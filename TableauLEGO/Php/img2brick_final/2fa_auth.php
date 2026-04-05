<?php
session_start();
global $cnx;
include("./config/cnx.php");
require_once __DIR__ . '/includes/i18n.php';
require_once __DIR__ . '/twofactorauthlight.php';
date_default_timezone_set('Europe/Paris');

// Verify if we have a pending 2FA user in session, else redirect to login
if (!isset($_SESSION['2fa_pending_user_id'])) {
    header("Location: auth.php");
    exit;
}

$pendingUserId = (int)$_SESSION['2fa_pending_user_id'];
$errors        = [];

// Fetch user data and 2FA method
$stmt = $cnx->prepare("SELECT user_id, username, email, twofa_method, totp_secret FROM USER WHERE user_id = ?");
$stmt->execute([$pendingUserId]);
$user = $stmt->fetch(PDO::FETCH_ASSOC);
if (!$user) { header("Location: auth.php"); exit; }

$method = $user['twofa_method'] ?? 'email'; // 'email' or 'totp'

// EMAIL METHOD - send link if not already sent
if ($method === 'email' && !isset($_SESSION['2fa_mail_sent'])) {
    try {
        $token     = bin2hex(random_bytes(32));
        $expireAt  = date('Y-m-d H:i:s', time() + 60);
        $cnx->prepare("DELETE FROM 2FA WHERE user_id = ?")->execute([$pendingUserId]);
        $cnx->prepare("INSERT INTO 2FA (user_id, verification_token, token_expire_at) VALUES (?,?,?)")
            ->execute([$pendingUserId, $token, $expireAt]);
        $protocol = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? "https://" : "http://";
        $link     = $protocol . $_SERVER['HTTP_HOST'] . dirname($_SERVER['PHP_SELF']) . '/verify_connexion.php?token=' . $token;
        $emailBody = "
            <div style='font-family:Arial,sans-serif;padding:20px;border:1px solid #e0e0e0;border-radius:8px;max-width:600px;'>
                <h2 style='color:#A26547;'>Your Bricksy login link</h2>
                <p>Click the button below to complete your login. This link expires in <strong>1 minute</strong>.</p>
                <p style='text-align:center;'>
                    <a href='{$link}' style='display:inline-block;background:#A26547;color:white;padding:12px 28px;text-decoration:none;border-radius:6px;font-weight:bold;'>
                        Log In to Bricksy
                    </a>
                </p>
                <p style='color:#9a8a7a;font-size:12px;margin-top:20px;'>Or copy this link: {$link}</p>
            </div>";
        sendMail($user['email'], 'Your Bricksy login link', $emailBody);
        $_SESSION['2fa_mail_sent'] = true;
    } catch (Exception $e) {
        $errors[] = 'Error sending email. Please try again.';
    }
}

// TOTP METHOD - verify code on POST
if ($method === 'totp' && $_SERVER['REQUEST_METHOD'] === 'POST') {
    if (!csrf_validate($_POST['csrf'] ?? null)) {
        $errors[] = 'Session expired. Please go back and try again.';
    } else {
        $inputCode   = trim($_POST['totp_code'] ?? '');
        $totpSecret  = $user['totp_secret'] ?? '';
        $tfa         = new TwoFactorAuthLight();

        if (empty($totpSecret)) {
            $errors[] = 'TOTP not configured. Please set it up in your account settings.';
        } elseif (!$tfa->verifyCode($totpSecret, $inputCode)) {
            $errors[] = 'Invalid code. Make sure your app time is synchronized and try again.';
        } else {
            // Verfication successful - log in the user
            session_regenerate_id(true);
            $_SESSION['userId']   = $pendingUserId;
            $_SESSION['username'] = $user['username'];
            $_SESSION['email']    = $user['email'];
            unset($_SESSION['2fa_pending_user_id'], $_SESSION['2fa_mail_sent']);
            addLog($cnx, "USER", "LOGIN", "totp_2fa");
            header("Location: index.php");
            exit;
        }
    }
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title><?= $method === 'totp' ? 'Enter Authenticator Code' : 'Check Your Email' ?> — Bricksy</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600&display=swap" rel="stylesheet">
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
    <link rel="stylesheet" href="style/creation_mail.css">
    <link rel="stylesheet" href="style/all.css">
    <style>
        /* ── Responsive layout overrides ── */
        html, body {
            height: auto;
            min-height: 100vh;
            overflow-x: hidden;
            overflow-y: auto;
        }
        .mail-page {
            min-height: calc(100vh - 80px);
            height: auto !important;
            display: flex;
            align-items: flex-start;
            justify-content: center;
            padding: clamp(16px, 4vw, 48px) clamp(12px, 4vw, 24px);
            box-sizing: border-box;
        }
        .mail-card {
            width: 100%;
            max-height: none !important;
            height: auto !important;
            overflow: visible !important;
            margin: 0 auto;
            box-sizing: border-box;
        }

        /* ── Page-specific styles ── */
        .code-input-row { display:flex; gap:8px; margin-top:14px; flex-wrap: wrap; }
        .code-input-row input { flex:1; min-width: 0; padding:12px 14px; border:1.5px solid var(--border,#e0d5c8); border-radius:8px; font-family:monospace; font-size:1.3rem; letter-spacing:.25em; text-align:center; background:#fff; outline:none; transition:border-color .15s; }
        .code-input-row input:focus { border-color:var(--main-brown,#A26547); }
        .code-input-row button { padding:12px 22px; background:var(--main-brown,#A26547); color:#fff; border:none; border-radius:8px; font-family:'DM Sans',sans-serif; font-weight:600; font-size:.82rem; cursor:pointer; transition:background .15s; white-space: nowrap; }
        .code-input-row button:hover { background:var(--brown-dk,#7d4e36); }
        .alert-err { padding:10px 14px; background:#fff5f5; border:1px solid #fecaca; border-radius:8px; color:#c0392b; font-size:.82rem; margin-bottom:14px; }
        .method-badge { display:inline-flex; align-items:center; gap:6px; padding:4px 10px; border-radius:20px; font-size:.68rem; font-weight:600; letter-spacing:.06em; text-transform:uppercase; margin-bottom:12px; }
        .method-badge.email { background:#e8f4fd; color:#1a6fa5; }
        .method-badge.totp  { background:#fdf0e6; color:var(--main-brown,#A26547); }

        /* ── Mobile ── */
        @media (max-width: 480px) {
            .code-input-row { flex-direction: column; }
            .code-input-row button { width: 100%; }
        }
    </style>
</head>
<body>
<?php include("./includes/navbar.php"); ?>

<div class="mail-page">
    <div class="mail-card">

        <?php if ($method === 'email'): ?>
        <!-- ════ MODE EMAIL ════ -->
        <div class="mail-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"
                 stroke-linecap="round" stroke-linejoin="round">
                <rect x="2" y="4" width="20" height="16" rx="2"/>
                <polyline points="2,4 12,13 22,4"/>
            </svg>
        </div>

        <span class="method-badge email">Email verification</span>
        <h1 class="mail-title">Check your inbox</h1>
        <p class="mail-subtitle">
            We sent a secure login link to <strong><?= htmlspecialchars($user['email']) ?></strong>.<br>
            Click the link to complete your login.
        </p>

        <?php if (!empty($errors)): ?>
        <div class="alert-err"><?php foreach ($errors as $e): ?><div><?= htmlspecialchars($e) ?></div><?php endforeach; ?></div>
        <?php endif; ?>

        <div class="alert alert-success">
            ✓ The link expires in <strong>1 minute</strong>. Check your spam folder if you don't see it.
        </div>

        <div class="mail-divider"></div>
        <a href="auth.php" class="btn-back">← Back to Login</a>

        <?php else: ?>
        <!-- ════ MODE TOTP ════ -->
        <div class="mail-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"
                 stroke-linecap="round" stroke-linejoin="round">
                <rect x="5" y="2" width="14" height="20" rx="2"/>
                <line x1="12" y1="18" x2="12.01" y2="18"/>
                <rect x="8" y="6" width="8" height="6" rx="1"/>
            </svg>
        </div>

        <span class="method-badge totp">Authenticator app</span>
        <h1 class="mail-title">Enter your code</h1>
        <p class="mail-subtitle">
            Open your authenticator app and enter the <strong>6-digit code</strong> for Bricksy.
        </p>

        <?php if (!empty($errors)): ?>
        <div class="alert-err"><?php foreach ($errors as $e): ?><div><?= htmlspecialchars($e) ?></div><?php endforeach; ?></div>
        <?php endif; ?>

        <form method="POST">
            <input type="hidden" name="csrf" value="<?= htmlspecialchars(csrf_get()) ?>">
            <div class="code-input-row">
                <input type="text" name="totp_code" id="totp_code"
                       inputmode="numeric" pattern="[0-9]{6}" maxlength="6"
                       placeholder="000 000" autocomplete="one-time-code"
                       required autofocus>
                <button type="submit">Verify</button>
            </div>
        </form>

        <div class="mail-divider"></div>
        <a href="auth.php" class="btn-back">← Back to Login</a>

        <?php endif; ?>
    </div>
</div>

<script>
document.getElementById('totp_code')?.addEventListener('input', function () {
    this.value = this.value.replace(/\D/g, '').slice(0, 6);
});
</script>
</body>
</html>
