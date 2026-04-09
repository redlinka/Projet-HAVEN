<?php
session_start();
ob_start();
global $cnx;
include("./config/cnx.php");
require_once __DIR__ . '/includes/i18n.php';

// ── Prerequisites ──────────────────────────────────────────────────────────
if (!isset($_SESSION['step3_image_id'])) {
    session_write_close();
    ob_end_clean();
    header("Location: index.php");
    exit;
}

$parentId  = $_SESSION['step3_image_id'];
$_SESSION['redirect_after_login'] = 'tiling_selection.php';
$imgFolder    = 'users/imgs/';
$tilingFolder = 'users/tilings/';
$errors = [];

if (isset($_GET['error']) && $_GET['error'] === 'missing_files') {
    $errors[] = tr('errors.cart_missing_files', 'Required processing files are missing. Please regenerate the previews.');
}

// ── Source image ───────────────────────────────────────────────────────────
$stmt = $cnx->prepare("SELECT path FROM IMAGE WHERE image_id = ?");
$stmt->execute([$parentId]);
$sourceFile = $stmt->fetchColumn();

// ── Preset definitions ─────────────────────────────────────────────────────
$PRESETS = [
    'high_detail' => [
        'name'        => 'High Detail',
        'description' => 'Maximum precision using fine adaptive quadtree blocks. Best for portraits and complex images.',
        'method'      => 'quadtree',
        'mode'        => 'relax',
        'threshold'   => 1000,
        'quality'     => 92,
        'badge'       => 'Best Quality',
        'badge_class' => 'premium',
        'algo_label'  => 'Quadtree · T=1k',
    ],
    'balanced' => [
        'name'        => 'Most Popular',
        'description' => 'The sweet spot between detail and affordability. Recommended for most images and budgets.',
        'method'      => 'quadtree',
        'mode'        => 'relax',
        'threshold'   => 2000,
        'quality'     => 70,
        'badge'       => 'Most Popular',
        'badge_class' => 'recommended',
        'algo_label'  => 'Quadtree · T=2k',
        'discount'    => 5,
    ],
    'classic_brick' => [
        'name'        => 'Classic Brick',
        'description' => 'Uses iconic 2×4 LEGO bricks for a recognisable blocky mosaic feel.',
        'method'      => 'tile',
        'mode'        => 'relax',
        'tileWidth'   => 2,
        'tileHeight'  => 4,
        'threshold'   => 2000,
        'quality'     => 60,
        'badge'       => 'Classic',
        'badge_class' => 'classic',
        'algo_label'  => 'Tile 2×4',
    ],
    'minimal_price' => [
        'name'        => 'Minimal Price',
        'description' => 'Smart grouping keeps the brick count low while the image stays recognisable. Best value for money.',
        'method'      => 'quadtree',
        'mode'        => 'relax',
        'threshold'   => 3000,
        'quality'     => 48,
        'badge'       => 'Best Price',
        'badge_class' => 'economy',
        'algo_label'  => 'Quadtree · T=3k',
    ],
    'pixel_perfect' => [
        'name'        => 'Pixel Perfect',
        'description' => 'One 1×1 stud per pixel — the highest fidelity possible. Premium price, stunning result.',
        'method'      => '1x1',
        'mode'        => 'relax',
        'quality'     => 100,
        'badge'       => 'Premium',
        'badge_class' => 'premium',
        'algo_label'  => '1×1 · Strict',
    ],
];

// ── Helper: run one TileAndDraw command ────────────────────────────────────
function runPreset(string $key, array $preset, string $sourceFile, int $parentId, $cnx, int $userId = 0): array
{
    global $imgFolder, $tilingFolder;

    // Return cached result if PNG still exists
    if (isset($_SESSION['tilings_generated'][$key])) {
        $s = $_SESSION['tilings_generated'][$key];
        if (!($s['failed'] ?? false) && file_exists(__DIR__ . '/' . $imgFolder . $s['png'])) {
            return $s;
        }
    }

    $baseName      = 'preset_' . $key . '_' . $parentId;
    $finalPngName  = $baseName;
    $finalTxtName  = $baseName . '.txt';
    $inputPath     = __DIR__ . '/' . $imgFolder    . $sourceFile;
    $outputPngPath = __DIR__ . '/' . $imgFolder    . $finalPngName;
    $outputTxtPath = __DIR__ . '/' . $tilingFolder . $finalTxtName;
    $jarPath       = __DIR__ . '/brain.jar';
    $exePath       = __DIR__ . '/C_tiler';

    $javaCmd = 'java';
    if (strtoupper(substr(PHP_OS, 0, 3)) === 'WIN') {
        $javaCmd = '"C:\\Program Files\\Eclipse Adoptium\\jdk-25.0.1.8-hotspot\\bin\\java.exe"';
    }

    $cmdArgs = [];
    switch ($preset['method']) {
        case 'quadtree':
            $cmdArgs[] = $preset['threshold'];
            break;
        case 'tile':
            $cmdArgs[] = $preset['tileWidth'];
            $cmdArgs[] = $preset['tileHeight'];
            $cmdArgs[] = $preset['threshold'];
            break;
        default:
            break; // 1x1 — no extra args
    }

    $cmd = sprintf(
        '%s -cp %s fr.uge.univ_eiffel.TileAndDraw %s %s %s %s %s %s %s 2>&1',
        $javaCmd,
        escapeshellarg($jarPath),
        escapeshellarg($inputPath),
        escapeshellarg($outputPngPath),
        escapeshellarg($outputTxtPath),
        escapeshellarg($exePath),
        escapeshellarg($preset['method']),
        escapeshellarg($preset['mode']),
        implode(' ', array_map('escapeshellarg', $cmdArgs))
    );

    $output = [];
    $rc     = 0;

    exec($cmd, $output, $rc);


    error_log("[Preset $key] rc=$rc output=" . implode(" | ", $output));

    if ($rc !== 0 || !file_exists($outputPngPath . '.png')) {
        return ['failed' => true, 'preset_key' => $key];
    }

    // Save / update IMAGE row
    $existingId = $_SESSION['tilings_generated'][$key]['image_id'] ?? null;
    try {
        if ($existingId) {
            // Met à jour status, path ET user_id pour couvrir le cas de la régénération
            $cnx->prepare("UPDATE IMAGE SET status='LEGO', path=?, user_id=COALESCE(user_id, ?) WHERE image_id=?")
                ->execute([$finalPngName . '.png', $userId ?: null, $existingId]);
            $imageId = $existingId;
        } else {
            $cnx->prepare("INSERT INTO IMAGE (user_id, filename, path, status, img_parent) VALUES (?, ?, ?, 'LEGO', ?)")
                ->execute([$userId ?: null, 'Preset ' . $key, $finalPngName . '.png', $parentId]);
            $imageId = (int)$cnx->lastInsertId();
        }
    } catch (PDOException $e) {
        error_log("DB error preset $key: " . $e->getMessage());
        return ['failed' => true, 'preset_key' => $key];
    }

    addLog($cnx, "USER", "GENERATE", "preset_$key");

    return [
        'failed'    => false,
        'preset_key' => $key,
        'image_id'  => $imageId,
        'png'       => $finalPngName . '.png',
        'txt_name'  => $finalTxtName,
        'txt_path'  => __DIR__ . '/' . $tilingFolder . $finalTxtName,
    ];
}

// ── POST actions ───────────────────────────────────────────────────────────
if ($_SERVER['REQUEST_METHOD'] === 'POST') {

    if (!csrf_validate($_POST['csrf'] ?? null)) {
        $errors[] = 'Invalid session.';
    } else {

        $action = $_POST['action'] ?? '';

        // GENERATE ALL
        if ($action === 'generate') {
            if (!isset($_SESSION['tilings_generated'])) $_SESSION['tilings_generated'] = [];
            foreach ($PRESETS as $key => $preset) {
                $currentUserId = (int)($_SESSION['userId'] ?? 0);
                $_SESSION['tilings_generated'][$key] = runPreset($key, $preset, $sourceFile, $parentId, $cnx, $currentUserId);
            }
            $_SESSION['tilings_parent_id'] = $parentId;
            session_write_close();
            ob_end_clean();
            header("Location: tiling_selection.php");
            exit;
        }

        // ADD SELECTED TO CART
        if ($action === 'add_to_cart') {
            $selected = $_POST['selected_presets'] ?? [];
            if (empty($selected)) {
                $errors[] = 'Please select at least one tiling.';
            } else {
                $cartItems = [];
                foreach ($selected as $key) {
                    $t = $_SESSION['tilings_generated'][$key] ?? null;
                    if ($t && !($t['failed'] ?? true)) {
                        $cartItems[] = $t;
                    }
                }

                if (empty($cartItems)) {
                    $errors[] = 'Selected tilings are not available. Please regenerate.';
                } else {
                    $userId = (int)($_SESSION['userId'] ?? 0);
                    if (!$userId) {
                        // Save pending cart articles (with pre-calculed prices)
                        // To insert them as soon as the user is connected
                        $_SESSION['pending_cart_items']   = $cartItems;
                        $_SESSION['redirect_after_login'] = 'cart.php';
                        session_write_close();
                        ob_end_clean();
                        header("Location: auth.php");
                        exit;
                    }

                    try {
                        $cnx->beginTransaction();

                        // 1. Find or create the draft ORDER_BILL for this user
                        $stmt = $cnx->prepare("SELECT order_id FROM ORDER_BILL WHERE user_id = ? AND created_at IS NULL LIMIT 1");
                        $stmt->execute([$userId]);
                        $orderId = $stmt->fetchColumn();

                        if (!$orderId) {
                            $cnx->prepare("INSERT INTO ORDER_BILL (user_id) VALUES (?)")->execute([$userId]);
                            $orderId = (int)$cnx->lastInsertId();
                        }

                        // 2. For each selected preset, insert into TILLING + contain
                        foreach ($cartItems as $item) {
                            $imageId  = (int)$item['image_id'];
                            $txtName  = $item['txt_name'];  // e.g. "preset_balanced_42.txt"

                            // Rattache l'image LEGO à l'utilisateur connecté (protection contre cleanStorage)
                            $cnx->prepare("UPDATE IMAGE SET user_id = ? WHERE image_id = ? AND user_id IS NULL")
                                ->execute([$userId, $imageId]);
                            // Rattache aussi l'image parente — JOIN syntax pour éviter l'erreur MySQL subquery
                            $cnx->prepare("UPDATE IMAGE i1 JOIN IMAGE i2 ON i1.image_id = i2.img_parent SET i1.user_id = ? WHERE i2.image_id = ? AND i1.user_id IS NULL")
                                ->execute([$userId, $imageId]);

                            // Calcule prix et qualité depuis le fichier .txt (stockage pérenne)
                            $stats         = getTilingStats($txtName);
                            $storedPrice   = (int)($stats['price']   ?? 0);
                            $storedQuality = (float)($stats['quality'] ?? 0);
                            $item['stored_price']   = $storedPrice;
                            $item['stored_quality'] = $storedQuality;

                            // Apply discount if exists
                            $presetDiscount = $PRESETS[$key]['discount'] ?? 0;
                            if ($presetDiscount > 0) {
                                $storedPrice = (int)round($storedPrice * (1 - $presetDiscount / 100));
                            }
                            // Check if this image_id already has a TILLING row
                            $stmt = $cnx->prepare("SELECT pavage_id FROM TILLING WHERE image_id = ? LIMIT 1");
                            $stmt->execute([$imageId]);
                            $pavageId = $stmt->fetchColumn();

                            if (!$pavageId) {
                                // Insert new TILLING row avec prix et qualité
                                $cnx->prepare("INSERT INTO TILLING (image_id, pavage_txt, price, quality) VALUES (?, ?, ?, ?)")
                                    ->execute([$imageId, $txtName, $storedPrice, $storedQuality]);
                                $pavageId = (int)$cnx->lastInsertId();
                            } else {
                                // Met à jour prix et qualité si le pavage existait déjà
                                $cnx->prepare("UPDATE TILLING SET price=?, quality=? WHERE pavage_id=?")
                                    ->execute([$storedPrice, $storedQuality, $pavageId]);
                            }

                            // Check if already in the draft order (avoid duplicates)
                            $stmt = $cnx->prepare("SELECT 1 FROM contain WHERE order_id = ? AND pavage_id = ?");
                            $stmt->execute([$orderId, $pavageId]);
                            if (!$stmt->fetchColumn()) {
                                $cnx->prepare("INSERT INTO contain (order_id, pavage_id) VALUES (?, ?)")
                                    ->execute([$orderId, $pavageId]);
                            }
                        }

                        $cnx->commit();

                        // Update legacy session vars with last inserted item (for compatibility)
                        $last = end($cartItems);
                        $_SESSION['step4_image_id']   = (int)$last['image_id'];
                        $_SESSION['pavage_txt']        = $last['txt_path'];
                        $_SESSION['pavage_txt_name']   = $last['txt_name'];

                        addLog($cnx, "USER", "ADD", "cart_multi");
                        session_write_close();
                        ob_end_clean();
                        header("Location: cart.php");
                        exit;
                    } catch (PDOException $e) {
                        if ($cnx->inTransaction()) $cnx->rollBack();
                        error_log("Cart multi-insert error: " . $e->getMessage());
                        $errors[] = 'An error occurred while adding items to your cart. Please try again.';
                    }
                }
            }
        }

        // REGENERATE (clear cache)
        if ($action === 'regenerate') {
            unset($_SESSION['tilings_generated']);
            session_write_close();
            ob_end_clean();
            header("Location: tiling_selection.php");
            exit;
        }
    }
}

// ── Load stats for display ─────────────────────────────────────────────────
$generated = $_SESSION['tilings_generated'] ?? null;

// Invalide le cache si l'image source a changé
if ($generated && ($_SESSION['tilings_parent_id'] ?? null) !== $parentId) {
    unset($_SESSION['tilings_generated']);
    $generated = null;
}

if ($generated) {
    $anyValid = false;
    foreach ($generated as $key => $t) {
        if (!($t['failed'] ?? true) && isset($t['png']) && file_exists(__DIR__ . '/' . $imgFolder . $t['png'])) {
            $anyValid = true;
            break;
        }
    }
    if (!$anyValid) {
        // Ne pas effacer — garder pour afficher les cartes en erreur
    }
}
$statsCache = [];
if ($generated) {
    foreach ($generated as $key => $t) {
        if (!($t['failed'] ?? true) && isset($t['txt_name'])) {
            $statsCache[$key] = getTilingStats($t['txt_name']);
        }
    }
}
?>
<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Choose Your Tiling - Bricksy</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600&display=swap" rel="stylesheet">
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
    <link rel="stylesheet" href="style/tiling_selection.css">
    <link rel="stylesheet" href="style/all.css">
    <?php include_once("matomo_tag.php"); ?>
</head>

<body>

    <?php include("./includes/navbar.php"); ?>

    <!-- ═══ LOADING OVERLAY (cosmetic animation while server runs) ═══ -->
    <div class="page-loading-overlay" id="loadingOverlay">
        <div class="loading-spinner"></div>
        <p class="loading-title">Generating your tilings…</p>
        <div class="loading-steps" id="loadingSteps">
            <?php foreach ($PRESETS as $key => $preset): ?>
                <div class="loading-step" id="lstep-<?= $key ?>">
                    <span class="step-dot"></span>
                    <?= htmlspecialchars($preset['name']) ?>
                </div>
            <?php endforeach; ?>
        </div>
    </div>

    <!-- ═══ ZOOM MODAL ═══ -->
    <div class="zoom-modal" id="zoomModal" onclick="closeZoom()">
        <button class="zoom-close" onclick="closeZoom()">✕</button>
        <img id="zoomImg" src="" alt="Tiling zoom">
    </div>

    <div class="page-wrapper">

        <!-- ── TOP BAR ── -->
        <div class="top-bar">
            <div class="top-bar-left">
                <?php if ($sourceFile): ?>
                    <img src="<?= htmlspecialchars($imgFolder . $sourceFile) ?>" class="source-thumb" alt="Source">
                <?php endif; ?>
                <div class="top-bar-title">
                    <p class="page-title">Choose Your Tiling</p>
                    <p class="page-subtitle">
                        <?= $generated
                            ? count(array_filter($generated, fn($t) => !($t['failed'] ?? true))) . ' / ' . count($PRESETS) . ' presets generated'
                            : 'Generate 5 styles and pick your favourite' ?>
                    </p>
                </div>
            </div>
            <div class="top-bar-actions">
                <a href="filter_selection.php" class="btn btn-ghost">
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                        <line x1="19" y1="12" x2="5" y2="12" />
                        <polyline points="12 19 5 12 12 5" />
                    </svg>
                    Back
                </a>
                <?php if ($generated): ?>
                    <form method="POST" style="display:inline;">
                        <input type="hidden" name="csrf" value="<?= htmlspecialchars(csrf_get()) ?>">
                        <input type="hidden" name="action" value="regenerate">
                        <button type="submit" class="btn btn-ghost">
                            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <polyline points="23 4 23 10 17 10" />
                                <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
                            </svg>
                            Regenerate
                        </button>
                    </form>
                <?php endif; ?>
            </div>
        </div>

        <!-- ── ERRORS ── -->
        <?php if (!empty($errors)): ?>
            <div class="error-banner">
                <ul><?php foreach ($errors as $e): ?><li><?= htmlspecialchars($e) ?></li><?php endforeach; ?></ul>
            </div>
        <?php endif; ?>

        <?php if (!$generated): ?>

            <!-- Hidden form auto-submitted on DOMContentLoaded -->
            <form method="POST" id="autoGenerateForm" style="display:none;">
                <input type="hidden" name="csrf" value="<?= htmlspecialchars(csrf_get()) ?>">
                <input type="hidden" name="action" value="generate">
            </form>

        <?php else: ?>

            <form method="POST" id="cartForm">
                <input type="hidden" name="csrf" value="<?= htmlspecialchars(csrf_get()) ?>">
                <input type="hidden" name="action" value="add_to_cart">

                <div class="presets-grid">
                    <?php foreach ($PRESETS as $key => $preset):
                        $t       = $generated[$key] ?? ['failed' => true];
                        $failed  = $t['failed'] ?? true;
                        $stats   = $statsCache[$key] ?? null;
                        $rawPrice    = $stats ? (float)$stats['price'] / 100 : null;
                        $discountPct = $preset['discount'] ?? 0;
                        $finalPrice  = $rawPrice !== null ? $rawPrice * (1 - $discountPct / 100) : null;
                        $price       = $finalPrice !== null ? number_format($finalPrice, 2, '.', ' ') . ' €' : null;
                        $quality = $preset['quality']; // Qualité visuelle du preset, plus représentative que la couverture C tiler
                        $pngPath = !$failed ? __DIR__ . '/' . $imgFolder . $t['png'] : null;
                        $pngSrc  = ($pngPath && file_exists($pngPath))
                            ? $imgFolder . $t['png'] . '?t=' . filemtime($pngPath)
                            : null;
                    ?>
                        <div class="preset-card <?= $failed ? 'failed' : '' ?> <?= $key === 'balanced' && !$failed ? 'selected' : '' ?>"
                            id="card-<?= $key ?>"
                            onclick="<?= !$failed ? "toggleCard('$key')" : '' ?>">

                            <!-- Checkbox (only if not failed) -->
                            <?php if (!$failed): ?>
                                <div class="card-checkbox-wrap" onclick="event.stopPropagation()">
                                    <input type="checkbox"
                                        class="card-checkbox"
                                        name="selected_presets[]"
                                        value="<?= $key ?>"
                                        id="chk-<?= $key ?>"
                                        <?= $key === 'balanced' ? 'checked' : '' ?>
                                        onchange="syncCard('<?= $key ?>')">
                                </div>
                            <?php endif; ?>

                            <!-- Badge -->
                            <span class="card-badge <?= htmlspecialchars($preset['badge_class']) ?>">
                                <?= htmlspecialchars($preset['badge']) ?>
                            </span>

                            <!-- Preview image -->
                            <div class="card-preview">
                                <?php if ($pngSrc): ?>
                                    <img src="<?= htmlspecialchars($pngSrc) ?>"
                                        alt="<?= htmlspecialchars($preset['name']) ?>"
                                        onclick="event.stopPropagation(); openZoom('<?= htmlspecialchars($pngSrc) ?>')">
                                <?php else: ?>
                                    <div class="card-preview-placeholder">
                                        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                                            <circle cx="12" cy="12" r="10" />
                                            <line x1="12" y1="8" x2="12" y2="12" />
                                            <line x1="12" y1="16" x2="12.01" y2="16" />
                                        </svg>
                                        <?= $failed ? 'Generation failed' : 'Loading…' ?>
                                    </div>
                                <?php endif; ?>
                            </div>

                            <!-- Card info -->
                            <div class="card-info">
                                <p class="card-name"><?= htmlspecialchars($preset['name']) ?></p>
                                <p class="card-desc"><?= htmlspecialchars($preset['description']) ?></p>

                                <span class="card-algo-tag">
                                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                        <polyline points="16 18 22 12 16 6" />
                                        <polyline points="8 6 2 12 8 18" />
                                    </svg>
                                    <?= htmlspecialchars($preset['algo_label']) ?>
                                </span>

                                <div class="quality-row">
                                    <span class="quality-label">Quality</span>
                                    <div class="quality-bar">
                                        <div class="quality-fill" style="width:<?= $quality ?>%"></div>
                                    </div>
                                    <span class="quality-label"><?= $quality ?>%</span>
                                </div>

                                <?php if (!$failed && $price): ?>
                                    <?php if ($discountPct > 0): ?>
                                        <p class="card-price" style="text-decoration:line-through; color:#999; font-size:0.8em; margin-bottom:2px;">
                                            <?= number_format($rawPrice, 2, '.', ' ') ?> €
                                        </p>
                                        <p class="card-price" style="display:flex; align-items:center; gap:6px;">
                                            <?= $price ?>
                                            <span style="background:#e8f5e9; color:#2e7d32; font-size:0.72em; font-weight:700; padding:2px 6px; border-radius:4px;">
                                                -<?= $discountPct ?>%
                                            </span>
                                        </p>
                                    <?php else: ?>
                                        <p class="card-price"><?= $price ?></p>
                                    <?php endif; ?>
                                <?php elseif ($failed): ?>
                                    <p class="card-price computing">Unavailable</p>
                                <?php else: ?>
                                    <p class="card-price computing">Computing…</p>
                                <?php endif; ?>
                            </div>

                        </div><!-- /preset-card -->
                    <?php endforeach; ?>
                </div><!-- /presets-grid -->

                <!-- ── PAGE FOOTER ── -->
                <div class="page-footer">
                    <p class="selection-info" id="selInfo">
                        <strong id="selCount">1</strong> tiling selected
                    </p>
                    <button type="submit" class="btn btn-success" id="addToCartBtn"
                        onclick="
                document.querySelectorAll('.card-checkbox:checked').forEach(chk => {
                _paq.push(['trackEvent', 'Pavage', 'Ajout panier', chk.value]);
                });
            ">
                        Add to basket
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
                            <line x1="3" y1="6" x2="21" y2="6" />
                            <path d="M16 10a4 4 0 0 1-8 0" />
                        </svg>
                    </button>
                </div>

            </form>
        <?php endif; ?>

    </div><!-- /page-wrapper -->

    <script>
        // ── Loading overlay (cosmetic step animation) ──
        function showLoading() {
            document.getElementById('loadingOverlay').classList.add('visible');
            const steps = <?= json_encode(array_keys($PRESETS)) ?>;
            let i = 0;
            (function nextStep() {
                if (i > 0) {
                    const prev = document.getElementById('lstep-' + steps[i - 1]);
                    if (prev) {
                        prev.classList.remove('active');
                        prev.classList.add('done');
                    }
                }
                if (i < steps.length) {
                    const cur = document.getElementById('lstep-' + steps[i]);
                    if (cur) cur.classList.add('active');
                    i++;
                    setTimeout(nextStep, 1600);
                }
            })();
        }

        // ── Card toggle ──
        function toggleCard(key) {
            const chk = document.getElementById('chk-' + key);
            if (!chk) return;
            chk.checked = !chk.checked;
            document.getElementById('card-' + key).classList.toggle('selected', chk.checked);
            // Matomo : sélection ou désélection d'un pavage
            _paq.push(['trackEvent', 'Pavage', chk.checked ? 'Selection' : 'Deselection', key]);
            updateCount();
        }

        function syncCard(key) {
            const chk = document.getElementById('chk-' + key);
            document.getElementById('card-' + key).classList.toggle('selected', chk.checked);
            // Matomo : sélection ou désélection d'un pavage
            _paq.push(['trackEvent', 'Pavage', chk.checked ? 'Selection' : 'Deselection', key]);
            updateCount();
        }

        function updateCount() {
            const n = document.querySelectorAll('.card-checkbox:checked').length;
            const cnt = document.getElementById('selCount');
            if (cnt) cnt.textContent = n;
            const inf = document.getElementById('selInfo');
            if (inf) inf.innerHTML = '<strong>' + n + '</strong> tiling' + (n !== 1 ? 's' : '') + ' selected';
            const btn = document.getElementById('addToCartBtn');
            if (btn) {
                btn.disabled = (n === 0);
                btn.className = n > 0 ? 'btn btn-success' : 'btn btn-disabled';
            }
        }

        // ── Zoom modal ──
        function openZoom(src) {
            document.getElementById('zoomImg').src = src;
            document.getElementById('zoomModal').classList.add('open');
        }

        function closeZoom() {
            document.getElementById('zoomModal').classList.remove('open');
        }
        document.addEventListener('keydown', e => {
            if (e.key === 'Escape') closeZoom();
        });

        document.addEventListener('DOMContentLoaded', () => {
            updateCount();

            const autoForm = document.getElementById('autoGenerateForm');
            if (autoForm) {
                showLoading();
                setTimeout(() => autoForm.submit(), 120);
            } else {
                // Page résultat — cache l'overlay
                const overlay = document.getElementById('loadingOverlay');
                if (overlay) overlay.style.display = 'none';
            }
        });
    </script>

</body>

</html>