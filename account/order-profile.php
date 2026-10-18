<?php
require_once __DIR__ . '/bootstrap.php';
require_once __DIR__ . '/menu-catalog.php';

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store, private');

if (!account_is_authenticated()) {
    http_response_code(401);
    echo json_encode(['error' => 'Sign in to use your saved account details at checkout.']);
    exit;
}

try {
    $statement = account_db()->prepare(
        'SELECT first_name, last_name, phone, address, city
         FROM users WHERE id = :id LIMIT 1'
    );
    $statement->execute(['id' => $_SESSION['account_user_id']]);
    $profile = $statement->fetch();
} catch (PDOException $exception) {
    error_log('Vitaly Tea checkout profile lookup failed: ' . $exception->getMessage());
    http_response_code(503);
    echo json_encode(['error' => 'Account details are temporarily unavailable. Please try again later.']);
    exit;
}

if (!$profile) {
    http_response_code(404);
    echo json_encode(['error' => 'Your account profile could not be found.']);
    exit;
}

if (trim((string) $profile['address']) === '') {
    http_response_code(422);
    echo json_encode(['error' => 'Add your street address to your profile before checkout.']);
    exit;
}

echo json_encode([
    'fullName' => trim($profile['first_name'] . ' ' . $profile['last_name']),
    'phone' => $profile['phone'] ?? '',
    'address' => $profile['address'] ?? '',
    'city' => $profile['city'] ?? '',
    'cities' => account_cities(),
    'catalog' => account_menu_catalog(),
    'csrfToken' => account_csrf_token(),
], JSON_THROW_ON_ERROR);
