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
$_SESSION['coupon_applied']     = true;
$_SESSION['coupon_final_total'] = $finalTotal;
$_SESSION['coupon_user_id']     = $userId;

$formatted = number_format($finalTotal, 2, '.', ' ') . ' EUR';

echo json_encode([
    'success'             => true,
    'new_total'           => $finalTotal,
    'new_total_formatted' => $formatted,
]);
