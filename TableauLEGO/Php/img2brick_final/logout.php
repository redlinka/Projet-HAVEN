<?php
session_start();
global $cnx;
include("./config/cnx.php");

addLog($cnx, "USER", "LOG", "out");

// Clear android_token from database if user is logged in
if (isset($_SESSION['userId'])) {
    try {
        $updateStmt = $cnx->prepare("UPDATE USER SET android_token = NULL WHERE user_id = ?");
        $updateStmt->execute([$_SESSION['userId']]);
    } catch (PDOException $e) {
        error_log("Error clearing android_token: " . $e->getMessage());
    }
}

// Clear android_token cookie
setcookie('android_token', '', [
    'expires' => time() - 3600,
    'path' => '/',
    'secure' => (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') || $_SERVER['SERVER_PORT'] == 443,
    'httponly' => true,
    'samesite' => 'Lax'
]);

// Unset specific variable as requested
unset($_SESSION['id_user']);

// destroy the whole session to clear carts/steps too
session_destroy();

// Send HTML page with JavaScript bridge for Android notification
?>
<!DOCTYPE html>
<html>

<head>
    <meta charset="UTF-8">
    <title>Logging out...</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            text-align: center;
            padding: 50px;
            background: #f5f5f5;
        }

        .container {
            background: white;
            padding: 40px;
            border-radius: 8px;
            max-width: 600px;
            margin: 0 auto;
        }

        h2 {
            color: #28a745;
        }

        p {
            color: #666;
        }
    </style>
</head>

<body>
    <div class="container">
        <h2>✅ Logged Out</h2>
        <p>You have been logged out successfully...</p>
    </div>

    <script>
        window.addEventListener('load', function() {
            // Check if running in Android WebView with Bridge
            if (typeof Android !== 'undefined' && typeof Android.clearAuthData !== 'undefined') {
                // Android app detected: Clear stored auth token from SharedPreferences
                Android.clearAuthData();
            }
            // Redirect after a short delay
            setTimeout(function() {
                window.location.href = 'index.php';
            }, 500);
        });

        // Fallback redirect after 2 seconds
        setTimeout(function() {
            window.location.href = 'index.php';
        }, 2000);
    </script>
</body>

</html>