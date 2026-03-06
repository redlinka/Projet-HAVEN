<?php
/**
 * translate.php - Backend de traduction dynamique
 * API MyMemory (gratuite, sans clé) + cache BDD
 */

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(200); exit; }

global $cnx;
include __DIR__ . '/config/cnx.php';

$raw  = file_get_contents('php://input');
$body = json_decode($raw, true);

$texts  = $body['texts']  ?? [];
$target = $body['target'] ?? 'en';
$source = $body['source'] ?? 'en';

$texts = array_values(array_filter(
    array_map('trim', (array)$texts),
    fn($t) => mb_strlen($t) >= 2
));

$target = preg_replace('/[^a-z\-]/', '', strtolower($target));
$source = preg_replace('/[^a-z\-]/', '', strtolower($source));

if (empty($texts) || $target === $source) {
    $identity = [];
    foreach ($texts as $t) $identity[$t] = $t;
    echo json_encode(['translations' => $identity]);
    exit;
}

try {
    $cnx->exec("
        CREATE TABLE IF NOT EXISTS `translation_cache` (
            `id`          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
            `source_lang` VARCHAR(10)  NOT NULL DEFAULT 'en',
            `target_lang` VARCHAR(10)  NOT NULL,
            `source_text` TEXT         NOT NULL,
            `translation` TEXT         NOT NULL,
            `created_at`  TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
            UNIQUE KEY `uniq_tr` (source_lang(5), target_lang(5), source_text(200))
        ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
    ");
} catch (PDOException $e) {}

$translations = [];
$toTranslate  = [];

try {
    $placeholders = implode(',', array_fill(0, count($texts), '?'));
    $stmt = $cnx->prepare("
        SELECT source_text, translation
        FROM translation_cache
        WHERE source_lang = ? AND target_lang = ? AND source_text IN ($placeholders)
    ");
    $stmt->execute(array_merge([$source, $target], $texts));
    $cached = $stmt->fetchAll(PDO::FETCH_KEY_PAIR);
} catch (PDOException $e) {
    error_log("[translate] Erreur cache BDD: " . $e->getMessage());
    $cached = [];
}

foreach ($texts as $text) {
    if (isset($cached[$text])) {
        $translations[$text] = $cached[$text];
        error_log("[translate] cache BDD hit: '$text' → '{$cached[$text]}'");
    } else {
        $toTranslate[] = $text;
    }
}

error_log("[translate] " . count($toTranslate) . " textes à traduire via MyMemory");

$langPair = $source . '|' . $target;

foreach ($toTranslate as $text) {
    error_log("[translate] MyMemory appel pour: '$text'");

    if (mb_strlen($text) > 500) {
        $translations[$text] = $text;
        continue;
    }

    $url = 'https://api.mymemory.translated.net/get?' . http_build_query([
        'q'        => $text,
        'langpair' => $langPair,
    ]);

    $ctx = stream_context_create(['http' => [
        'timeout' => 6,
        'header'  => "User-Agent: Bricksy/1.0\r\n",
    ]]);

    $response = @file_get_contents($url, false, $ctx);

    if ($response === false) {
        error_log("[translate] MyMemory réseau KO pour: '$text'");
        $translations[$text] = $text;
        continue;
    }

    $data       = json_decode($response, true);
    $status     = (int)($data['responseStatus'] ?? 0);
    $translated = trim($data['responseData']['translatedText'] ?? '');

    error_log("[translate] MyMemory '$text' → status=$status → '$translated'");

    if ($status === 200 && $translated !== '' && $translated !== $text) {
        $translations[$text] = $translated;

        // Mise en cache BDD
        try {
            $cnx->prepare("
                INSERT IGNORE INTO translation_cache (source_lang, target_lang, source_text, translation)
                VALUES (?, ?, ?, ?)
            ")->execute([$source, $target, $text, $translated]);
        } catch (PDOException $e) {
            error_log("[translate] Erreur INSERT cache: " . $e->getMessage());
        }
    } else {
        $translations[$text] = $text; // fallback original
    }
}

echo json_encode(['translations' => $translations], JSON_UNESCAPED_UNICODE);