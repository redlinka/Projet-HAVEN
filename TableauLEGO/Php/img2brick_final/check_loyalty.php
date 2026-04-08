<?php
/**
 * api/check_loyalty.php
 * Appelé quotidiennement par LoyaltyWorker.
 * Reçoit android_token, retourne si une notification de fidélisation doit s'afficher.
 */

header('Content-Type: application/json');

include __DIR__ . '/../config/cnx.php';

$body = json_decode(file_get_contents('php://input'), true);
$token = trim($body['android_token'] ?? '');

if (empty($token)) {
    echo json_encode(['show' => false]);
    exit;
}

// Récupérer l'utilisateur via le token
$stmt = $cnx->prepare("SELECT user_id FROM USER WHERE android_token = :token LIMIT 1");
$stmt->execute(['token' => $token]);
$user = $stmt->fetch(PDO::FETCH_ASSOC);

if (!$user) {
    echo json_encode(['show' => false]);
    exit;
}

$userId = (int) $user['user_id'];

// Vérifier la dernière commande
$stmt = $cnx->prepare("
    SELECT MAX(created_at) AS last_order
    FROM ORDER_BILL
    WHERE user_id = :uid AND created_at IS NOT NULL
");
$stmt->execute(['uid' => $userId]);
$row = $stmt->fetch(PDO::FETCH_ASSOC);

$lastOrder = $row['last_order'] ?? null;
$daysSinceOrder = $lastOrder
    ? (int) ((time() - strtotime($lastOrder)) / 86400)
    : 999;

$INACTIVITY_DAYS = 14;

if ($daysSinceOrder >= $INACTIVITY_DAYS) {
    $message = $daysSinceOrder >= 30
        ? "Vous n'avez pas commandé depuis plus d'un mois. Revenez créer votre prochain tableau LEGO !"
        : "Ça fait " . $daysSinceOrder . " jours sans commande. Et si vous créiez un nouveau tableau ?";

    echo json_encode(['show' => true, 'message' => $message]);
    exit;
}

echo json_encode(['show' => false]);