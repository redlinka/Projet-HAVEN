<?php
session_start();
global $cnx;
include("./config/cnx.php");
require_once __DIR__ . '/includes/i18n.php';

if (!isset($_SESSION['userId'])) {
    header("Location: auth.php");
    exit;
}

$errors    = [];
$id_uti    = (int)$_SESSION['userId'];
$imgFolder    = 'users/imgs/';
$tilingFolder = 'users/tilings/';

if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['remove_pavage_id'])) {
    $pavageId = (int)$_POST['remove_pavage_id'];
    $userId   = (int)($_SESSION['userId'] ?? 0);

    try {
        $cnx->beginTransaction();

        $stmt = $cnx->prepare("SELECT pavage_txt, image_id FROM TILLING WHERE pavage_id = ?");
        $stmt->execute([$pavageId]);
        $tiling = $stmt->fetch(PDO::FETCH_ASSOC);

        if ($tiling) {
            $cnx->prepare("DELETE FROM contain WHERE pavage_id = ?")->execute([$pavageId]);
            $cnx->prepare("DELETE FROM TILLING WHERE pavage_id = ?")->execute([$pavageId]);

            $txtPath = __DIR__ . $tilingFolder . $tiling['pavage_txt'];
            if (file_exists($txtPath)) unlink($txtPath);

            $rootImageId = (int)$tiling['image_id'];
            while (true) {
                $stmt = $cnx->prepare("SELECT img_parent FROM IMAGE WHERE image_id = ?");
                $stmt->execute([$rootImageId]);
                $parentId = $stmt->fetchColumn();
                if (!$parentId) break;
                $rootImageId = (int)$parentId;
            }

            $imgDirPath    = __DIR__ . '/users/imgs';
            $tilingDirPath = __DIR__ . '/users/tilings';
            deleteDescendants($cnx, $rootImageId, $imgDirPath, $tilingDirPath, false);
        }

        $cnx->commit();
        addLog($cnx, "USER", "DELETE", "pavage");
        header("Location: cart.php");
        exit;
    } catch (PDOException $e) {
        if ($cnx->inTransaction()) $cnx->rollBack();
        header("Location: cart.php?error=delete_failed");
        exit;
    }
}

function money($v) {
    return number_format((float)$v, 2, '.', ' ') . ' EUR';
}

$stmt = $cnx->prepare("
    SELECT
        o.order_id,
        c.pavage_id,
        i.path AS lego_path,
        t.pavage_txt
    FROM ORDER_BILL o
    JOIN contain c  ON c.order_id  = o.order_id
    JOIN TILLING t  ON t.pavage_id = c.pavage_id
    JOIN IMAGE   i  ON i.image_id  = t.image_id
    WHERE o.user_id    = :user_id
      AND o.created_at IS NULL
");
$stmt->execute(['user_id' => $id_uti]);
$row_pan = $stmt->fetchAll(PDO::FETCH_ASSOC);

$items    = [];
$subtotal = 0.0;

foreach ($row_pan as $row) {
    $id_pavage  = (int)($row['pavage_id'] ?? 0);
    $legoPath   = (string)($row['lego_path'] ?? '');
    $src        = $imgFolder . ltrim($legoPath, '/');
    $price      = 0.0;
    $pavageFile = trim((string)($row['pavage_txt'] ?? ''));
    $txtPath    = __DIR__ . '/users/tilings/' . $pavageFile;

    if ($pavageFile !== '' && is_file($txtPath) && is_readable($txtPath)) {
        $txtContent = file_get_contents($txtPath);
        if ($txtContent !== false && preg_match('/\d+/', $txtContent, $m)) {
            $price = ((float)$m[0]) / 100;
        }
    }

    $subtotal += $price;
    $items[] = [
        'id_pavage'  => $id_pavage,
        'src'        => $src,
        'price'      => $price,
        'line_total' => $price,
    ];
}

$shipping = $subtotal * 0.10;
$total    = $subtotal + $shipping;
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>My Cart — Bricksy</title>

    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600&display=swap" rel="stylesheet">
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
    <link rel="stylesheet" href="style/cart.css">
    <link rel="stylesheet" href="style/all.css">
</head>
<body>

<?php include("./includes/navbar.php"); ?>

<div class="page-wrapper">

    <p class="page-title" data-i18n="cart.title">My Cart</p>

    <div class="cart-layout">

        <!-- ══ LEFT: ITEMS ══ -->
        <div class="panel">
            <div class="panel-head" data-i18n="cart.items">Items</div>

            <div class="panel-items">
                <?php if (empty($items)): ?>
                <div class="cart-empty">
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none"
                         stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round">
                        <circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/>
                        <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
                    </svg>
                    <p data-i18n="cart.empty">Your cart is empty.</p>
                </div>

                <?php else: ?>
                <div class="items-grid">
                    <?php foreach ($items as $it): ?>
                    <article class="item-card">

                        <div class="item-thumb">
                            <img src="<?= htmlspecialchars($it['src'] ?: '/images/placeholder.png') ?>"
                                 alt="LEGO mosaic preview"
                                 data-i18n-attr="alt:cart.item_alt">
                        </div>

                        <div class="item-meta">
                            <div class="item-price-row">
                                <span data-i18n="cart.unit">Unit</span>
                                <strong><?= money($it['price']) ?></strong>
                            </div>
                            <div class="item-price-row">
                                <span data-i18n="cart.line">Line</span>
                                <strong><?= money($it['line_total']) ?></strong>
                            </div>

                            <form method="post" action="cart.php">
                                <input type="hidden" name="remove_pavage_id"
                                       value="<?= (int)$it['id_pavage'] ?>">
                                <button type="submit" class="btn-remove"
                                        data-i18n="cart.remove">Remove</button>
                            </form>
                        </div>

                    </article>
                    <?php endforeach; ?>
                </div>
                <?php endif; ?>
            </div>
        </div>

        <!-- ══ RIGHT: SUMMARY ══ -->
        <div class="panel">
            <div class="panel-head" data-i18n="cart.summary">Summary</div>

            <div class="panel-summary">

                <div class="sum-row">
                    <span data-i18n="cart.subtotal">Subtotal</span>
                    <strong><?= money($subtotal) ?></strong>
                </div>

                <div class="sum-row">
                    <span data-i18n="cart.shipping">Shipping (10%)</span>
                    <strong><?= money($shipping) ?></strong>
                </div>

                <div class="sum-divider"></div>

                <div class="sum-row total">
                    <span data-i18n="cart.total">Total</span>
                    <strong><?= money($total) ?></strong>
                </div>

                <p class="sum-note">Taxes and duties may apply at checkout.</p>

                <div class="sum-divider"></div>

                <?php if (!empty($items)): ?>
                    <a href="order.php" class="btn-order" data-i18n="cart.order">
                        Place Order
                    </a>
                <?php else: ?>
                    <span class="btn-order disabled" data-i18n="cart.order">Place Order</span>
                <?php endif; ?>

                <a href="index.php" class="btn-back-cart" data-i18n="cart.back">
                    ← Back to start
                </a>

            </div>
        </div>

    </div><!-- /cart-layout -->
</div><!-- /page-wrapper -->

<script src="assets/i18n.js"></script>
</body>
</html>