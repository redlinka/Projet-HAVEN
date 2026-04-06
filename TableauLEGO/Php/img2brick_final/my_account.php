<?php
session_start();
global $cnx;
include("./config/cnx.php");
require_once __DIR__ . '/includes/i18n.php';

if (!isset($_SESSION['userId'])) {
    header("Location: auth.php");
    exit;
}
if ($_SESSION['username'] == '4DM1N1STRAT0R_4ND_4LM16HTY') {
    header("Location: admin_panel.php");
    exit;
}

$userId  = $_SESSION['userId'];
$errors  = [];
$success = '';
if (isset($_GET['success']) && $_GET['success'] == 1)
    $success = tr('account.update_success', 'Information updated successfully!');

try {
    $stmt = $cnx->prepare("SELECT user_id, username, email, first_name, last_name, phone, birth_year, twofa_method, totp_secret FROM USER WHERE user_id = ?");
    $stmt->execute([$userId]);
    $user = $stmt->fetch(PDO::FETCH_ASSOC);
    if (!$user) {
        header("Location: index.php");
        exit;
    }

    $stmtAddr = $cnx->prepare("SELECT street, postal_code, city, country FROM ADDRESS WHERE user_id = ? AND is_default = 1 LIMIT 1");
    $stmtAddr->execute([$userId]);
    $addressData = $stmtAddr->fetch(PDO::FETCH_ASSOC) ?: [];
} catch (PDOException $e) {
    header("Location: index.php");
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    if (!csrf_validate($_POST['csrf'] ?? null)) {
        $errors[] = tr('account.session_expired', 'Session expired. Please refresh.');
    } else {
        $action = $_POST['action'] ?? '';

        if ($action === 'set_2fa_method') {
            $newMethod = $_POST['twofa_method'] ?? 'email';
            if (in_array($newMethod, ['email', 'totp'])) {
                if ($newMethod === 'totp') {
                    $checkSecret = $cnx->prepare("SELECT totp_secret FROM USER WHERE user_id = ?");
                    $checkSecret->execute([$userId]);
                    $sec = $checkSecret->fetchColumn();
                    if (!$sec) {
                        $errors[] = 'Please set up TOTP first before switching to this method.';
                    } else {
                        $cnx->prepare("UPDATE USER SET twofa_method = ? WHERE user_id = ?")->execute([$newMethod, $userId]);
                        header("Location: my_account.php?success=1");
                        exit;
                    }
                } else {
                    $cnx->prepare("UPDATE USER SET twofa_method = ? WHERE user_id = ?")->execute([$newMethod, $userId]);
                    header("Location: my_account.php?success=1");
                    exit;
                }
            }
        }

        if ($action === 'remove_totp') {
            $cnx->prepare("UPDATE USER SET totp_secret = NULL, twofa_method = 'email' WHERE user_id = ?")
                ->execute([$userId]);
            header("Location: my_account.php?success=1");
            exit;
        }

        $username  = trim($_POST['username'] ?? '');
        $newEmail  = !empty($_POST['email']) ? trim($_POST['email']) : $user['email'];
        $name      = trim($_POST['name'] ?? '');
        $surname   = trim($_POST['surname'] ?? '');
        $phone     = trim($_POST['phone'] ?? '') ?: null;
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
                $errors[] = "Database error: " . $e->getMessage();
            }
        }
    }
}

$user = [
    'username'      => ($_SERVER['REQUEST_METHOD'] === 'POST') ? $username : $user['username'],
    'email'         => $user['email'],
    'name'          => ($_SERVER['REQUEST_METHOD'] === 'POST') ? $name    : $user['first_name'],
    'surname'       => ($_SERVER['REQUEST_METHOD'] === 'POST') ? $surname : $user['last_name'],
    'phone'         => ($_SERVER['REQUEST_METHOD'] === 'POST') ? $phone   : $user['phone'],
    'birth_year'    => ($_SERVER['REQUEST_METHOD'] === 'POST') ? $birthYear : $user['birth_year'],
    'street'        => ($_SERVER['REQUEST_METHOD'] === 'POST') ? $street  : ($addressData['street']      ?? ''),
    'zip'           => ($_SERVER['REQUEST_METHOD'] === 'POST') ? $zip     : ($addressData['postal_code'] ?? ''),
    'city'          => ($_SERVER['REQUEST_METHOD'] === 'POST') ? $city    : ($addressData['city']        ?? ''),
    'country'       => ($_SERVER['REQUEST_METHOD'] === 'POST') ? $country : ($addressData['country']     ?? ''),
    'twofa_method'  => $user['twofa_method']  ?? 'email',
    'totp_secret'   => $user['totp_secret']   ?? null,
];
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
    <style>
        .twofa-cards {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 12px;
            margin-top: 10px;
        }

        @media (max-width: 560px) {
            .twofa-cards {
                grid-template-columns: 1fr;
            }
        }

        .twofa-card {
            border: 1.5px solid var(--border, #e0d5c8);
            border-radius: 10px;
            padding: 14px 16px;
            background: #fff;
            transition: border-color .15s, box-shadow .15s;
        }

        .twofa-card.active {
            border-color: var(--main-brown, #A26547);
            box-shadow: 0 0 0 3px rgba(162, 101, 71, .1);
        }

        .twofa-card-head {
            display: flex;
            align-items: center;
            gap: 8px;
            font-size: .82rem;
            font-weight: 600;
            color: var(--text, #2b1f14);
            margin-bottom: 6px;
        }

        .twofa-badge {
            margin-left: auto;
            padding: 2px 8px;
            border-radius: 20px;
            font-size: .65rem;
            font-weight: 700;
            letter-spacing: .06em;
            text-transform: uppercase;
        }

        .twofa-badge.active {
            background: #dcfce7;
            color: #166534;
        }

        .twofa-badge.configured {
            background: #fef9c3;
            color: #854d0e;
        }

        .twofa-card-desc {
            font-size: .75rem;
            color: var(--muted, #9a8a7a);
            line-height: 1.45;
            margin: 0;
        }

        .twofa-switch-btn {
            display: inline-flex;
            align-items: center;
            padding: 6px 14px;
            border-radius: 6px;
            font-family: 'DM Sans', sans-serif;
            font-size: .72rem;
            font-weight: 600;
            cursor: pointer;
            text-decoration: none;
            border: 1.5px solid var(--main-brown, #A26547);
            color: var(--main-brown, #A26547);
            background: transparent;
            transition: background .15s, color .15s;
        }

        .twofa-switch-btn:hover {
            background: var(--main-brown, #A26547);
            color: #fff;
        }

        .twofa-switch-btn.danger {
            border-color: #c0392b;
            color: #c0392b;
        }

        .twofa-switch-btn.danger:hover {
            background: #c0392b;
            color: #fff;
        }

        /* Security card hidden by default, shown by JS */
        #security-card {
            display: none;
        }
    </style>
    <link rel="stylesheet" href="style/all.css">
    <?php include_once("matomo_tag.php"); ?>
</head>

<body>

    <?php include("./includes/navbar.php"); ?>

    <div class="page-wrapper">

        <!-- ══ SIDEBAR ══ -->
        <aside class="sidebar">
            <div class="user-card">
                <div class="user-avatar"><?= strtoupper(substr($user['username'], 0, 1)) ?></div>
                <div>
                    <p class="user-name"><?= htmlspecialchars($user['username']) ?></p>
                    <p class="user-email"><?= htmlspecialchars($user['email']) ?></p>
                </div>
            </div>
            <nav class="nav-tabs-custom">
                <button class="nav-tab active" id="tab-identity" onclick="switchTab('identity')">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                        <circle cx="12" cy="7" r="4" />
                    </svg>
                    Identity
                </button>
                <button class="nav-tab" id="tab-stats" onclick="switchTab('stats')">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <line x1="18" y1="20" x2="18" y2="10" />
                        <line x1="12" y1="20" x2="12" y2="4" />
                        <line x1="6" y1="20" x2="6" y2="14" />
                    </svg>
                    Statistics
                </button>
                <button class="nav-tab" id="tab-delivery" onclick="switchTab('delivery')">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                        <polyline points="9 22 9 12 15 12 15 22" />
                    </svg>
                    Delivery
                </button>
                <button class="nav-tab danger" id="tab-security" onclick="switchTab('security')">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
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

            <!-- ══════════════════════════════════════
             FORMULAIRE PRINCIPAL (sans security)
        ══════════════════════════════════════ -->
            <form method="POST" id="account-form">
                <input type="hidden" name="csrf" value="<?= htmlspecialchars(csrf_get()) ?>">

                <div class="form-card" id="main-card">
                    <div class="form-card-head" id="panel-title">Identity</div>
                    <div class="form-card-body">

                        <!-- IDENTITY -->
                        <div class="tab-panel active" id="panel-identity">
                            <div class="fields-grid">
                                <div class="field">
                                    <label for="username">Username</label>
                                    <input type="text" id="username" name="username"
                                        value="<?= htmlspecialchars($user['username']) ?>" required>
                                    <span class="field-hint">Must be unique.</span>
                                </div>
                                <div class="field">
                                    <label for="email">Email</label>
                                    <input type="text" id="email" name="email"
                                        value="<?= htmlspecialchars($user['email']) ?>" disabled>
                                    <span class="field-hint">Cannot be changed directly.</span>
                                </div>
                                <div class="field">
                                    <label for="name">First Name</label>
                                    <input type="text" id="name" name="name"
                                        value="<?= htmlspecialchars($user['name'] ?? '') ?>"
                                        placeholder="e.g. John (optional)">
                                </div>
                                <div class="field">
                                    <label for="surname">Surname</label>
                                    <input type="text" id="surname" name="surname"
                                        value="<?= htmlspecialchars($user['surname'] ?? '') ?>"
                                        placeholder="e.g. Doe (optional)">
                                </div>
                            </div>
                        </div>

                        <!-- STATISTICS -->
                        <div class="tab-panel" id="panel-stats">
                            <div class="fields-grid cols-1">
                                <div class="field">
                                    <label for="birth_year">Year of Birth</label>
                                    <input type="number" id="birth_year" name="birth_year"
                                        min="1900" max="<?= date('Y') ?>"
                                        value="<?= htmlspecialchars($user['birth_year'] ?? '') ?>"
                                        placeholder="YYYY">
                                    <span class="field-hint">Used for age statistics only. Never shared.</span>
                                </div>
                            </div>
                        </div>

                        <!-- DELIVERY -->
                        <div class="tab-panel" id="panel-delivery">
                            <div class="fields-grid">
                                <div class="field field-full">
                                    <label for="phone">Phone Number</label>
                                    <input type="tel" id="phone" name="phone"
                                        value="<?= htmlspecialchars($user['phone'] ?? '') ?>"
                                        placeholder="+33 6 12 34 56 78">
                                </div>
                                <div class="field field-full">
                                    <label for="street">Street Address</label>
                                    <input type="text" id="street" name="street"
                                        value="<?= htmlspecialchars($user['street'] ?? '') ?>"
                                        placeholder="123 Brick Street">
                                </div>
                                <div class="field">
                                    <label for="zip">Zip Code</label>
                                    <input type="text" id="zip" name="zip"
                                        value="<?= htmlspecialchars($user['zip'] ?? '') ?>"
                                        placeholder="75001">
                                </div>
                                <div class="field">
                                    <label for="city">City</label>
                                    <input type="text" id="city" name="city"
                                        value="<?= htmlspecialchars($user['city'] ?? '') ?>"
                                        placeholder="Paris">
                                </div>
                                <div class="field field-full">
                                    <label for="country">Country</label>
                                    <select id="country" name="country">
                                        <option value="France" <?= ($user['country'] === 'France' ? 'selected' : '') ?>>France</option>
                                        <option value="Spain" <?= ($user['country'] === 'Spain'  ? 'selected' : '') ?>>Spain</option>
                                        <option value="USA" <?= ($user['country'] === 'USA'    ? 'selected' : '') ?>>USA</option>
                                        <option value="UK" <?= ($user['country'] === 'UK'     ? 'selected' : '') ?>>UK</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                    </div><!-- /form-card-body -->

                    <div class="form-card-footer" id="form-footer">
                        <button type="submit" class="btn-submit">Save Changes</button>
                    </div>
                </div><!-- /form-card -->
            </form>
            <!-- FIN DU FORMULAIRE PRINCIPAL — pas de formulaires imbriqués au-dessus -->

            <!-- ══════════════════════════════════════
             SECURITY — carte séparée, hors du form
        ══════════════════════════════════════ -->
            <div class="form-card" id="security-card">
                <div class="form-card-head danger">Security & 2FA</div>
                <div class="form-card-body">

                    <p class="security-note">
                        Need to change your password? We'll send a secure reset link to your registered email address.
                    </p>
                    <a href="password_forgotten.php" class="btn-danger-outline">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                        </svg>
                        Reset Password
                    </a>

                    <div class="twofa-section">
                        <p class="security-note" style="margin-top:28px;">
                            <strong>Two-Factor Authentication (2FA)</strong><br>
                            Choose how you verify your identity when logging in.
                            <em>Email</em> is used by default.
                        </p>

                        <?php
                        $currentMethod = $user['twofa_method'] ?? 'email';
                        $hasTotp       = !empty($user['totp_secret']);
                        ?>

                        <div class="twofa-cards">

                            <!-- Email method -->
                            <div class="twofa-card <?= $currentMethod === 'email' ? 'active' : '' ?>">
                                <div class="twofa-card-head">
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                        <rect x="2" y="4" width="20" height="16" rx="2" />
                                        <polyline points="2,4 12,13 22,4" />
                                    </svg>
                                    <span>Email link</span>
                                    <?php if ($currentMethod === 'email'): ?>
                                        <span class="twofa-badge active">Active</span>
                                    <?php endif; ?>
                                </div>
                                <p class="twofa-card-desc">A secure login link is sent to your email address each time you log in.</p>
                                <?php if ($currentMethod !== 'email'): ?>
                                    <form method="POST" style="margin-top:8px;">
                                        <input type="hidden" name="csrf" value="<?= htmlspecialchars(csrf_get()) ?>">
                                        <input type="hidden" name="action" value="set_2fa_method">
                                        <input type="hidden" name="twofa_method" value="email">
                                        <button type="submit" class="twofa-switch-btn">Switch to Email</button>
                                    </form>
                                <?php endif; ?>
                            </div>

                            <!-- TOTP method -->
                            <div class="twofa-card <?= $currentMethod === 'totp' ? 'active' : '' ?>">
                                <div class="twofa-card-head">
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                        <rect x="5" y="2" width="14" height="20" rx="2" />
                                        <line x1="12" y1="18" x2="12.01" y2="18" />
                                        <rect x="8" y="6" width="8" height="6" rx="1" />
                                    </svg>
                                    <span>Authenticator app</span>
                                    <?php if ($currentMethod === 'totp'): ?>
                                        <span class="twofa-badge active">Active</span>
                                    <?php elseif ($hasTotp): ?>
                                        <span class="twofa-badge configured">Configured</span>
                                    <?php endif; ?>
                                </div>
                                <p class="twofa-card-desc">Use an app like LastPass Authenticator or Google Authenticator to generate a 6-digit code.</p>
                                <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:8px;">
                                    <?php if (!$hasTotp || $currentMethod !== 'totp'): ?>
                                        <a href="setup_totp.php" class="twofa-switch-btn">
                                            <?= $hasTotp ? 'Reconfigure TOTP' : 'Set Up TOTP' ?>
                                        </a>
                                    <?php endif; ?>
                                    <?php if ($hasTotp && $currentMethod !== 'totp'): ?>
                                        <form method="POST">
                                            <input type="hidden" name="csrf" value="<?= htmlspecialchars(csrf_get()) ?>">
                                            <input type="hidden" name="action" value="set_2fa_method">
                                            <input type="hidden" name="twofa_method" value="totp">
                                            <button type="submit" class="twofa-switch-btn">Switch to TOTP</button>
                                        </form>
                                    <?php endif; ?>
                                    <?php if ($hasTotp): ?>
                                        <form method="POST" onsubmit="return confirm('Remove TOTP configuration?');">
                                            <input type="hidden" name="csrf" value="<?= htmlspecialchars(csrf_get()) ?>">
                                            <input type="hidden" name="action" value="remove_totp">
                                            <button type="submit" class="twofa-switch-btn danger">Remove TOTP</button>
                                        </form>
                                    <?php endif; ?>
                                </div>
                            </div>

                        </div><!-- /twofa-cards -->
                    </div><!-- /twofa-section -->

                </div><!-- /form-card-body -->
            </div><!-- /security-card -->

        </div><!-- /main-panel -->
    </div><!-- /page-wrapper -->

    <script>
        const titleEl = document.getElementById('panel-title');
        const footerEl = document.getElementById('form-footer');
        const mainCard = document.getElementById('main-card');
        const secCard = document.getElementById('security-card');

        function switchTab(tab) {
            // Boutons sidebar
            document.querySelectorAll('.nav-tab').forEach(b => b.classList.remove('active'));
            document.getElementById('tab-' + tab).classList.add('active');

            if (tab === 'security') {
                // Masque le formulaire principal, affiche la carte security
                mainCard.style.display = 'none';
                secCard.style.display = 'block';
                footerEl.style.display = 'none';
            } else {
                // Affiche le formulaire principal, masque security
                mainCard.style.display = 'block';
                secCard.style.display = 'none';
                footerEl.style.display = 'flex';

                // Affiche le bon panel dans le formulaire
                document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
                document.getElementById('panel-' + tab).classList.add('active');

                // Titre de la carte
                const titles = {
                    identity: 'Identity',
                    stats: 'Statistics',
                    delivery: 'Delivery'
                };
                titleEl.textContent = titles[tab] || tab;
                titleEl.className = 'form-card-head';
            }
        }
    </script>

</body>

</html>
