<?php
    header("Access-Control-Allow-Origin: https://adam.nachnouchi.com"); // Mettre ip
    header("Access-Control-Allow-Credentials: true");
    header("Content-Type: application/json");

    session_start();

    if (!isset($_SESSION["userId"])) {
        $_SESSION["userId"] = null;
    }

    echo json_encode([
        "id" => $_SESSION["userId"],
    ]);
?>
