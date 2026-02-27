<?php
session_start();
global $cnx;
include("./config/cnx.php");
require_once __DIR__ . '/includes/i18n.php';

if (!isset($_SESSION['userId'])) {
    header("Location: connexion.php");
    exit;
}

$userId  = (int)$_SESSION['userId'];
$orderId = isset($_GET['order_id']) ? (int)$_GET['order_id'] : 0;
if ($orderId <= 0 && isset($_SESSION['last_order_id'])) {
    $orderId = (int)$_SESSION['last_order_id'];
}
if ($orderId <= 0) { header("Location: index.php"); exit; }

try {
    $stmt = $cnx->prepare("SELECT * FROM ORDER_BILL WHERE order_id = :oid AND user_id = :uid LIMIT 1");
    $stmt->execute(['oid' => $orderId, 'uid' => $userId]);
    $orderBill = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$orderBill || empty($orderBill['created_at'])) { header("Location: index.php"); exit; }

    $stmt = $cnx->prepare("SELECT * FROM ADDRESS WHERE address_id = ?");
    $stmt->execute([$orderBill['address_id']]);
    $addr = $stmt->fetch(PDO::FETCH_ASSOC) ?: [];

    $stmt = $cnx->prepare("SELECT first_name, last_name, email, phone FROM USER WHERE user_id = ?");
    $stmt->execute([$userId]);
    $u = $stmt->fetch(PDO::FETCH_ASSOC);

    $stmt = $cnx->prepare("
        SELECT t.pavage_txt, i.path AS lego_path
        FROM contain c
        JOIN TILLING t ON t.pavage_id = c.pavage_id
        JOIN IMAGE   i ON t.image_id  = i.image_id
        WHERE c.order_id = ?
    ");
    $stmt->execute([$orderId]);
    $items = $stmt->fetchAll(PDO::FETCH_ASSOC);

    $totalPrice     = 0.0;
    $emailItemsHtml = "";

    foreach ($items as $item) {
        $stats      = getTilingStats($item['pavage_txt']);
        $itemPrice  = (float)$stats['price'] / 100;
        $totalPrice += $itemPrice;
        $emailItemsHtml .= "<li>LEGO mosaic ({$item['pavage_txt']}) - " . number_format($itemPrice, 2) . " EUR</li>";
    }

    $livraison = $totalPrice * 0.10;
    $totaux    = $totalPrice + $livraison;

    if (!isset($_SESSION['mail_sent_' . $orderId])) {
        $subject = "Confirmation of your order #" . $orderId . " - Bricksy";
        $body    = "
            <h2>Thank you for your order, {$u['first_name']} !</h2>
            <p>We have received your payment. Here is the summary :</p>
            <ul>{$emailItemsHtml}</ul>
            <p><strong>Shipping costs :</strong> " . number_format($livraison, 2) . " EUR</p>
            <p><strong>Total paid :</strong> " . number_format($totaux, 2) . " EUR</p>
            <p>Your package will be shipped to :<br>
            {$addr['street']}, {$addr['postal_code']} {$addr['city']}, {$addr['country']}</p>
        ";
        sendMail($u['email'], $subject, $body);
        $_SESSION['mail_sent_' . $orderId] = true;
    }

} catch (PDOException $e) {
    die("System Error");
}

function money($v) { return number_format((float)$v, 2, '.', ' ') . ' EUR'; }
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title><?= htmlspecialchars(tr('order_completed.page_title', 'Order Confirmed — Bricksy')) ?></title>

    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600&display=swap" rel="stylesheet">
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
    <link rel="stylesheet" href="style/order_completed.css">
    <link rel="stylesheet" href="style/all.css">
</head>
<body>

<?php include("./includes/navbar.php"); ?>

<div class="page-wrapper">
    <div class="conf-card">

        <!-- ══ HEADER ══ -->
        <div class="conf-header">
            <div class="conf-header-left">
                <div class="check-icon">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
                         stroke="currentColor" stroke-width="2.8"
                         stroke-linecap="round" stroke-linejoin="round">
                        <polyline points="20 6 9 17 4 12"/>
                    </svg>
                </div>
                <div class="conf-title-group">
                    <p class="conf-title" data-i18n="order_completed.title">Order Successfully Placed!</p>
                    <p class="conf-subtitle">
                        Order #<?= (int)$orderBill['order_id'] ?>
                        &nbsp;·&nbsp;
                        <?= htmlspecialchars(date('d/m/Y à H:i', strtotime($orderBill['created_at']))) ?>
                    </p>
                </div>
            </div>
            <span class="status-badge">Preparation</span>
        </div>

        <!-- ══ BODY ══ -->
        <div class="conf-body">

            <!-- Left — mosaic preview -->
            <div class="conf-preview">
                <p class="conf-preview-label">Your Mosaic</p>
                <?php if (!empty($items)): ?>
                <div class="preview-wrap" onclick="openZoom(this)">
                    <img src="users/imgs/<?= htmlspecialchars($items[0]['lego_path']) ?>"
                         alt="LEGO mosaic preview">
                    <span class="zoom-hint">🔍 Zoom</span>
                </div>
                <?php endif; ?>
            </div>

            <!-- Right — details -->
            <div class="conf-details">

                <!-- Delivery -->
                <div class="detail-section">
                    <p class="detail-label">Delivery Details</p>
                    <p class="detail-name"><?= htmlspecialchars(($u['first_name'] ?? '') . ' ' . ($u['last_name'] ?? '')) ?></p>
                    <div class="detail-row">
                        <span>Phone</span>
                        <strong><?= htmlspecialchars($u['phone'] ?? '—') ?></strong>
                    </div>
                    <p class="detail-address">
                        <?= htmlspecialchars($addr['street']      ?? 'N/A') ?><br>
                        <?= htmlspecialchars(($addr['postal_code'] ?? '') . ' ' . ($addr['city'] ?? '')) ?><br>
                        <?= htmlspecialchars($addr['country']      ?? '') ?>
                    </p>
                </div>

                <!-- Payment summary -->
                <div class="detail-section">
                    <p class="detail-label">Payment Summary</p>
                    <div class="detail-row">
                        <span>Subtotal</span>
                        <strong><?= money($totalPrice) ?></strong>
                    </div>
                    <div class="detail-row">
                        <span>Shipping (10%)</span>
                        <strong><?= money($livraison) ?></strong>
                    </div>
                    <div class="sum-divider"></div>
                    <div class="total-row">
                        <span>Total paid</span>
                        <strong><?= money($totaux) ?></strong>
                    </div>
                </div>

                <p class="order-date">
                    Order placed on <?= htmlspecialchars(date('d/m/Y à H:i', strtotime($orderBill['created_at']))) ?>
                </p>

            </div><!-- /conf-details -->
        </div><!-- /conf-body -->

        <!-- ══ FOOTER ══ -->
        <div class="conf-footer">
            <p class="footer-note" data-i18n="order_completed.footer_note">
                We are currently picking your bricks. You will receive a tracking number once the package leaves our warehouse.
            </p>
            <div class="footer-actions">
                <button onclick="window.print()" class="btn-outline-oc" data-i18n="order_completed.print">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
                         stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                        <polyline points="6 9 6 2 18 2 18 9"/>
                        <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/>
                        <rect x="6" y="14" width="12" height="8"/>
                    </svg>
                    Print
                </button>
                <a href="upload.php" class="btn-primary-oc" data-i18n="order_completed.create_another">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
                         stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                        <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                    </svg>
                    New Mosaic
                </a>
            </div>
        </div>

    </div><!-- /conf-card -->
</div><!-- /page-wrapper -->

<!-- ══ ZOOM MODAL ══ -->
<div class="zoom-modal" id="zoomModal" onclick="closeZoom()">
    <button class="zoom-close" onclick="closeZoom()" aria-label="Close">✕</button>
    <img id="zoomImg" src="" alt="LEGO mosaic zoomed">
</div>

<script>
    function openZoom(wrap) {
        const src = wrap.querySelector('img').src;
        document.getElementById('zoomImg').src = src;
        document.getElementById('zoomModal').classList.add('open');
    }
    function closeZoom() {
        document.getElementById('zoomModal').classList.remove('open');
    }
    document.addEventListener('keydown', e => { if (e.key === 'Escape') closeZoom(); });
</script>
</body>
</html>