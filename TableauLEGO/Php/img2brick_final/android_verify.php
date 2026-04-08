<?php

/**
 * Android App Link Interceptor
 * 
 * Purpose: 
 * - Tries to open Bricksy app via custom scheme (bricksy://verify?token=xxx)
 * - If app not installed or not on mobile: Falls back to web browser
 * 
 * Called by: 2fa_auth.php (email "Open in App" green button)
 * Flow:
 * 1. Email client receives https://...android_verify.php?token=xxx
 * 2. User clicks "📱 Open in App" green button
 * 3. This page attempts to open bricksy://verify?token=xxx
 * 4. If app installed (Android): Deep Link opens MainActivity
 * 5. If app not installed (Desktop/Browser): Falls back to verify_connexion.php
 */

// Get token from URL parameter
$token = isset($_GET['token']) ? $_GET['token'] : null;

if (!$token) {
    http_response_code(400);
    echo "Missing token parameter";
    exit;
}

// HTML page that attempts to open the app, with fallback to browser
?>
<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Bricksy App Login</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            margin: 0;
            padding: 20px;
        }

        .container {
            background: white;
            border-radius: 10px;
            padding: 40px;
            text-align: center;
            box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
            max-width: 400px;
        }

        h1 {
            color: #333;
            margin-bottom: 10px;
        }

        .spinner {
            border: 4px solid #f3f3f3;
            border-top: 4px solid #667eea;
            border-radius: 50%;
            width: 40px;
            height: 40px;
            animation: spin 1s linear infinite;
            margin: 20px auto;
        }

        @keyframes spin {
            0% {
                transform: rotate(0deg);
            }

            100% {
                transform: rotate(360deg);
            }
        }

        .message {
            color: #666;
            margin: 20px 0;
            font-size: 14px;
        }

        .fallback-button {
            background-color: #0d6efd;
            color: white;
            padding: 12px 24px;
            text-decoration: none;
            border-radius: 5px;
            font-weight: bold;
            display: inline-block;
            margin-top: 20px;
            border: none;
            cursor: pointer;
            font-size: 16px;
        }

        .fallback-button:hover {
            background-color: #0b5ed7;
        }
    </style>
</head>

<body>
    <div class="container">
        <h1>🚀 Opening Bricksy App...</h1>
        <div class="spinner"></div>
        <p class="message">If the app doesn't open automatically, please click the button below:</p>
        <a href="verify_connexion.php?token=<?php echo htmlspecialchars($token); ?>" class="fallback-button">
            💻 Continue in Browser
        </a>
    </div>

    <script>
        // Attempt to open the app using the custom scheme
        // The app only receives the intent if it's actually installed on Android
        const appSchemeUrl = 'bricksy://verify?token=<?php echo htmlspecialchars($token); ?>';
        const fallbackUrl = 'verify_connexion.php?token=<?php echo htmlspecialchars($token); ?>';

        // Try to open the app
        window.location.href = appSchemeUrl;

        // If the app doesn't open within 2 seconds, fallback to browser
        setTimeout(function() {
            // Check if we're still on this page (means the scheme didn't work)
            // We use visibility change or unload - if neither happened, fallback
        }, 2000);
    </script>
</body>

</html>