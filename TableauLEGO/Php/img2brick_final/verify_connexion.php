<?php
// verify the connection of a verified account
session_start();
global $cnx;
include("./config/cnx.php");
require_once __DIR__ . '/includes/i18n.php';
require_once __DIR__ . '/includes/process_pending_cart.php';

// Validate input Ensure token presence
if (!isset($_GET['token'])) {
    http_response_code(400);
    die(tr('verify_connexion.no_token', 'No token provided.'));
}

try {
    // Query token Verify validity and expiration
    $stmt = $cnx->prepare("SELECT t.*, u.username, u.email, u.user_id
                               FROM 2FA t
                               JOIN USER u ON t.user_id = u.user_id
                               WHERE t.verification_token = ?
                               LIMIT 1");
    $stmt->execute([$_GET['token']]);
    $result = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$result) {
        http_response_code(400);
        die(tr('verify_connexion.invalid_link', 'Invalid or expired login link.'));
    }

    // Check expiration (1 minute)
    $now = new DateTime();
    $expiry = new DateTime($result['token_expire_at']);

    if ($now > $expiry) {
        http_response_code(400);
        die(tr('verify_connexion.expired', 'This login link has expired. Please try logging in again.'));
    }

    // --- All checks passed: Log the user in ---

    // persistent android_token generation (never expires in DB)
    $androidToken = bin2hex(random_bytes(32)); // 64-char hex

    // Store android_token in USER table
    $updateStmt = $cnx->prepare("UPDATE USER SET android_token = ? WHERE user_id = ?");
    $updateStmt->execute([$androidToken, $result['user_id']]);

    // Set android_token cookie (30 days for app persistence)
    setcookie('android_token', $androidToken, [
        'expires' => time() + (30 * 24 * 60 * 60),
        'path' => '/',
        'secure' => (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') || $_SERVER['SERVER_PORT'] == 443,
        'httponly' => true,
        'samesite' => 'Lax'
    ]);

    // Delete used 2FA token to prevent reuse
    $cnx->prepare("DELETE FROM `2FA` WHERE verification_token = ? AND user_id = ?")->execute([$_GET['token'], $result['user_id']]);

    // Regenerate session ID Prevent fixation
    session_regenerate_id(true);
    $_SESSION['userId'] = $result['user_id'];
    $_SESSION['username'] = $result['username'];
    $_SESSION['email'] = $result['email'];

    // Link guest images to new session
    // This relies on the user clicking the link in the same browser session
    $guestImages = [
        $_SESSION['step0_image_id'] ?? null,
        $_SESSION['step1_image_id'] ?? null,
        $_SESSION['step2_image_id'] ?? null,
        $_SESSION['step3_image_id'] ?? null,
        $_SESSION['step4_image_id'] ?? null
    ];

    foreach ($guestImages as $imgId) {
        if ($imgId) {
            // Adopt image only if currently orphaned
            $adoptStmt = $cnx->prepare("UPDATE IMAGE SET user_id = ? WHERE image_id = ? AND user_id IS NULL");
            $adoptStmt->execute([$result['user_id'], $imgId]);
        }
    }

    // Rotate CSRF
    processPendingCart($cnx, (int)$result['user_id']);
    csrf_rotate();
    addLog($cnx, "USER", "LOG", "in");
    // Send HTML page with JavaScript bridge (smart detection for Android vs Browser)
    // The JavaScript will attempt to call Android.saveAuthToken() if in Android WebView, otherwise it will redirect to a browser page.
?>
    <!DOCTYPE html>
    <html>

    <head>
        <meta charset="UTF-8">
        <title>Logging in...</title>
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
                color: #0d6efd;
            }

            p {
                color: #666;
            }
        </style>
    </head>

    <body>
        <div class="container">
            <h2>✅ Login Successful!</h2>
            <p>Redirecting you...</p>
        </div>

        <script>
            // console.log("=== LOGIN SCRIPT STARTED ===");
            // console.log("typeof Android:", typeof Android);

            window.addEventListener('load', function() {
                //Notify React App of session change
                const bc = new BroadcastChannel("bricksy_session");
                bc.postMessage({
                    bricksy_id: userId
                });
                bc.close();
                // console.log("=== WINDOW LOAD EVENT ===");
                // console.log("typeof Android:", typeof Android);

                // Check if running in Android WebView with Bridge
                if (typeof Android !== 'undefined' && typeof Android.saveAuthToken !== 'undefined') {
                    console.log("✅ Android bridge FOUND! Calling saveAuthToken()...");

                    // Android app detected: Save token to SharedPreferences
                    try {
                        Android.saveAuthToken(
                            '<?php echo htmlspecialchars($androidToken, ENT_QUOTES, 'UTF-8'); ?>',
                            '<?php echo htmlspecialchars($result['user_id'], ENT_QUOTES, 'UTF-8'); ?>',
                            '<?php echo htmlspecialchars($result['username'], ENT_QUOTES, 'UTF-8'); ?>'
                        );
                        console.log("saveAuthToken() called successfully!");
                    } catch (e) {
                        console.error("Error calling saveAuthToken():", e);
                    }

                    // redirection after short delay to ensure token is saved in Android
                    setTimeout(function() {
                        // console.log("Redirecting to index.php from Android...");
                        window.location.href = 'index.php';
                    }, 500);
                } else {
                    // Redirect to completion page (tells user to go back to other tab)
                    // The polling on 2fa_auth.php will detect the login and auto-redirect
                    // console.log("Android bridge NOT found. Using fallback...");
                    // console.log("Redirecting to verify_connexion_complete.php from Browser...");
                    window.location.href = 'verify_connexion_complete.php';
                }
            });

            // Fallback redirect after 5 seconds if nothing happens
            setTimeout(function() {
                if (typeof Android === 'undefined') {
                    // console.warn("Fallback timeout - redirecting to browser mode");
                    window.location.href = 'verify_connexion_complete.php';
                }
            }, 5000);
        </script>
    </body>

    </html>
<?php
    exit;
} catch (PDOException $e) {
    http_response_code(500);
    die(tr('verify_connexion.db_error', 'Database error. Please try again later.'));
}
