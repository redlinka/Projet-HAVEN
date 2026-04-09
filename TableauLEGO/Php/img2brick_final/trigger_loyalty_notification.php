<?php
/**
 * trigger_loyalty_notification.php
 * Page avec un bouton pour déclencher la notification de loyauté
 * Simule l'appel du LoyaltyWorker Android
 */

session_start();
header('Content-Type: text/html; charset=utf-8');

include __DIR__ . '/config/cnx.php';

// Vérifier que l'utilisateur est connecté
if (empty($_SESSION['userId'])) {
    die('<h2 style="color: red;">❌ Erreur : Vous devez être connecté</h2>');
}

$userId = (int) $_SESSION['userId'];

// Récupérer le token Android de l'utilisateur
$stmt = $cnx->prepare("SELECT android_token FROM USER WHERE user_id = :uid LIMIT 1");
$stmt->execute(['uid' => $userId]);
$user = $stmt->fetch(PDO::FETCH_ASSOC);
$androidToken = $user['android_token'] ?? null;

$result = null;
$error = null;
$notifWillShow = false;

if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['trigger'])) {
    if (empty($androidToken)) {
        $error = "❌ Pas de token Android trouvé. Tu dois d'abord te connecter via l'app Android.";
    } else {
        // Appeler check_loyalty.php comme le ferait LoyaltyWorker
        $ch = curl_init();
        curl_setopt($ch, CURLOPT_URL, 'http://localhost:8080/img2brick_final/check_loyalty.php');
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode(['android_token' => $androidToken]));
        curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
        
        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        if ($httpCode === 200) {
            $result = json_decode($response, true);
            $notifWillShow = $result['show'] ?? false;
        } else {
            $error = "❌ Erreur HTTP: " . $httpCode;
        }
    }
}

?>
<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>🔔 Déclencher Notif Loyauté</title>
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
            border-radius: 15px;
            box-shadow: 0 15px 50px rgba(0,0,0,0.3);
            padding: 50px;
            max-width: 700px;
            width: 100%;
        }
        h1 {
            color: #333;
            margin-bottom: 10px;
            text-align: center;
            font-size: 2em;
        }
        .subtitle {
            text-align: center;
            color: #666;
            margin-bottom: 30px;
            border-bottom: 2px solid #f0f0f0;
            padding-bottom: 15px;
        }
        .info-box {
            background: #f0f7ff;
            border-left: 4px solid #667eea;
            padding: 15px;
            margin: 20px 0;
            border-radius: 5px;
        }
        .button-container {
            text-align: center;
            margin: 40px 0;
        }
        button {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 18px 50px;
            border: none;
            border-radius: 50px;
            cursor: pointer;
            font-weight: bold;
            font-size: 1.1em;
            transition: transform 0.2s, box-shadow 0.2s;
            box-shadow: 0 5px 20px rgba(102, 126, 234, 0.4);
        }
        button:hover {
            transform: translateY(-3px);
            box-shadow: 0 8px 30px rgba(102, 126, 234, 0.6);
        }
        button:active {
            transform: translateY(-1px);
        }
        .message {
            padding: 15px;
            margin: 20px 0;
            border-radius: 8px;
            font-weight: bold;
            text-align: center;
        }
        .message.error {
            background: #f8d7da;
            color: #721c24;
            border: 1px solid #f5c6cb;
        }
        .message.success {
            background: #d4edda;
            color: #155724;
            border: 1px solid #c3e6cb;
        }
        .message.warning {
            background: #fff3cd;
            color: #856404;
            border: 1px solid #ffeaa7;
        }
        .result-box {
            background: #f9f9f9;
            border: 2px solid #667eea;
            padding: 20px;
            border-radius: 8px;
            margin: 20px 0;
            font-family: 'Monaco', monospace;
        }
        .result-label {
            color: #667eea;
            font-weight: bold;
            margin-top: 15px;
            margin-bottom: 5px;
        }
        .result-value {
            background: white;
            padding: 10px;
            border-radius: 5px;
            margin-bottom: 10px;
            word-break: break-all;
        }
        .status-badge {
            display: inline-block;
            padding: 8px 16px;
            border-radius: 20px;
            font-weight: bold;
            margin: 10px 0;
        }
        .status-badge.show {
            background: #ff6b6b;
            color: white;
        }
        .status-badge.hidden {
            background: #51cf66;
            color: white;
        }
        .token-info {
            background: #e3f2fd;
            padding: 15px;
            border-radius: 8px;
            margin: 20px 0;
            border-left: 4px solid #2196F3;
        }
        .token-info strong {
            color: #2196F3;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>🔔 Déclencher Notification</h1>
        <div class="subtitle">Simule l'appel du LoyaltyWorker Android</div>

        <!-- INFO TOKEN -->
        <?php if ($androidToken): ?>
            <div class="token-info">
                <strong>✅ Token Android trouvé:</strong><br>
                <small><?php echo htmlspecialchars(substr($androidToken, 0, 20) . '...'); ?></small>
            </div>
        <?php else: ?>
            <div class="message error">
                ⚠️ Pas de token Android. Connecte-toi d'abord via l'app Android pour obtenir un token.
            </div>
        <?php endif; ?>

        <!-- ERREUR -->
        <?php if ($error): ?>
            <div class="message error">
                <?php echo $error; ?>
            </div>
        <?php endif; ?>

        <!-- BOUTON PRINCIPAL -->
        <form method="POST" class="button-container">
            <button type="submit" name="trigger" value="1" 
                    <?php echo empty($androidToken) ? 'disabled style="opacity:0.5; cursor: not-allowed;"' : ''; ?>>
                🚀 Tester la Notification
            </button>
        </form>

        <!-- RÉSULTAT -->
        <?php if ($result): ?>
            <div class="result-box">
                <div class="result-label">📊 Réponse de check_loyalty.php:</div>
                
                <div class="result-label">Notification à afficher:</div>
                <div class="result-value">
                    <span class="status-badge <?php echo $notifWillShow ? 'show' : 'hidden'; ?>">
                        <?php echo $notifWillShow ? '✅ OUI - Notif affichée' : '❌ NON - Pas encore inactive'; ?>
                    </span>
                </div>

                <?php if ($notifWillShow): ?>
                    <div class="result-label">💬 Message notifié:</div>
                    <div class="result-value" style="background: #fff3cd; border-left: 4px solid #ff9800;">
                        <?php echo htmlspecialchars($result['message']); ?>
                    </div>

                    <div style="padding: 15px; background: #d4edda; border-radius: 8px; margin-top: 20px; text-align: center;">
                        <strong style="color: #155724;">✅ La notification devrait apparaître sur ton app Android maintenant!</strong>
                    </div>
                <?php else: ?>
                    <div style="padding: 15px; background: #d1ecf1; border-radius: 8px; margin-top: 20px; text-align: center;">
                        <strong style="color: #0c5460;">ℹ️ Pas assez d'inactivité détectée.<br>
                        Utilise la page de test pour simuler une inactivité.</strong>
                    </div>
                <?php endif; ?>

                <div class="result-label">📋 JSON complet:</div>
                <div class="result-value" style="overflow-x: auto;">
                    <pre><?php echo json_encode($result, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE); ?></pre>
                </div>
            </div>
        <?php endif; ?>

        <!-- INFOS -->
        <div class="info-box">
            <strong>ℹ️ Comment ça fonctionne:</strong>
            <ul style="margin-left: 20px; margin-top: 10px;">
                <li>Ce bouton simule l'appel que ferait LoyaltyWorker chaque jour</li>
                <li>Il envoie ton token Android à check_loyalty.php</li>
                <li>Si la notification doit s'afficher → Elle apparaîtra sur ton app</li>
                <li>Tu peux simuler l'inactivité <a href="test_loyalty_check.php" style="color: #667eea; font-weight: bold;">ici</a></li>
            </ul>
        </div>

        <!-- LIENS RAPIDES -->
        <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 2px solid #f0f0f0;">
            <a href="test_loyalty_check.php" style="color: #667eea; text-decoration: none; margin: 0 10px; font-weight: bold;">
                ← Simuler inactivité
            </a>
            <a href="test_loyalty_api.php" style="color: #667eea; text-decoration: none; margin: 0 10px; font-weight: bold;">
                Voir JSON →
            </a>
        </div>
    </div>
</body>
</html>
