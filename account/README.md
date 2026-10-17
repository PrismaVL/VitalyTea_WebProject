# Vitaly Tea accounts

This account area uses PHP sessions and MySQL through PDO. It stores only account/profile information; it does not store carts, orders, or contact-form messages. There is no admin inbox.

## Local XAMPP setup

1. Start **Apache** and **MySQL** from the XAMPP Control Panel.
2. In phpMyAdmin, import `account/schema.sql`. This creates the `vitalytea_accounts` database and its `users` table.
3. Open the site through Apache, for example `http://localhost/VitalyTea_WebProject-1/`. Do not open the pages using `file://`; PHP pages need Apache.
4. Use **Sign in** in the shared navbar to register or log in. New registrations are signed in and sent to the account profile.

For a default local XAMPP installation, PHP connects to `127.0.0.1:3306` as `root` with an empty password. Override these development defaults with environment variables when the MySQL setup differs:

- `VITALYTEA_DB_HOST`
- `VITALYTEA_DB_PORT`
- `VITALYTEA_DB_NAME`
- `VITALYTEA_DB_USER`
- `VITALYTEA_DB_PASSWORD`

Use a dedicated MySQL user with a strong password outside local development. Passwords are stored as PHP `password_hash()` hashes. Forms use CSRF tokens, and database statements use PDO prepared statements.

Registration and profile updates require a Philippine phone number in `+63` format. A street address is required to complete the profile; after registration, the user is sent directly to the profile to fill it in. The profile city is restricted to Metro Manila cities and Pateros; the country field is omitted because delivery is limited to the Philippines. At checkout, signed-in users get their saved name, phone, address, city, and postal code prefilled. Name and phone are read-only there, while delivery address, city, and postal code can be changed for that order.

Email addresses are kept fixed because changing a sign-in address should require a separate verified-email flow.
