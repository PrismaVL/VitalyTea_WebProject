# Vitaly Tea accounts

This account area uses PHP sessions and MySQL through PDO. It stores account/profile information and confirmed order history. The cart remains in the browser until an order is explicitly confirmed. Contact-form messages are not stored, and there is no admin inbox.

## Local XAMPP setup

1. Start **Apache** and **MySQL** from the XAMPP Control Panel.
2. In phpMyAdmin, import `account/schema.sql`. This creates the `vitalytea_accounts` database and its account/order tables. Re-importing is safe; existing order tables are retained.
3. Open the site through Apache, for example `http://localhost/VitalyTea_WebProject-1/`. Do not open the pages using `file://`; PHP pages need Apache.
4. Use the account icon in the shared navbar to register or log in. New registrations are signed in and sent to the account profile.

For a default local XAMPP installation, PHP connects to `127.0.0.1:3306` as `root` with an empty password. Override these development defaults with environment variables when the MySQL setup differs:

- `VITALYTEA_DB_HOST`
- `VITALYTEA_DB_PORT`
- `VITALYTEA_DB_NAME`
- `VITALYTEA_DB_USER`
- `VITALYTEA_DB_PASSWORD`

Use a dedicated MySQL user with a strong password outside local development. Passwords are stored as PHP `password_hash()` hashes. Forms use CSRF tokens, and database statements use PDO prepared statements.

Registration and profile updates require a Philippine phone number in `+63` format. A street address is required to complete the profile; after registration, the user is sent directly to the profile to fill it in. The profile city is restricted to Metro Manila cities and Pateros; the country field is omitted because delivery is limited to the Philippines. At checkout, signed-in users get their saved name, phone, address, and city prefilled. Name and phone are read-only there, while delivery address and city can be changed for that order.

Email addresses are kept fixed because changing a sign-in address should require a separate verified-email flow. Confirmed orders are stored with a server-calculated snapshot of the current menu prices and are listed in the profile's Order history section. If menu prices or products change, update the server-side catalog in `account/menu-catalog.php` to match `html/menu.html`.

The checkout confirmation creates a saved order request. Online payment methods are currently demo selections only; no payment is charged or processed.

If upgrading an existing database, run `ALTER TABLE vitalytea_accounts.users DROP COLUMN postal_code;` once to remove the old postal-code field and its saved values.
