<?php
require_once __DIR__ . '/bootstrap.php';

if (account_is_authenticated()) {
    header('Location: profile.php');
    exit;
}

$error = '';
$email = '';
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $email = strtolower(account_post('email'));
    $password = account_post_secret('password');

    if (!account_csrf_is_valid()) {
        $error = 'Your session expired. Please try signing in again.';
    } elseif (!filter_var($email, FILTER_VALIDATE_EMAIL) || $password === '') {
        $error = 'Enter a valid email address and password.';
    } else {
        try {
            $statement = account_db()->prepare(
                'SELECT id, first_name, password_hash FROM users WHERE email = :email LIMIT 1'
            );
            $statement->execute(['email' => $email]);
            $user = $statement->fetch();

            if ($user && password_verify($password, $user['password_hash'])) {
                if (password_needs_rehash($user['password_hash'], PASSWORD_DEFAULT)) {
                    $update = account_db()->prepare('UPDATE users SET password_hash = :password_hash WHERE id = :id');
                    $update->execute([
                        'password_hash' => password_hash($password, PASSWORD_DEFAULT),
                        'id' => $user['id'],
                    ]);
                }

                session_regenerate_id(true);
                $_SESSION['account_user_id'] = (int) $user['id'];
                $_SESSION['account_user_name'] = $user['first_name'];
                header('Location: profile.php');
                exit;
            }

            $error = 'The email address or password is incorrect.';
        } catch (PDOException $exception) {
            error_log('Vitaly Tea account login failed: ' . $exception->getMessage());
            $error = 'Sign in is temporarily unavailable. Please try again later.';
        }
    }
}

$pageTitle = 'Sign in';
require __DIR__ . '/layout-top.php';
?>
<main class="account-main account-main-compact">
    <section class="account-card" aria-labelledby="account-heading">
        <p class="account-eyebrow">Your Vitaly Tea account</p>
        <h1 id="account-heading">Welcome back</h1>
        <p class="account-intro">Sign in to view and update your account profile.</p>

        <?php if ($error !== ''): ?>
            <p class="account-alert account-alert-error" role="alert"><?= account_escape($error) ?></p>
        <?php endif; ?>

        <form class="account-form" method="post" action="login.php">
            <input type="hidden" name="csrf_token" value="<?= account_escape(account_csrf_token()) ?>">
            <div class="account-field">
                <label for="email">Email address</label>
                <input id="email" name="email" type="email" autocomplete="email" maxlength="254" value="<?= account_escape($email) ?>" required>
            </div>
            <div class="account-field">
                <label for="password">Password</label>
                <input id="password" name="password" type="password" autocomplete="current-password" required>
            </div>
            <button class="account-primary-button" type="submit">Sign in</button>
        </form>
        <p class="account-switch">New to Vitaly Tea? <a href="register.php">Create an account</a></p>
    </section>
</main>
<?php require __DIR__ . '/layout-bottom.php'; ?>
