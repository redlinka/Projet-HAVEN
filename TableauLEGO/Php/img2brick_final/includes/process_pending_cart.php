<?php

/* Insert in database saved articles in the session before authentification*/
function processPendingCart($cnx, int $userId): void
{
    $cartItems = $_SESSION['pending_cart_items'] ?? [];
    if (empty($cartItems)) return;

    try {
        $cnx->beginTransaction();

        // Find or create draft ORDER_BILL
        $stmt = $cnx->prepare("SELECT order_id FROM ORDER_BILL WHERE user_id = ? AND created_at IS NULL LIMIT 1");
        $stmt->execute([$userId]);
        $orderId = $stmt->fetchColumn();

        if (!$orderId) {
            $stmt = $cnx->prepare("SELECT address_id FROM ADDRESS WHERE user_id = ? AND is_default = 1 LIMIT 1");
            $stmt->execute([$userId]);
            $addressId = (int)$stmt->fetchColumn();
            if ($addressId <= 0) {
                $cnx->prepare("INSERT INTO ADDRESS (user_id, is_default) VALUES (?, 0)")->execute([$userId]);
                $addressId = (int)$cnx->lastInsertId();
            }
            $cnx->prepare("INSERT INTO ORDER_BILL (user_id, address_id) VALUES (?, ?)")->execute([$userId, $addressId]);
            $orderId = (int)$cnx->lastInsertId();
        }

        foreach ($cartItems as $item) {
            $imageId       = (int)$item['image_id'];
            $txtName       = $item['txt_name'];
            $storedPrice   = (int)($item['stored_price']   ?? 0);
            $storedQuality = (float)($item['stored_quality'] ?? 0);

            // Rattache l'image LEGO et son parent à l'utilisateur
            $cnx->prepare("UPDATE IMAGE SET user_id = ? WHERE image_id = ? AND user_id IS NULL")
                ->execute([$userId, $imageId]);
            $cnx->prepare("UPDATE IMAGE i1 JOIN IMAGE i2 ON i1.image_id = i2.img_parent SET i1.user_id = ? WHERE i2.image_id = ? AND i1.user_id IS NULL")
                ->execute([$userId, $imageId]);

            // Find or create TILLING row
            $stmt = $cnx->prepare("SELECT pavage_id FROM TILLING WHERE image_id = ? ORDER BY pavage_id DESC LIMIT 1");
            $stmt->execute([$imageId]);
            $pavageId = $stmt->fetchColumn();

            if (!$pavageId) {
                $cnx->prepare("INSERT INTO TILLING (image_id, pavage_txt, price, quality) VALUES (?, ?, ?, ?)")
                    ->execute([$imageId, $txtName, $storedPrice, $storedQuality]);
                $pavageId = (int)$cnx->lastInsertId();
            } else {
                $cnx->prepare("UPDATE TILLING SET price=?, quality=? WHERE pavage_id=?")
                    ->execute([$storedPrice, $storedQuality, $pavageId]);
            }

            // Anti-doublon
            $stmt = $cnx->prepare("SELECT 1 FROM contain WHERE order_id = ? AND pavage_id = ?");
            $stmt->execute([$orderId, $pavageId]);
            if (!$stmt->fetchColumn()) {
                $cnx->prepare("INSERT INTO contain (order_id, pavage_id) VALUES (?, ?)")
                    ->execute([$orderId, $pavageId]);
            }
        }

        $cnx->commit();
        unset($_SESSION['pending_cart_items'], $_SESSION['redirect_after_login']);
    } catch (PDOException $e) {
        if ($cnx->inTransaction()) $cnx->rollBack();
        error_log("processPendingCart error: " . $e->getMessage());
        // La connexion réussit même si la restauration du panier échoue
    }
}
