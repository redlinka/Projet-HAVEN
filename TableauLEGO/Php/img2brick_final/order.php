<?php
session_start();
global $cnx;
include("./config/cnx.php");

if (!isset($_SESSION['userId'])) {
    $_SESSION['redirect_after_login'] = 'order.php';
    header("Location: index.php");
    exit;
}

$userId = (int)$_SESSION['userId'];
$errors = [];

$isLocal = in_array($_SERVER['SERVER_NAME'] ?? '', ['localhost', '127.0.0.1'], true)
    || str_starts_with($_SERVER['HTTP_HOST'] ?? '', 'localhost')
    || str_starts_with($_SERVER['HTTP_HOST'] ?? '', '127.0.0.1');

$stmt = $cnx->prepare("
    SELECT order_id, address_id
    FROM ORDER_BILL
    WHERE user_id = :uid AND created_at IS NULL
    LIMIT 1
");
$stmt->execute(['uid' => $userId]);
$cart = $stmt->fetch(PDO::FETCH_ASSOC);

if (!$cart) { header("Location: cart.php"); exit; }

$cartOrderId   = (int)$cart['order_id'];
$cartAddressId = !empty($cart['address_id']) ? (int)$cart['address_id'] : 0;

$stmt = $cnx->prepare("SELECT first_name, last_name, phone FROM USER WHERE user_id = :uid LIMIT 1");
$stmt->execute(['uid' => $userId]);
$u = $stmt->fetch(PDO::FETCH_ASSOC) ?: [];

$fillName    = $u['first_name'] ?? '';
$fillSurname = $u['last_name']  ?? '';
$fillPhone   = $u['phone']      ?? '';

$stmt = $cnx->prepare("SELECT street, postal_code, city, country FROM ADDRESS WHERE user_id = ? AND is_default = 1 LIMIT 1");
$stmt->execute([$userId]);
$defaultAddr = $stmt->fetch(PDO::FETCH_ASSOC);

$fillAddr    = $defaultAddr['street']      ?? '';
$fillZip     = $defaultAddr['postal_code'] ?? '';
$fillCity    = $defaultAddr['city']        ?? '';
$fillCountry = $defaultAddr['country']     ?? 'France';

// ── Calcul du total ──
$stmt = $cnx->prepare("
    SELECT t.pavage_txt
    FROM contain c
    JOIN TILLING t ON t.pavage_id = c.pavage_id
    WHERE c.order_id = :oid
");
$stmt->execute(['oid' => $cartOrderId]);
$rows = $stmt->fetchAll(PDO::FETCH_COLUMN);
if (empty($rows)) { header("Location: cart.php?error=empty_cart"); exit; }

$total = 0.0;
foreach ($rows as $txt) {
    $stats = getTilingStats($txt);
    if (isset($stats['price'])) $total += (float)$stats['price'] / 100;
}

$totalPrice = $total;
$livraison  = $total * 0.10;
$totaux     = $livraison + $totalPrice;

// ────────────────────────────────────────────────────────────────
//  POST — validation du formulaire puis création ordre PayPal
// ────────────────────────────────────────────────────────────────
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['confirm_order'])) {

    if (!csrf_validate($_POST['csrf'] ?? '')) {
        $errors[] = "Invalid security token (CSRF). Please try again.";
    }

    $fName   = trim($_POST['first_name'] ?? '');
    $lName   = trim($_POST['last_name']  ?? '');
    $phone   = trim($_POST['phone']      ?? '');
    $street  = trim($_POST['address']    ?? '');
    $city    = trim($_POST['city']       ?? '');
    $zip     = trim($_POST['zip']        ?? '');
    $country = trim($_POST['country']    ?? '');

    $fillName    = $fName;  $fillSurname = $lName;
    $fillPhone   = $phone;  $fillAddr    = $street;
    $fillCity    = $city;   $fillZip     = $zip;
    $fillCountry = $country;

    if (empty($errors) && !$isLocal) {
        $token = $_POST['cf-turnstile-response'] ?? '';
        if ($token === '') {
            $errors[] = "Please complete the captcha.";
        } else {
            set_error_handler(function () { return true; });
            $ts = validateTurnstile();
            restore_error_handler();
            if (empty($ts['success'])) $errors[] = "Captcha failed.";
        }
    }

    if (empty($errors)) {
        if ($fName==='' || $lName==='' || $phone==='' || $street==='' || $city==='' || $zip==='' || $country==='')
            $errors[] = "Please fill in all contact and shipping fields.";
    }

    // ── Si tout est valide → sauvegarder adresse + infos, puis créer ordre PayPal ──
    if (empty($errors)) {
        try {
            $cnx->beginTransaction();

            $cnx->exec("SET @disable_triggers = 1");

            // Adresse snapshot pour cette commande
            $stmt = $cnx->prepare("INSERT INTO ADDRESS (street, postal_code, city, country, user_id, is_default) VALUES (?, ?, ?, ?, ?, 0)");
            $stmt->execute([$street, $zip, $city, $country, $userId]);
            $orderAddressId = (int)$cnx->lastInsertId();

            // Adresse par défaut mise à jour
            $cnx->prepare("UPDATE ADDRESS SET is_default = 0 WHERE user_id = ? AND is_default = 1")->execute([$userId]);
            $cnx->prepare("INSERT INTO ADDRESS (street, postal_code, city, country, user_id, is_default) VALUES (?, ?, ?, ?, ?, 1)")
                ->execute([$street, $zip, $city, $country, $userId]);

            $cnx->exec("SET @disable_triggers = 0");

            // Mise à jour infos user
            $cnx->prepare("UPDATE USER SET first_name = ?, last_name = ?, phone = ? WHERE user_id = ?")
                ->execute([$fName, $lName, $phone, $userId]);

            // Lier l'adresse à la commande (sans valider encore — created_at reste NULL jusqu'au retour PayPal)
            $cnx->prepare("UPDATE ORDER_BILL SET address_id = ? WHERE order_id = ?")
                ->execute([$orderAddressId, $cartOrderId]);

            $cnx->commit();

            // ── Stocker les infos en session pour paypal_return.php ──
            $_SESSION['pending_order_id']      = $cartOrderId;
            $_SESSION['pending_order_address'] = $orderAddressId;

            // ── Créer l'ordre PayPal via API ──
            $paypalOrderId = createPayPalOrder($totaux);

            if (!$paypalOrderId) {
                $errors[] = "Unable to connect to PayPal. Please try again.";
            } else {
                $_SESSION['paypal_order_id'] = $paypalOrderId;

                // Récupérer le lien d'approbation PayPal
                $approvalUrl = getPayPalApprovalUrl($paypalOrderId);
                if ($approvalUrl) {
                    addLog($cnx, "USER", "PAYPAL_INIT", "order");
                    header("Location: " . $approvalUrl);
                    exit;
                } else {
                    $errors[] = "Unable to get PayPal approval URL. Please try again.";
                }
            }

        } catch (Exception $e) {
            try { $cnx->exec("SET @disable_triggers = 0"); } catch (Exception $ignored) {}
            if ($cnx->inTransaction()) $cnx->rollBack();
            $errors[] = "An error occurred while processing your order. Please try again.";
        }
    }
}

// ────────────────────────────────────────────────────────────────
//  Fonctions PayPal Sandbox
// ────────────────────────────────────────────────────────────────

/**
 * Obtenir un access token PayPal Sandbox
 */
function getPayPalAccessToken(): ?string {
    $clientId     = $_ENV['PAYPAL_CLIENT_ID']     ?? getenv('PAYPAL_CLIENT_ID');
    $clientSecret = $_ENV['PAYPAL_CLIENT_SECRET']  ?? getenv('PAYPAL_CLIENT_SECRET');

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
 * Créer un ordre PayPal et retourner son ID
 */
function createPayPalOrder(float $amount): ?string {
    $token = getPayPalAccessToken();
    if (!$token) return null;

    $protocol = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https' : 'http';
    $baseUrl  = $protocol . '://' . ($_SERVER['HTTP_HOST'] ?? 'localhost');

    $payload = [
        'intent' => 'CAPTURE',
        'purchase_units' => [[
            'amount' => [
                'currency_code' => 'EUR',
                'value'         => number_format($amount, 2, '.', ''),
            ],
            'description' => 'Bricksy LEGO Mosaic Order',
        ]],
        'application_context' => [
            'brand_name'          => 'Bricksy',
            'landing_page'        => 'NO_PREFERENCE',
            'user_action'         => 'PAY_NOW',
            'return_url'          => $baseUrl . '/img2brick_final/paypal_return.php',
            'cancel_url'          => $baseUrl . '/img2brick_final/paypal_cancel.php',
        ],
    ];

    $ch = curl_init('https://api-m.sandbox.paypal.com/v2/checkout/orders');
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_POST           => true,
        CURLOPT_HTTPHEADER     => [
            'Content-Type: application/json',
            'Authorization: Bearer ' . $token,
        ],
        CURLOPT_POSTFIELDS => json_encode($payload),
    ]);
    $response = curl_exec($ch);
    curl_close($ch);

    $data = json_decode($response, true);
    return $data['id'] ?? null;
}

/**
 * Récupérer le lien d'approbation PayPal (redirect user vers PayPal)
 */
function getPayPalApprovalUrl(string $paypalOrderId): ?string {
    $token = getPayPalAccessToken();
    if (!$token) return null;

    $ch = curl_init("https://api-m.sandbox.paypal.com/v2/checkout/orders/$paypalOrderId");
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_HTTPHEADER     => [
            'Content-Type: application/json',
            'Authorization: Bearer ' . $token,
        ],
    ]);
    $response = curl_exec($ch);
    curl_close($ch);

    $data = json_decode($response, true);
    foreach ($data['links'] ?? [] as $link) {
        if ($link['rel'] === 'approve') {
            return $link['href'];
        }
    }
    return null;
}

function money($v) { return number_format((float)$v, 2, '.', ' ') . ' EUR'; }
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Checkout — Bricksy</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600&display=swap" rel="stylesheet">
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
    <link rel="stylesheet" href="style/order.css">
    <link rel="stylesheet" href="style/all.css">
    <script src="https://challenges.cloudflare.com/turnstile/v0/api.js" async defer></script>
</head>
<body>

<?php include("./includes/navbar.php"); ?>

<form method="POST" novalidate>
<input type="hidden" name="csrf" value="<?= csrf_get() ?>">

<div class="page-wrapper">

    <!-- ── PayPal cancelled banner ── -->
    <?php if (isset($_GET['paypal']) && $_GET['paypal'] === 'cancelled'): ?>
    <div style="grid-column:1/-1;background:var(--warning-bg);border:1px solid var(--warning-brd);color:var(--warning-txt);padding:clamp(8px,1.2vh,12px) var(--pad-x);border-radius:var(--r-sm);font-size:var(--fs-sm);">
        ⚠️ You cancelled the PayPal payment. Your cart is still intact — you can try again.
    </div>
    <?php endif; ?>

    <!-- ── Error banner ── -->
    <?php if (!empty($errors)): ?>
    <div class="alert-error">
        <ul><?php foreach ($errors as $e): ?><li><?= htmlspecialchars($e) ?></li><?php endforeach; ?></ul>
    </div>
    <?php endif; ?>

    <!-- ══════════════════════════════
         LEFT — Form sections
    ══════════════════════════════ -->
    <div class="col-form">

        <!-- 1. Contact -->
        <div class="section-card">
            <div class="section-head">
                <span class="step-num">1</span>
                Contact Details
            </div>
            <div class="section-body">
                <div class="fields-grid">
                    <div class="field">
                        <label for="first_name">First Name</label>
                        <input type="text" id="first_name" name="first_name"
                               value="<?= htmlspecialchars($fillName) ?>"
                               placeholder="John" required>
                    </div>
                    <div class="field">
                        <label for="last_name">Last Name</label>
                        <input type="text" id="last_name" name="last_name"
                               value="<?= htmlspecialchars($fillSurname) ?>"
                               placeholder="Doe" required>
                    </div>
                    <div class="field field-full">
                        <label for="phone">Phone Number</label>
                        <input type="tel" id="phone" name="phone"
                               value="<?= htmlspecialchars($fillPhone) ?>"
                               placeholder="+33 6 12 34 56 78" required>
                    </div>
                </div>
            </div>
        </div>

        <!-- 2. Shipping -->
        <div class="section-card">
            <div class="section-head">
                <span class="step-num">2</span>
                Shipping Address
            </div>
            <div class="section-body">
                <div class="fields-grid">
                    <div class="field field-full">
                        <label for="address">Street Address</label>
                        <input type="text" id="address" name="address"
                               value="<?= htmlspecialchars($fillAddr) ?>"
                               placeholder="123 Brick Street" required>
                    </div>
                    <div class="field">
                        <label for="city">City</label>
                        <input type="text" id="city" name="city"
                               value="<?= htmlspecialchars($fillCity) ?>"
                               placeholder="Paris" required>
                    </div>
                    <div class="field">
                        <label for="zip">Zip Code</label>
                        <input type="text" id="zip" name="zip"
                               value="<?= htmlspecialchars($fillZip) ?>"
                               placeholder="75001" required>
                    </div>
                    <div class="field field-full">
                        <label for="country">Country</label>
                        <select id="country" name="country" required>
                            <option value="France" <?= ($fillCountry==='France' ? 'selected':'') ?>>France</option>
                            <option value="USA"    <?= ($fillCountry==='USA'    ? 'selected':'') ?>>United States</option>
                            <option value="UK"     <?= ($fillCountry==='UK'     ? 'selected':'') ?>>United Kingdom</option>
                        </select>
                    </div>
                </div>
            </div>
        </div>

        <!-- 3. Payment — PayPal Sandbox -->
        <div class="section-card">
            <div class="section-head">
                <span class="step-num">3</span>
                Payment
            </div>
            <div class="section-body">
                <div class="paypal-info">
                    <img src="https://www.paypalobjects.com/webstatic/mktg/logo/pp_cc_mark_111x69.jpg"
                         alt="PayPal" style="height:40px; margin-bottom:10px; display:block;">
                    <p style="font-size:0.85rem; color:#555; margin:0;">
                        After confirming, you will be securely redirected to PayPal Sandbox to complete your payment.
                    </p>
                </div>
            </div>
        </div>

        <!-- Captcha -->
        <?php if (!$isLocal): ?>
        <div class="captcha-wrap">
            <div class="cf-turnstile"
                 data-sitekey="<?= htmlspecialchars($_ENV['CLOUDFLARE_TURNSTILE_PUBLIC'] ?? '') ?>">
            </div>
        </div>
        <?php endif; ?>

    </div><!-- /col-form -->

    <!-- ══════════════════════════════
         RIGHT — Summary
    ══════════════════════════════ -->
    <div class="col-summary">

        <div class="summary-card">
            <div class="summary-head">Order Summary</div>

            <div class="summary-body">
                <div class="sum-row">
                    <span>Subtotal</span>
                    <strong><?= money($totalPrice) ?></strong>
                </div>
                <div class="sum-row">
                    <span>Shipping (10%)</span>
                    <strong><?= money($livraison) ?></strong>
                </div>
                <div class="sum-divider"></div>
                <div class="sum-row grand">
                    <span>Total</span>
                    <strong><?= money($totaux) ?></strong>
                </div>
            </div>

            <div class="summary-footer">
                <button type="submit" name="confirm_order" class="btn-confirm">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                         stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"
                         style="margin-right:6px;vertical-align:middle;">
                        <rect x="1" y="4" width="22" height="16" rx="2" ry="2"/>
                        <line x1="1" y1="10" x2="23" y2="10"/>
                    </svg>
                    Pay with PayPal — <?= money($totaux) ?>
                </button>
                <a href="cart.php" class="btn-back">
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none"
                         stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                        <line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/>
                    </svg>
                    Back to Cart
                </a>
            </div>
        </div>

    </div><!-- /col-summary -->

</div><!-- /page-wrapper -->
</form>

</body>
</html>