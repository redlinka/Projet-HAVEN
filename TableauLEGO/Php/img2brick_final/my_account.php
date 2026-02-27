<?php
session_start();
global $cnx;
include("./config/cnx.php");
require_once __DIR__ . '/includes/i18n.php';

if (!isset($_SESSION['userId'])) { header("Location: auth.php"); exit; }
if ($_SESSION['username'] == '4DM1N1STRAT0R_4ND_4LM16HTY') { header("Location: admin_panel.php"); exit; }

$userId  = $_SESSION['userId'];
$errors  = [];
$success = '';
if (isset($_GET['success']) && $_GET['success'] == 1)
    $success = tr('account.update_success', 'Information updated successfully!');

try {
    $stmt = $cnx->prepare("SELECT user_id, username, email, first_name, last_name, phone, birth_year FROM USER WHERE user_id = ?");
    $stmt->execute([$userId]);
    $user = $stmt->fetch(PDO::FETCH_ASSOC);
    if (!$user) { header("Location: index.php"); exit; }

    $stmtAddr = $cnx->prepare("SELECT street, postal_code, city, country FROM ADDRESS WHERE user_id = ? AND is_default = 1 LIMIT 1");
    $stmtAddr->execute([$userId]);
    $addressData = $stmtAddr->fetch(PDO::FETCH_ASSOC) ?: [];
} catch (PDOException $e) { header("Location: index.php"); }

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    if (!csrf_validate($_POST['csrf'] ?? null)) {
        $errors[] = tr('account.session_expired', 'Session expired. Please refresh.');
    } else {
        $username  = trim($_POST['username'] ?? '');
        $newEmail  = !empty($_POST['email']) ? trim($_POST['email']) : $user['email'];
        $name      = trim($_POST['name'] ?? '');
        $surname   = trim($_POST['surname'] ?? '');
        $phone     = trim($_POST['phone'] ?? '');
        $birthYear = !empty($_POST['birth_year']) ? (int)$_POST['birth_year'] : null;
        $street    = trim($_POST['street'] ?? '');
        $zip       = trim($_POST['zip'] ?? '');
        $city      = trim($_POST['city'] ?? '');
        $country   = trim($_POST['country'] ?? '');

        if (empty($username)) $errors[] = "Username is required.";
        if (empty($newEmail))  $errors[] = "Email is required.";

        if (empty($errors) && $username !== $user['username']) {
            $check = $cnx->prepare("SELECT 1 FROM USER WHERE username = ? AND user_id <> ?");
            $check->execute([$username, $userId]);
            if ($check->fetchColumn()) $errors[] = "Username '$username' is already taken.";
        }
        if (empty($errors) && $newEmail !== $user['email']) {
            $checkEmail = $cnx->prepare("SELECT 1 FROM USER WHERE email = ? AND user_id <> ?");
            $checkEmail->execute([$newEmail, $userId]);
            if ($checkEmail->fetchColumn()) $errors[] = "The email address '$newEmail' is already associated with another account.";
        }

        if (empty($errors)) {
            try {
                $cnx->beginTransaction();
                $emailChanged = ($newEmail !== $user['email']);
                $sql = "UPDATE USER SET username=?, email=?, first_name=?, last_name=?, phone=?, birth_year=?"
                     . ($emailChanged ? ", is_verified=0" : "") . " WHERE user_id=?";
                $upd = $cnx->prepare($sql);
                $upd->execute([$username, $newEmail, $name, $surname, $phone, $birthYear, $userId]);

                $stmtCheck = $cnx->prepare("SELECT address_id FROM ADDRESS WHERE user_id = ? AND is_default = 1 LIMIT 1");
                $stmtCheck->execute([$userId]);
                $existingAddressId = $stmtCheck->fetchColumn();
                if ($existingAddressId) {
                    $cnx->prepare("UPDATE ADDRESS SET street=?, postal_code=?, city=?, country=? WHERE address_id=?")
                        ->execute([$street, $zip, $city, $country, $existingAddressId]);
                } else {
                    $cnx->prepare("INSERT INTO ADDRESS (street, postal_code, city, country, user_id, is_default) VALUES (?,?,?,?,?,1)")
                        ->execute([$street, $zip, $city, $country, $userId]);
                }

                if ($emailChanged) {
                    $token = bin2hex(random_bytes(32));
                    $expire_at = date('Y-m-d H:i:s', time() + 60);
                    $cnx->prepare("DELETE FROM 2FA WHERE user_id=?")->execute([$userId]);
                    $cnx->prepare("INSERT INTO 2FA (user_id, verification_token, token_expire_at) VALUES (?,?,?)")->execute([$userId, $token, $expire_at]);
                    $protocol = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off' || $_SERVER['SERVER_PORT'] == 443) ? "https://" : "http://";
                    $link = $protocol . $_SERVER['HTTP_HOST'] . dirname($_SERVER['PHP_SELF']) . '/verify_connexion.php?token=' . $token;
                    $emailBody = "<div style='font-family:Arial,sans-serif;padding:20px;border:1px solid #e0e0e0;border-radius:8px;max-width:600px;'><h2 style='color:#8B5E3C;'>Verify Your New Email Address</h2><p>Click below to verify your new email:</p><p style='text-align:center;'><a href='{$link}' style='display:inline-block;background:#8B5E3C;color:white;padding:12px 24px;text-decoration:none;border-radius:5px;font-weight:bold;'>Verify My Email</a></p><p style='color:#6c757d;font-size:12px;margin-top:20px;'>Or copy: {$link}</p></div>";
                    sendMail($newEmail, 'Verify your new email address - Bricksy', $emailBody);
                    $success = "Information updated. A verification link has been sent to your new email.";
                }

                $cnx->commit();
                $success = $success ?: tr('account.update_success', 'Information updated successfully!');
                $_SESSION['email']    = $newEmail;
                $_SESSION['username'] = $username;
                header("Location: my_account.php?success=1");
                exit;
            } catch (PDOException $e) {
                $cnx->rollBack();
                $errors[] = "Database error.";
            }
        }
    }
}

$user = [
    'username'   => ($_SERVER['REQUEST_METHOD'] === 'POST') ? $username : $user['username'],
    'email'      => $user['email'],
    'name'       => ($_SERVER['REQUEST_METHOD'] === 'POST') ? $name    : $user['first_name'],
    'surname'    => ($_SERVER['REQUEST_METHOD'] === 'POST') ? $surname : $user['last_name'],
    'phone'      => ($_SERVER['REQUEST_METHOD'] === 'POST') ? $phone   : $user['phone'],
    'birth_year' => ($_SERVER['REQUEST_METHOD'] === 'POST') ? $birthYear : $user['birth_year'],
    'street'     => ($_SERVER['REQUEST_METHOD'] === 'POST') ? $street  : ($addressData['street']      ?? ''),
    'zip'        => ($_SERVER['REQUEST_METHOD'] === 'POST') ? $zip     : ($addressData['postal_code'] ?? ''),
    'city'       => ($_SERVER['REQUEST_METHOD'] === 'POST') ? $city    : ($addressData['city']        ?? ''),
    'country'    => ($_SERVER['REQUEST_METHOD'] === 'POST') ? $country : ($addressData['country']     ?? ''),
];

/* Active tab: security if no errors on form, else whichever had the error */
$activeTab = 'identity';
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>My Account — Bricksy</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600&display=swap" rel="stylesheet">
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
    <link rel="stylesheet" href="style/my_account.css">
    <link rel="stylesheet" href="style/all.css">
</head>
<body>

<?php include("./includes/navbar.php"); ?>

<div class="page-wrapper">

    <!-- ══ SIDEBAR ══ -->
    <aside class="sidebar">

        <!-- User info card -->
        <div class="user-card">
            <div class="user-avatar">
                <?= strtoupper(substr($user['username'], 0, 1)) ?>
            </div>
            <div>
                <p class="user-name"><?= htmlspecialchars($user['username']) ?></p>
                <p class="user-email"><?= htmlspecialchars($user['email']) ?></p>
            </div>
        </div>

        <!-- Nav tabs -->
        <nav class="nav-tabs-custom">
            <button class="nav-tab active" id="tab-identity" onclick="switchTab('identity')">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
                </svg>
                Identity
            </button>
            <button class="nav-tab" id="tab-stats" onclick="switchTab('stats')">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>
                </svg>
                Statistics
            </button>
            <button class="nav-tab" id="tab-delivery" onclick="switchTab('delivery')">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>
                </svg>
                Delivery
            </button>
            <button class="nav-tab danger" id="tab-security" onclick="switchTab('security')">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                </svg>
                Security
            </button>
        </nav>

    </aside>

    <!-- ══ MAIN PANEL ══ -->
    <div class="main-panel">

        <?php if ($success): ?>
        <div class="alert alert-success">✓ <?= htmlspecialchars($success) ?></div>
        <?php endif; ?>

        <?php if (!empty($errors)): ?>
        <div class="alert alert-error">
            <ul><?php foreach ($errors as $e): ?><li><?= htmlspecialchars($e) ?></li><?php endforeach; ?></ul>
        </div>
        <?php endif; ?>

        <form method="POST" id="account-form">
            <input type="hidden" name="csrf" value="<?= htmlspecialchars(csrf_get()) ?>">

            <div class="form-card">

                <!-- Card header — updated by JS -->
                <div class="form-card-head" id="panel-title">Identity</div>

                <div class="form-card-body">

                    <!-- ── IDENTITY ── -->
                    <div class="tab-panel active" id="panel-identity">
                        <div class="fields-grid">
                            <div class="field">
                                <label for="username" data-i18n="account.username">Username</label>
                                <input type="text" id="username" name="username"
                                       value="<?= htmlspecialchars($user['username']) ?>" required>
                                <span class="field-hint" data-i18n="account.username_hint">Must be unique.</span>
                            </div>
                            <div class="field">
                                <label for="email" data-i18n="account.email">Email</label>
                                <input type="text" id="email" name="email"
                                       value="<?= htmlspecialchars($user['email']) ?>" disabled>
                                <span class="field-hint" data-i18n="account.email_hint">Cannot be changed directly.</span>
                            </div>
                            <div class="field">
                                <label for="name" data-i18n="account.first_name">First Name</label>
                                <input type="text" id="name" name="name"
                                       value="<?= htmlspecialchars($user['name'] ?? '') ?>"
                                       placeholder="e.g. John (optional)">
                            </div>
                            <div class="field">
                                <label for="surname" data-i18n="account.surname">Surname</label>
                                <input type="text" id="surname" name="surname"
                                       value="<?= htmlspecialchars($user['surname'] ?? '') ?>"
                                       placeholder="e.g. Doe (optional)">
                            </div>
                        </div>
                    </div>

                    <!-- ── STATISTICS ── -->
                    <div class="tab-panel" id="panel-stats">
                        <div class="fields-grid cols-1">
                            <div class="field">
                                <label for="birth_year" data-i18n="account.birth_year">Year of Birth</label>
                                <input type="number" id="birth_year" name="birth_year"
                                       min="1900" max="<?= date('Y') ?>"
                                       value="<?= htmlspecialchars($user['birth_year'] ?? '') ?>"
                                       placeholder="YYYY">
                                <span class="field-hint" data-i18n="account.birth_year_hint">Used for age statistics only. Never shared.</span>
                            </div>
                        </div>
                    </div>

                    <!-- ── DELIVERY ── -->
                    <div class="tab-panel" id="panel-delivery">
                        <div class="fields-grid">
                            <div class="field field-full">
                                <label for="phone" data-i18n="account.phone">Phone Number</label>
                                <input type="tel" id="phone" name="phone"
                                       value="<?= htmlspecialchars($user['phone'] ?? '') ?>"
                                       placeholder="+33 6 12 34 56 78">
                            </div>
                            <div class="field field-full">
                                <label for="street" data-i18n="account.street">Street Address</label>
                                <input type="text" id="street" name="street"
                                       value="<?= htmlspecialchars($user['street'] ?? '') ?>"
                                       placeholder="123 Brick Street">
                            </div>
                            <div class="field">
                                <label for="zip" data-i18n="account.zip">Zip Code</label>
                                <input type="text" id="zip" name="zip"
                                       value="<?= htmlspecialchars($user['zip'] ?? '') ?>"
                                       placeholder="75001">
                            </div>
                            <div class="field">
                                <label for="city" data-i18n="account.city">City</label>
                                <input type="text" id="city" name="city"
                                       value="<?= htmlspecialchars($user['city'] ?? '') ?>"
                                       placeholder="Paris">
                            </div>
                            <div class="field field-full">
                                <label for="country" data-i18n="account.country">Country</label>
                                <select id="country" name="country">
                                    <option value="France"  <?= ($user['country'] === 'France'  ? 'selected' : '') ?>>France</option>
                                    <option value="Spain"   <?= ($user['country'] === 'Spain'   ? 'selected' : '') ?>>Spain</option>
                                    <option value="USA"     <?= ($user['country'] === 'USA'     ? 'selected' : '') ?>>USA</option>
                                    <option value="UK"      <?= ($user['country'] === 'UK'      ? 'selected' : '') ?>>UK</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    <!-- ── SECURITY ── -->
                    <div class="tab-panel" id="panel-security">
                        <p class="security-note" data-i18n="account.security_hint">
                            Need to change your password? We'll send a secure reset link to your registered email address.
                        </p>
                        <a href="password_forgotten.php" class="btn-danger-outline" data-i18n="account.reset_password">
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                            </svg>
                            Reset Password
                        </a>
                    </div>

                </div><!-- /form-card-body -->

                <!-- Footer — hidden on security tab -->
                <div class="form-card-footer" id="form-footer">
                    <button type="submit" class="btn-submit" data-i18n="account.update">
                        Save Changes
                    </button>
                </div>

            </div><!-- /form-card -->
        </form>

    </div><!-- /main-panel -->
</div><!-- /page-wrapper -->

<script>
    const panels   = { identity: 'Identity', stats: 'Statistics', delivery: 'Delivery', security: 'Security' };
    const titleEl  = document.getElementById('panel-title');
    const footerEl = document.getElementById('form-footer');

    function switchTab(tab) {
        // Buttons
        document.querySelectorAll('.nav-tab').forEach(b => b.classList.remove('active'));
        document.getElementById('tab-' + tab).classList.add('active');

        // Panels
        document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
        document.getElementById('panel-' + tab).classList.add('active');

        // Header title
        titleEl.textContent = panels[tab];
        titleEl.className   = 'form-card-head' + (tab === 'security' ? ' danger' : '');

        // Hide submit on security tab
        footerEl.style.display = (tab === 'security') ? 'none' : 'flex';
    }
</script>

</body>
</html>