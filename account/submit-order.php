<?php
require_once __DIR__ . '/bootstrap.php';
require_once __DIR__ . '/menu-catalog.php';

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store, private');

function order_response(int $status, array $payload): never
{
    http_response_code($status);
    echo json_encode($payload, JSON_THROW_ON_ERROR);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    header('Allow: POST');
    order_response(405, ['error' => 'Use POST to submit an order.']);
}

if (!account_is_authenticated()) {
    order_response(401, ['error' => 'Sign in to place an order.']);
}

$submittedToken = $_SERVER['HTTP_X_CSRF_TOKEN'] ?? '';
if (!is_string($submittedToken) || !account_csrf_token_is_valid($submittedToken)) {
    order_response(400, ['error' => 'Your session expired. Refresh checkout and try again.']);
}

try {
    $payload = json_decode(file_get_contents('php://input'), true, 512, JSON_THROW_ON_ERROR);
} catch (JsonException $exception) {
    order_response(400, ['error' => 'The order details could not be read. Refresh checkout and try again.']);
}

if (!is_array($payload)) {
    order_response(400, ['error' => 'Invalid order details.']);
}

$orderToken = $payload['orderToken'] ?? '';
$items = $payload['items'] ?? null;
$deliveryMethod = $payload['deliveryMethod'] ?? '';
$paymentMethod = $payload['paymentMethod'] ?? '';
$address = trim(is_string($payload['address'] ?? null) ? $payload['address'] : '');
$city = trim(is_string($payload['city'] ?? null) ? $payload['city'] : '');
$notes = trim(is_string($payload['notes'] ?? null) ? $payload['notes'] : '');

if (!is_string($orderToken) || !preg_match('/^[a-f0-9-]{36}$/i', $orderToken)) {
    order_response(400, ['error' => 'Invalid order confirmation token.']);
}
if (!is_array($items) || $items === [] || count($items) > 30) {
    order_response(422, ['error' => 'Your cart is empty or contains too many different items.']);
}
if (!in_array($deliveryMethod, ['standard', 'express', 'pickup'], true)) {
    order_response(422, ['error' => 'Choose a valid delivery method.']);
}
if (!in_array($paymentMethod, ['Cash on Delivery', 'GCash', 'Online Bank', 'Credit Card'], true)) {
    order_response(422, ['error' => 'Choose a valid payment method.']);
}
if (mb_strlen($notes) > 1000) {
    order_response(422, ['error' => 'Order notes must be no longer than 1000 characters.']);
}

$isPickup = $deliveryMethod === 'pickup';
if ($isPickup && $paymentMethod === 'Cash on Delivery') {
    order_response(422, ['error' => 'Cash on Delivery is unavailable for store pickup.']);
}
if (!$isPickup && ($address === '' || mb_strlen($address) > 190 || !in_array($city, account_cities(), true))) {
    order_response(422, ['error' => 'Enter a street address and choose a Metro Manila city.']);
}

$catalog = account_menu_catalog();
$normalizedItems = [];
$subtotalCents = 0;
foreach ($items as $item) {
    if (!is_array($item) || !is_string($item['name'] ?? null)) {
        order_response(422, ['error' => 'One or more cart items are invalid.']);
    }

    $name = $item['name'];
    $size = $item['size'] ?? '';
    $quantity = filter_var($item['quantity'] ?? null, FILTER_VALIDATE_INT);
    if (!isset($catalog[$name]) || !is_string($size) || $quantity === false || $quantity < 1 || $quantity > 99) {
        order_response(422, ['error' => 'One or more cart items are unavailable. Please refresh your cart.']);
    }
    if (!array_key_exists($size, $catalog[$name])) {
        order_response(422, ['error' => 'A cart item has an invalid size. Please refresh your cart.']);
    }

    $unitPriceCents = $catalog[$name][$size];
    $lineTotalCents = $unitPriceCents * $quantity;
    $subtotalCents += $lineTotalCents;
    $normalizedItems[] = [
        'name' => $name,
        'size' => $size !== '' ? $size : null,
        'quantity' => $quantity,
        'unitPrice' => $unitPriceCents / 100,
        'lineTotal' => $lineTotalCents / 100,
    ];
}

if ($subtotalCents > 10000000000) {
    order_response(422, ['error' => 'The order total is too high to process.']);
}

$deliveryFeeCents = match ($deliveryMethod) {
    'standard' => 15000,
    'express' => 25000,
    'pickup' => 0,
};
$subtotal = $subtotalCents / 100;
$deliveryFee = $deliveryFeeCents / 100;
$total = ($subtotalCents + $deliveryFeeCents) / 100;
$storedAddress = $isPickup ? 'Store Pickup' : $address;
$storedCity = $isPickup ? null : $city;

try {
    $pdo = account_db();
    $existing = $pdo->prepare(
        'SELECT id, order_number, full_name, phone, address, city, delivery_method, delivery_fee,
                payment_method, order_notes, subtotal, total, status, created_at
         FROM orders WHERE user_id = :user_id AND order_token = :order_token LIMIT 1'
    );
    $existing->execute([
        'user_id' => $_SESSION['account_user_id'],
        'order_token' => $orderToken,
    ]);
    $order = $existing->fetch();

    if (!$order) {
        $profileQuery = $pdo->prepare(
            'SELECT first_name, last_name, phone FROM users WHERE id = :id LIMIT 1'
        );
        $profileQuery->execute(['id' => $_SESSION['account_user_id']]);
        $profile = $profileQuery->fetch();
        if (!$profile || !account_is_valid_philippine_phone($profile['phone'] ?? '')) {
            order_response(422, ['error' => 'Complete your profile with a valid +63 phone number before ordering.']);
        }

        $pdo->beginTransaction();
        $insertOrder = $pdo->prepare(
            'INSERT INTO orders
                (user_id, order_token, order_number, full_name, phone, address, city,
                 delivery_method, delivery_fee, payment_method, order_notes, subtotal, total)
             VALUES
                (:user_id, :order_token, :order_number, :full_name, :phone, :address, :city,
                 :delivery_method, :delivery_fee, :payment_method, :order_notes, :subtotal, :total)'
        );
        $fullName = trim($profile['first_name'] . ' ' . $profile['last_name']);
        $insertOrder->execute([
            'user_id' => $_SESSION['account_user_id'],
            'order_token' => $orderToken,
            'order_number' => 'pending-' . bin2hex(random_bytes(8)),
            'full_name' => $fullName,
            'phone' => $profile['phone'],
            'address' => $storedAddress,
            'city' => $storedCity,
            'delivery_method' => $deliveryMethod,
            'delivery_fee' => number_format($deliveryFee, 2, '.', ''),
            'payment_method' => $paymentMethod,
            'order_notes' => $notes,
            'subtotal' => number_format($subtotal, 2, '.', ''),
            'total' => number_format($total, 2, '.', ''),
        ]);
        $orderId = (int) $pdo->lastInsertId();
        $orderNumber = 'VT-' . date('Ymd') . '-' . str_pad((string) $orderId, 6, '0', STR_PAD_LEFT);
        $pdo->prepare('UPDATE orders SET order_number = :order_number WHERE id = :id')
            ->execute(['order_number' => $orderNumber, 'id' => $orderId]);

        $insertItem = $pdo->prepare(
            'INSERT INTO order_items (order_id, item_name, item_size, quantity, unit_price, line_total)
             VALUES (:order_id, :item_name, :item_size, :quantity, :unit_price, :line_total)'
        );
        foreach ($normalizedItems as $item) {
            $insertItem->execute([
                'order_id' => $orderId,
                'item_name' => $item['name'],
                'item_size' => $item['size'],
                'quantity' => $item['quantity'],
                'unit_price' => number_format($item['unitPrice'], 2, '.', ''),
                'line_total' => number_format($item['lineTotal'], 2, '.', ''),
            ]);
        }
        $pdo->commit();
        $existing->execute([
            'user_id' => $_SESSION['account_user_id'],
            'order_token' => $orderToken,
        ]);
        $order = $existing->fetch();
    }

    if (!$order) {
        throw new RuntimeException('Saved order could not be loaded after insertion.');
    }

    $itemQuery = $pdo->prepare(
        'SELECT item_name, item_size, quantity, unit_price, line_total
         FROM order_items WHERE order_id = :order_id ORDER BY id'
    );
    $itemQuery->execute(['order_id' => $order['id']]);
    $savedItems = array_map(static fn (array $item): array => [
        'name' => $item['item_name'],
        'size' => $item['item_size'],
        'quantity' => (int) $item['quantity'],
        'unitPrice' => (float) $item['unit_price'],
        'lineTotal' => (float) $item['line_total'],
    ], $itemQuery->fetchAll());

    order_response(200, [
        'orderNumber' => $order['order_number'],
        'fullName' => $order['full_name'],
        'phone' => $order['phone'],
        'address' => $order['address'],
        'city' => $order['city'],
        'deliveryMethod' => $order['delivery_method'],
        'deliveryFee' => (float) $order['delivery_fee'],
        'paymentMethod' => $order['payment_method'],
        'notes' => $order['order_notes'],
        'subtotal' => (float) $order['subtotal'],
        'total' => (float) $order['total'],
        'status' => $order['status'],
        'createdAt' => $order['created_at'],
        'items' => $savedItems,
    ]);
} catch (PDOException $exception) {
    if (isset($pdo) && $pdo->inTransaction()) {
        $pdo->rollBack();
    }
    error_log('Vitaly Tea order submission failed: ' . $exception->getMessage());
    order_response(503, ['error' => 'We could not save your order. Please try again.']);
} catch (RuntimeException $exception) {
    if (isset($pdo) && $pdo->inTransaction()) {
        $pdo->rollBack();
    }
    error_log('Vitaly Tea order processing failed: ' . $exception->getMessage());
    order_response(500, ['error' => 'We could not complete your order. Please try again.']);
}
