<?php
session_start();
global $cnx;
include("./config/cnx.php");
require_once __DIR__ . '/includes/i18n.php';

$errors    = [];
$viewState = 'form'; // 'form' | 'success' | 'error'
$message   = '';

if ($_SERVER["REQUEST_METHOD"] == "POST") {

    if (!csrf_validate($_POST['csrf'] ?? null)) {
        $viewState = 'error';
        $message   = 'Invalid form submission.';
    }
    elseif (!validateTurnstile()['success']) {
        $errors[] = 'Access denied to bots or internal error.';
    }
    else {
        $email = filter_var($_POST['email'], FILTER_SANITIZE_EMAIL);

        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
            $errors[] = 'Invalid email format';
        } else {
            $lastSendTime    = $_SESSION['last_password_reset_sent'] ?? 0;
            $currentTime     = time();
            $cooldownSeconds = 60;

            if (($currentTime - $lastSendTime) < $cooldownSeconds) {
                $remainingTime = $cooldownSeconds - ($currentTime - $lastSendTime);
                $errors[] = "Please wait {$remainingTime} seconds before requesting another link.";
            } else {
                try {
                    $stmt = $cnx->prepare("SELECT * FROM USER WHERE email = ?");
                    $stmt->execute([$email]);
                    $user = $stmt->fetch(PDO::FETCH_ASSOC);

                    $viewState = 'success';

                    if ($user !== false) {
                        $token     = bin2hex(random_bytes(32));
                        $expire_at = date('Y-m-d H:i:s', time() + 60);

                        $cleanup = $cnx->prepare("DELETE FROM `2FA` WHERE user_id = ?");
                        $cleanup->execute([$user['user_id']]);

                        $ins = $cnx->prepare("INSERT INTO 2FA (user_id, verification_token, token_expire_at) VALUES (?, ?, ?)");
                        $ins->execute([$user['user_id'], $token, $expire_at]);

                        $protocol = ((!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') || $_SERVER['SERVER_PORT'] == 443) ? "https://" : "http://";
                        $domain   = $_SERVER['HTTP_HOST'];
                        $link     = $protocol . $domain . dirname($_SERVER['PHP_SELF']) . '/reset_password.php?token=' . $token;

                        $emailBody = "
                            <div style='font-family: Arial, sans-serif; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px; max-width: 600px;'>
                                <h2 style='color: #A26547;'>Password Reset Request</h2>
                                <p>We received a request to reset your password. Click the button below to proceed:</p>
                                <p style='text-align: center;'>
                                    <a href='{$link}' style='display: inline-block; background-color: #A26547; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold;'>Reset Password</a>
                                </p>
                                <p style='color: #6c757d; font-size: 12px; margin-top: 20px;'>Link expires in 1 minute.</p>
                            </div>";

                        sendMail($email, 'Password Recovery', $emailBody);
                        $_SESSION['last_password_reset_sent'] = $currentTime;
                    }
                    csrf_rotate();

                } catch (PDOException $e) {
                    $viewState = 'error';
                    $message   = 'Database error. Please try again later.';
                }
            }
        }
    }
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title><?= htmlspecialchars(tr('password_forgotten.page_title', 'Password Recovery — Bricksy')) ?></title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600&display=swap" rel="stylesheet">
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
    <link href="style/password_forgotten.css" rel="stylesheet">
    <link href="style/all.css" rel="stylesheet">
    <script src="https://challenges.cloudflare.com/turnstile/v0/api.js" async defer></script>
</head>
<body>

<?php include("./includes/navbar.php"); ?>

<div class="page-wrapper">
    <div class="auth-card">
        <div class="card-accent"></div>
        <div class="card-body">

            <?php if ($viewState === 'success'): ?>
            <!-- ══ SUCCESS STATE ══ -->

            <div class="state-icon success-icon">
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none"
                     stroke="currentColor" stroke-width="2.8"
                     stroke-linecap="round" stroke-linejoin="round">
                    <polyline points="20 6 9 17 4 12"/>
                </svg>
            </div>

            <div class="card-heading">
                <p class="card-title" data-i18n="password_forgotten.success_title">Check your inbox</p>
                <p class="card-hint" data-i18n="password_forgotten.success_text">
                    If an account exists for that email, we've sent a password reset link. It may take a few minutes to arrive.
                </p>
            </div>

            <div class="info-badge">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
                     stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <circle cx="12" cy="12" r="10"/>
                    <polyline points="12 6 12 12 16 14"/>
                </svg>
                The link expires in 1 minute
            </div>

            <a href="auth.php" class="btn-outline-bk" data-i18n="password_forgotten.back_login">
                ← Back to Login
            </a>

            <?php elseif ($viewState === 'error'): ?>
            <!-- ══ ERROR STATE ══ -->

            <div class="state-icon error-icon">
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none"
                     stroke="currentColor" stroke-width="2.8"
                     stroke-linecap="round" stroke-linejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18"/>
                    <line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
            </div>

            <div class="card-heading">
                <p class="card-title" data-i18n="password_forgotten.error_title">Request Failed</p>
                <p class="card-hint"><?= htmlspecialchars($message) ?></p>
            </div>

            <div class="btn-group">
                <a href="password_forgotten.php" class="btn-primary-bk" data-i18n="password_forgotten.try_again">Try Again</a>
                <a href="index.php" class="btn-outline-bk" data-i18n="password_forgotten.go_home">Go Home</a>
            </div>

            <?php else: ?>
            <!-- ══ FORM STATE ══ -->

            <div class="state-icon form-icon">
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none"
                     stroke="currentColor" stroke-width="2"
                     stroke-linecap="round" stroke-linejoin="round">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                    <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                </svg>
            </div>

            <div class="card-heading">
                <p class="card-title" data-i18n="password_forgotten.form_title">Password Recovery</p>
                <p class="card-hint" data-i18n="password_forgotten.form_hint">
                    Enter your email address and we'll send you a secure reset link.
                </p>
            </div>

            <?php if (!empty($errors)): ?>
            <div class="alert-box error">
                <ul><?php foreach ($errors as $e): ?><li><?= htmlspecialchars($e) ?></li><?php endforeach; ?></ul>
            </div>
            <?php endif; ?>

            <form method="POST" action="">
                <input type="hidden" name="csrf" value="<?= htmlspecialchars(csrf_get(), ENT_QUOTES, 'UTF-8') ?>">

                <div style="display:flex;flex-direction:column;gap:clamp(14px,2.2vh,22px);">
                    <div class="field">
                        <label for="email" data-i18n="password_forgotten.email_label">Email Address</label>
                        <input type="email" id="email" name="email"
                               placeholder="name@example.com"
                               data-i18n-attr="placeholder:password_forgotten.email_placeholder"
                               required>
                    </div>

                    <div class="captcha-wrap">
                        <div class="cf-turnstile"
                             data-sitekey="<?= htmlspecialchars($_ENV['CLOUDFLARE_TURNSTILE_PUBLIC'] ?? '') ?>"
                             data-theme="light"
                             data-size="flexible">
                        </div>
                    </div>

                    <button type="submit" class="btn-primary-bk" data-i18n="password_forgotten.submit">
                        Send Recovery Link
                    </button>
                </div>
            </form>

            <p class="back-link">
                Remembered it? <a href="auth.php" data-i18n="password_forgotten.back_login">Back to Login</a>
            </p>

            <?php endif; ?>

        </div><!-- /card-body -->
    </div><!-- /auth-card -->
</div><!-- /page-wrapper -->

</body>
</html>