<?php
require_once __DIR__ . '/bootstrap.php';
account_require_authentication();

$errors = [];
$success = '';
$welcome = isset($_GET['welcome']) && $_GET['welcome'] === '1';

try {
    $statement = account_db()->prepare(
        'SELECT id, first_name, last_name, email, phone, address, city, postal_code, created_at
         FROM users WHERE id = :id LIMIT 1'
    );
    $statement->execute(['id' => $_SESSION['account_user_id']]);
    $profile = $statement->fetch();
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
        'postal_code' => account_post('postal_code'),
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
    foreach (['address' => 190, 'postal_code' => 20] as $field => $limit) {
        if (mb_strlen($values[$field]) > $limit) {
            $errors[] = ucfirst(str_replace('_', ' ', $field)) . " must be no longer than {$limit} characters.";
        }
    }

    if ($errors === []) {
        try {
            $update = account_db()->prepare(
                'UPDATE users
                 SET first_name = :first_name, last_name = :last_name, phone = :phone,
                     address = :address, city = :city, postal_code = :postal_code
                 WHERE id = :id'
            );
            $update->execute([
                'first_name' => $values['first_name'],
                'last_name' => $values['last_name'],
                'phone' => $values['phone'],
                'address' => $values['address'],
                'city' => $values['city'],
                'postal_code' => $values['postal_code'] !== '' ? $values['postal_code'] : null,
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
                <form method="post" action="logout.php">
                    <input type="hidden" name="csrf_token" value="<?= account_escape(account_csrf_token()) ?>">
                    <button class="account-secondary-button" type="submit">Sign out</button>
                </form>
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
                    <div class="account-field account-field-full">
                        <label for="phone">Philippine phone number</label>
                        <input id="phone" name="phone" type="tel" autocomplete="tel" inputmode="tel" pattern="\+63[0-9]{9,10}" maxlength="14" placeholder="+639171234567" value="<?= account_escape($profile['phone']) ?>" required>
                    </div>
                    <div class="account-field account-field-full">
                        <label for="address">Street address</label>
                        <input id="address" name="address" type="text" autocomplete="street-address" maxlength="190" value="<?= account_escape($profile['address']) ?>" required>
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
                    <div class="account-field">
                        <label for="postal_code">Postal code <span>Optional</span></label>
                        <input id="postal_code" name="postal_code" type="text" autocomplete="postal-code" maxlength="20" value="<?= account_escape($profile['postal_code']) ?>">
                    </div>
                </div>
                <button class="account-primary-button" type="submit">Save profile</button>
            </form>
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
