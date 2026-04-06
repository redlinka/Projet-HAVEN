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

    try {
        $cnx->beginTransaction();

        $stmt = $cnx->prepare("SELECT pavage_txt, image_id FROM TILLING WHERE pavage_id = ?");
        $stmt->execute([$pavageId]);
        $tiling = $stmt->fetch(PDO::FETCH_ASSOC);

        if ($tiling) {
            $imageId = (int)$tiling['image_id'];

            // Supprime uniquement ce pavage du panier et de la table TILLING
            $cnx->prepare("DELETE FROM contain WHERE pavage_id = ?")->execute([$pavageId]);
            $cnx->prepare("DELETE FROM TILLING WHERE pavage_id = ?")->execute([$pavageId]);

            // Supprime le fichier .txt associé
            $txtPath = __DIR__ . '/users/tilings/' . $tiling['pavage_txt'];
            if (file_exists($txtPath)) unlink($txtPath);

            // Supprime uniquement l'image LEGO de ce preset (pas toute l'arborescence)
            $stmt = $cnx->prepare("SELECT path FROM IMAGE WHERE image_id = ?");
            $stmt->execute([$imageId]);
            $imgFile = $stmt->fetchColumn();

            if ($imgFile) {
                $fullPath = __DIR__ . '/users/imgs/' . $imgFile;
                if (file_exists($fullPath)) unlink($fullPath);
            }
            $cnx->prepare("DELETE FROM IMAGE WHERE image_id = ?")->execute([$imageId]);

            // Si l'image source n'a plus aucun enfant LEGO, on la supprime aussi
            $stmt = $cnx->prepare("SELECT img_parent FROM IMAGE WHERE image_id = ?");
            $stmt->execute([$imageId]);
            // L'image vient d'être supprimée, on relit depuis TILLING pour retrouver le parent
            // On cherche d'autres presets liés à la même image parente
            $stmt = $cnx->prepare("
                SELECT COUNT(*) FROM TILLING t
                JOIN IMAGE i ON i.image_id = t.image_id
                JOIN IMAGE parent ON parent.image_id = i.img_parent
                WHERE i.img_parent = (
                    SELECT img_parent FROM IMAGE WHERE image_id = ? LIMIT 1
                )
            ");
            // Note : l'image est déjà supprimée ici, cleanStorage s'occupera du parent orphelin
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
        i.path     AS lego_path,
        t.pavage_txt,
        t.price    AS stored_price
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
    $pavageFile = trim((string)($row['pavage_txt'] ?? ''));

    // Prix stocké en centimes dans la BDD, on convertit en euros
    $storedPrice = (int)($row['stored_price'] ?? 0);
    if ($storedPrice > 0) {
        $price = $storedPrice / 100;
    } else {
        // Fallback sur getTilingStats() si le prix n'est pas encore en BDD
        $stats = getTilingStats($pavageFile);
        $price = ($stats['price'] ?? 0) / 100;
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
    <?php include_once("matomo_tag.php"); ?>
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

                <a href="upload.php" class="btn-back-cart">
                    Add new item
                </a>

            </div>
        </div>

    </div><!-- /cart-layout -->
</div><!-- /page-wrapper -->

<script src="assets/i18n.js"></script>
</body>
</html>
