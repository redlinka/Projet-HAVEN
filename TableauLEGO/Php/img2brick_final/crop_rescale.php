<?php include_once("matomo_tag.php"); ?>
<?php
session_start();
global $cnx;
include("./config/cnx.php");
require_once __DIR__ . '/includes/i18n.php';

// Redirect to home if no previous image step exists
if (!isset($_SESSION['step0_image_id'])) {
    header("Location: index.php");
    exit;
}

$parentId = $_SESSION['step0_image_id'];
$_SESSION['redirect_after_login'] = 'crop_selection.php';
$imgDir    = 'users/imgs/';
$tilingDir = 'users/tilings/';
$errors    = [];

if ($_SERVER['REQUEST_METHOD'] === 'POST') {

    if (!csrf_validate($_POST['csrf'] ?? null)) {
        $errors[] = 'Invalid session (CSRF). Please refresh and try again.';
    }

    if (empty($errors)) {
        if (empty($_POST['image'])) {
            $errors[] = 'No image data received.';
        } else {
            $imageParts = explode(";base64,", $_POST['image']);

            if (count($imageParts) < 2) {
                $errors[] = "Invalid image format.";
            } else {
                $width  = (int)($_POST['width']  ?? 0);
                $height = (int)($_POST['height'] ?? 0);

                if ($width < 16 || $height < 16)             $errors[] = "Dimensions must be at least 16x16.";
                if ($width % 16 !== 0 || $height % 16 !== 0) $errors[] = "Dimensions must be multiples of 16.";
                if ($width > 1024 || $height > 1024)          $errors[] = "Maximum dimension is 1024 studs.";

                if (empty($errors)) {
                    $imageType   = explode("image/", $imageParts[0])[1];
                    $imageBase64 = base64_decode($imageParts[1]);

                    $existingId     = $_SESSION['step1_image_id'] ?? null;
                    $isUpdate       = false;
                    $targetFilename = null;

                    if ($existingId) {
                        $stmt = $cnx->prepare("SELECT path FROM IMAGE WHERE image_id = ? AND img_parent = ?");
                        $stmt->execute([$existingId, $parentId]);
                        $existingRow = $stmt->fetch();
                        if ($existingRow) {
                            $isUpdate = true;
                            $targetFilename = $existingRow['path'];
                        }
                    }

                    if (!$targetFilename) $targetFilename = bin2hex(random_bytes(16)) . '.' . $imageType;
                    $targetPath = $imgDir . $targetFilename;

                    if (file_put_contents(__DIR__ . '/' . $targetPath, $imageBase64)) {
                        try {
                            if ($isUpdate) {
                                $stmt = $cnx->prepare("UPDATE IMAGE SET filename = 'Cropped Image', created_at = NOW() WHERE image_id = ?");
                                $stmt->execute([$existingId]);
                                deleteDescendants($cnx, $existingId, $imgDir, $tilingDir, true);
                                unset($_SESSION['step2_image_id'], $_SESSION['step3_image_id'], $_SESSION['step4_image_id']);
                            } else {
                                $stmt = $cnx->prepare("INSERT INTO IMAGE (user_id, filename, path, created_at, img_parent) VALUES (:user_id, 'Cropped Image', :path, NOW(), :img_parent)");
                                $userId = $_SESSION['userId'] ?? NULL;
                                $stmt->execute([':user_id' => $userId, ':path' => $targetFilename, ':img_parent' => $parentId]);
                                $_SESSION['step1_image_id'] = $cnx->lastInsertId();
                            }

                            $_SESSION['target_width']  = $width;
                            $_SESSION['target_height'] = $height;

                            addLog($cnx, "USER", "CROP",   "image");
                            addLog($cnx, "USER", "CHOOSE", "dimensions");
                            csrf_rotate();

                            header("Location: downscale_selection.php");
                            exit;
                        } catch (PDOException $e) {
                            if (!$isUpdate && file_exists(__DIR__ . '/' . $targetPath)) unlink(__DIR__ . '/' . $targetPath);
                            http_response_code(500);
                            $errors[] = "Database error: " . $e->getMessage();
                        }
                    } else {
                        http_response_code(500);
                        $errors[] = "Server error: could not save cropped image.";
                    }
                }
            }
        }
    }
}

// GET: fetch source image info
try {
    $stmt = $cnx->prepare("SELECT path FROM IMAGE WHERE image_id = ?");
    $stmt->execute([$parentId]);
    $image = $stmt->fetch();
    if (!$image) {
        http_response_code(404);
        die("Image not found");
    }

    $fullSourcePath = __DIR__ . '/' . $imgDir . $image['path'];
    list($origW, $origH) = getimagesize($fullSourcePath);
    $displayPath = $imgDir . $image['path'] . '?t=' . time();
} catch (PDOException $e) {
    http_response_code(500);
    die("Database Error");
}
?>
<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Crop &amp; Rescale — Bricksy</title>

    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/cropperjs/1.5.13/cropper.min.css">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600&display=swap" rel="stylesheet">
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
    <link href="style/crop-rescale.css" rel="stylesheet">
    <link href="style/all.css" rel="stylesheet">
</head>

<body>

    <?php include("./includes/navbar.php"); ?>

    <div class="page-wrapper">

        <p class="page-title">Crop and rescale your image</p>

        <?php if (!empty($errors)): ?>
            <div class="error-banner">
                <ul>
                    <?php foreach ($errors as $err): ?>
                        <li><?= htmlspecialchars($err) ?></li>
                    <?php endforeach; ?>
                </ul>
            </div>
        <?php endif; ?>

        <div class="card">
            <div class="card-body">

                <div class="panel-left">

                    <div class="section-crop">
                        <div class="section-head">
                            <svg width="14" height="14" width="clamp(12px, 1.4vw, 18px)" height="clamp(12px, 1.4vw, 18px)" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" id="crop-icon">
                                <polyline points="6 2 6 6 2 6" />
                                <polyline points="18 22 18 18 22 18" />
                                <path d="M2 6h14a2 2 0 0 1 2 2v14" />
                                <path d="M6 2v14a2 2 0 0 0 2 2h14" />
                            </svg>
                            Crop your image
                        </div>

                        <p class="section-label">Aspect Ratio</p>

                        <div class="btn-grid-2">
                            <button type="button" class="opt-btn" id="btnSquare" onclick="setRatio(1, this)">Square</button>
                            <button type="button" class="opt-btn" id="btnRect" onclick="setRatio(16/9, this)">Rectangle</button>
                        </div>
                        <button type="button" class="opt-btn-full" id="btnFree" onclick="setRatio(NaN, this)">Free Shape</button>
                    </div>

                    <div class="section-size">
                        <p class="section-label">Mosaic size</p>

                        <button type="button" class="opt-btn-full active" id="btnRatio" onclick="setMode('ratio')">
                            Keep Ratio
                            <small>Adjust scale, preserves shape (Recommended)</small>
                        </button>

                        <div class="btn-grid-3">
                            <button type="button" class="opt-btn" id="btnSmall" onclick="setMode('small')">
                                Small <small>48x48</small>
                            </button>
                            <button type="button" class="opt-btn" id="btnMedium" onclick="setMode('medium')">
                                Medium <small>96x96</small>
                            </button>
                            <button type="button" class="opt-btn" id="btnLarge" onclick="setMode('large')">
                                Large <small>128x128</small>
                            </button>
                        </div>

                        <button type="button" class="opt-btn-full" id="btnCustom" onclick="setMode('custom')">
                            Custom size
                            <small>Manual entry (max. 1024)</small>
                        </button>

                        <div class="slider-wrap visible" id="ratioControls">
                            <div class="slider-row">
                                <span>Scale Factor</span>
                                <strong id="sliderValDisplay">64 studs</strong>
                            </div>
                            <input type="range" id="ratioSlider" min="16" max="512" step="16" value="64">
                        </div>

                        <div class="custom-inputs" id="customControls">
                            <div class="custom-field">
                                <label>Width</label>
                                <input type="number" id="customW" placeholder="64" min="16" max="1024" step="16">
                            </div>
                            <div class="custom-field">
                                <label>Height</label>
                                <input type="number" id="customH" placeholder="64" min="16" max="1024" step="16">
                            </div>
                        </div>

                        <div>
                            <span class="output-badge">
                                Output:&nbsp;<strong id="displayDims">…</strong>&nbsp;studs
                            </span>
                        </div>
                    </div>

                </div>

                <div class="panel-right">
                    <div class="preview-wrapper" id="previewWrapper">
                        <img id="cropImage"
                            src="<?= htmlspecialchars($displayPath) ?>"
                            crossorigin="anonymous"
                            alt="Source image">
                    </div>
                </div>

                <div class="card-footer" style="border: none;">
                    <div class="footer-left">
                        <a href="index.php" class="btn btn-ghost">Cancel</a>
                        <button type="button" class="btn btn-primary" id="btnApply">Apply</button>
                    </div>
                    <button type="button" class="btn btn-continue" id="btnContinue">
                        Continue
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                            <line x1="5" y1="12" x2="19" y2="12" />
                            <polyline points="12 5 19 12 12 19" />
                        </svg>
                    </button>
                </div>
            </div>

        </div>
    </div>

    <form method="POST" id="mainForm" style="display:none;">
        <input type="hidden" name="csrf" value="<?= htmlspecialchars(csrf_get()) ?>">
        <input type="hidden" name="image" id="hiddenImage">
        <input type="hidden" name="width" id="wInput">
        <input type="hidden" name="height" id="hInput">
    </form>

    <script src="https://cdnjs.cloudflare.com/ajax/libs/cropperjs/1.5.13/cropper.min.js"></script>

    <script>
        /* ── PHP → JS ── */
        const origW = <?= (int)$origW ?>;
        const origH = <?= (int)$origH ?>;
        const aspectRatio = origW / origH;

        /* ── State ── */
        let cropper = null;
        let currentMode = 'ratio';
        let cropApplied = false;
        let croppedBlob = null;

        /* ── Init Cropper ── */
        const imgEl = document.getElementById('cropImage');

        function initCropper() {
            if (cropper) cropper.destroy();
            cropper = new Cropper(imgEl, {
                aspectRatio: NaN,
                viewMode: 1,
                autoCropArea: 0.85,
                background: false,
                responsive: true,
                movable: true,
                zoomable: true,
            });
            cropApplied = false;
        }

        if (imgEl.complete) initCropper();
        else imgEl.onload = initCropper;

        /* ── Crop ratio buttons ── */
        const ratioButtonIds = ['btnSquare', 'btnRect', 'btnFree'];

        function setRatio(ratio, btn) {
            if (!cropper) return;
            cropper.setAspectRatio(ratio);
            cropApplied = false;
            ratioButtonIds.forEach(id => document.getElementById(id).classList.remove('active'));
            btn.classList.add('active');
        }

        /* ── Size mode buttons ── */
        const sizeButtonIds = ['btnRatio', 'btnSmall', 'btnMedium', 'btnLarge', 'btnCustom'];

        function setMode(mode) {
            currentMode = mode;
            sizeButtonIds.forEach(id => document.getElementById(id).classList.remove('active'));
            document.getElementById('btn' + mode.charAt(0).toUpperCase() + mode.slice(1)).classList.add('active');

            document.getElementById('ratioControls').classList.toggle('visible', mode === 'ratio');
            document.getElementById('customControls').classList.toggle('visible', mode === 'custom');
            calculateDimensions();
        }

        /* ── Dimension calculation ── */
        const ratioSlider = document.getElementById('ratioSlider');
        const displayDims = document.getElementById('displayDims');
        const sliderDisplay = document.getElementById('sliderValDisplay');
        const customW = document.getElementById('customW');
        const customH = document.getElementById('customH');
        const wInput = document.getElementById('wInput');
        const hInput = document.getElementById('hInput');

        function calculateDimensions() {
            let w = 0,
                h = 0;
            if (currentMode === 'small') {
                w = 48;
                h = 48;
            } else if (currentMode === 'medium') {
                w = 96;
                h = 96;
            } else if (currentMode === 'large') {
                w = 128;
                h = 128;
            } else if (currentMode === 'custom') {
                w = parseInt(customW.value) || 0;
                h = parseInt(customH.value) || 0;
            } else {
                const long = parseInt(ratioSlider.value);
                if (origW >= origH) {
                    w = long;
                    h = Math.max(16, Math.round((long / aspectRatio) / 16) * 16);
                } else {
                    h = long;
                    w = Math.max(16, Math.round((long * aspectRatio) / 16) * 16);
                }
                sliderDisplay.textContent = long + ' studs';
            }
            displayDims.textContent = w + ' x ' + h;
            wInput.value = w;
            hInput.value = h;
        }

        ratioSlider.addEventListener('input', calculateDimensions);

        function enforce16(e) {
            let v = parseInt(e.target.value) || 16;
            v = Math.round(v / 16) * 16;
            v = Math.min(1024, Math.max(16, v));
            e.target.value = v;
            calculateDimensions();
        }
        customW.addEventListener('change', enforce16);
        customH.addEventListener('change', enforce16);
        customW.addEventListener('keyup', calculateDimensions);
        customH.addEventListener('keyup', calculateDimensions);

        /* ── APPLY: freeze crop, show result ── */
        document.getElementById('btnApply').addEventListener('click', () => {
            if (!cropper) return;
            const canvas = cropper.getCroppedCanvas({
                maxWidth: 2048,
                maxHeight: 2048
            });
            if (!canvas) return;

            croppedBlob = canvas.toDataURL('image/png', 0.9);
            cropper.destroy();
            cropper = null;

            imgEl.src = croppedBlob;
            imgEl.style.cursor = 'pointer';
            imgEl.title = 'Click to re-crop';
            imgEl.onclick = () => {
                initCropper();
                cropApplied = false;
                imgEl.onclick = null;
                imgEl.title = '';
                imgEl.style.cursor = '';
            };
            cropApplied = true;
            ratioButtonIds.forEach(id => document.getElementById(id).classList.remove('active'));
        });

        /* ── CONTINUE: validate then submit ── */
        document.getElementById('btnContinue').addEventListener('click', () => {
            function submit(dataUrl) {
                const w = parseInt(wInput.value) || 0;
                const h = parseInt(hInput.value) || 0;
                if (!dataUrl) {
                    alert('Please apply a crop before continuing.');
                    return;
                }
                if (w < 16 || h < 16) {
                    alert('Please select a valid mosaic size.');
                    return;
                }
                document.getElementById('hiddenImage').value = dataUrl;
                document.getElementById('btnContinue').disabled = true;
                document.getElementById('btnContinue').textContent = 'Processing…';
                document.getElementById('mainForm').submit();
            }

            if (cropApplied && croppedBlob) {
                submit(croppedBlob);
            } else if (cropper) {
                const canvas = cropper.getCroppedCanvas({
                    maxWidth: 2048,
                    maxHeight: 2048
                });
                if (!canvas) {
                    alert('Could not process image.');
                    return;
                }
                submit(canvas.toDataURL('image/png', 0.9));
            } else {
                submit(croppedBlob);
            }
        });

        /* ── Init ── */
        setMode('ratio');
    </script>

</body>

</html>
