<?php
global $cnx;
require_once __DIR__ . '/i18n.php';
$isLoggedIn  = isset($_SESSION['userId']);
$navUsername = $_SESSION['username'] ?? tr('nav.account_guest', 'Account');
$currentPage = basename($_SERVER['PHP_SELF']);

// Détecte automatiquement le sous-dossier du projet depuis DOCUMENT_ROOT
// Fonctionne que navbar.php soit dans includes/ ou à la racine
$_docRoot    = rtrim(str_replace('\\', '/', realpath($_SERVER['DOCUMENT_ROOT'])), '/');
$_projectDir = rtrim(str_replace('\\', '/', realpath(__DIR__ . '/..')), '/');
$projectBase = str_replace($_docRoot, '', $_projectDir);
$projectBase = '/' . trim($projectBase, '/');
if ($projectBase === '/') $projectBase = '';
$translateEndpoint = $projectBase . '/translate.php';

if ($isLoggedIn) {
    $userId = $_SESSION['userId'];
    $stmt   = $cnx->prepare("
        SELECT COUNT(*) AS nb_panier
        FROM ORDER_BILL o
        JOIN contain c ON c.order_id = o.order_id
        WHERE o.user_id = :user_id AND o.created_at IS NULL
    ");
    $stmt->execute(['user_id' => $userId]);
    $number = (int) $stmt->fetchColumn();
}
?>
<link rel="stylesheet" href="<?= $projectBase ?>/style/i18n.css">

<style>
    .cart-wrapper {
        position: relative;
        display: inline-flex;
        align-items: center;
    }
    .cart-icon { width: 36px; height: 36px; }
    .cart-badge {
        position: absolute;
        top: -6px; right: -6px;
        min-width: 18px; height: 18px;
        padding: 0 5px;
        background: #e60023;
        color: #fff;
        font-size: 11px;
        font-weight: 700;
        border-radius: 999px;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 0 0 2px #fff;
        pointer-events: none;
    }
    #logo {
        width: clamp(20px, 4vw, 36px);
        height: clamp(20px, 4vw, 36px);
        display: block;
    }
</style>

<nav class="navbar navbar-expand-lg navbar-light bg-white shadow-sm mb-4"
     style="width:100%; padding: 1.2vh 2% 1.2vh 2%;">
    <div class="container-fluid px-3">

        <!-- Brand -->
        <div class="d-flex align-items-center gap-2">
            <img src="<?= $projectBase ?>/assets/logo.svg" alt="Bricksy logo" id="logo">
            <a class="navbar-brand fw-bold mb-0" href="<?= $projectBase ?>/index.php">Bricksy</a>
        </div>

        <!-- Mobile toggler -->
        <button class="navbar-toggler" type="button"
                data-bs-toggle="collapse" data-bs-target="#navbarContent"
                aria-controls="navbarContent" aria-expanded="false"
                aria-label="Toggle navigation">
            <span class="navbar-toggler-icon"></span>
        </button>

        <!-- Nav content -->
        <div class="collapse navbar-collapse" id="navbarContent">
            <ul class="navbar-nav me-auto mb-2 mb-lg-0"></ul>

            <div class="d-flex flex-column flex-lg-row align-items-lg-center gap-2 mt-3 mt-lg-0"
                 data-i18n-skip>

                <!-- Sélecteur de langue injecté par i18n.js -->
                <div id="lang-switcher-slot"></div>

                <?php if ($isLoggedIn): ?>

                    <a href="<?= $projectBase ?>/cart.php" class="cart-wrapper" aria-label="Panier">
                        <svg class="cart-icon" viewBox="0 0 24 24" fill="none"
                             stroke="currentColor" stroke-width="1.8"
                             stroke-linecap="round" stroke-linejoin="round">
                            <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/>
                            <line x1="3" y1="6" x2="21" y2="6"/>
                            <path d="M16 10a4 4 0 0 1-8 0"/>
                        </svg>
                        <?php if (($number ?? 0) > 0): ?>
                        <span class="cart-badge"><?= $number > 9 ? '9+' : $number ?></span>
                        <?php endif; ?>
                    </a>

                    <a href="<?= $projectBase ?>/my_orders.php"
                       class="btn btn-outline-secondary btn-sm <?= $currentPage === 'my_orders.php' ? 'active' : '' ?>">
                        My Orders
                    </a>

                    <?php if ($navUsername !== '4DM1N1STRAT0R_4ND_4LM16HTY'): ?>
                    <a href="<?= $projectBase ?>/my_account.php"
                       class="btn btn-outline-secondary btn-sm <?= $currentPage === 'my_account.php' ? 'active' : '' ?>">
                        <?= htmlspecialchars($navUsername) ?>
                    </a>
                    <?php else: ?>
                    <a href="<?= $projectBase ?>/admin_panel.php"
                       class="btn btn-outline-secondary btn-sm <?= $currentPage === 'admin_panel.php' ? 'active' : '' ?>">
                        Admin Panel
                    </a>
                    <?php endif; ?>

                    <a href="<?= $projectBase ?>/logout.php" class="btn btn-outline-danger btn-sm">Log Out</a>

                <?php else: ?>

                    <a href="<?= $projectBase ?>/auth.php" class="btn btn-sm"
                       style="border:1.5px solid var(--main-brown,#A26547);color:var(--main-brown,#A26547);border-radius:.6em;">
                        Sign in
                    </a>

                <?php endif; ?>
            </div>
        </div>
    </div>
</nav>

<!-- Bootstrap JS -->
<script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>

<!-- Endpoint injecté AVANT i18n.js -->
<script>window.I18N_ENDPOINT = '<?= htmlspecialchars($translateEndpoint) ?>';</script>
<script src="<?= $projectBase ?>/js/i18n.js"></script>