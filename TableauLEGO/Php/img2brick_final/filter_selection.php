<?php
session_start();
global $cnx;
include("./config/cnx.php");
require_once __DIR__ . '/includes/i18n.php';

// Redirect if prerequisite step is missing
if (!isset($_SESSION['step2_image_id'])) {
    header("Location: index.php");
    exit;
}

$parentId = $_SESSION['step2_image_id'];
$_SESSION['redirect_after_login'] = 'filter_selection.php';
$imgDir    = 'users/imgs/';
$tilingDir = 'users/tilings/';
$errors    = [];

if ($_SERVER['REQUEST_METHOD'] === 'POST') {

    if (!csrf_validate($_POST['csrf'] ?? null)) {
        $errors[] = 'Invalid session.';
    }

    if (empty($errors)) {
        if (empty($_POST['image'])) {
            $errors[] = 'No image data received. Please try again.';
        } else {
            $imageParts = explode(";base64,", $_POST['image']);

            if (count($imageParts) < 2) {
                $errors[] = 'Invalid image format.';
            } else {
                $imageType   = explode("image/", $imageParts[0])[1];
                $imageBase64 = base64_decode($imageParts[1]);
                $filterName  = $_POST['filterName'] ?? 'Custom Filter';

                $existingId     = $_SESSION['step3_image_id'] ?? null;
                $isUpdate       = false;
                $targetFilename = null;

                if ($existingId) {
                    $stmt = $cnx->prepare("SELECT filename FROM IMAGE WHERE image_id = ? AND img_parent = ?");
                    $stmt->execute([$existingId, $parentId]);
                    $existingRow = $stmt->fetch();
                    if ($existingRow) {
                        $isUpdate       = true;
                        $targetFilename = $existingRow['filename'];
                    }
                }

                if (!$targetFilename) {
                    $targetFilename = bin2hex(random_bytes(16)) . '.' . $imageType;
                }
                $targetPath = $imgDir . $targetFilename;

                if (file_put_contents(__DIR__ . '/' . $targetPath, $imageBase64)) {
                    try {
                        if ($isUpdate) {
                            $stmt = $cnx->prepare("UPDATE IMAGE SET status = 'CUSTOM' WHERE image_id = ?");
                            $stmt->execute([$existingId]);
                            deleteDescendants($cnx, $existingId, $imgDir, $tilingDir, true);
                            unset($_SESSION['step4_image_id']);
                        } else {
                            $stmt = $cnx->prepare("INSERT INTO IMAGE (user_id, filename, path, status, img_parent) VALUES (?, ?, ?, 'CUSTOM', ?)");
                            $userId = $_SESSION['userId'] ?? NULL;
                            $stmt->execute([$userId, "Image filtered", $targetFilename, $parentId]);
                            $_SESSION['step3_image_id'] = $cnx->lastInsertId();
                        }
                        addLog($cnx, "USER", "ADD", "filter");
                        header("Location: tiling_selection.php");
                        exit;
                    } catch (PDOException $e) {
                        if (!$isUpdate && file_exists(__DIR__ . '/' . $targetPath)) unlink(__DIR__ . '/' . $targetPath);
                        http_response_code(500);
                        $errors[] = 'Database Error. Try again later.';
                    }
                } else {
                    http_response_code(500);
                    $errors[] = 'Server Error: Could not save file.';
                }
            }
        }
    }
}

try {
    $stmt = $cnx->prepare("SELECT path FROM IMAGE WHERE image_id = ?");
    $stmt->execute([$parentId]);
    $image = $stmt->fetch();
    if (!$image) die("Image not found");
    $displayPath = $imgDir . $image['path'] . '?t=' . time();
} catch (PDOException $e) {
    http_response_code(500);
    die("Database Error");
}

$filters = [
    ['name' => 'Normal',        'key' => 'filter.normal',        'css' => 'none'],
    ['name' => 'Black & White', 'key' => 'filter.bw',            'css' => 'grayscale(100%)'],
    ['name' => 'Sepia',         'key' => 'filter.sepia',         'css' => 'sepia(100%)'],
    ['name' => 'Warm Red',      'key' => 'filter.warm_red',      'css' => 'contrast(1.5) sepia(100%) hue-rotate(-50deg) saturate(2)'],
    ['name' => 'Cool Blue',     'key' => 'filter.cool_blue',     'css' => 'contrast(1.2) hue-rotate(180deg)'],
    ['name' => 'High Contrast', 'key' => 'filter.high_contrast', 'css' => 'contrast(2)'],
];
?>
<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Choose a Filter — Bricksy</title>

    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600&display=swap" rel="stylesheet">
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
    <link href="style/filter_selection.css" rel="stylesheet">
    <link href="style/all.css" rel="stylesheet">
    <?php include_once("matomo_tag.php"); ?>
</head>

<body>

    <?php include("./includes/navbar.php"); ?>

    <div class="page-wrapper">

        <p class="page-title">Choose a Tint</p>

        <?php if (!empty($errors)): ?>
            <div class="error-banner">
                <ul>
                    <?php foreach ($errors as $err): ?>
                        <li><?= htmlspecialchars($err) ?></li>
                    <?php endforeach; ?>
                </ul>
            </div>
        <?php endif; ?>

        <form method="POST" id="filterForm" style="display:none;">
            <input type="hidden" name="csrf" value="<?= htmlspecialchars(csrf_get()) ?>">
            <input type="hidden" name="image" id="hiddenImage">
            <input type="hidden" name="filterName" id="hiddenFilterName">
        </form>

        <img id="sourceImage" src="<?= htmlspecialchars($displayPath) ?>" style="display:none;" crossorigin="anonymous">

        <div class="cards-grid">
            <?php foreach ($filters as $f): ?>
                <?php $displayName = tr($f['key'], $f['name']); ?>

                <div class="filter-card"
                    onclick="openModal('<?= htmlspecialchars($displayPath) ?>', '<?= htmlspecialchars($f['css']) ?>', '<?= htmlspecialchars($f['name']) ?>')">

                    <div class="card-header-custom"><?= htmlspecialchars($displayName) ?></div>

                    <div class="preview-box">
                        <img src="<?= htmlspecialchars($displayPath) ?>"
                            style="filter: <?= htmlspecialchars($f['css']) ?>;"
                            alt="<?= htmlspecialchars($displayName) ?>"
                            onclick="event.stopPropagation(); openModal(this.src, '<?= htmlspecialchars($f['css']) ?>', '<?= htmlspecialchars($f['name']) ?>')">
                        <span class="zoom-hint">🔍 zoom</span>
                    </div>

                    <div class="card-footer-custom">
                        <button type="button" class="btn-select"
                            onclick="event.stopPropagation(); selectFilter('<?= htmlspecialchars($f['css']) ?>', '<?= htmlspecialchars($f['name']) ?>')">
                            Select this
                        </button>
                    </div>
                </div>

            <?php endforeach; ?>
        </div>

        <div class="page-footer">
            <a href="downscale_selection.php" class="btn-back">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                    <line x1="19" y1="12" x2="5" y2="12" />
                    <polyline points="12 19 5 12 12 5" />
                </svg>
                Back
            </a>
            <span class="footer-hint">6 filters available</span>
        </div>

    </div>

    <div id="imgModal">
        <span class="close" onclick="closeModal()">&times;</span>
        <div style="text-align:center; margin-bottom: 12px;">
            <span id="modalFilterLabel" style="color:#fff; font-size:0.75rem; letter-spacing:0.18em; text-transform:uppercase; display:block; margin-bottom:10px;"></span>
            <button id="modalSelectBtn" class="modal-select-btn" onclick="confirmFilterFromModal()">Select this</button>
        </div>
        <img class="modal-content" id="modalImg" alt="">
    </div>

    <canvas id="hiddenCanvas" style="display:none;"></canvas>

    <script>

        const sourceImg = document.getElementById('sourceImage');
        const canvas = document.getElementById('hiddenCanvas');
        const form = document.getElementById('filterForm');

        let _currentFilterCss = '';
        let _currentFilterName = '';

        function selectFilter(filterCss, filterName) {
            const ctx = canvas.getContext('2d');
            canvas.width = sourceImg.naturalWidth;
            canvas.height = sourceImg.naturalHeight;
            ctx.filter = filterCss;
            ctx.drawImage(sourceImg, 0, 0, canvas.width, canvas.height);
            document.getElementById('hiddenImage').value = canvas.toDataURL('image/png');
            document.getElementById('hiddenFilterName').value = filterName;
            form.submit();
        }

        function confirmFilterFromModal() {
            selectFilter(_currentFilterCss, _currentFilterName);
        }

        function openModal(src, filterCss, filterName) {
            _currentFilterCss = filterCss || '';
            _currentFilterName = filterName || '';

            document.getElementById("imgModal").style.display = "block";
            const modalImg = document.getElementById("modalImg");
            modalImg.src = src;
            modalImg.style.filter = filterCss;
            
            const label = document.getElementById('modalFilterLabel');
            if (label) label.textContent = filterName || '';
        }

        function closeModal() {
            document.getElementById("imgModal").style.display = "none";
        }

        window.onclick = function(event) {
            if (event.target === document.getElementById("imgModal")) closeModal();
        }

        document.addEventListener('keydown', e => {
            if (e.key === 'Escape') closeModal();
        });
    </script>

</body>

</html>
