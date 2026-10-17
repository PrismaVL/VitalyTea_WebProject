<?php
require_once __DIR__ . '/bootstrap.php';

if (account_is_authenticated()) {
    header('Location: profile.php');
    exit;
}

$errors = [];
$values = [
    'first_name' => '',
    'last_name' => '',
    'email' => '',
    'phone' => '',
];

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $values = [
        'first_name' => account_post('first_name'),
        'last_name' => account_post('last_name'),
        'email' => strtolower(account_post('email')),
        'phone' => account_post('phone'),
    ];
    $password = account_post_secret('password');
    $passwordConfirmation = account_post_secret('password_confirmation');

    if (!account_csrf_is_valid()) {
        $errors[] = 'Your session expired. Please try registering again.';
    }
    if ($values['first_name'] === '' || mb_strlen($values['first_name']) > 80) {
        $errors[] = 'Enter a first name no longer than 80 characters.';
    }
    if ($values['last_name'] === '' || mb_strlen($values['last_name']) > 80) {
        $errors[] = 'Enter a last name no longer than 80 characters.';
    }
    if (!filter_var($values['email'], FILTER_VALIDATE_EMAIL) || mb_strlen($values['email']) > 254) {
        $errors[] = 'Enter a valid email address.';
    }
    if (!account_is_valid_philippine_phone($values['phone'])) {
        $errors[] = 'Enter a valid Philippine phone number starting with +63.';
    }
    if (strlen($password) < 8 || strlen($password) > 4096) {
        $errors[] = 'Your password must be at least 8 characters long.';
    }
    if ($password !== $passwordConfirmation) {
        $errors[] = 'The passwords do not match.';
    }

    if ($errors === []) {
        try {
            $statement = account_db()->prepare(
                'INSERT INTO users (first_name, last_name, email, phone, password_hash)
                 VALUES (:first_name, :last_name, :email, :phone, :password_hash)'
            );
            $statement->execute([
                'first_name' => $values['first_name'],
                'last_name' => $values['last_name'],
                'email' => $values['email'],
                'phone' => $values['phone'],
                'password_hash' => password_hash($password, PASSWORD_DEFAULT),
            ]);
            session_regenerate_id(true);
            $_SESSION['account_user_id'] = (int) account_db()->lastInsertId();
            $_SESSION['account_user_name'] = $values['first_name'];
            header('Location: profile.php?welcome=1');
            exit;
        } catch (PDOException $exception) {
            if ($exception->getCode() === '23000') {
                $errors[] = 'An account with that email address already exists.';
            } else {
                error_log('Vitaly Tea account registration failed: ' . $exception->getMessage());
                $errors[] = 'We could not create your account right now. Please try again later.';
            }
        }
    }
}

$pageTitle = 'Create an account';
require __DIR__ . '/layout-top.php';
?>
<main class="account-main">
    <section class="account-card" aria-labelledby="account-heading">
        <p class="account-eyebrow">Welcome to Vitaly Tea</p>
        <h1 id="account-heading">Create your account</h1>
        <p class="account-intro">Create a profile to keep your contact and delivery details together.</p>

        <?php if ($errors !== []): ?>
            <div class="account-alert account-alert-error" role="alert">
                <ul>
                    <?php foreach ($errors as $error): ?>
                        <li><?= account_escape($error) ?></li>
                    <?php endforeach; ?>
                </ul>
            </div>
        <?php endif; ?>

        <form class="account-form" method="post" action="register.php">
            <input type="hidden" name="csrf_token" value="<?= account_escape(account_csrf_token()) ?>">
            <div class="account-form-grid">
                <div class="account-field">
                    <label for="first_name">First name</label>
                    <input id="first_name" name="first_name" type="text" autocomplete="given-name" maxlength="80" value="<?= account_escape($values['first_name']) ?>" required>
                </div>
                <div class="account-field">
                    <label for="last_name">Last name</label>
                    <input id="last_name" name="last_name" type="text" autocomplete="family-name" maxlength="80" value="<?= account_escape($values['last_name']) ?>" required>
                </div>
                <div class="account-field account-field-full">
                    <label for="email">Email address</label>
                    <input id="email" name="email" type="email" autocomplete="email" maxlength="254" value="<?= account_escape($values['email']) ?>" required>
                </div>
                <div class="account-field account-field-full">
                    <label for="phone">Philippine phone number</label>
                    <input id="phone" name="phone" type="tel" autocomplete="tel" inputmode="tel" pattern="\+63[0-9]{9,10}" maxlength="14" placeholder="+639171234567" value="<?= account_escape($values['phone']) ?>" aria-describedby="phone-help" required>
                    <small id="phone-help">Include the country code, for example +639171234567.</small>
                </div>
                <div class="account-field">
                    <label for="password">Password</label>
                    <input id="password" name="password" type="password" autocomplete="new-password" minlength="8" required>
                </div>
                <div class="account-field">
                    <label for="password_confirmation">Confirm password</label>
                    <input id="password_confirmation" name="password_confirmation" type="password" autocomplete="new-password" minlength="8" required>
                </div>
            </div>
            <button class="account-primary-button" type="submit">Create account</button>
        </form>
        <p class="account-switch">Already have an account? <a href="login.php">Sign in</a></p>
    </section>
</main>
<?php require __DIR__ . '/layout-bottom.php'; ?>
