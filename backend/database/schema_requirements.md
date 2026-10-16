# Database schema requirements

No complete schema or schema dump is checked into this repository. The backend controllers and routes reference the following existing tables; use the deployed database schema as the source of truth before creating or changing them.

| Feature | Tables referenced |
| --- | --- |
| Accounts and preferences | `users` |
| Resumes | `resumes`, `resume_versions`, `resume_payments`, `resume_invoices`, `resume_downloads` |
| Login security | `login_history`, `trusted_devices`, `user_sessions`, OTP tables referenced in auth controllers |
| Subscriptions and quotas | `subscription_plans`, `user_subscriptions`, subscription payment and invoice tables |
| Internship applications | `internship_listings`, `internship_applications` |
| Community | posts, post media, likes, comments, follows, friends/requests, notifications, reports, saved posts, and views tables (see `postController.js` and `communityController.js`) |

`resume_payment_migration.sql` adds resume payment, invoice, download, and version tables and expects existing `users` and `resumes` tables. The connected `internship_portal` schema was inspected read-only during this review. `password_reset_history` exists and lacks `attempts`; `password_reset_attempts_migration.sql` adds that one confirmed column with a default of zero and does not remove or rewrite data. Apply it once before deploying the recovery attempt counter.

Additional schema dependencies confirmed during review:

- `resume_otps` has `user_id`, `resume_id`, `otp`, `created_at`, `expires_at`, `verified`, and `attempts` in the inspected schema. Active resume OTP code now uses those verified columns; it does not persist a redundant email field.
- `password_reset_history` has `user_id`, `otp`, `otp_expires_at`, `reset_method`, `otp_verified`, `status`, `verification_time`, and `created_at`; `attempts` is added by the migration above. The recovery flow also relies on verified `users.mobile` and `users.must_change_password` columns.
- `language_change_history` and `language_otps` are required by the language routes; `language_otps` requires `attempts` and `verified` fields.
- The login security controllers rely on OTP attempt/expiry fields, `trusted_devices`, `login_history`, and `user_sessions` as described in their SQL queries.

Other listed fields were compared to the connected schema. Production schema may differ; verify the deployment target before applying the migration.

### Safe migration procedure

1. Take a fresh backup of the target database and confirm that the backup can be restored in a non-production environment.
2. Confirm the target database is the intended one, then check that `password_reset_history` exists and that `attempts` is absent:

   ```sql
   SELECT TABLE_SCHEMA, TABLE_NAME, COLUMN_NAME
   FROM information_schema.COLUMNS
   WHERE TABLE_SCHEMA = DATABASE()
     AND TABLE_NAME = 'password_reset_history'
     AND COLUMN_NAME IN ('otp_verified', 'attempts');
   ```

   The verified deployment should show `otp_verified` and no `attempts` row. If `attempts` already exists, do not run the migration again.
3. Apply `password_reset_attempts_migration.sql` once using the database's normal migration process. It adds a `NOT NULL` integer column with a default of zero and does not delete or rewrite existing rows.
4. Re-run the metadata query and verify that `attempts` exists before deploying the recovery controller.

## Recovery and delivery limitations

- Email password recovery is implemented. The OTP request row is committed only after the configured SMTP server accepts the message, so an SMTP failure does not consume the 24-hour request window.
- Mobile recovery currently validates whether the number belongs to an account, then returns HTTP 501. No SMS provider or delivery credentials are configured; do not advertise mobile OTP recovery as available until one is integrated and tested.
- Email delivery has not been verified against a real SMTP account as part of this repository review.
