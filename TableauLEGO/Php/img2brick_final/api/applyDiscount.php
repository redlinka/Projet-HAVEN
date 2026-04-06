<?php
session_start();
global $cnx;
include("../config/cnx.php");

header('Content-Type: application/json');

if (!isset($_SESSION['userId'])) {
    echo json_encode(['success' => false, 'error' => 'Not authenticated']);
    exit;
}

$body = json_decode(file_get_contents('php://input'), true);

if (!csrf_validate($body['csrf'] ?? '')) {
    echo json_encode(['success' => false, 'error' => 'Invalid CSRF token']);
    exit;
}

$orderId    = (int)($body['order_id']    ?? 0);
$finalTotal = (float)($body['final_total'] ?? 0);
$userId     = (int)$_SESSION['userId'];

if ($orderId <= 0 || $finalTotal < 0) {
    echo json_encode(['success' => false, 'error' => 'Invalid data']);
    exit;
}

// Vérifie que la commande appartient bien à cet utilisateur
$stmt = $cnx->prepare("SELECT order_id FROM ORDER_BILL WHERE order_id = ? AND user_id = ? AND created_at IS NULL");
$stmt->execute([$orderId, $userId]);
if (!$stmt->fetchColumn()) {
    echo json_encode(['success' => false, 'error' => 'Order not found']);
    exit;
}

// Stocke le total final avec réduction en session pour PayPal
$_SESSION['coupon_final_total'] = $finalTotal;
$_SESSION['coupon_applied']     = true;

// Appelle le serveur Node pour marquer tous les points comme utilisés
$nodeUrl = "https://adam.nachnouchi.com/api-node/use-points";
$ch = curl_init($nodeUrl);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_TIMEOUT, 5);
curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, true);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode(['SQLid' => $userId]));
$nodeResponse = curl_exec($ch);
$nodeCode     = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

if ($nodeCode !== 200) {
    echo json_encode(['success' => false, 'error' => 'Failed to update points on game server']);
    exit;
}

$formatted = number_format($finalTotal, 2, '.', ' ') . ' EUR';

echo json_encode([
    'success'            => true,
    'new_total'          => $finalTotal,
    'new_total_formatted' => $formatted,
]);
