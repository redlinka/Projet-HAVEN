<?php
session_start();
global $cnx;
include("./config/cnx.php");

$errors   = [];
$activeTab = 'signup'; // which tab to show after a failed POST

/* ══════════════════════════════════════════════════════════
   POST HANDLING
══════════════════════════════════════════════════════════ */
if ($_SERVER['REQUEST_METHOD'] === 'POST') {

    $formType = $_POST['form_type'] ?? '';

    /* ── CSRF ── */
    if (!csrf_validate($_POST['csrf'] ?? null)) {
        http_response_code(400);
        die('Invalid form submission.');
    }

    /* ── CAPTCHA ── */
    if (!validateTurnstile()['success']) {
        http_response_code(403);
        $errors[]  = 'Access denied to bots or internal error.';
        $activeTab = $formType;
    } else {

        /* ════════════════════════════════
           SIGN UP
        ════════════════════════════════ */
        if ($formType === 'signup') {
            $activeTab = 'signup';

            $_SESSION['email'] = filter_var($_POST['email'], FILTER_SANITIZE_EMAIL);
            if (!filter_var($_SESSION['email'], FILTER_VALIDATE_EMAIL))
                $errors[] = 'Invalid email format.';

            $username = trim($_POST['username'] ?? '');
            if (strlen($username) < 8)
                $errors[] = 'Username must be at least 8 characters long.';

            $password = $_POST['password'] ?? '';
            if (strlen($password) < 12)                                    $errors[] = 'Password must be at least 12 characters long.';
            if (!preg_match('/[0-9]/', $password))                         $errors[] = 'Password must contain at least one number.';
            if (!preg_match('/[A-Z]/', $password))                         $errors[] = 'Password must contain at least one uppercase letter.';
            if (!preg_match('/[a-z]/', $password))                         $errors[] = 'Password must contain at least one lowercase letter.';
            if (!preg_match('/[!@#$%^&*(),.?":{}|<>]/', $password))       $errors[] = 'Password must contain at least one special character.';

            if (empty($errors)) {
                $password_hashed = password_hash($password, $_ENV['ALGO']);

                try {
                    $stmt = $cnx->prepare("SELECT COUNT(*) FROM USER WHERE email = ?");
                    $stmt->execute([$_SESSION['email']]);
                    if ($stmt->fetchColumn() > 0) {
                        $errors[] = 'Unable to create an account with this email address.';
                    } else {
                        $stmt = $cnx->prepare("SELECT COUNT(*) FROM USER WHERE username = ?");
                        $stmt->execute([$username]);
                        if ($stmt->fetchColumn() > 0) {
                            $errors[] = 'Username is already taken.';
                        } else {
                            $token     = bin2hex(random_bytes(32));
                            $expire_at = date('Y-m-d H:i:s', time() + 60);

                            $cnx->beginTransaction();

                            $stmt = $cnx->prepare("INSERT INTO USER (username, email, password, phone, default_address, last_name, first_name, is_verified) VALUES (?, ?, ?, ?, ?, ?, ?, ?)");
                            $stmt->execute([$username, $_SESSION['email'], $password_hashed, null, null, null, null, 0]);

                            $_SESSION['tempId'] = $cnx->lastInsertId();
                            $stmt = $cnx->prepare("INSERT INTO 2FA (user_id, verification_token, token_expire_at) VALUES (?, ?, ?)");
                            $stmt->execute([$_SESSION['tempId'], $token, $expire_at]);

                            $protocol = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off' || $_SERVER['SERVER_PORT'] == 443) ? "https://" : "http://";
                            $link = $protocol . $_SERVER['HTTP_HOST'] . dirname($_SERVER['PHP_SELF']) . '/verify_account.php?token=' . $token;

                            $emailBody = "<div style='font-family:Arial,sans-serif;padding:20px;border:1px solid #e0e0e0;border-radius:8px;max-width:600px;'>
                                <h2 style='color:#8B5E3C;'>Welcome to Bricksy! 🧱</h2>
                                <p>Thanks for joining. Click below to activate your account:</p>
                                <p style='text-align:center;'><a href='{$link}' style='display:inline-block;background:#8B5E3C;color:#fff;padding:12px 24px;text-decoration:none;border-radius:5px;font-weight:bold;'>Verify My Account</a></p>
                                <p style='color:#999;font-size:12px;margin-top:20px;'>Or copy: {$link}</p></div>";

                            sendMail($_SESSION['email'], 'Welcome to Bricksy - Verify your account', $emailBody);
                            $_SESSION['last_email_sent'] = time();
                            $_SESSION['email_sent'] = true;

                            csrf_rotate();
                            $cnx->commit();
                            header('Location: creation_mail.php');
                            exit;
                        }
                    }
                } catch (PDOException $e) {
                    http_response_code(500);
                    if ($cnx->inTransaction()) $cnx->rollBack();
                    $errors[] = 'Database error. Please try again later.';
                }
            }

        /* ════════════════════════════════
           SIGN IN
        ════════════════════════════════ */
        } elseif ($formType === 'signin') {
            $activeTab = 'signin';

            try {
                $stmt = $cnx->prepare("SELECT * FROM USER WHERE (email = ? OR username = ?)");
                $stmt->execute([$_POST['userid'], $_POST['userid']]);
                $user = $stmt->fetch(PDO::FETCH_ASSOC);

                usleep(150000);

                if (!$user || !password_verify($_POST['password'], $user['password'])) {
                    $errors[] = 'Invalid username or password.';
                } elseif ((int)$user['is_verified'] === 0) {
                    session_regenerate_id(true);
                    $_SESSION['tempId']          = $user['user_id'];
                    $_SESSION['unverified_email'] = $user['email'];

                    $token     = bin2hex(random_bytes(32));
                    $expire_at = date('Y-m-d H:i:s', time() + 60);

                    $cnx->prepare("DELETE FROM 2FA WHERE user_id = ?")->execute([$user['user_id']]);
                    $cnx->prepare("INSERT INTO 2FA (user_id, verification_token, token_expire_at) VALUES (?, ?, ?)")->execute([$user['user_id'], $token, $expire_at]);

                    $protocol = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off' || $_SERVER['SERVER_PORT'] == 443) ? "https://" : "http://";
                    $link = $protocol . $_SERVER['HTTP_HOST'] . dirname($_SERVER['PHP_SELF']) . '/verify_account.php?token=' . $token;
                    $emailBody = "<div style='font-family:Arial,sans-serif;padding:20px;border:1px solid #e0e0e0;border-radius:8px;max-width:600px;'><h2 style='color:#8B5E3C;'>Activate Your Account</h2><p>Click below to verify your email:</p><p style='text-align:center;'><a href='{$link}' style='display:inline-block;background:#8B5E3C;color:#fff;padding:12px 24px;text-decoration:none;border-radius:5px;font-weight:bold;'>Verify My Account</a></p></div>";
                    sendMail($user['email'], 'Activate your Bricksy account', $emailBody);
                    $errors[] = 'Your account is not activated. A new verification email has been sent. <a href="creation_mail.php" style="color:var(--brown);">Resend</a>.';
                } else {
                    if (password_needs_rehash($user['password'], $_ENV['ALGO'])) {
                        $upd = $cnx->prepare("UPDATE USER SET password = ? WHERE user_id = ?");
                        $upd->execute([password_hash($_POST['password'], $_ENV['ALGO']), $user['user_id']]);
                    }

                    $token     = bin2hex(random_bytes(32));
                    $expire_at = date('Y-m-d H:i:s', time() + 60);
                    $cnx->prepare("DELETE FROM `2FA` WHERE user_id = ?")->execute([$user['user_id']]);
                    $cnx->prepare("INSERT INTO 2FA (user_id, verification_token, token_expire_at) VALUES (?, ?, ?)")->execute([$user['user_id'], $token, $expire_at]);

                    $protocol = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off' || $_SERVER['SERVER_PORT'] == 443) ? "https://" : "http://";
                    $link = $protocol . $_SERVER['HTTP_HOST'] . dirname($_SERVER['PHP_SELF']) . '/verify_connexion.php?token=' . $token;

                    $emailBody = "<div style='font-family:Arial,sans-serif;padding:20px;border:1px solid #e0e0e0;border-radius:8px;max-width:600px;'>
                        <h2 style='color:#8B5E3C;'>Secure Login Link 🔑</h2>
                        <p>Click the button below to complete your login:</p>
                        <p style='text-align:center;'><a href='{$link}' style='display:inline-block;background:#8B5E3C;color:#fff;padding:12px 24px;text-decoration:none;border-radius:5px;font-weight:bold;'>Log In</a></p>
                        <p style='color:#999;font-size:12px;margin-top:20px;'>Or copy: {$link}</p>
                        <p style='color:#999;font-size:12px;'>This link expires in 1 minute.</p></div>";

                    sendMail($user['email'], 'Complete your Bricksy login', $emailBody);
                    csrf_rotate();
                    header("Location: connexion_mail.php");
                    exit;
                }
            } catch (PDOException $e) {
                http_response_code(500);
                $errors[] = 'Database error. Please try again later.';
            }
        }
    }
}

$csrfToken = htmlspecialchars(csrf_get(), ENT_QUOTES, 'UTF-8');
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Sign In / Sign Up — Bricksy</title>

    <!-- Cloudflare Turnstile -->
    <script src="https://challenges.cloudflare.com/turnstile/v0/api.js" async defer></script>

    <!-- Google Fonts -->
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
    <link href="style/auth.css" rel="stylesheet">
    <link href="style/all.css" rel="stylesheet">
</head>
<body>

<?php include("./includes/navbar.php"); ?>

<div class="auth-page">
    <main class="auth-main">
        <div class="auth-visual">
            <img src="assets/guy.svg" alt="Bricksy mascot — a Lego figure">
        </div>

        <div class="auth-card">

            <p class="auth-title">Create your account</p>

            <!-- Tab switcher -->
            <div class="tab-switcher" role="tablist">
                <button class="tab-btn <?= $activeTab === 'signup' ? 'active' : '' ?>"
                        id="tab-signup" role="tab"
                        onclick="switchTab('signup')">Sign Up</button>
                <button class="tab-btn <?= $activeTab === 'signin' ? 'active' : '' ?>"
                        id="tab-signin" role="tab"
                        onclick="switchTab('signin')">Log In</button>
            </div>

            <!-- Error banner (shared) -->
            <?php if (!empty($errors)): ?>
            <div class="error-banner">
                <ul>
                    <?php foreach ($errors as $err): ?>
                        <li><?= $err ?></li>
                    <?php endforeach; ?>
                </ul>
            </div>
            <?php endif; ?>

            <!-- ════════════════════════════
                 SIGN UP PANEL
            ════════════════════════════ -->
            <div class="form-panel <?= $activeTab === 'signup' ? 'active' : '' ?>" id="panel-signup" role="tabpanel">
                <form method="POST" id="signup-form" novalidate>
                    <input type="hidden" name="csrf"      value="<?= $csrfToken ?>">
                    <input type="hidden" name="form_type" value="signup">

                    <div class="field">
                        <label for="su-username">Username</label>
                        <input type="text" id="su-username" name="username"
                               placeholder="Enter your username"
                               minlength="8"
                               value="<?= htmlspecialchars($_POST['username'] ?? '') ?>"
                               autocomplete="username" required>
                    </div>

                    <div class="field">
                        <label for="su-email">Email</label>
                        <input type="email" id="su-email" name="email"
                               placeholder="Enter your email"
                               value="<?= htmlspecialchars($_POST['email'] ?? '') ?>"
                               autocomplete="email" required>
                    </div>

                    <div class="field">
                        <label for="su-password">Password <span>( 12 characters )</span></label>
                        <input type="password" id="su-password" name="password"
                               placeholder="Enter your password"
                               autocomplete="new-password" required>
                    </div>

                    <div class="field">
                        <label for="su-confirm">Confirm Password</label>
                        <input type="password" id="su-confirm" name="confirm-password"
                               placeholder="Repeat your password"
                               autocomplete="new-password" required>
                        <div class="pw-match-msg" id="pw-match-msg"></div>
                    </div>

                    <!-- Password requirements -->
                    <div class="pw-requirements" id="pw-requirements">
                        <h6>Password must contain:</h6>
                        <div class="req-item invalid" id="req-letter">Lowercase letter</div>
                        <div class="req-item invalid" id="req-capital">Uppercase letter</div>
                        <div class="req-item invalid" id="req-number">Number</div>
                        <div class="req-item invalid" id="req-special">Special character</div>
                        <div class="req-item invalid" id="req-length">Min 12 characters</div>
                    </div>

                    <!-- Turnstile captcha -->
                    <div class="captcha-wrap">
                        <div class="cf-turnstile"
                             data-sitekey="<?= $_ENV['CLOUDFLARE_TURNSTILE_PUBLIC'] ?>"
                             data-theme="light"
                             data-size="flexible"
                             data-callback="onSignupSuccess">
                        </div>
                    </div>

                    <button type="submit" class="btn-submit" id="su-submit" disabled>
                        Get Started
                    </button>
                </form>
            </div>

            <!-- ════════════════════════════
                 SIGN IN PANEL
            ════════════════════════════ -->
            <div class="form-panel <?= $activeTab === 'signin' ? 'active' : '' ?>" id="panel-signin" role="tabpanel">
                <form method="POST" id="signin-form" novalidate>
                    <input type="hidden" name="csrf"      value="<?= $csrfToken ?>">
                    <input type="hidden" name="form_type" value="signin">

                    <div class="field">
                        <label for="si-userid">Email</label>
                        <input type="text" id="si-userid" name="userid"
                               placeholder="Enter your email"
                               autocomplete="username" required>
                    </div>

                    <div class="field">
                        <label for="si-password">Password <span>( 12 characters )</span></label>
                        <input type="password" id="si-password" name="password"
                               placeholder="Enter your password"
                               autocomplete="current-password" required>
                        <a href="password_forgotten.php" class="forgot-link">Forgot password ? <strong>click here</strong></a>
                    </div>

                    <!-- Turnstile captcha -->
                    <div class="captcha-wrap">
                        <div class="cf-turnstile"
                             data-sitekey="<?= $_ENV['CLOUDFLARE_TURNSTILE_PUBLIC'] ?>"
                             data-theme="light"
                             data-size="flexible"
                             data-callback="onSigninSuccess">
                        </div>
                    </div>

                    <button type="submit" class="btn-submit" id="si-submit">
                        Get Started
                    </button>
                </form>
            </div>

        </div><!-- /auth-card -->
    </main>
</div>

<script>
    /* ══════════════════════════════════════════
       TAB SWITCHING
    ══════════════════════════════════════════ */
    function switchTab(tab) {
        const panels  = document.querySelectorAll('.form-panel');
        const tabBtns = document.querySelectorAll('.tab-btn');

        panels.forEach(p => p.classList.remove('active', 'entering'));
        tabBtns.forEach(b => b.classList.remove('active'));

        const target = document.getElementById('panel-' + tab);
        target.classList.add('active', 'entering');
        document.getElementById('tab-' + tab).classList.add('active');
    }

    /* ══════════════════════════════════════════
       CAPTCHA CALLBACKS
    ══════════════════════════════════════════ */
    let signupCaptcha = false;
    let signinCaptcha = false;

    window.onSignupSuccess = () => { signupCaptcha = true;  validateSignup(); };
    window.onSigninSuccess = () => { signinCaptcha = true; };

    /* ══════════════════════════════════════════
       SIGN UP — REAL-TIME VALIDATION
    ══════════════════════════════════════════ */
    const suPassword = document.getElementById('su-password');
    const suConfirm  = document.getElementById('su-confirm');
    const suUsername = document.getElementById('su-username');
    const suEmail    = document.getElementById('su-email');
    const suSubmit   = document.getElementById('su-submit');
    const pwMatchMsg = document.getElementById('pw-match-msg');

    const reqLetter  = document.getElementById('req-letter');
    const reqCapital = document.getElementById('req-capital');
    const reqNumber  = document.getElementById('req-number');
    const reqSpecial = document.getElementById('req-special');
    const reqLength  = document.getElementById('req-length');

    function updateReq(el, ok, label) {
        el.classList.toggle('success', ok);
        el.classList.toggle('invalid', !ok);
        el.textContent = (ok ? '✓ ' : '✗ ') + label;
    }

    function validateSignup() {
        const pw  = suPassword.value;
        const cf  = suConfirm.value;
        const usr = suUsername.value.trim();

        // Requirements
        updateReq(reqLetter,  /[a-z]/.test(pw),                      'Lowercase letter');
        updateReq(reqCapital, /[A-Z]/.test(pw),                      'Uppercase letter');
        updateReq(reqNumber,  /[0-9]/.test(pw),                      'Number');
        updateReq(reqSpecial, /[!@#$%^&*(),.?":{}|<>]/.test(pw),    'Special character');
        updateReq(reqLength,  pw.length >= 12,                        'Min 12 characters');

        // Confirm match
        if (cf) {
            if (pw === cf) {
                pwMatchMsg.textContent = 'Passwords match';
                pwMatchMsg.className   = 'pw-match-msg ok';
            } else {
                pwMatchMsg.textContent = 'Passwords do not match';
                pwMatchMsg.className   = 'pw-match-msg err';
            }
        } else {
            pwMatchMsg.textContent = '';
            pwMatchMsg.className   = 'pw-match-msg';
        }

        // Enable submit
        const allReqOk = /[a-z]/.test(pw) && /[A-Z]/.test(pw) && /[0-9]/.test(pw)
                      && /[!@#$%^&*(),.?":{}|<>]/.test(pw) && pw.length >= 12;

        suSubmit.disabled = !(usr.length >= 8 && suEmail.value && pw && cf === pw && allReqOk && signupCaptcha);
    }

    suPassword.addEventListener('input', validateSignup);
    suConfirm.addEventListener('input',  validateSignup);
    suUsername.addEventListener('input', validateSignup);
    suEmail.addEventListener('input',    validateSignup);

    /* ══════════════════════════════════════════
       INIT — restore correct tab on page load
       (in case of POST error redirect)
    ══════════════════════════════════════════ */
    (function init() {
        const active = '<?= $activeTab ?>';
        if (active) switchTab(active);
    })();
</script>
</body>
</html>