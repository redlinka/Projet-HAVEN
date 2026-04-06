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

function money($v)
{
    return number_format((float)$v, 2, '.', ' ') . ' EUR';
}

/* Extrait la clé de preset depuis le nom du fichier .txt
 * Ex: "preset_balanced_382.txt" → "balanced" */
function extractPresetKey(string $pavageTxt): string
{
    if (preg_match('/^preset_(.+)_\d+\.txt$/', $pavageTxt, $m)) {
        return $m[1]; // ex: "balanced", "high_detail", "pixel_perfect"
    }
    return '';
}

/* Retourne le nom lisible et la qualité visuelle du preset */
function getPresetMeta(string $key): array
{
    $presets = [
        'high_detail'   => ['name' => 'High Detail',   'quality' => 92],
        'balanced'      => ['name' => 'Balanced',       'quality' => 70],
        'classic_brick' => ['name' => 'Classic Brick',  'quality' => 60],
        'minimal_price' => ['name' => 'Minimal Price',  'quality' => 48],
        'pixel_perfect' => ['name' => 'Pixel Perfect',  'quality' => 100],
    ];
    return $presets[$key] ?? ['name' => ucwords(str_replace('_', ' ', $key)), 'quality' => 75];
}

try {
    $stmt = $cnx->prepare("SELECT order_id, created_at, address_id, discount_amount FROM ORDER_BILL WHERE user_id = ? AND created_at IS NOT NULL ORDER BY created_at DESC");
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
    <?php include_once("matomo_tag.php"); ?>
</head>

<body>

    <?php include("./includes/navbar.php"); ?>

    <div class="page-wrapper">

        <p class="page-title" data-i18n="my_orders.title">My Orders</p>

        <?php if (empty($orders)): ?>
            <div class="empty-state">
                <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                    stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
                    <line x1="3" y1="6" x2="21" y2="6" />
                    <path d="M16 10a4 4 0 0 1-8 0" />
                </svg>
                <p>You have not placed an order yet.</p>
                <a href="index.php">Start creating</a>
            </div>

        <?php else: ?>

            <?php foreach ($orders as $order): ?>
                <div class="order-card">

                    <!-- Header -->
                    <div class="order-header">
                        <div class="order-meta">
                            <span class="order-id">Order #<?= (int)$order['order_id'] ?></span>
                            <span class="order-date">
                                Placed on <?= date('d/m/Y à H:i', strtotime($order['created_at'])) ?>
                            </span>
                        </div>
                        <span class="status-badge">Paid</span>
                    </div>

                    <!-- Body -->
                    <div class="order-body">

                        <?php
                        // Récupère prix et qualité stockés en DB dans TILLING
                        $stmtItems = $cnx->prepare("
                    SELECT t.pavage_txt, t.price AS stored_price, t.quality AS stored_quality,
                           i.path AS lego_path, t.pavage_id, i.image_id
                    FROM contain c
                    JOIN TILLING t ON c.pavage_id = t.pavage_id
                    LEFT JOIN IMAGE i ON t.image_id = i.image_id
                    WHERE c.order_id = ?
                ");
                        $stmtItems->execute([$order['order_id']]);
                        $items = $stmtItems->fetchAll(PDO::FETCH_ASSOC);

                        $orderTotal = 0;
                        foreach ($items as $item):
                            $hasImage   = !empty($item['lego_path']);
                            $presetKey  = extractPresetKey($item['pavage_txt']);
                            $presetMeta = getPresetMeta($presetKey);

                            // Nom du fichier : depuis l'image originale, sinon nom du preset
                            $originalImage = $item['image_id'] ? getOriginalImage($cnx, $item['image_id']) : null;
                            $filename = ($originalImage && !empty($originalImage['filename']))
                                ? $originalImage['filename']
                                : $presetMeta['name'] . ' tiling';

                            // Prix stocké en DB — résistant à la suppression des fichiers
                            $storedPrice = (int)($item['stored_price'] ?? 0);

                            // Fallback sur le fichier .txt si prix DB = 0
                            if ($storedPrice === 0) {
                                $txtPath = __DIR__ . '/users/tilings/' . $item['pavage_txt'];
                                if (file_exists($txtPath)) {
                                    $stats       = getTilingStats($item['pavage_txt']);
                                    $storedPrice = (int)($stats['price'] ?? 0);
                                }
                            }

                            $price   = $storedPrice / 100;
                
                            $quality = $presetMeta['quality'];
                            $orderTotal += $price;
                        ?>

                            <div class="item-row">

                                <!-- Thumbnail -->
                                <div class="item-thumb">
                                    <?php if ($hasImage): ?>
                                        <img src="users/imgs/<?= htmlspecialchars($item['lego_path']) ?>"
                                            alt="LEGO mosaic preview">
                                    <?php else: ?>
                                        <div class="item-thumb-placeholder">
                                            <svg width="28" height="28" viewBox="0 0 24 24" fill="none"
                                                stroke="currentColor" stroke-width="1.5">
                                                <rect x="3" y="3" width="18" height="18" rx="2" />
                                                <circle cx="8.5" cy="8.5" r="1.5" />
                                                <polyline points="21 15 16 10 5 21" />
                                            </svg>
                                        </div>
                                    <?php endif; ?>
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
                                                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                                                <polyline points="14 2 14 8 20 8" />
                                                <line x1="16" y1="13" x2="8" y2="13" />
                                                <line x1="16" y1="17" x2="8" y2="17" />
                                            </svg>
                                            View Guide
                                        </a>
                                        <?php if ($hasImage): ?>
                                            <a href="users/imgs/<?= htmlspecialchars($item['lego_path']) ?>"
                                                download class="btn-action outline-muted">
                                                <svg width="11" height="11" viewBox="0 0 24 24" fill="none"
                                                    stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                                                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                                                    <polyline points="7 10 12 15 17 10" />
                                                    <line x1="12" y1="15" x2="12" y2="3" />
                                                </svg>
                                                Image
                                            </a>
                                        <?php endif; ?>
                                        <a href="users/tilings/<?= htmlspecialchars($item['pavage_txt']) ?>"
                                            download class="btn-action outline-muted">
                                            <svg width="11" height="11" viewBox="0 0 24 24" fill="none"
                                                stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                                                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                                                <polyline points="7 10 12 15 17 10" />
                                                <line x1="12" y1="15" x2="12" y2="3" />
                                            </svg>
                                            Tiling
                                        </a>
                                    </div>
                                </div>

                                <!-- Price -->
                                <div class="item-price"><?= money($price) ?></div>

                            </div>

                        <?php endforeach; ?>

                        <?php
                        $discountOrder  = (float)($order['discount_amount'] ?? 0.00);
                        $livraisonOrder = $orderTotal * 0.1;
                        $grandTotal     = round($orderTotal + $livraisonOrder - $discountOrder, 2);
                        ?>
                        <!-- Totals -->
                        <div class="order-totals">
                            <div class="total-row">
                                <span>Subtotal</span>
                                <strong><?= money($orderTotal) ?></strong>
                            </div>
                            <div class="total-row">
                                <span>Shipping (10%)</span>
                                <strong><?= money($livraisonOrder) ?></strong>
                            </div>
                            <?php if ($discountOrder > 0): ?>
                                <div class="total-row" style="color: #2e7d32;">
                                    <span>Discount (points)</span>
                                    <strong>- <?= money($discountOrder) ?></strong>
                                </div>
                            <?php endif; ?>
                            <div class="total-row grand">
                                <span>Total</span>
                                <strong><?= money($grandTotal) ?></strong>
                            </div>
                        </div>

                    </div><!-- /order-body -->
                </div><!-- /order-card -->

            <?php endforeach; ?>
        <?php endif; ?>

    </div><!-- /page-wrapper -->

</body>

</html>