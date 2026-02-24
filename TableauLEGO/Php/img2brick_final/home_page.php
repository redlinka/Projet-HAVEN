<?php
session_start();
include("./config/cnx.php");
require_once __DIR__ . '/includes/i18n.php';
?>

<!doctype html>
<html lang="fr">

<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Bricksy - Turn your images into brick paintings</title>
  <link rel="stylesheet" href="style/bricksy.css" />
  <link rel="stylesheet" href="style/all.css" />
  <link rel="stylesheet" href="style/home.css" />
  <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
</head>

<body>
  <?php include("./includes/navbar.php"); ?>
  <!-- <header>
      <div class="logo-container">
        <div class="lego-icon">
          <img src="assets/logo.svg" alt="our logo" />
        </div>
        <div class="logo-text">Bricksy</div>
      </div>
      <a href="#" class="btn-signin">SIGN IN</a>
    </header> -->

  <main>
    <div class="content-top">
      <h2 class="inter-title">TURN YOUR IMAGES</h2>
      <h1 id="home-title">into brick paintings</h1>
    </div>
    <div class="content-bottom">
      <div class="how-it-works">
        <h3 class="section-title">HOW IT WORKS</h3>
        <p class="description">
          IMAGINE TRANSFORMING YOUR FAVORITE PHOTO INTO A UNIQUE MOSAIC MADE
          OF BRICKS, A PIECE OF ART YOU CAN ACTUALLY BUILD.<br /><br />
          UPLOAD YOUR IMAGE, CHOOSE YOUR FORMAT, AND RECEIVE A COMPLETE KIT TO
          BUILD YOUR PERSONALIZED MASTERPIECE AT HOME.<br /><br />
          CREATIVE. PERSONAL. UNFORGETTABLE.
        </p>
      </div>

      <div class="content-right">
        <div class="image-showcase">
          <img
            src="assets/lego1.png"
            alt="Original Image"
            class="img-original" />

          <div class="exchange-badge">
            <img src="assets/switch.png" alt="an icon of switch">
          </div>

          <img
            src="assets/lego2.png"
            alt="Lego Version"
            class="img-lego" />
        </div>
        <div class="stud stud-top-left">
          <img src="assets/brick.svg" alt="a brick of lego">
        </div>
        <div class="stud stud-bottom-right">
          <img src="assets/brick.svg" alt="a brick of lego">
        </div>
      </div>
    </div>
    <div class="action-buttons">
      <button class="btn-outline">
        <a href="#">DOWNLOAD APP</a>
        <img src="assets/arrow.svg">
      </button>
      <button class="btn-outline">
        <a href="#">START</a>
        <img src="assets/arrow.svg">
      </button>
      <!-- <a href="#" class="btn-outline">DOWNLOAD APP</a>
        <a href="upload.php" class="btn-outline">START &rarr;</a> -->
    </div>
  </main>

  <?php include("./includes/footer.php"); ?>
</body>

</html>