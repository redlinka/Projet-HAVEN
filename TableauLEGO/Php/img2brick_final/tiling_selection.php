<?php
session_start();
global $cnx;
include("./config/cnx.php");
require_once __DIR__ . '/includes/i18n.php';

// Verify session prerequisites
if (!isset($_SESSION['step3_image_id'])) {
    header("Location: index.php");
    exit;
}

$parentId = $_SESSION['step3_image_id'];
$_SESSION['redirect_after_login'] = 'tiling_selection.php';
$imgFolder    = 'users/imgs/';
$tilingFolder = 'users/tilings/';
$errors       = [];
$previewImage = null;

if (isset($_GET['error'])) {
    if ($_GET['error'] === 'missing_files') {
        $errors[] = tr('errors.cart_missing_files', 'Required processing files are missing. Please regenerate the preview.');
    }
}

// Retrieve source image filename
$stmt = $cnx->prepare("SELECT path FROM IMAGE WHERE image_id = ?");
$stmt->execute([$parentId]);
$sourceFile = $stmt->fetchColumn();

// Process generation request
if ($_SERVER['REQUEST_METHOD'] === 'POST') {

    if (!csrf_validate($_POST['csrf'] ?? null)) {
        $errors[] = 'Invalid session.';
    } else {
        $method    = $_POST['method']    ?? 'quadtree';
        $mode      = $_POST['mode']      ?? 'relax';
        $threshold = (int)($_POST['threshold'] ?? 2000);

        $ALLOWED_TILES = [
            [1,1],[1,2],[1,3],[1,4],[1,5],[1,6],[1,8],[1,10],[1,12],
            [2,2],[2,3],[2,4],[2,6],[2,8],[2,10],[2,12],[2,14],[2,16],
            [3,3],[4,4],[4,6],[4,8],[4,10],[4,12],
            [6,6],[6,8],[6,10],[6,12],[6,14],[6,16],[6,24],
            [8,8],[8,11],[8,16],[16,16]
        ];

        $tileSize = $_POST['tileSize'] ?? null;

        if ($method === 'tile') {
            if (!$tileSize || !preg_match('/^\d+x\d+$/', $tileSize)) {
                $errors[] = "Invalid tile size.";
            } else {
                [$tileWidth, $tileHeight] = array_map('intval', explode('x', $tileSize));
                $isAllowed = false;
                foreach ($ALLOWED_TILES as [$w, $h]) {
                    if ($w === $tileWidth && $h === $tileHeight) { $isAllowed = true; break; }
                }
                if (!$isAllowed) $errors[] = "Tile size not allowed.";
            }
        }

        $cmdArgs = [];
        switch ($method) {
            case '1x1':      break;
            case 'quadtree': $cmdArgs[] = $threshold; break;
            case 'tile':     $cmdArgs[] = $tileWidth; $cmdArgs[] = $tileHeight; $cmdArgs[] = $threshold; break;
        }

        $existingId = $_SESSION['step4_image_id'] ?? null;
        $isUpdate   = false;
        $baseName   = null;

        if ($existingId) {
            $stmt = $cnx->prepare("SELECT path FROM IMAGE WHERE image_id = ? AND img_parent = ?");
            $stmt->execute([$existingId, $parentId]);
            $existingRow = $stmt->fetch();
            if ($existingRow) {
                $isUpdate = true;
                $baseName = pathinfo($existingRow['path'], PATHINFO_FILENAME);
            }
        }

        if (!$baseName) $baseName = bin2hex(random_bytes(16));

        $finalPngName  = $baseName;
        $finalTxtName  = $baseName . '.txt';
        $inputPath     = __DIR__ . '/' . $imgFolder    . $sourceFile;
        $outputPngPath = __DIR__ . '/' . $imgFolder    . $finalPngName;
        $outputTxtPath = __DIR__ . '/' . $tilingFolder . $finalTxtName;
        $jarPath       = __DIR__ . '/brain.jar';
        $exePath       = __DIR__ . '/C_tiler';
        $catalogPath   = __DIR__ . '/catalog.txt';

        $javaCmd = 'java';
        if (strtoupper(substr(PHP_OS, 0, 3)) === 'WIN') {
            $javaCmd = '"C:\\Program Files\\Eclipse Adoptium\\jdk-25.0.1.8-hotspot\\bin\\java.exe"';
            $exePath = __DIR__ . '/C_tiler';
        }

        $cmd = sprintf(
            '%s -cp %s fr.uge.univ_eiffel.TileAndDraw %s %s %s %s %s %s %s 2>&1',
            $javaCmd,
            escapeshellarg($jarPath),
            escapeshellarg($inputPath),
            escapeshellarg($outputPngPath),
            escapeshellarg($outputTxtPath),
            escapeshellarg($exePath),
            escapeshellarg($method),
            escapeshellarg($mode),
            implode(' ', array_map('escapeshellarg', $cmdArgs))
        );

        $output = [];
        $returnCode = 0;
        exec($cmd, $output, $returnCode);

        if (!empty($output)) { foreach ($output as $o) error_log("Java/C Output: " . $o); }
        else error_log("Java/C Output: (no output captured)");
        error_log("Return Code: "        . $returnCode);
        error_log("Command: "            . $cmd);
        error_log("PNG exists: "         . (file_exists($outputPngPath) ? 'YES' : 'NO') . " - " . $outputPngPath);
        error_log("TXT exists: "         . (file_exists($outputTxtPath) ? 'YES' : 'NO') . " - " . $outputTxtPath);
        error_log("Catalog exists: "     . (file_exists($catalogPath)   ? 'YES' : 'NO') . " - " . $catalogPath);
        error_log("C_tiler exists: "     . (file_exists($exePath)       ? 'YES' : 'NO') . " - " . $exePath);
        error_log("C_tiler executable: " . (is_executable($exePath)     ? 'YES' : 'NO'));

        if ($returnCode === 0) {
            try {
                if ($isUpdate) {
                    $stmt = $cnx->prepare("UPDATE IMAGE SET status = 'LEGO' WHERE image_id = ?");
                    $stmt->execute([$existingId]);
                } else {
                    $stmt = $cnx->prepare("INSERT INTO IMAGE (user_id, filename, path, status, img_parent) VALUES (?, ?, ?, 'LEGO', ?)");
                    $userId = $_SESSION['userId'] ?? NULL;
                    $stmt->execute([$userId, 'Image Tilled', $finalPngName . ".png", $parentId]);
                    $_SESSION['step4_image_id'] = $cnx->lastInsertId();
                }

                $legoImageId             = (int)$_SESSION['step4_image_id'];
                $txtContent              = file_get_contents($outputTxtPath);
                $pavageFile              = __DIR__ . "/users/tilings/" . $finalTxtName;
                $_SESSION['pavage_txt_name'] = $finalTxtName;
                $_SESSION['pavage_txt']      = $pavageFile;

                $previewImage = $imgFolder . $finalPngName . ".png" . '?t=' . time();
                addLog($cnx, "USER", "GENERATE", "pavage");
            } catch (PDOException $e) {
                $errors[] = "A database error occurred. Please try again later.";
            }
        } else {
            $errors[] = "An error occurred during image processing. Please try again.";
        }
    }
} else {
    if (isset($_SESSION['step4_image_id'])) {
        $stmt = $cnx->prepare("SELECT path FROM IMAGE WHERE image_id = ?");
        $stmt->execute([$_SESSION['step4_image_id']]);
        $existingFile = $stmt->fetchColumn();
        if ($existingFile) $previewImage = $imgFolder . $existingFile . '?t=' . time();
        $finalTxtName = $_SESSION['pavage_txt_name'];
    }
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Generate LEGO Tiling — Bricksy</title>

    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600&display=swap" rel="stylesheet">
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
    <link rel="stylesheet" href="style/tiling.css">
    <link rel="stylesheet" href="style/all.css">
</head>
<body>

<?php include("./includes/navbar.php"); ?>

<div class="page-wrapper">

    <p class="page-title">Tiling Optimization</p>

    <?php if (!empty($errors)): ?>
    <div class="error-banner">
        <ul>
            <?php foreach ($errors as $e): ?>
                <li><?= htmlspecialchars($e) ?></li>
            <?php endforeach; ?>
        </ul>
    </div>
    <?php endif; ?>

    <div class="card">
        <div class="card-body">

            <!-- ══ LEFT: PREVIEW ══ -->
            <div class="panel-preview">
                <div class="preview-wrapper">
                    <?php if ($previewImage): ?>
                        <img src="<?= htmlspecialchars($previewImage) ?>"
                             class="lego-img"
                             onclick="openModal(this.src)"
                             alt="LEGO tiling preview">
                    <?php else: ?>
                        <div class="preview-placeholder">
                            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                                <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/>
                                <polyline points="21 15 16 10 5 21"/>
                            </svg>
                            Preview will appear here
                        </div>
                    <?php endif; ?>
                </div>

                <?php if ($previewImage && isset($finalTxtName)): ?>
                <div class="stats-badge">
                    <strong><?= number_format(getTilingStats($finalTxtName)['price'] / 100, 2, '.', ' ') ?>€</strong>
                    <span class="stats-sep">·</span>
                    <span><?= getTilingStats($finalTxtName)['quality'] ?>% quality</span>
                </div>
                <?php endif; ?>
            </div>

            <!-- ══ RIGHT: CONTROLS ══ -->
            <div class="panel-controls">
                <form method="POST" id="tilingForm">
                    <input type="hidden" name="csrf"      value="<?= htmlspecialchars(csrf_get()) ?>">
                    <input type="hidden" name="threshold" id="thresholdInput" value="2000">

                    <div class="controls-scroll">

                        <!-- 1. Method -->
                        <div>
                            <p class="section-label">1. Method</p>
                            <select id="algorithmSelect" name="method" class="ctrl-select"
                                    onchange="toggleAlgorithmParams()">
                                <option value="1x1">1×1 — No extra args</option>
                                <option value="quadtree" selected>Quadtree — Threshold</option>
                                <option value="tile">Tile — Width, Height, Threshold</option>
                            </select>
                        </div>

                        <!-- 2. Dynamic params -->
                        <div id="algoParams"></div>

                        <!-- 3. Mode -->
                        <div>
                            <p class="section-label">Mode</p>
                            <select name="mode" class="ctrl-select">
                                <option value="relax">Relax</option>
                                <option value="strict">Strict</option>
                            </select>
                        </div>

                        <!-- Generate button (inside scroll area so it's always reachable) -->
                        <button type="submit" class="btn-generate">
                            <?= $previewImage ? 'Regenerate Preview' : 'Generate Preview' ?>
                        </button>

                    </div><!-- /controls-scroll -->
                </form>
            </div><!-- /panel-controls -->

        </div><!-- /card-body -->

        <!-- ══ FOOTER ══ -->
        <div class="card-footer">
            <a href="filter_selection.php" class="btn btn-ghost">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                    <line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/>
                </svg>
                Back
            </a>

            <?php if ($previewImage): ?>
                <a href="add_cart.php" class="btn btn-success">
                    Add to basket
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                        <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
                    </svg>
                </a>
            <?php else: ?>
                <span class="btn btn-disabled">Add to basket</span>
            <?php endif; ?>
        </div>

    </div><!-- /card -->
</div><!-- /page-wrapper -->

<!-- Modal — original structure preserved -->
<div id="imgModal" onclick="closeModal()">
    <span class="close">&times;</span>
    <img class="modal-content" id="modalImg" alt="">
</div>

<script>
    const thresholdInput = document.getElementById('thresholdInput');

    /* ── These are set inside toggleAlgorithmParams when needed ── */
    let presetBtns = [];
    let customDiv  = null;
    let customNum  = null;

    /* ── Original function — untouched ── */
    function toggleAlgorithmParams() {
        const algo      = document.getElementById('algorithmSelect').value;
        const container = document.getElementById('algoParams');
        container.innerHTML = '';

        if (algo === 'quadtree') {
            container.innerHTML = `
                <p class="section-label">2. Budget / Precision</p>
                <div class="preset-group">
                    <button type="button" class="preset-btn" onclick="setThreshold(1000, this)">
                        <strong data-i18n="tiling.preset_high">High Detail</strong>
                        <small data-i18n="tiling.preset_high_hint">Threshold: 1,000</small>
                    </button>
                    <button type="button" class="preset-btn active" onclick="setThreshold(2000, this)">
                        <strong data-i18n="tiling.preset_balanced">Balanced</strong>
                        <small data-i18n="tiling.preset_balanced_hint">Threshold: 2,000 (Recommended)</small>
                    </button>
                    <button type="button" class="preset-btn" onclick="setThreshold(100000, this)">
                        <strong data-i18n="tiling.preset_minimal">Minimal Price</strong>
                        <small data-i18n="tiling.preset_minimal_hint">Threshold: 100,000 (Abstract)</small>
                    </button>
                    <button type="button" class="preset-btn" id="customBtn" onclick="enableCustom()">
                        <strong data-i18n="tiling.preset_custom">Custom Value</strong>
                        <small data-i18n="tiling.preset_custom_hint">Enter manually…</small>
                    </button>
                </div>
                <div class="custom-input-row" id="customInputDiv">
                    <input type="number" id="customNumber" placeholder="e.g. 5000"
                           data-i18n-attr="placeholder:tiling.custom_placeholder">
                    <button class="btn-set" type="button" onclick="applyCustom()"
                            data-i18n="tiling.custom_set">Set</button>
                </div>
            `;

            presetBtns = container.querySelectorAll('.preset-btn');
            customDiv  = document.getElementById('customInputDiv');
            customNum  = document.getElementById('customNumber');
            customNum.addEventListener('input', (e) => { thresholdInput.value = e.target.value; });

        } else if (algo === 'tile') {
            container.innerHTML = `
                <p class="section-label">2. Tile Size</p>
                <select name="tileSize" class="ctrl-select" required>
                    <option value="">— Choose a tile size —</option>
                    <optgroup label="1×">
                        <option value="1x1">1 × 1</option><option value="1x2">1 × 2</option>
                        <option value="1x3">1 × 3</option><option value="1x4">1 × 4</option>
                        <option value="1x5">1 × 5</option><option value="1x6">1 × 6</option>
                        <option value="1x8">1 × 8</option><option value="1x10">1 × 10</option>
                        <option value="1x12">1 × 12</option>
                    </optgroup>
                    <optgroup label="2×">
                        <option value="2x2">2 × 2</option><option value="2x3">2 × 3</option>
                        <option value="2x4">2 × 4</option><option value="2x6">2 × 6</option>
                        <option value="2x8">2 × 8</option><option value="2x10">2 × 10</option>
                        <option value="2x12">2 × 12</option><option value="2x14">2 × 14</option>
                        <option value="2x16">2 × 16</option>
                    </optgroup>
                    <optgroup label="3×"><option value="3x3">3 × 3</option></optgroup>
                    <optgroup label="4×">
                        <option value="4x4">4 × 4</option><option value="4x6">4 × 6</option>
                        <option value="4x8">4 × 8</option><option value="4x10">4 × 10</option>
                        <option value="4x12">4 × 12</option>
                    </optgroup>
                    <optgroup label="6×">
                        <option value="6x6">6 × 6</option><option value="6x8">6 × 8</option>
                        <option value="6x10">6 × 10</option><option value="6x12">6 × 12</option>
                        <option value="6x14">6 × 14</option><option value="6x16">6 × 16</option>
                        <option value="6x24">6 × 24</option>
                    </optgroup>
                    <optgroup label="8×">
                        <option value="8x8">8 × 8</option><option value="8x11">8 × 11</option>
                        <option value="8x16">8 × 16</option>
                    </optgroup>
                    <optgroup label="16×"><option value="16x16">16 × 16</option></optgroup>
                </select>

                <div class="tile-threshold-row">
                    <p class="section-label" style="margin-top: var(--gap);">Threshold</p>
                    <input type="number" name="threshold" value="2000" min="1">
                </div>
            `;
        }
    }

    /* ── Original helper functions — untouched ── */
    function setThreshold(val, btn) {
        thresholdInput.value = val;
        customDiv.classList.remove('show');
        presetBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
    }

    function enableCustom() {
        presetBtns.forEach(b => b.classList.remove('active'));
        document.getElementById('customBtn').classList.add('active');
        customDiv.classList.add('show');
        customNum.focus();
    }

    function applyCustom() {
        const val = customNum.value;
        if (val && val > 0) {
            thresholdInput.value = val;
        } else {
            alert(window.I18N?.t?.('tiling.valid_number', 'Please enter a valid number') ?? 'Please enter a valid number');
        }
    }

    function openModal(src) {
        document.getElementById("imgModal").style.display = "block";
        document.getElementById("modalImg").src = src;
    }

    function closeModal() {
        document.getElementById("imgModal").style.display = "none";
    }

    document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });

    /* ── Init ── */
    document.addEventListener('DOMContentLoaded', toggleAlgorithmParams);
</script>

</body>
</html>