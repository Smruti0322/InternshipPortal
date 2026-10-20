# Database schema requirements

The backend controllers and routes use the tables listed below. `initial_schema.sql` is the reproducible baseline for a **new, empty development database**. Do not apply it to an existing or production database. Existing installations require metadata inspection and reviewed additive migrations; the baseline intentionally contains no destructive statements and stops if tables already exist.

| Feature | Tables referenced |
| --- | --- |
| Accounts and preferences | `users` |
| Authentication, recovery, and device security | `login_history`, `trusted_devices`, `login_verifications`, `user_sessions`, `password_reset_history`, `resume_otps`, `language_otps`, `language_change_history` |
| Resumes and payment | `resumes`, `resume_versions`, `resume_payments`, `resume_invoices`, `resume_downloads` |
| Subscriptions and quotas | `subscription_plans`, `user_subscriptions`, `subscription_payments`, `subscription_invoices` |
| Internship applications | `internship_listings`, `internship_applications` |
| Community | `friend_requests`, `friendships`, `follows`, `posts`, `post_media`, `hashtags`, `post_hashtags`, `post_mentions`, `post_likes`, `post_saves`, `post_comments`, `post_shares`, `post_reports`, `post_views`, `notifications` |

`resume_payment_migration.sql` and `password_reset_attempts_migration.sql` are historical migrations for an existing installation. The initial schema already includes their tables and recovery `attempts` column, so do not run them after the baseline. The migrations use `IF NOT EXISTS` for resume tables but do not update partially existing definitions; inspect existing metadata before any migration. No database connection was available during this implementation, and no live schema inspection or mutation was performed.

Additional query dependencies included in the baseline:

- `resume_otps` has `user_id`, `resume_id`, `otp`, `created_at`, `expires_at`, `verified`, and `attempts` in the inspected schema. Active resume OTP code now uses those verified columns; it does not persist a redundant email field.
- `password_reset_history` has `user_id`, `otp`, `otp_expires_at`, `reset_method`, `otp_verified`, `attempts`, `status`, `verification_time`, and `created_at`. The recovery flow also relies on `users.mobile` and `users.must_change_password` columns.
- `language_change_history` and `language_otps` are required by the language routes; `language_otps` requires `attempts` and `verified` fields.
- The login security controllers rely on OTP attempt/expiry fields, `trusted_devices`, `login_history`, and `user_sessions` as described in their SQL queries.

The script includes `resumes.resume_language`, used by active resume create/read/update routes. SQL date usage is mixed: some paths use `NOW()`, resume OTP expiry uses `UTC_TIMESTAMP()`, and listing/post quota checks use `CURDATE()`. Store `DATETIME` values with UTC server/session settings; these app expressions must continue to be interpreted consistently. Payment capture, subscription activation, and related writes use InnoDB transactions/row locks; transaction semantics require InnoDB tables. The schema provides foreign keys and indexes for those locking/look-up paths. Test against an isolated disposable database before application integration.

### Supported local setup and verification

- Supported baseline: MySQL Community Server 8.0.16+ with InnoDB. `utf8mb4_0900_ai_ci` collation is used.
- Create and populate a fresh development database by running `mysql -u <dev-user> -p < backend/database/initial_schema.sql`. It creates `internship_portal_dev`; it never drops databases or tables.
- Set the environment variable names from `backend/.env.example`; for the baseline set `DB_NAME=internship_portal_dev`. Do not disclose or commit values. Never use a production DB for setup verification.
- Verify a disposable DB read-only with `mysql -u <dev-user> -p internship_portal_dev < backend/database/verify_schema.sql`, then run `npm test` in `backend/` for the static schema contract check.
- Manual metadata checks: `SHOW TABLES;`, `SHOW CREATE TABLE users;`, `SHOW CREATE TABLE resumes;`, and `SELECT plan_name, monthly_price, application_limit FROM subscription_plans ORDER BY id;`.
- Existing schema discrepancy: do not rerun the baseline. Produce a schema-specific, additive `ALTER TABLE` migration after comparing `information_schema` with the query contract and backing up/restoring in a test copy. No blanket replacement is supported.

### Safe migration procedure

1. Take a fresh backup of the target database and confirm that the backup can be restored in a non-production environment.
2. Confirm the target database is a non-production target, then check that `password_reset_history` exists and that `attempts` is absent:

   ```sql
   SELECT TABLE_SCHEMA, TABLE_NAME, COLUMN_NAME
   FROM information_schema.COLUMNS
   WHERE TABLE_SCHEMA = DATABASE()
     AND TABLE_NAME = 'password_reset_history'
     AND COLUMN_NAME IN ('otp_verified', 'attempts');
   ```

   The target should show `otp_verified` and no `attempts` row. If `attempts` already exists, do not run the migration again. This migration only addresses this column, not any other schema difference.
3. Apply `password_reset_attempts_migration.sql` once using the database's normal migration process. It adds a `NOT NULL` integer column with a default of zero and does not delete or rewrite existing rows.
4. Re-run the metadata query and verify that `attempts` exists before deploying the recovery controller. This legacy migration is not needed after the new initial schema.

## Recovery and delivery limitations

- Email password recovery is implemented. The OTP request row is committed only after the configured SMTP server accepts the message, so an SMTP failure does not consume the 24-hour request window.
- Mobile recovery currently validates whether the number belongs to an account, then returns HTTP 501. No SMS provider or delivery credentials are configured; do not advertise mobile OTP recovery as available until one is integrated and tested.
- Email delivery has not been verified against a real SMTP account as part of this repository review.
