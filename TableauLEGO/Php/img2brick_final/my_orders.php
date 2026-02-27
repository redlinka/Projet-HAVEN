<?php
session_start();
global $cnx;
include("./config/cnx.php");
require_once __DIR__ . '/includes/i18n.php';

$_SESSION['redirect_after_login'] = 'my_orders.php';
if (!isset($_SESSION['userId'])) {
    header("Location: auth.php");
    exit();
}

$userId = (int)$_SESSION['userId'];

function money($v) {
    return number_format((float)$v, 2, '.', ' ') . ' EUR';
}

try {
    $stmt = $cnx->prepare("SELECT order_id, created_at, address_id FROM ORDER_BILL WHERE user_id = ? AND created_at IS NOT NULL ORDER BY created_at DESC");
    $stmt->execute([$userId]);
    $orders = $stmt->fetchAll(PDO::FETCH_ASSOC);
} catch (PDOException $e) {
    die("Erreur : " . $e->getMessage());
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>My Orders — Bricksy</title>

    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600&display=swap" rel="stylesheet">
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
    <link rel="stylesheet" href="style/my_orders.css">
    <link rel="stylesheet" href="style/all.css">
</head>
<body>

<?php include("./includes/navbar.php"); ?>

<div class="page-wrapper">

    <p class="page-title" data-i18n="my_orders.title">My Orders</p>

    <?php if (empty($orders)): ?>

    <!-- ── Empty state ── -->
    <div class="empty-state">
        <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="currentColor"
             stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round">
            <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/>
            <line x1="3" y1="6" x2="21" y2="6"/>
            <path d="M16 10a4 4 0 0 1-8 0"/>
        </svg>
        <p>You have not placed an order yet.</p>
        <a href="index.php">Start creating</a>
    </div>

    <?php else: ?>

    <?php foreach ($orders as $order): ?>

    <div class="order-card">

        <!-- ── Header ── -->
        <div class="order-header">
            <div class="order-meta">
                <span class="order-id">Order #<?= (int)$order['order_id'] ?></span>
                <span class="order-date">
                    Placed on <?= date('d/m/Y à H:i', strtotime($order['created_at'])) ?>
                </span>
            </div>
            <span class="status-badge">Paid</span>
        </div>

        <!-- ── Body ── -->
        <div class="order-body">

            <?php
            $stmtItems = $cnx->prepare("
                SELECT t.pavage_txt, i.path AS lego_path, t.pavage_id, i.image_id
                FROM contain c
                JOIN TILLING t ON c.pavage_id = t.pavage_id
                JOIN IMAGE   i ON t.image_id  = i.image_id
                WHERE c.order_id = ?
            ");
            $stmtItems->execute([$order['order_id']]);
            $items = $stmtItems->fetchAll(PDO::FETCH_ASSOC);

            $orderTotal = 0;
            foreach ($items as $item):
                $filename = getOriginalImage($cnx, $item['image_id'])['filename'];
                $stats    = getTilingStats($item['pavage_txt']);
                $price    = $stats['price'] / 100;
                $quality  = (int)$stats['quality'];
                $orderTotal += $price;
            ?>

            <div class="item-row">

                <!-- Thumbnail -->
                <div class="item-thumb">
                    <img src="users/imgs/<?= htmlspecialchars($item['lego_path']) ?>"
                         alt="LEGO mosaic preview">
                </div>

                <!-- Info -->
                <div class="item-info">
                    <p class="item-filename"><?= htmlspecialchars($filename) ?></p>

                    <div class="item-quality">
                        <div class="quality-bar">
                            <div class="quality-fill" style="width:<?= $quality ?>%"></div>
                        </div>
                        <?= $quality ?>% quality
                    </div>

                    <div class="item-actions">
                        <a href="generate_manual.php?file=<?= urlencode($item['pavage_txt']) ?>"
                           target="_blank" class="btn-action outline-brown">
                            <svg width="11" height="11" viewBox="0 0 24 24" fill="none"
                                 stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                                <polyline points="14 2 14 8 20 8"/>
                                <line x1="16" y1="13" x2="8" y2="13"/>
                                <line x1="16" y1="17" x2="8" y2="17"/>
                            </svg>
                            View Guide
                        </a>
                        <a href="users/imgs/<?= htmlspecialchars($item['lego_path']) ?>"
                           download class="btn-action outline-muted">
                            <svg width="11" height="11" viewBox="0 0 24 24" fill="none"
                                 stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                                <polyline points="7 10 12 15 17 10"/>
                                <line x1="12" y1="15" x2="12" y2="3"/>
                            </svg>
                            Image
                        </a>
                        <a href="users/tilings/<?= htmlspecialchars($item['pavage_txt']) ?>"
                           download class="btn-action outline-muted">
                            <svg width="11" height="11" viewBox="0 0 24 24" fill="none"
                                 stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                                <polyline points="7 10 12 15 17 10"/>
                                <line x1="12" y1="15" x2="12" y2="3"/>
                            </svg>
                            Tiling
                        </a>
                    </div>
                </div>

                <!-- Price -->
                <div class="item-price"><?= money($price) ?></div>

            </div>

            <?php endforeach; ?>

            <!-- ── Totals ── -->
            <div class="order-totals">
                <div class="total-row">
                    <span>Subtotal</span>
                    <strong><?= money($orderTotal) ?></strong>
                </div>
                <div class="total-row">
                    <span>Shipping (10%)</span>
                    <strong><?= money($orderTotal * 0.1) ?></strong>
                </div>
                <div class="total-row grand">
                    <span>Total</span>
                    <strong><?= money($orderTotal * 1.1) ?></strong>
                </div>
            </div>

        </div><!-- /order-body -->
    </div><!-- /order-card -->

    <?php endforeach; ?>
    <?php endif; ?>

</div><!-- /page-wrapper -->

</body>
</html>