<?php

/**
 * test_loyalty_api.php
 * Endpoint de test pour simuler l'appel Android
 * 
 * Quand connecté au site :
 * - Récupère votre android_token depuis la base de données
 * - Appelle check_loyalty.php exactement comme le ferait l'app Android
 * - Affiche le résultat (JSON)
 */

session_start();
header('Content-Type: application/json');

include __DIR__ . '/config/cnx.php';

// Vérifier que l'utilisateur est connecté
if (empty($_SESSION['userId'])) {
    http_response_code(401);
    echo json_encode(['error' => 'Authentification requise', 'detail' => 'Vous devez être connecté']);
    exit;
}

$userId = (int) $_SESSION['userId'];

// Récupérer le android_token de l'utilisateur connecté
$stmt = $cnx->prepare("SELECT android_token FROM USER WHERE user_id = :uid LIMIT 1");
$stmt->execute(['uid' => $userId]);
$user = $stmt->fetch(PDO::FETCH_ASSOC);

if (!$user || empty($user['android_token'])) {
    http_response_code(404);
    echo json_encode([
        'error' => 'Pas de token Android',
        'detail' => 'Votre compte n\'a pas de token Android enregistré'
    ]);
    exit;
}

$androidToken = $user['android_token'];

// ===== APPELER check_loyalty.php =====
// Recréer la logique de check_loyalty.php

// 1. Récupérer l'utilisateur via le token (comme dans check_loyalty.php)
$stmt = $cnx->prepare("SELECT user_id FROM USER WHERE android_token = :token LIMIT 1");
$stmt->execute(['token' => $androidToken]);
$userFromToken = $stmt->fetch(PDO::FETCH_ASSOC);

if (!$userFromToken) {
    http_response_code(404);
    echo json_encode(['error' => 'Token invalide']);
    exit;
}

$loyaltyUserId = (int) $userFromToken['user_id'];

// 2. Vérifier la dernière commande
$stmt = $cnx->prepare("
    SELECT MAX(created_at) AS last_order
    FROM ORDER_BILL
    WHERE user_id = :uid AND created_at IS NOT NULL
");
$stmt->execute(['uid' => $loyaltyUserId]);
$row = $stmt->fetch(PDO::FETCH_ASSOC);

$lastOrder = $row['last_order'] ?? null;
$daysSinceOrder = $lastOrder
    ? (int) ((time() - strtotime($lastOrder)) / 86400)
    : 999;

$INACTIVITY_DAYS = 14;

// 3. Générer la réponse (même logique que check_loyalty.php)
$result = [
    'test' => true,
    'user_id' => $loyaltyUserId,
    'android_token' => substr($androidToken, 0, 10) . '...',
    'last_order' => $lastOrder,
    'days_since_order' => $daysSinceOrder,
    'inactivity_threshold' => $INACTIVITY_DAYS,
    'show' => false,
    'message' => null
];

if ($daysSinceOrder >= $INACTIVITY_DAYS) {
    $result['show'] = true;
    $result['message'] = $daysSinceOrder >= 30
        ? "Vous n'avez pas commandé depuis plus d'un mois. Revenez créer votre prochain tableau LEGO !"
        : "Ça fait " . $daysSinceOrder . " jours sans commande. Et si vous créiez un nouveau tableau ?";
}

echo json_encode($result, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);