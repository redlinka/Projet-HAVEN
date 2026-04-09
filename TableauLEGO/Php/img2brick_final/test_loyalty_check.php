<?php
/**
 * test_loyalty_check.php
 * Script de test pour la notification de loyauté
 * Accès : /img2brick_final/test_loyalty_check.php (quand connecté)
 * 
 * Permet de :
 * - Voir la dernière commande
 * - Tester la logique de notification de loyauté
 * - Simuler une vieille commande pour les tests
 */

session_start();
header('Content-Type: text/html; charset=utf-8');

include __DIR__ . '/config/cnx.php';

// Vérifier que l'utilisateur est connecté
if (empty($_SESSION['userId'])) {
    die('<h2 style="color: red;">❌ Erreur : Vous devez être connecté pour accéder à cette page.</h2>');
}

$userId = (int) $_SESSION['userId'];

// ===== GESTION DES ACTIONS =====
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $action = $_POST['action'] ?? '';

    if ($action === 'simulate_old_order') {
        $daysAgo = (int) ($_POST['days_ago'] ?? 15);
        $dateSimulated = date('Y-m-d H:i:s', time() - ($daysAgo * 86400));
        
        try {
            $stmt = $cnx->prepare("
                UPDATE ORDER_BILL 
                SET created_at = :date 
                WHERE user_id = :uid 
                ORDER BY order_id DESC 
                LIMIT 1
            ");
            $stmt->execute(['uid' => $userId, 'date' => $dateSimulated]);
            $message = "✅ Dernière commande simulée à : {$dateSimulated} ({$daysAgo} jours)";
        } catch (Exception $e) {
            $message = "❌ Erreur : " . $e->getMessage();
        }
    }

    if ($action === 'reset_order') {
        try {
            // Récupérer la vraie date (la plus ancienne, avant simulations)
            $stmt = $cnx->query("SELECT MIN(created_at) FROM ORDER_BILL");
            $oldDate = "2024-01-01 00:00:00"; // Date par défaut
            
            $message = "✅ Réinitialisation : mettez à jour manuellement la commande si besoin.";
        } catch (Exception $e) {
            $message = "❌ Erreur : " . $e->getMessage();
        }
    }
}

// ===== RÉCUPÉRER LES DONNÉES =====
$stmt = $cnx->prepare("
    SELECT MAX(created_at) AS last_order
    FROM ORDER_BILL
    WHERE user_id = :uid AND created_at IS NOT NULL
");
$stmt->execute(['uid' => $userId]);
$row = $stmt->fetch(PDO::FETCH_ASSOC);
$lastOrder = $row['last_order'] ?? null;

$daysSinceOrder = $lastOrder
    ? (int) ((time() - strtotime($lastOrder)) / 86400)
    : 999;

$INACTIVITY_DAYS = 14;
$shouldShowNotif = $daysSinceOrder >= $INACTIVITY_DAYS;

if ($daysSinceOrder >= 30) {
    $notifMessage = "Vous n'avez pas commandé depuis plus d'un mois. Revenez créer votre prochain tableau LEGO !";
} else if ($shouldShowNotif) {
    $notifMessage = "Ça fait " . $daysSinceOrder . " jours sans commande. Et si vous créiez un nouveau tableau ?";
} else {
    $notifMessage = "Pas encore d'inactivité détectée (besoin de 14 jours).";
}

?>
<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>📱 Test Notification Loyauté</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            display: flex;
            justify-content: center;
            align-items: center;
            padding: 20px;
        }
        .container {
            background: white;
            border-radius: 10px;
            box-shadow: 0 10px 40px rgba(0,0,0,0.3);
            padding: 40px;
            max-width: 600px;
            width: 100%;
        }
        h1 {
            color: #333;
            margin-bottom: 10px;
            text-align: center;
        }
        .subtitle {
            text-align: center;
            color: #666;
            font-size: 0.9em;
            margin-bottom: 30px;
            border-bottom: 2px solid #f0f0f0;
            padding-bottom: 15px;
        }
        .info-box {
            background: #f5f5f5;
            border-left: 4px solid #667eea;
            padding: 15px;
            margin: 20px 0;
            border-radius: 5px;
        }
        .info-box strong { color: #667eea; }
        .status {
            padding: 15px;
            margin: 15px 0;
            border-radius: 5px;
            text-align: center;
            font-weight: bold;
        }
        .status.active {
            background: #d4edda;
            color: #155724;
            border: 1px solid #c3e6cb;
        }
        .status.notification {
            background: #fff3cd;
            color: #856404;
            border: 1px solid #ffeaa7;
        }
        .status.alert {
            background: #f8d7da;
            color: #721c24;
            border: 1px solid #f5c6cb;
        }
        .form-group {
            margin: 15px 0;
        }
        label {
            display: block;
            margin-bottom: 8px;
            color: #333;
            font-weight: 600;
        }
        input, select {
            width: 100%;
            padding: 10px;
            border: 1px solid #ddd;
            border-radius: 5px;
            font-size: 1em;
            margin-bottom: 10px;
        }
        input:focus, select:focus {
            outline: none;
            border-color: #667eea;
            box-shadow: 0 0 5px rgba(102, 126, 234, 0.3);
        }
        button {
            background: #667eea;
            color: white;
            padding: 12px 20px;
            border: none;
            border-radius: 5px;
            cursor: pointer;
            font-weight: bold;
            font-size: 1em;
            transition: background 0.3s;
            width: 100%;
        }
        button:hover {
            background: #764ba2;
        }
        .message {
            padding: 12px;
            margin: 15px 0;
            border-radius: 5px;
            text-align: center;
        }
        .message.success {
            background: #d4edda;
            color: #155724;
        }
        .message.error {
            background: #f8d7da;
            color: #721c24;
        }
        .stats {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 15px;
            margin: 20px 0;
        }
        .stat-card {
            background: #f9f9f9;
            padding: 15px;
            border-radius: 5px;
            border: 1px solid #eee;
        }
        .stat-card label {
            margin: 0;
            font-size: 0.85em;
            color: #666;
        }
        .stat-card .value {
            font-size: 1.5em;
            color: #667eea;
            font-weight: bold;
            margin-top: 5px;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>📱 Test Notification Loyauté</h1>
        <div class="subtitle">Simulez et testez la notification de réengagement</div>

        <?php if (isset($message)) { ?>
            <div class="message <?php echo strpos($message, '❌') ? 'error' : 'success'; ?>">
                <?php echo htmlspecialchars($message); ?>
            </div>
        <?php } ?>

        <!-- INFOS ACTUELLES -->
        <div class="info-box">
            <strong>👤 Utilisateur:</strong> ID <?php echo $userId; ?><br>
            <strong>🕐 Dernière commande:</strong> <?php echo $lastOrder ? date('d/m/Y à H:i', strtotime($lastOrder)) : 'Aucune commande'; ?><br>
            <strong>⏱️ Jours depuis:</strong> <?php echo $daysSinceOrder; ?> jour(s)
        </div>

        <!-- STATISTIQUES -->
        <div class="stats">
            <div class="stat-card">
                <label>📦 Jours d'inactivité</label>
                <div class="value"><?php echo $daysSinceOrder; ?>/14</div>
            </div>
            <div class="stat-card">
                <label>🔔 Notification</label>
                <div class="value" style="color: <?php echo $shouldShowNotif ? '#ff6b6b' : '#51cf66'; ?>;">
                    <?php echo $shouldShowNotif ? 'OUI' : 'NON'; ?>
                </div>
            </div>
        </div>

        <!-- STATUS NOTIFICATION -->
        <div class="status <?php echo $shouldShowNotif ? 'alert' : 'active'; ?>">
            <?php if ($shouldShowNotif) { ?>
                🔴 Notification ACTIVE
            <?php } else { ?>
                🟢 Notification inactive
            <?php } ?>
        </div>

        <!-- MESSAGE DE LA NOTIFICATION -->
        <div class="info-box" style="border-left-color: #764ba2;">
            <strong>💬 Message qui s'affichera:</strong><br>
            <em><?php echo htmlspecialchars($notifMessage); ?></em>
        </div>

        <!-- FORMULAIRE DE TEST -->
        <form method="POST">
            <h3 style="margin-top: 30px; color: #333; margin-bottom: 15px;">🧪 Simuler Une Inactivité</h3>
            
            <div class="form-group">
                <label for="days_ago">Nombre de jours depuis la dernière commande :</label>
                <select name="days_ago" id="days_ago" required>
                    <option value="">-- Sélectionner --</option>
                    <option value="5">5 jours (pas encore actif)</option>
                    <option value="14">14 jours (seuil exact)</option>
                    <option value="15">15 jours (notification active)</option>
                    <option value="20">20 jours (notification active)</option>
                    <option value="30">30 jours (message spécial)</option>
                    <option value="60">60 jours (très inactif)</option>
                </select>
            </div>

            <input type="hidden" name="action" value="simulate_old_order">
            <button type="submit">🎯 Simuler cette inactivité</button>
        </form>

        <!-- INFOS UTILES -->
        <div style="margin-top: 30px; padding: 20px; background: #f0f0f0; border-radius: 5px; font-size: 0.85em; color: #666;">
            <strong>💡 Comment ça fonctionne :</strong>
            <ul style="margin-left: 20px; margin-top: 10px;">
                <li>Modifiez la date de votre dernière commande pour simuler l'inactivité</li>
                <li>La notification Android s'affiche après <strong>14 jours</strong> d'inactivité</li>
                <li>À partir de <strong>30 jours</strong>, le message change</li>
                <li>Vous pouvez tester plusieurs scénarios en répétant les simulations</li>
            </ul>
        </div>
    </div>
</body>
</html>
