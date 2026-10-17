<?php
if (!defined('VITALYTEA_ACCOUNT_PAGE')) {
    http_response_code(404);
    exit;
}

$pageTitle = $pageTitle ?? 'My Account';
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="theme-color" content="#f9f6f2">
    <title><?= account_escape($pageTitle) ?> | Vitaly Tea</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=DM+Serif+Display&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="../styles/site-shell.css">
    <link rel="stylesheet" href="account.css">
    <link rel="icon" type="image/x-icon" href="../images/LOGO2.png">
    <script defer src="../script/site-shell.js"></script>
    <script defer src="../script/account-nav.js"></script>
</head>
<body class="account-page">
    <nav class="navbar" aria-label="Main navigation">
        <a class="logo" href="../index.html" aria-label="Vitaly Tea home">
            <img src="../images/headerlogo.png" alt="Vitaly Tea">
        </a>
        <div class="nav-links" id="site-navigation">
            <a href="../html/services.html">Services</a>
            <a href="../html/menu.html">Menu</a>
            <a href="../html/order.html">Order</a>
            <a href="../html/about.html">About</a>
            <a href="../html/contact.html">Contact us</a>
        </div>
        <button class="hamburger" type="button" aria-label="Open navigation menu" aria-expanded="false" aria-controls="site-navigation">
            <span></span>
            <span></span>
            <span></span>
        </button>
    </nav>
