<?php
require_once __DIR__ . '/bootstrap.php';
account_require_authentication();

$errors = [];
$success = '';
$welcome = isset($_GET['welcome']) && $_GET['welcome'] === '1';
$orders = [];
$orderItems = [];

try {
    $statement = account_db()->prepare(
        'SELECT id, first_name, last_name, email, phone, address, city
         FROM users WHERE id = :id LIMIT 1'
    );
    $statement->execute(['id' => $_SESSION['account_user_id']]);
    $profile = $statement->fetch();
    $ordersStatement = account_db()->prepare(
        'SELECT id, order_number, address, city, delivery_method, payment_method,
                subtotal, delivery_fee, total, status, created_at
         FROM orders WHERE user_id = :id ORDER BY created_at DESC, id DESC LIMIT 20'
    );
    $ordersStatement->execute(['id' => $_SESSION['account_user_id']]);
    $orders = $ordersStatement->fetchAll();

    if ($orders !== []) {
        $orderIds = array_column($orders, 'id');
        $placeholders = implode(',', array_fill(0, count($orderIds), '?'));
        $itemsStatement = account_db()->prepare(
            "SELECT order_id, item_name, item_size, quantity, unit_price, line_total
             FROM order_items WHERE order_id IN ({$placeholders}) ORDER BY id"
        );
        $itemsStatement->execute($orderIds);
        foreach ($itemsStatement->fetchAll() as $item) {
            $orderItems[$item['order_id']][] = $item;
        }
    }
} catch (PDOException $exception) {
    error_log('Vitaly Tea profile lookup failed: ' . $exception->getMessage());
    http_response_code(503);
    $profile = false;
    $errors[] = 'Your profile is temporarily unavailable. Please try again later.';
}

if (!$profile && $errors === []) {
    $_SESSION = [];
    session_destroy();
    header('Location: login.php');
    exit;
}

if ($profile && $_SERVER['REQUEST_METHOD'] === 'POST') {
    $values = [
        'first_name' => account_post('first_name'),
        'last_name' => account_post('last_name'),
        'phone' => account_post('phone'),
        'address' => account_post('address'),
        'city' => account_post('city'),
    ];

    if (!account_csrf_is_valid()) {
        $errors[] = 'Your session expired. Please reload the page and try again.';
    }
    if ($values['first_name'] === '' || mb_strlen($values['first_name']) > 80) {
        $errors[] = 'Enter a first name no longer than 80 characters.';
    }
    if ($values['last_name'] === '' || mb_strlen($values['last_name']) > 80) {
        $errors[] = 'Enter a last name no longer than 80 characters.';
    }
    if (!account_is_valid_philippine_phone($values['phone'])) {
        $errors[] = 'Enter a valid Philippine phone number starting with +63.';
    }
    if (!in_array($values['city'], account_cities(), true)) {
        $errors[] = 'Choose a city or municipality in Metro Manila.';
    }
    if ($values['address'] === '') {
        $errors[] = 'Street address is required.';
    }
    if (mb_strlen($values['address']) > 190) {
        $errors[] = 'Street address must be no longer than 190 characters.';
    }

    if ($errors === []) {
        try {
            $update = account_db()->prepare(
                'UPDATE users
                 SET first_name = :first_name, last_name = :last_name, phone = :phone,
                     address = :address, city = :city
                 WHERE id = :id'
            );
            $update->execute([
                'first_name' => $values['first_name'],
                'last_name' => $values['last_name'],
                'phone' => $values['phone'],
                'address' => $values['address'],
                'city' => $values['city'],
                'id' => $profile['id'],
            ]);
            $_SESSION['account_user_name'] = $values['first_name'];
            $success = 'Your profile has been updated.';
            $profile = array_merge($profile, $values);
        } catch (PDOException $exception) {
            error_log('Vitaly Tea profile update failed: ' . $exception->getMessage());
            $errors[] = 'We could not update your profile right now. Please try again later.';
        }
    } else {
        $profile = array_merge($profile, $values);
    }
}

$pageTitle = 'My profile';
require __DIR__ . '/layout-top.php';
?>
<main class="account-main">
    <?php if ($profile): ?>
        <section class="account-card account-profile-card" aria-labelledby="account-heading">
            <div class="profile-heading">
                <div>
                    <p class="account-eyebrow">Your Vitaly Tea account</p>
                    <h1 id="account-heading">My profile</h1>
                    <p class="account-intro">Keep your contact and delivery details up to date.</p>
                </div>
            </div>

            <?php if ($welcome): ?>
                <p class="account-alert account-alert-success" role="status">Your account is ready. Add your required street address to complete your profile for checkout.</p>
            <?php endif; ?>
            <?php if ($success !== ''): ?>
                <p class="account-alert account-alert-success" role="status"><?= account_escape($success) ?></p>
            <?php endif; ?>
            <?php if ($errors !== []): ?>
                <div class="account-alert account-alert-error" role="alert">
                    <ul>
                        <?php foreach ($errors as $error): ?>
                            <li><?= account_escape($error) ?></li>
                        <?php endforeach; ?>
                    </ul>
                </div>
            <?php endif; ?>

            <form class="account-form" method="post" action="profile.php">
                <input type="hidden" name="csrf_token" value="<?= account_escape(account_csrf_token()) ?>">
                <div class="account-form-grid">
                    <div class="account-field">
                        <label for="first_name">First name</label>
                        <input id="first_name" name="first_name" type="text" autocomplete="given-name" maxlength="80" value="<?= account_escape($profile['first_name']) ?>" required>
                    </div>
                    <div class="account-field">
                        <label for="last_name">Last name</label>
                        <input id="last_name" name="last_name" type="text" autocomplete="family-name" maxlength="80" value="<?= account_escape($profile['last_name']) ?>" required>
                    </div>
                    <div class="account-field account-field-full">
                        <label for="email">Email address</label>
                        <input id="email" type="email" value="<?= account_escape($profile['email']) ?>" readonly aria-describedby="email-help">
                        <small id="email-help">Email is used to sign in and cannot be changed here.</small>
                    </div>
                    <div class="account-field">
                        <label for="phone">Philippine phone number</label>
                        <input id="phone" name="phone" type="tel" autocomplete="tel" inputmode="tel" pattern="\+63[0-9]{9,10}" maxlength="14" placeholder="+639171234567" value="<?= account_escape($profile['phone']) ?>" required>
                    </div>
                    <div class="account-field">
                        <label for="city">City / municipality</label>
                        <select id="city" name="city" autocomplete="address-level2" required>
                            <option value="">Choose a Metro Manila city</option>
                            <?php foreach (account_cities() as $city): ?>
                                <option value="<?= account_escape($city) ?>" <?= $profile['city'] === $city ? 'selected' : '' ?>><?= account_escape($city) ?></option>
                            <?php endforeach; ?>
                        </select>
                    </div>
                    <div class="account-field account-field-full">
                        <label for="address">Street address</label>
                        <input id="address" name="address" type="text" autocomplete="street-address" maxlength="190" value="<?= account_escape($profile['address']) ?>" required>
                    </div>
                </div>
                <button class="account-primary-button" type="submit">Save profile</button>
            </form>
        </section>

        <section class="account-card account-history-card" aria-labelledby="order-history-heading">
            <p class="account-eyebrow">Your past purchases</p>
            <h2 id="order-history-heading">Order history</h2>
            <?php if ($orders === []): ?>
                <p class="account-intro account-history-empty">Your completed orders will appear here.</p>
            <?php else: ?>
                <div class="account-order-list">
                    <?php foreach ($orders as $order): ?>
                        <details class="account-order">
                            <summary>
                                <span>
                                    <strong><?= account_escape($order['order_number']) ?></strong>
                                    <small><?= account_escape(date('M j, Y · g:i A', strtotime($order['created_at']))) ?></small>
                                </span>
                                <span class="account-order-summary">
                                    <strong>₱<?= number_format((float) $order['total'], 2) ?></strong>
                                    <small><?= account_escape($order['status']) ?></small>
                                </span>
                            </summary>
                            <div class="account-order-details">
                                <p><strong>Delivery:</strong> <?= account_escape(ucfirst($order['delivery_method'])) ?><?= $order['delivery_method'] === 'pickup' ? '' : ' · ' . account_escape(trim($order['address'] . ', ' . ($order['city'] ?? ''))) ?></p>
                                <p><strong>Payment:</strong> <?= account_escape($order['payment_method']) ?></p>
                                <ul>
                                    <?php foreach ($orderItems[$order['id']] ?? [] as $item): ?>
                                        <li>
                                            <span><?= account_escape($item['item_name']) ?><?= $item['item_size'] ? ' (' . account_escape($item['item_size']) . ')' : '' ?> × <?= (int) $item['quantity'] ?></span>
                                            <strong>₱<?= number_format((float) $item['line_total'], 2) ?></strong>
                                        </li>
                                    <?php endforeach; ?>
                                </ul>
                                <p class="account-order-total"><span>Subtotal + delivery</span><strong>₱<?= number_format((float) $order['subtotal'], 2) ?> + ₱<?= number_format((float) $order['delivery_fee'], 2) ?></strong></p>
                            </div>
                        </details>
                    <?php endforeach; ?>
                </div>
            <?php endif; ?>
        </section>
    <?php else: ?>
        <section class="account-card" aria-labelledby="account-heading">
            <p class="account-eyebrow">Your Vitaly Tea account</p>
            <h1 id="account-heading">Profile unavailable</h1>
            <p class="account-alert account-alert-error" role="alert"><?= account_escape($errors[0]) ?></p>
            <a class="account-primary-button account-button-link" href="profile.php">Try again</a>
        </section>
    <?php endif; ?>
</main>
<?php require __DIR__ . '/layout-bottom.php'; ?>
