<?php
require_once __DIR__ . '/bootstrap.php';

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store, private');

echo json_encode([
    'authenticated' => account_is_authenticated(),
    'name' => account_is_authenticated() ? ($_SESSION['account_user_name'] ?? '') : '',
], JSON_THROW_ON_ERROR);
