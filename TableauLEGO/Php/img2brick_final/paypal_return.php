<?php

/**
 * paypal_return.php
 * ─────────────────────────────────────────────────────────────────
 * PayPal redirige ici après que l'utilisateur a approuvé le paiement.
 * Ce script capture le paiement via l'API PayPal Orders v2,
 * finalise la commande en BDD, puis redirige vers order_completed.php.
 * ─────────────────────────────────────────────────────────────────
 */

session_start();
global $cnx;
include("./config/cnx.php");

if (!isset($_SESSION['userId'])) {
    header("Location: auth.php");
    exit;
}

$userId = (int)$_SESSION['userId'];

// ── Récupérer les infos stockées en session ──
$paypalOrderId  = $_SESSION['paypal_order_id']      ?? null;
$cartOrderId    = (int)($_SESSION['pending_order_id']      ?? 0);
$orderAddressId = (int)($_SESSION['pending_order_address'] ?? 0);

// ── Vérifications de base ──
if (!$paypalOrderId || $cartOrderId <= 0) {
    header("Location: cart.php?error=paypal_session_lost");
    exit;
}

// ── PayPal renvoie aussi le token dans l'URL (double vérification) ──
$tokenFromUrl = $_GET['token'] ?? null;
if ($tokenFromUrl && $tokenFromUrl !== $paypalOrderId) {
    // Utiliser le token de l'URL s'il diffère (cas edge)
    $paypalOrderId = $tokenFromUrl;
}

// ────────────────────────────────────────────────────────────────
//  Fonctions PayPal
// ────────────────────────────────────────────────────────────────

function getPayPalAccessToken(): ?string
{
    $clientId     = $_ENV['PAYPAL_CLIENT_ID']    ?? getenv('PAYPAL_CLIENT_ID');
    $clientSecret = $_ENV['PAYPAL_CLIENT_SECRET'] ?? getenv('PAYPAL_CLIENT_SECRET');

    $ch = curl_init('https://api-m.sandbox.paypal.com/v1/oauth2/token');
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_POST           => true,
        CURLOPT_USERPWD        => "$clientId:$clientSecret",
        CURLOPT_POSTFIELDS     => 'grant_type=client_credentials',
        CURLOPT_HTTPHEADER     => ['Accept: application/json', 'Accept-Language: en_US'],
    ]);
    $response = curl_exec($ch);
    curl_close($ch);
    $data = json_decode($response, true);
    return $data['access_token'] ?? null;
}

/**
 * Capturer le paiement — c'est ici que l'argent est débité
 */
function capturePayPalOrder(string $paypalOrderId): ?array
{
    $token = getPayPalAccessToken();
    if (!$token) return null;

    $ch = curl_init("https://api-m.sandbox.paypal.com/v2/checkout/orders/$paypalOrderId/capture");
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_POST           => true,
        CURLOPT_HTTPHEADER     => [
            'Content-Type: application/json',
            'Authorization: Bearer ' . $token,
        ],
        CURLOPT_POSTFIELDS => '{}',
    ]);
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    $data = json_decode($response, true);

    // Succès si status = COMPLETED
    if (($data['status'] ?? '') === 'COMPLETED') {
        return $data;
    }

    return null;
}

// ────────────────────────────────────────────────────────────────
//  Capture du paiement
// ────────────────────────────────────────────────────────────────

$captureResult = capturePayPalOrder($paypalOrderId);

if (!$captureResult) {
    // Paiement échoué ou non complété
    header("Location: order.php?error=paypal_capture_failed");
    exit;
}

// Extraire l'ID de transaction PayPal
$captureId = $captureResult['purchase_units'][0]['payments']['captures'][0]['id'] ?? null;

// ────────────────────────────────────────────────────────────────
//  Finaliser la commande en BDD
// ────────────────────────────────────────────────────────────────

try {
    $cnx->beginTransaction();

    $discountAmount = !empty($_SESSION['coupon_applied']) && !empty($_SESSION['coupon_final_total'])
        ? round($totaux_original - (float)$_SESSION['coupon_final_total'], 2)
        : 0.00;
    
    $discountAmount = (float)($_SESSION['coupon_discount_amount'] ?? 0.00);

    $stmt = $cnx->prepare("UPDATE ORDER_BILL SET created_at = NOW(), address_id = ?, discount_amount = ? WHERE order_id = ? AND user_id = ?");
    $stmt->execute([$orderAddressId, $discountAmount, $cartOrderId, $userId]);



    $cnx->commit();
    if (!empty($_SESSION['coupon_applied']) && !empty($_SESSION['coupon_user_id'])) {
        $nodeUrl = "https://adam.nachnouchi.com/api-node/use-points";
        $ch = curl_init($nodeUrl);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_TIMEOUT, 5);
        curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, true);
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
        curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode(['SQLid' => (int)$_SESSION['coupon_user_id']]));
        curl_exec($ch);
        curl_close($ch);
    }

    // Nettoyer la session
    unset(
        $_SESSION['paypal_order_id'],
        $_SESSION['pending_order_id'],
        $_SESSION['pending_order_address'],
        $_SESSION['coupon_applied'],
        $_SESSION['coupon_final_total'],
        $_SESSION['coupon_discount_amount'],
        $_SESSION['coupon_user_id']
    );
    $_SESSION['last_order_id'] = $cartOrderId;

    addLog($cnx, "USER", "PAYPAL_CAPTURE", "order");

    header("Location: order_completed.php?order_id=" . $cartOrderId);
    exit;
} catch (Exception $e) {
    if ($cnx->inTransaction()) $cnx->rollBack();
    // Le paiement a été capturé mais la BDD a planté — logguer en urgence
    error_log("[BRICKSY] CRITICAL: PayPal captured ($paypalOrderId / capture:$captureId) but DB failed for order $cartOrderId — " . $e->getMessage());
    header("Location: order.php?error=db_fail_after_payment");
    exit;
}
