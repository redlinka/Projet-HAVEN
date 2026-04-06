<?php
session_start();
global $cnx;
include("./config/cnx.php");

// If not logged in, redirect to login
if (empty($_SESSION['userId'])) {
    header("Location: auth.php");
    exit;
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Connected — Bricksy</title>

    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600&display=swap" rel="stylesheet">
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
    <link rel="stylesheet" href="style/creation_mail.css">
    <link rel="stylesheet" href="style/all.css">
    <style>
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
        .success-icon {
            width: 80px;
            height: 80px;
            margin: 0 auto 24px;
            background: #d4edda;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            color: #155724;
        }
        .success-icon svg {
            width: 50px;
            height: 50px;
        }
    </style>
</head>
<body>
<?php include("./includes/navbar.php"); ?>

<div class="mail-page">
    <div class="mail-card">
        <!-- Success Icon -->
        <div class="success-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
                 stroke-linecap="round" stroke-linejoin="round">
                <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
        </div>

        <!-- Title -->
        <h1 class="mail-title" style="color: #155724;">You're connected!</h1>

        <!-- Message -->
        <p class="mail-subtitle">
            Your login was successful. <br>
            <strong>Go back to the other tab</strong> to continue.
        </p>

        <!-- Alert -->
        <div class="alert alert-info" style="margin-top: 20px;">
            <strong>Tip:</strong> The page where you were waiting should have already updated automatically.
        </div>

        <div class="mail-divider"></div>

    </div>
</div>
</body>
</html>
