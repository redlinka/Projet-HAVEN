<?php
session_start();
global $cnx;
include("./config/cnx.php");
require_once __DIR__ . '/includes/i18n.php';
require_once __DIR__ . '/TwoFactorAuthLight.php';
date_default_timezone_set('Europe/Paris');

if (!isset($_SESSION['userId'])) {
    header("Location: auth.php");
    exit;
}
$userId = (int)$_SESSION['userId'];
$errors  = [];
$success = '';

$stmt = $cnx->prepare("SELECT email, totp_secret FROM USER WHERE user_id = ?");
$stmt->execute([$userId]);
$user = $stmt->fetch(PDO::FETCH_ASSOC);
if (!$user) {
    header("Location: auth.php");
    exit;
}

$tfa = new TwoFactorAuthLight();
if (empty($_SESSION['totp_secret_temp'])) {
    $_SESSION['totp_secret_temp'] = $tfa->createSecret();
}
$secret = $_SESSION['totp_secret_temp'];

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    if (!csrf_validate($_POST['csrf'] ?? null)) {
        $errors[] = 'Session expired. Please try again.';
    } else {
        $inputCode = trim($_POST['code'] ?? '');
        if (!$tfa->verifyCode($secret, $inputCode)) {
            $errors[] = 'Invalid code. Make sure your app time is synchronized and try again.';
        } else {
            try {
                $cnx->prepare("UPDATE USER SET totp_secret = ?, twofa_method = 'totp' WHERE user_id = ?")
                    ->execute([$secret, $userId]);
                unset($_SESSION['totp_secret_temp']);
                $_SESSION['twofa_method'] = 'totp';
                $success = 'TOTP authentication successfully activated!';
            } catch (PDOException $e) {
                $errors[] = 'Database error. Please try again.';
            }
        }
    }
}

$label      = 'Bricksy:' . $user['email'];
$otpAuthUrl = $tfa->getQRCodeUrl($label, $secret, 'Bricksy');
$qrImageUrl = 'https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=' . urlencode($otpAuthUrl);
?>
<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Set Up Authenticator — Bricksy</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600&display=swap" rel="stylesheet">
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
    <link rel="stylesheet" href="style/creation_mail.css">
    <link rel="stylesheet" href="style/all.css">
    <?php include_once("matomo_tag.php"); ?>
    <style>
        /* ── Responsive layout overrides ── */
        html,
        body {
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
        .totp-card {
            max-width: 460px;
        }

        .steps-list {
            list-style: none;
            padding: 0;
            margin: 0 0 18px;
            display: flex;
            flex-direction: column;
            gap: 10px;
        }

        .steps-list li {
            display: flex;
            align-items: flex-start;
            gap: 12px;
            font-size: .82rem;
            line-height: 1.5;
        }

        .step-num {
            flex-shrink: 0;
            width: 22px;
            height: 22px;
            border-radius: 50%;
            background: var(--main-brown, #A26547);
            color: #fff;
            font-size: .68rem;
            font-weight: 700;
            display: flex;
            align-items: center;
            justify-content: center;
        }

        .qr-wrap {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 10px;
            padding: 16px;
            background: #fff;
            border: 1.5px solid var(--border, #e0d5c8);
            border-radius: 10px;
            margin: 16px 0;
        }

        .qr-wrap img {
            width: clamp(140px, 40vw, 200px);
            height: auto;
        }

        .secret-code {
            font-family: monospace;
            font-size: .86rem;
            font-weight: 600;
            letter-spacing: .12em;
            background: var(--prev-bg, #ede7de);
            border: 1px solid var(--border, #e0d5c8);
            border-radius: 6px;
            padding: 6px 12px;
            color: var(--main-brown, #A26547);
            word-break: break-all;
            text-align: center;
            max-width: 100%;
        }

        .code-input-row {
            display: flex;
            gap: 8px;
            margin-top: 14px;
            flex-wrap: wrap;
        }

        .code-input-row input {
            flex: 1;
            min-width: 0;
            padding: 10px 14px;
            border: 1.5px solid var(--border, #e0d5c8);
            border-radius: 8px;
            font-family: monospace;
            font-size: 1.1rem;
            letter-spacing: .2em;
            text-align: center;
            background: #fff;
            outline: none;
            transition: border-color .15s;
        }

        .code-input-row input:focus {
            border-color: var(--main-brown, #A26547);
        }

        .code-input-row button {
            padding: 10px 20px;
            background: var(--main-brown, #A26547);
            color: #fff;
            border: none;
            border-radius: 8px;
            font-family: 'DM Sans', sans-serif;
            font-weight: 600;
            font-size: .8rem;
            cursor: pointer;
            transition: background .15s;
            white-space: nowrap;
        }

        .code-input-row button:hover {
            background: var(--brown-dk, #7d4e36);
        }

        .alert-ok {
            display: flex;
            align-items: center;
            gap: 10px;
            padding: 12px 16px;
            background: #f0fdf4;
            border: 1.5px solid #86efac;
            border-radius: 8px;
            color: #166534;
            font-size: .82rem;
            font-weight: 500;
            margin-bottom: 16px;
        }

        .alert-err {
            padding: 10px 14px;
            background: #fff5f5;
            border: 1px solid #fecaca;
            border-radius: 8px;
            color: #c0392b;
            font-size: .82rem;
            margin-bottom: 14px;
        }

        /* ── Mobile ── */
        @media (max-width: 480px) {
            .code-input-row {
                flex-direction: column;
            }

            .code-input-row button {
                width: 100%;
            }

            .totp-card {
                max-width: 100%;
            }
        }
    </style>
</head>

<body>
    <?php include("./includes/navbar.php"); ?>
    <div class="mail-page">
        <div class="mail-card totp-card">

            <div class="mail-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                    <rect x="5" y="2" width="14" height="20" rx="2" />
                    <line x1="12" y1="18" x2="12.01" y2="18" />
                    <rect x="8" y="6" width="8" height="6" rx="1" />
                </svg>
            </div>

            <h1 class="mail-title">Set Up Authenticator</h1>
            <p class="mail-subtitle">Scan the QR code with <strong>LastPass Authenticator</strong>, <strong>Google Authenticator</strong> or any TOTP app.</p>

            <?php if ($success): ?>
                <div class="alert-ok">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                        <polyline points="20 6 9 17 4 12" />
                    </svg>
                    <?= htmlspecialchars($success) ?>
                </div>
                <div class="mail-divider"></div>
                <a href="my_account.php" class="btn-back">← Back to My Account</a>

            <?php else: ?>

                <?php if (!empty($errors)): ?>
                    <div class="alert-err"><?php foreach ($errors as $e): ?><div><?= htmlspecialchars($e) ?></div><?php endforeach; ?></div>
                <?php endif; ?>

                <ol class="steps-list">
                    <li><span class="step-num">1</span>Install <strong>LastPass Authenticator</strong> or any TOTP app on your phone.</li>
                    <li><span class="step-num">2</span>Scan the QR code below, or enter the secret key manually.</li>
                    <li><span class="step-num">3</span>Enter the 6-digit code shown in the app to confirm setup.</li>
                </ol>

                <div class="qr-wrap">
                    <img src="<?= htmlspecialchars($qrImageUrl) ?>" width="200" height="200" alt="QR Code TOTP">
                    <p style="font-size:.72rem;color:var(--muted);margin:0;">Can't scan? Enter this key manually:</p>
                    <span class="secret-code"><?= htmlspecialchars($secret) ?></span>
                </div>

                <form method="POST">
                    <input type="hidden" name="csrf" value="<?= htmlspecialchars(csrf_get()) ?>">
                    <label style="font-size:.78rem;font-weight:600;color:var(--muted);">6-digit code from your app</label>
                    <div class="code-input-row">
                        <input type="text" name="code" id="code"
                            inputmode="numeric" pattern="[0-9]{6}" maxlength="6"
                            placeholder="000 000" autocomplete="one-time-code" required>
                        <button type="submit">Verify &amp; Activate</button>
                    </div>
                </form>

                <div class="mail-divider"></div>
                <a href="my_account.php" class="btn-back">← Cancel</a>

            <?php endif; ?>
        </div>
    </div>
    <script>
        document.getElementById('code')?.addEventListener('input', function() {
            this.value = this.value.replace(/\D/g, '').slice(0, 6);
        });
    </script>
</body>

</html>
