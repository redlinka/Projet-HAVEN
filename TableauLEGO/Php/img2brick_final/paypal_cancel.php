<?php
/**
 * paypal_cancel.php
 * ─────────────────────────────────────────────────────────────────
 * PayPal redirige ici si l'utilisateur clique "Cancel" sur le portail.
 * La commande reste en état "panier" (created_at IS NULL),
 * l'utilisateur est renvoyé sur order.php pour réessayer.
 * ─────────────────────────────────────────────────────────────────
 */

session_start();

// Nettoyer uniquement les clés PayPal — la commande et l'adresse sont conservées
unset($_SESSION['paypal_order_id']);
// On garde pending_order_id et pending_order_address pour que le panier soit intact

// Rediriger vers order.php avec un message d'info
header("Location: order.php?paypal=cancelled");
exit;