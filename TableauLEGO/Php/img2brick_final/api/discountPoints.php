<?php
session_start();
$userId = $_SESSION["userId"] ?? null; 

$apiUrl = "https://adam.nachnouchi.com/api-node/stats?SQLid=" . $userId;

$ch = curl_init($apiUrl);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_TIMEOUT, 5);
curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, true);
$json = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

if ($json && $httpCode === 200) {
    $data = json_decode($json, true);
    $points = $data['points'] ?? 0;
    $percent = $data['percent'] ?? 0;
} else {
    $points = 0;
    $percent = 0;
}
?>

<div class="stats-box">
    <p>Points disponibles : <?php echo $points; ?></p>
    <p>Progression : <?php echo $percent; ?>%</p>
    <p>ID : <?php echo $userId; ?></p>
</div>