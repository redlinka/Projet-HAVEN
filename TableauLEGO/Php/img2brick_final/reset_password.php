<?php
session_start();
global $cnx;
include("./config/cnx.php");
require_once __DIR__ . '/includes/i18n.php';

$errors    = [];
$viewState = 'checking';
$message   = '';

// 1. TOKEN VERIFICATION
if (!isset($_GET['token'])) {
    $viewState = 'error';
    $message   = tr('reset_password.no_token', 'No token provided.');
} else {
    $token = $_GET['token'];

    try {
        $stmt = $cnx->prepare("SELECT * FROM `2FA` WHERE verification_token = ? LIMIT 1");
        $stmt->execute([$token]);
        $result = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$result) {
            $viewState = 'error';
            $message   = tr('reset_password.invalid_token', 'Invalid or expired token.');
        } else {
            $now    = new DateTime();
            $expiry = new DateTime($result['token_expire_at']);

            if ($now > $expiry) {
                $viewState = 'error';
                $message   = tr('reset_password.expired', 'This link has expired. Please request a new one.');
            } else {
                $viewState = 'form';
                $userId    = $result['user_id'];
            }
        }
    } catch (PDOException $e) {
        $viewState = 'error';
        $message   = tr('reset_password.db_error', 'Database error. Please try again later.');
    }
}

// 2. FORM SUBMISSION
if ($viewState === 'form' && $_SERVER["REQUEST_METHOD"] === "POST") {

    if (!csrf_validate($_POST['csrf'] ?? null)) {
        $errors[] = 'Invalid session.';
    } else {
        $password = $_POST['password'];

        if (strlen($password) < 12)                              $errors[] = 'Password must be at least 12 characters long';
        if (!preg_match('/[0-9]/', $password))                   $errors[] = 'Password must contain at least one number';
        if (!preg_match('/[A-Z]/', $password))                   $errors[] = 'Password must contain at least one uppercase letter';
        if (!preg_match('/[a-z]/', $password))                   $errors[] = 'Password must contain at least one lowercase letter';
        if (!preg_match('/[!@#$%^&*(),.?":{}|<>]/', $password)) $errors[] = 'Password must contain at least one special character';

        if (empty($errors)) {
            $algo = constant($_ENV['ALGO']) ?? PASSWORD_DEFAULT;
            $newPassword = password_hash($password, $algo);

            try {
                $cnx->beginTransaction();
                $cnx->prepare("UPDATE USER SET password = ? WHERE user_id = ?")->execute([$newPassword, $userId]);
                $cnx->prepare("DELETE FROM `2FA` WHERE verification_token = ?")->execute([$token]);
                unset($_SESSION['last_password_reset_sent']);
                $cnx->commit();
                $viewState = 'success';
                csrf_rotate();
                addLog($cnx, "USER", "RESET", "password");
            } catch (Exception $e) {
                if ($cnx->inTransaction()) $cnx->rollBack();
                $errors[] = 'Database error. Please try again later.';
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
    <title><?= htmlspecialchars(tr('reset_password.page_title', 'Reset Password — Bricksy')) ?></title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600&display=swap" rel="stylesheet">
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
    <link href="style/reset_password.css" rel="stylesheet">
    <link href="style/all.css" rel="stylesheet">
    <?php include_once("matomo_tag.php"); ?>
</head>

<body>

    <?php include("./includes/navbar.php"); ?>

    <div class="page-wrapper">
        <div class="auth-card">
            <div class="card-accent"></div>
            <div class="card-body">

                <?php if ($viewState === 'success'): ?>
                    <!-- ══ SUCCESS ══ -->

                    <div class="state-icon success-icon">
                        <svg width="26" height="26" viewBox="0 0 24 24" fill="none"
                            stroke="currentColor" stroke-width="2.8"
                            stroke-linecap="round" stroke-linejoin="round">
                            <polyline points="20 6 9 17 4 12" />
                        </svg>
                    </div>

                    <div class="card-heading">
                        <p class="card-title" data-i18n="reset_password.success_title">Password Updated!</p>
                        <p class="card-hint" data-i18n="reset_password.success_text">
                            Your password has been securely reset. You can now log in with your new credentials.
                        </p>
                    </div>

                    <a href="auth.php" class="btn-primary-rp" data-i18n="reset_password.login_now">
                        Log In Now
                    </a>

                <?php elseif ($viewState === 'error'): ?>
                    <!-- ══ ERROR ══ -->

                    <div class="state-icon error-icon">
                        <svg width="26" height="26" viewBox="0 0 24 24" fill="none"
                            stroke="currentColor" stroke-width="2.8"
                            stroke-linecap="round" stroke-linejoin="round">
                            <line x1="18" y1="6" x2="6" y2="18" />
                            <line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                    </div>

                    <div class="card-heading">
                        <p class="card-title" data-i18n="reset_password.error_title">Link Expired or Invalid</p>
                        <p class="card-hint"><?= htmlspecialchars($message) ?></p>
                    </div>

                    <div class="btn-group">
                        <a href="password_forgotten.php" class="btn-primary-rp" data-i18n="reset_password.request_new">
                            Request New Link
                        </a>
                        <a href="index.php" class="btn-outline-rp" data-i18n="reset_password.go_home">
                            Go Home
                        </a>
                    </div>

                <?php elseif ($viewState === 'form'): ?>
                    <!-- ══ FORM ══ -->

                    <div class="state-icon form-icon">
                        <svg width="26" height="26" viewBox="0 0 24 24" fill="none"
                            stroke="currentColor" stroke-width="2"
                            stroke-linecap="round" stroke-linejoin="round">
                            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                        </svg>
                    </div>

                    <div class="card-heading">
                        <p class="card-title" data-i18n="reset_password.form_title">Reset Password</p>
                        <p class="card-hint">Choose a strong new password for your account.</p>
                    </div>

                    <?php if (!empty($errors)): ?>
                        <div class="alert-box error">
                            <ul><?php foreach ($errors as $e): ?><li><?= htmlspecialchars($e) ?></li><?php endforeach; ?></ul>
                        </div>
                    <?php endif; ?>

                    <form action="" method="POST">
                        <input type="hidden" name="csrf" value="<?= htmlspecialchars(csrf_get(), ENT_QUOTES, 'UTF-8') ?>">

                        <div style="display:flex;flex-direction:column;gap:clamp(12px,1.8vh,18px);">

                            <!-- Password field -->
                            <div class="field">
                                <label for="password" data-i18n="reset_password.new_password_label">New Password</label>
                                <div class="field-input-wrap">
                                    <input type="password" id="password" name="password"
                                        placeholder="Min. 12 characters"
                                        data-i18n-attr="placeholder:reset_password.new_password_placeholder"
                                        required autocomplete="new-password">
                                    <button type="button" class="toggle-pwd" id="togglePwd" aria-label="Show/hide password">
                                        <!-- Eye icon — toggled by JS -->
                                        <svg id="eyeIcon" width="17" height="17" viewBox="0 0 24 24" fill="none"
                                            stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                                            <circle cx="12" cy="12" r="3" />
                                        </svg>
                                    </button>
                                </div>
                            </div>

                            <!-- Requirements checklist -->
                            <div class="requirements">
                                <p class="req-title" data-i18n="reset_password.requirements_title">Password must contain</p>
                                <div id="req-lower" class="req-item invalid" data-i18n="signup.requirements.lowercase">Lowercase letter</div>
                                <div id="req-upper" class="req-item invalid" data-i18n="signup.requirements.uppercase">Uppercase letter</div>
                                <div id="req-number" class="req-item invalid" data-i18n="signup.requirements.number">Number</div>
                                <div id="req-special" class="req-item invalid" data-i18n="signup.requirements.special">Special character</div>
                                <div id="req-length" class="req-item invalid" data-i18n="signup.requirements.length">Min 12 characters</div>
                            </div>

                            <button type="submit" class="btn-primary-rp" data-i18n="reset_password.submit">
                                Update Password
                            </button>

                        </div>
                    </form>

                <?php endif; ?>

            </div><!-- /card-body -->
        </div><!-- /auth-card -->
    </div><!-- /page-wrapper -->

    <script>
        // ── Show / hide password ──
        const toggle = document.getElementById('togglePwd');
        const pwdInput = document.getElementById('password');
        const eyeIcon = document.getElementById('eyeIcon');

        const eyeOpen = `<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>`;
        const eyeOff = `<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/>`;

        if (toggle && pwdInput) {
            toggle.addEventListener('click', () => {
                const isText = pwdInput.type === 'text';
                pwdInput.type = isText ? 'password' : 'text';
                eyeIcon.innerHTML = isText ? eyeOpen : eyeOff;
            });
        }

        // ── Requirements live check ──
        function t(key, fallback) {
            return (window.I18N && typeof window.I18N.t === 'function') ? window.I18N.t(key, fallback) : (fallback || key);
        }

        const reqs = {
            lower: {
                el: document.getElementById('req-lower'),
                test: v => /[a-z]/.test(v),
                label: () => t('signup.requirements.lowercase', 'Lowercase letter')
            },
            upper: {
                el: document.getElementById('req-upper'),
                test: v => /[A-Z]/.test(v),
                label: () => t('signup.requirements.uppercase', 'Uppercase letter')
            },
            number: {
                el: document.getElementById('req-number'),
                test: v => /[0-9]/.test(v),
                label: () => t('signup.requirements.number', 'Number')
            },
            special: {
                el: document.getElementById('req-special'),
                test: v => /[!@#$%^&*(),.?":{}|<>]/.test(v),
                label: () => t('signup.requirements.special', 'Special character')
            },
            length: {
                el: document.getElementById('req-length'),
                test: v => v.length >= 12,
                label: () => t('signup.requirements.length', 'Min 12 characters')
            }
        };

        if (pwdInput) {
            pwdInput.addEventListener('input', () => {
                const v = pwdInput.value;
                Object.values(reqs).forEach(r => {
                    if (!r.el) return;
                    const ok = r.test(v);
                    r.el.className = 'req-item ' + (ok ? 'valid' : 'invalid');
                    r.el.textContent = r.label();
                });
            });
        }
    </script>

</body>

</html>
