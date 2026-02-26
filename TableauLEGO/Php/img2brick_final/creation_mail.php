<?php
session_start();
global $cnx;
include("./config/cnx.php");

$message = '';
$status  = 'neutral';
$errors  = [];

$userEmail = $_SESSION['unverified_email'] ?? $_SESSION['email'] ?? null;

// Redirect if session invalid
if (!$_SESSION['tempId'] || !$userEmail) {
    header('Location: creation.php');
    exit;
}

// Set initial success message on first load
if (isset($_SESSION['email_sent'])) {
    $status  = 'success';
    $message = 'A verification email has been sent. It will be valid for 1 minute.';
    unset($_SESSION['email_sent']);
}

if ($_SERVER["REQUEST_METHOD"] == "POST") {

    if (!csrf_validate($_POST['csrf'] ?? null)) {
        http_response_code(400);
        die('Invalid form submission.');
    }

    $lastSendTime    = $_SESSION['last_email_sent'] ?? 0;
    $currentTime     = time();
    $cooldownSeconds = 10;

    if (($currentTime - $lastSendTime) < $cooldownSeconds) {
        $remainingTime = $cooldownSeconds - ($currentTime - $lastSendTime);
        $status   = 'error';
        $errors[] = "Please wait {$remainingTime} seconds before resending.";
    } else {
        try {
            $token     = bin2hex(random_bytes(32));
            $expire_at = date('Y-m-d H:i:s', time() + 60);

            $cleanup = $cnx->prepare("DELETE FROM 2FA WHERE user_id = ?");
            $cleanup->execute([$_SESSION['tempId']]);

            $ins = $cnx->prepare("INSERT INTO 2FA (user_id, verification_token, token_expire_at) VALUES (?, ?, ?)");
            $ins->execute([$_SESSION['tempId'], $token, $expire_at]);

            $protocol = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off' || $_SERVER['SERVER_PORT'] == 443) ? "https://" : "http://";
            $domain   = $_SERVER['HTTP_HOST'];
            $link     = $protocol . $domain . dirname($_SERVER['PHP_SELF']) . '/verify_account.php?token=' . $token;

            $emailBody = "
                <div style='font-family: Arial, sans-serif; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px; max-width: 600px;'>
                    <h2 style='color: #8B5E3C;'>Welcome to Bricksy! 🧱</h2>
                    <p>Thanks for joining. To activate your account and start building, please click the button below:</p>
                    <p style='text-align: center;'>
                        <a href='{$link}' style='display: inline-block; background-color: #8B5E3C; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold;'>Verify My Account</a>
                    </p>
                    <p style='color: #6c757d; font-size: 12px; margin-top: 20px;'>If the button doesn't work, copy this link: {$link}</p>
                </div>";

            sendMail($userEmail, 'Welcome to Bricksy - Verify your account', $emailBody);

            $_SESSION['last_email_sent'] = $currentTime;
            $status  = 'success';
            $message = 'Verification email has been resent.';

            csrf_rotate();
        } catch (PDOException $e) {
            $status   = 'error';
            $errors[] = 'Database error. Please try again.';
        } catch (Exception $e) {
            $status   = 'error';
            $errors[] = 'Error creating token.';
        }
    }
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Check your inbox — Bricksy</title>

    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600&display=swap" rel="stylesheet">
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
    <link rel="stylesheet" href="style/creation_mail.css">
    <link rel="stylesheet" href="style/all.css">
</head>
<body>

<?php include("./includes/navbar.php"); ?>

<div class="mail-page">
    <div class="mail-card">

        <!-- Icon -->
        <div class="mail-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"
                 stroke-linecap="round" stroke-linejoin="round">
                <rect x="2" y="4" width="20" height="16" rx="2"/>
                <polyline points="2,4 12,13 22,4"/>
            </svg>
        </div>

        <!-- Title -->
        <h1 class="mail-title">Check your inbox</h1>

        <!-- Subtitle -->
        <p class="mail-subtitle">
            We sent a verification link to<br>
            <strong><?= htmlspecialchars($userEmail) ?></strong>
        </p>

        <!-- Success alert -->
        <?php if ($status === 'success'): ?>
        <div class="alert alert-success">
            ✓ <?= htmlspecialchars($message) ?>
        </div>
        <?php endif; ?>

        <!-- Error alert -->
        <?php if (!empty($errors)): ?>
        <div class="alert alert-error">
            <ul>
                <?php foreach ($errors as $error): ?>
                    <li><?= htmlspecialchars($error) ?></li>
                <?php endforeach; ?>
            </ul>
        </div>
        <?php endif; ?>

        <!-- Resend form — original logic preserved -->
        <form action="" method="POST" style="width:100%;">
            <input type="hidden" name="csrf" value="<?= htmlspecialchars(csrf_get(), ENT_QUOTES, 'UTF-8') ?>">
            <button type="submit" name="resend" class="btn-resend">
                Resend Verification Email
            </button>
        </form>

        <div class="mail-divider"></div>

        <!-- Back link -->
        <a href="auth.php" class="btn-back">← Back to Login</a>

    </div>
</div>

</body>
</html>