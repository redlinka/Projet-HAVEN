<?php session_start(); ?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Check Your Email — Bricksy</title>

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
                <!-- Small lock badge -->
                <circle cx="18" cy="17" r="0" fill="none"/>
            </svg>
        </div>

        <!-- Title -->
        <h1 class="mail-title">Check your inbox</h1>

        <!-- Subtitle -->
        <p class="mail-subtitle">
            We sent a secure login link to your email address.<br>
            Click the link to complete your login.
        </p>

        <!-- Info notice -->
        <div class="alert alert-success">
            ✓ The link expires in <strong>1 minute</strong>. Check your spam folder if you don't see it.
        </div>

        <div class="mail-divider"></div>

        <!-- Back link -->
        <a href="auth.php" class="btn-back">← Back to Login</a>

    </div>
</div>
</body>
</html>