<?php
session_start();
global $cnx;
include("./config/cnx.php");
require_once __DIR__ . '/includes/i18n.php';

// Check session prerequisites
if (!isset($_SESSION['step1_image_id']) || !isset($_SESSION['target_width'])) {
    header("Location: index.php");
    exit;
}

$parentId = $_SESSION['step1_image_id'];
$_SESSION['redirect_after_login'] = 'downscale_selection.php';
$width  = $_SESSION['target_width'];
$height = $_SESSION['target_height'];
$imgDir    = 'users/imgs/';
$tilingDir = 'users/tilings/';
$errors = [];
$algos  = ['nearest', 'bilinear', 'bicubic'];
$generatedImages = [];

// Retrieve parent image file
$stmt = $cnx->prepare("SELECT path FROM IMAGE WHERE image_id = ?");
$stmt->execute([$parentId]);
$sourceFile = $stmt->fetchColumn();

// Generate downscaled variations
$jarPath = realpath(__DIR__ . '/brain.jar');
$sourcePath = __DIR__ . '/' . $imgDir . $sourceFile;
$libDir = realpath(__DIR__ . '/lib');

if (!$sourceFile || !file_exists($sourcePath)) {
    unset($_SESSION['step1_image_id']);
    header("Location: index.php");
    exit;
}
if (!$jarPath || !file_exists($jarPath)) {
    error_log("CRITICAL: JAR not found at location: " . $jarPath);
    header("Location: index.php");
    exit;
}

$javaCmd = 'java';
if (strtoupper(substr(PHP_OS, 0, 3)) === 'WIN') {
    $preferredJava = 'C:\\Program Files\\Eclipse Adoptium\\jdk-25.0.1.8-hotspot\\bin\\java.exe';
    if (file_exists($preferredJava)) {
        $javaCmd = '"' . $preferredJava . '"';
    }
}

if (empty($errors)) {
    if (!file_exists($jarPath))    $errors[] = "File Error: brain.jar not found at: " . $jarPath;
    if (!file_exists($sourcePath)) $errors[] = "File Error: source image not found at: " . $sourcePath;
}

if (empty($errors)) {
    foreach ($algos as $algo) {
        $tempName = 'temp_' . $algo . '_' . $parentId;
        $destPath = __DIR__ . '/' . $imgDir . $tempName;
        $cp = $jarPath . PATH_SEPARATOR . $libDir . DIRECTORY_SEPARATOR . '*';

        $cmd = sprintf(
            '%s -cp %s fr.uge.univ_eiffel.ImageRescaler %s %s %d %d %s 2>&1',
            $javaCmd,
            escapeshellarg($cp),
            escapeshellarg($sourcePath),
            escapeshellarg($destPath),
            (int)$width,
            (int)$height,
            escapeshellarg($algo)
        );

        $output = [];
        $returnCode = 0;
        exec($cmd, $output, $returnCode);

        if ($returnCode === 0) {
            $generatedImages[$algo] = $tempName . '.png?t=' . time();
        } else {
            $errors[] = "Failed to generate $algo: " . implode(" ", $output);
        }
    }
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    if (!csrf_validate($_POST['csrf'] ?? null)) {
        $errors[] = 'Invalid session.';
    } elseif (!isset($_POST['selected_algo'])) {
        $errors[] = 'Please select an image.';
    } else {
        $selectedAlgo = $_POST['selected_algo'];
        $selectedFilenameRaw = explode('?', $generatedImages[$selectedAlgo] ?? '')[0];

        if ($selectedFilenameRaw && file_exists(__DIR__ . '/' . $imgDir . $selectedFilenameRaw)) {

            $existingId = $_SESSION['step2_image_id'] ?? null;
            $isUpdate = false;
            $finalName = null;

            if ($existingId) {
                $stmt = $cnx->prepare("SELECT path FROM IMAGE WHERE image_id = ? AND img_parent = ?");
                $stmt->execute([$existingId, $parentId]);
                $existingRow = $stmt->fetch(PDO::FETCH_ASSOC);
                if ($existingRow && !empty($existingRow['path'])) {
                    $isUpdate  = true;
                    $finalName = $existingRow['path'];
                }
            }

            if (!$finalName) $finalName = bin2hex(random_bytes(16)) . '.png';

            $finalPath = __DIR__ . '/' . $imgDir . $finalName;
            $tempPath  = __DIR__ . '/' . $imgDir . $selectedFilenameRaw;

            if (rename($tempPath, $finalPath)) {
                try {
                    if ($isUpdate) {
                        $stmt = $cnx->prepare("UPDATE IMAGE SET filename = ?, created_at = NOW() WHERE image_id = ?");
                        $stmt->execute([$selectedAlgo, $existingId]);
                        deleteDescendants($cnx, $existingId, $imgDir, $tilingDir, true);
                        unset($_SESSION['step3_image_id']);
                    } else {
                        $stmt = $cnx->prepare("INSERT INTO IMAGE (user_id, filename, path, created_at, img_parent) VALUES (?, ?, ?, NOW(), ?)");
                        $userId = $_SESSION['userId'] ?? NULL;
                        $stmt->execute([$userId, $selectedAlgo, $finalName, $parentId]);
                        $_SESSION['step2_image_id'] = $cnx->lastInsertId();
                    }

                    foreach ($algos as $algo) {
                        $otherFile = 'temp_' . $algo . '_' . $parentId . '.png';
                        $otherPath = __DIR__ . '/' . $imgDir . $otherFile;
                        if (file_exists($otherPath)) unlink($otherPath);
                    }

                    csrf_rotate();
                    addLog($cnx, "USER", "DOWNSCALE", "image");
                    header("Location: filter_selection.php");
                    exit;
                } catch (PDOException $e) {
                    if (!$isUpdate && file_exists($finalPath)) unlink($finalPath);
                    $errors[] = "Database Error. Operation rolled back.";
                }
            } else {
                $errors[] = "File Error. Could not save selection.";
            }
        } else {
            $errors[] = "File Error: generated file not found.";
        }
    }
}
?>
<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Choose Interpolation — Bricksy</title>

    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600&display=swap" rel="stylesheet">
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
    <link href="style/downscale.css" rel="stylesheet">
    <link href="style/all.css" rel="stylesheet">

</head>

<body>

    <?php include("./includes/navbar.php"); ?>

    <div class="page-wrapper">

        <p class="downscale-title">Choose Your Interpolation</p>

        <?php if (!empty($errors)): ?>
            <div class="error-banner">
                <ul>
                    <?php foreach ($errors as $e): ?>
                        <li><?= htmlspecialchars($e) ?></li>
                    <?php endforeach; ?>
                </ul>
            </div>
        <?php endif; ?>

        <form method="POST" id="selectionForm">
            <input type="hidden" name="csrf" value="<?= htmlspecialchars(csrf_get()) ?>">
            <input type="hidden" name="selected_algo" id="selectedAlgoInput">
        </form>

        <div class="cards-row">
            <?php foreach ($algos as $algo): ?>
                <?php if (isset($generatedImages[$algo])): ?>

                    <div class="algo-card">
                        <div class="card-header-custom"><?= htmlspecialchars($algo) ?></div>

                        <div class="preview-box">
                            <img src="<?= htmlspecialchars($imgDir . $generatedImages[$algo]) ?>"
                                alt="<?= htmlspecialchars($algo) ?>"
                                onclick="event.stopPropagation(); openModal(this.src)">
                            <span class="zoom-hint">🔍 zoom</span>
                        </div>

                        <div class="card-footer-custom">
                            <button type="button" class="btn-select"
                                onclick="selectAlgo('<?= htmlspecialchars($algo) ?>')">
                                Select this
                            </button>
                        </div>
                    </div>

                <?php endif; ?>
            <?php endforeach; ?>
        </div>

        <div class="page-footer">
            <a href="crop_rescale.php" class="btn-back">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                    <line x1="19" y1="12" x2="5" y2="12" />
                    <polyline points="12 19 5 12 12 5" />
                </svg>
                Back
            </a>
            <span class="output-info">Output: <?= (int)$width ?> x <?= (int)$height ?> studs</span>
        </div>

    </div>

    <div id="imgModal">
        <span class="close" onclick="closeModal()">&times;</span>
        <img class="modal-content" id="modalImg" alt="" src="">
    </div>

    <script>
        function selectAlgo(algo) {
            document.getElementById('selectedAlgoInput').value = algo;
            document.getElementById('selectionForm').submit();
        }

        function openModal(src) {
            const modal = document.getElementById("imgModal");
            const modalImg = document.getElementById("modalImg");
            modal.style.display = "block";
            modalImg.src = src;
        }

        function closeModal() {
            document.getElementById("imgModal").style.display = "none";
        }

        window.onclick = function(event) {
            if (event.target === document.getElementById("imgModal")) {
                closeModal();
            }
        }

        document.addEventListener('keydown', e => {
            if (e.key === 'Escape') closeModal();
        });
    </script>
</body>

</html>