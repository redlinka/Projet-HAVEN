<?php
define('BASE_URL', '/img2brick_final');
// Load Composer dependencies for PHPMailer
require __DIR__ . '/../vendor/autoload.php';

use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception;

// Load configuration credentials from .env file to avoid hardcoding secrets
$envPath = __DIR__ . '/.env';
if (!is_file($envPath)) {
    $envPath = __DIR__ . '/../.env';
}
$_ENV = parse_ini_file($envPath) ?: [];
$user = $_ENV["USER"] ?? '';
$pass = $_ENV["PASS"] ?? '';
$db = $_ENV["DB"] ?? '';
$host = $_ENV["HOST"] ?? '';
$port = $_ENV["PORT"] ?? '3306';

// Specific local settings here
if (isset($_ENV['LOCAL_DEVELOPMENT']) && ($_ENV['LOCAL_DEVELOPMENT'] == "1" || $_ENV['LOCAL_DEVELOPMENT'] == "true")) {
    date_default_timezone_set('Europe/Paris');
}

// Establish database connection using PDO
try {
    $cnx = new PDO(
        "mysql:host=$host;port=$port;dbname=$db;charset=utf8mb4",
        $user,
        $pass,
        [
            PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES   => false,
        ]
    );
} catch (PDOException $e) {
    // Hide internal error details in production for security
    error_log("Connection Error: " . $e->getMessage());
    http_response_code(500);
    die("Internal error. Please try again later.");
}

/* Send emails using SMTP via PHPMailer.
 * Input: Recipient email, Subject, HTML Body, Array of file paths for attachments.
 * Output: Returns true on success, or error message string on failure. */
function sendMail($to, $subject, $body, $attachments = [])
{
    $mail = new PHPMailer(true);

    try {
        // Configure SMTP settings for Gmail service
        $mail->isSMTP();
        $mail->Host = 'smtp.gmail.com';
        $mail->SMTPAuth = true;
        $mail->Username = $_ENV['SMTP_USER'];
        $mail->Password = $_ENV['SMTP_PASS'];
        $mail->SMTPSecure = PHPMailer::ENCRYPTION_STARTTLS;
        $mail->Port = 587;

        // Set email headers and content
        $mail->setFrom($_ENV['SMTP_USER'], 'Bricksy');
        $mail->addAddress($to);

        $mail->isHTML(true); // Enable HTML rendering
        $mail->Subject = $subject;
        $mail->Body = $body;

        // Attach files if provided in the array
        foreach ($attachments as $filePath) {
            if (file_exists($filePath)) {
                $mail->addAttachment($filePath);
            }
        }

        $mail->send();
        return true;
    } catch (Exception $e) {
        return $mail->ErrorInfo;
    }
}

/* Verify Cloudflare Turnstile captcha token.
 * Logic: Sends a POST request to Cloudflare's verification API with the secret key and user token.
 * Output: Returns associative array with 'success' boolean. */
function validateTurnstile()
{
    if (isset($_ENV['LOCAL_DEVELOPMENT']) && ($_ENV['LOCAL_DEVELOPMENT'] == "1" || $_ENV['LOCAL_DEVELOPMENT'] == "true")) {
        return ['success' => true];
    }

    $secret = $_ENV['CLOUDFLARE_TURNSTILE_SECRET'];
    $token = $_POST['cf-turnstile-response'] ?? '';
    $remoteip = $_SERVER['HTTP_CF_CONNECTING_IP'] ?? $_SERVER['HTTP_X_FORWARDED_FOR'] ?? $_SERVER['REMOTE_ADDR'];

    $url = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';
    $data = ['secret' => $secret, 'response' => $token];
    if ($remoteip) {
        $data['remoteip'] = $remoteip;
    }

    // Configure HTTP context for the POST request
    $options = [
        'http' => [
            'header' => "Content-type: application/x-www-form-urlencoded\r\n",
            'method' => 'POST',
            'content' => http_build_query($data),
            'timeout' => 5
        ]
    ];
    $context = stream_context_create($options);
    $response = file_get_contents($url, false, $context);

    if ($response === FALSE) {
        return ['success' => false, 'error-codes' => ['internal-error']];
    }
    return json_decode($response, true);
}

/* Retrieve or generate the current CSRF token.
 * Purpose: Ensures a token exists in the session for form rendering. */
function csrf_get()
{
    if (empty($_SESSION['csrf_token'])) {
        $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
    }
    return $_SESSION['csrf_token'];
}

/* Validate a POSTed token against the session token.
 * Method: Uses hash_equals to prevent timing attacks during comparison. */
function csrf_validate($tokenFromPost)
{
    if (!isset($_SESSION['csrf_token']) || !is_string($tokenFromPost)) {
        return false;
    }
    return hash_equals($_SESSION['csrf_token'], $tokenFromPost);
}

/* Regenerate the CSRF token.
 * Usage: Call this after successful sensitive actions (login, password change) to prevent replay attacks. */
function csrf_rotate()
{
    $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
}

/* Translate PHP file upload error codes into human-readable messages. */
function error_message($code)
{
    switch ($code) {
        case UPLOAD_ERR_INI_SIZE:
            return 'File too large (server limit).';
        case UPLOAD_ERR_FORM_SIZE:
            return 'File too large (form limit).';
        case UPLOAD_ERR_PARTIAL:
            return 'Upload was interrupted. Please retry.';
        case UPLOAD_ERR_NO_FILE:
            return 'No file uploaded.';
        default:
            return 'Upload failed.';
    }
}

/* Recursively delete an image tree (Children first, then Parent).
 * Input: Database connection, Image ID, Directory paths, Flag to keep the root node.
 * Logic:
 * 1. Find all children of the current image.
 * 2. Recursively call this function on children (Depth-First Search).
 * 3. Delete associated temporary files (thumbnails, precursors).
 * 4. Delete the current image file and text file from disk.
 * 5. Remove the record from the database. */
function isImageLinkedToOrder($cnx, $imageId): bool
{
    // Vérifie si l'image est liée à une commande payée (via TILLING → contain → ORDER_BILL)
    $stmt = $cnx->prepare("
        SELECT COUNT(*) FROM TILLING t
        JOIN contain c ON c.pavage_id = t.pavage_id
        JOIN ORDER_BILL o ON o.order_id = c.order_id
        WHERE t.image_id = ? AND o.created_at IS NOT NULL
    ");
    $stmt->execute([$imageId]);
    return (int)$stmt->fetchColumn() > 0;
}

function deleteDescendants($cnx, $imageId, $imgDir, $tilingDir, $keepSelf = false)
{
    // Stop if no ID provided
    if (!$imageId) return;

    // Fetch children IDs to recurse
    $stmt = $cnx->prepare("SELECT image_id, path FROM IMAGE WHERE img_parent = ?");
    $stmt->execute([$imageId]);
    $children = $stmt->fetchAll(PDO::FETCH_ASSOC);

    foreach ($children as $child) {
        // Recurse into children to ensure bottom-up deletion
        deleteDescendants($cnx, $child['image_id'], $imgDir, $tilingDir, false);
    }

    // Clean specific temp files associated with this image ID (e.g., algorithmic variations)
    $tempFiles = glob($imgDir . '/temp_*_' . $imageId . '.png');
    if ($tempFiles) {
        foreach ($tempFiles as $temp) {
            if (file_exists($temp)) unlink($temp);
        }
    }

    // Delete the node itself unless requested otherwise (e.g., when updating crop but keeping the ID)
    if (!$keepSelf) {

        // Ne jamais supprimer une image liée à une commande payée
        if (isImageLinkedToOrder($cnx, $imageId)) {
            return;
        }

        // Fetch filename to delete physical files
        $stmtMe = $cnx->prepare("SELECT path FROM IMAGE WHERE image_id = ?");
        $stmtMe->execute([$imageId]);
        $myFile = $stmtMe->fetchColumn();

        if ($myFile) {
            // Remove main image file
            $imgPath = $imgDir . '/' . $myFile;
            if (file_exists($imgPath)) {
                unlink($imgPath);
            }

            // Remove associated brick list (text file)
            $baseName = pathinfo($myFile, PATHINFO_FILENAME);
            $tilingPath = $tilingDir . '/' . $baseName . '.txt';

            if (file_exists($tilingPath)) {
                unlink($tilingPath);
            }
        }

        // Delete record from Database
        $cnx->prepare("DELETE FROM IMAGE WHERE image_id = ?")->execute([$imageId]);
    }
}

/* Perform garbage collection on storage directories.
 * Logic:
 * A. Delete temporary processing files older than 30 minutes.
 * B. Delete abandoned guest sessions (Images with no User ID) older than 1 hour. */
function cleanStorage($cnx, $imgDir, $brickDir)
{
    $now = time();

    // Clean Images Directory: Remove stale temp images
    $tempImgs = glob($imgDir . '/temp_*');
    if ($tempImgs) {
        foreach ($tempImgs as $file) {
            if (is_file($file) && ($now - filemtime($file) >= 1800)) {
                unlink($file);
            }
        }
    }
    // Clean Abandoned Guest Data
    // Find root images (no parent) belonging to guests (no user_id)
    try {
        $stmt = $cnx->query("
    	SELECT i.image_id, i.path 
    	FROM IMAGE i
    	WHERE i.user_id IS NULL 
    	AND i.img_parent IS NULL
    	AND i.image_id NOT IN (
        SELECT DISTINCT i2.img_parent 
        FROM IMAGE i2
        JOIN TILLING t ON t.image_id = i2.image_id
        JOIN contain c ON c.pavage_id = t.pavage_id
        JOIN ORDER_BILL o ON o.order_id = c.order_id
        WHERE o.created_at IS NOT NULL
        AND i2.img_parent IS NOT NULL
    	)
	"); //
        while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
            $filePath = $imgDir . '/' . $row['path'];
            $baseName = pathinfo($row['path'], PATHINFO_FILENAME);
            $brickPath = $brickDir . '/' . $baseName . '.txt';

            // If file is older than 1 hour, assume session abandoned
            if (file_exists($filePath) && ($now - filemtime($filePath) > 3600)) {

                // Remove brick file if present
                if (file_exists($brickPath)) {
                    unlink($brickPath);
                }

                // Recursively delete the entire tree (Image + Children + DB Rows)
                deleteDescendants($cnx, $row['image_id'], $imgDir, $brickDir);
            }
        }
    } catch (Exception $e) {
    }
}

function addLog($cnx, $agent, $logAction, $logObject)
{

    //ex: addLog($cnx, "Client", "Create account", "Account");

    if (isset($_SESSION['userId'])) {

        if ($logObject === "pavage") {
            $logObject = $_SESSION['pavage_txt'];
        } else if ($logObject === "image") {
            $logObject = $_SESSION["image_name"];
        }
        try {
            $cnx->beginTransaction();
            $stmt = $cnx->prepare("INSERT INTO `LOG` (agent, log_action, log_object, log_date, user_id) VALUES (?, ?, ?, NOW(), ?)");
            $stmt->execute([$agent, $logAction, $logObject, $_SESSION["userId"]]);
            $cnx->commit();
        } catch (PDOException $e) {
            $cnx->rollback();
        }
    }
}

function getTilingStats($file)
{
    $result = [];
    $filePath = __DIR__ . "/../users/tilings/" . $file;
    if (!file_exists($filePath)) {
        return ['price' => 0, 'quality' => 0, 'error' => true];
    }

    $ligne = fgets(fopen($filePath, 'r'));
    if ($ligne !== false) {
        $ligne = trim($ligne);
        $valeurs = explode(' ', $ligne);

        if (count($valeurs) >= 2) {
            $coeff = str_contains($file, 'pixel_perfect') ? 3.93 : 7.4;
            $result = [
                'price'   => (int)round((float)$valeurs[0] * $coeff + 2500),
                'quality' => $valeurs[1]
            ];
        }
    }

    return $result;
}

function getOriginalImage($cnx, $imageId)
{
    if (!$imageId) {
        return null;
    }

    try {
        $stmt = $cnx->prepare("
            SELECT image_id, filename, img_parent
            FROM IMAGE
            WHERE image_id = ?
        ");
        $stmt->execute([$imageId]);

        $image = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$image) {
            return null;
        }

        if ($image['img_parent'] === null) {
            return $image;
        }

        return getOriginalImage($cnx, $image['img_parent']);
    } catch (PDOException $e) {
        return null;
    }
}

/**
 * Auto-login functionality for Android app persistence
 * Checks if android_token cookie exists and auto-creates session if no active session
 * Called automatically when cnx.php is included (after session_start)
 * 
 * Flow:
 * 1. If user already has active session, skip this
 * 2. If android_token cookie exists, validate it in USER table
 * 3. If valid, create session automatically (app just restarted)
 * 4. If invalid/expired, do nothing (user needs to login again)
 */
function attemptAutoLoginFromAndroidToken($cnx)
{
    // Only process if no active session
    if (isset($_SESSION['userId'])) {
        return; // Already logged in, skip auto-login
    }

    // Check if android_token cookie exists
    if (!isset($_COOKIE['android_token'])) {
        return; // No token, normal login required
    }

    try {
        $androidToken = $_COOKIE['android_token'];
        
        // Validate token exists in USER table
        $stmt = $cnx->prepare("SELECT user_id, username, email FROM USER WHERE android_token = ? LIMIT 1");
        $stmt->execute([$androidToken]);
        $user = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$user) {
            // Token invalid/not found, clear the cookie
            setcookie('android_token', '', [
                'expires' => time() - 3600,
                'path' => '/',
                'secure' => (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') || $_SERVER['SERVER_PORT'] == 443,
                'httponly' => true,
                'samesite' => 'Lax'
            ]);
            return; // Auto-login failed, continue to normal page
        }

        // Create session automatically if token is valid 
        session_regenerate_id(true);
        $_SESSION['userId'] = $user['user_id'];
        $_SESSION['username'] = $user['username'];
        $_SESSION['email'] = $user['email'];
        
        // Log this auto-login event
        addLog($cnx, "USER", "AUTO_LOGIN", "android_token");
        
    } catch (PDOException $e) {
        // Database error, skip auto-login silently
        error_log("Auto-login error: " . $e->getMessage());
    }
}

// Attempt auto-login if session was started and cnx.php is included
if (session_status() === PHP_SESSION_ACTIVE) {
    attemptAutoLoginFromAndroidToken($cnx);
}