<?php
declare(strict_types=1);

function start_account_session(): void
{
    if (session_status() === PHP_SESSION_ACTIVE) {
        return;
    }

    ini_set('session.use_strict_mode', '1');
    session_name('vitalytea_session');
    session_set_cookie_params([
        'httponly' => true,
        'secure' => !empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off',
        'samesite' => 'Lax',
        'path' => '/',
    ]);
    session_start();
}

function account_db(): PDO
{
    static $connection = null;
    if ($connection instanceof PDO) {
        return $connection;
    }

    $host = getenv('VITALYTEA_DB_HOST') ?: '127.0.0.1';
    $port = getenv('VITALYTEA_DB_PORT') ?: '3306';
    $name = getenv('VITALYTEA_DB_NAME') ?: 'vitalytea_accounts';
    $user = getenv('VITALYTEA_DB_USER') ?: 'root';
    $password = getenv('VITALYTEA_DB_PASSWORD');

    $dsn = sprintf('mysql:host=%s;port=%s;dbname=%s;charset=utf8mb4', $host, $port, $name);
    $connection = new PDO($dsn, $user, $password === false ? '' : $password, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES => false,
    ]);

    return $connection;
}

function account_escape(mixed $value): string
{
    return htmlspecialchars((string) $value, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
}

function account_post(string $key): string
{
    $value = $_POST[$key] ?? '';
    return is_string($value) ? trim($value) : '';
}

function account_post_secret(string $key): string
{
    $value = $_POST[$key] ?? '';
    return is_string($value) ? $value : '';
}

function account_cities(): array
{
    return [
        'Manila',
        'Caloocan',
        'Las Piñas',
        'Makati',
        'Malabon',
        'Mandaluyong',
        'Marikina',
        'Muntinlupa',
        'Navotas',
        'Parañaque',
        'Pasay',
        'Pasig',
        'Quezon City',
        'San Juan',
        'Taguig',
        'Valenzuela',
        'Pateros',
    ];
}

function account_is_valid_philippine_phone(string $phone): bool
{
    return preg_match('/^\+63[0-9]{9,10}$/', $phone) === 1;
}

function account_csrf_token(): string
{
    if (!isset($_SESSION['account_csrf']) || !is_string($_SESSION['account_csrf'])) {
        $_SESSION['account_csrf'] = bin2hex(random_bytes(32));
    }

    return $_SESSION['account_csrf'];
}

function account_csrf_is_valid(): bool
{
    $submitted = account_post('csrf_token');
    return account_csrf_token_is_valid($submitted);
}

function account_csrf_token_is_valid(string $submitted): bool
{
    $stored = $_SESSION['account_csrf'] ?? '';

    return is_string($stored) && $stored !== '' && hash_equals($stored, $submitted);
}

function account_is_authenticated(): bool
{
    return isset($_SESSION['account_user_id']) && is_int($_SESSION['account_user_id']);
}

function account_require_authentication(): void
{
    if (!account_is_authenticated()) {
        header('Location: login.php');
        exit;
    }
}

start_account_session();
define('VITALYTEA_ACCOUNT_PAGE', true);
