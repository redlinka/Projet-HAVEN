<?php
/**
 * API Endpoint: Check if user is logged in
 * Used by connexion_mail.php for real-time polling to detect when user clicks the magic link
 * Returns JSON: {'loggedIn': bool, 'username': string, 'redirectUrl': string}
 */
session_start();
header('Content-Type: application/json');

$response = [
    'loggedIn' => false,
    'username' => null,
    'redirectUrl' => null
];

// Check if user is authenticated
if (isset($_SESSION['userId']) && !empty($_SESSION['userId'])) {
    $response['loggedIn'] = true;
    $response['username'] = $_SESSION['username'] ?? 'User';
    // Redirect to homepage or referrer page
    $response['redirectUrl'] = $_SESSION['redirect_after_login'] ?? 'index.php';
    unset($_SESSION['redirect_after_login']);
}

echo json_encode($response);
