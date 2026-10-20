-- Read-only checks for the disposable internship_portal_dev database.
SELECT DATABASE() AS selected_database;
SELECT COUNT(*) AS total_base_tables,
       SUM(table_name IN (
         'users','resumes','resume_otps','resume_payments','resume_invoices',
         'resume_downloads','resume_versions','login_history','trusted_devices',
         'login_verifications','user_sessions','password_reset_history',
         'language_otps','language_change_history','friend_requests','friendships',
         'follows','posts','post_media','hashtags','post_hashtags','post_mentions',
         'post_likes','post_saves','post_comments','post_shares','post_reports',
         'post_views','notifications','internship_listings','internship_applications',
         'subscription_plans','user_subscriptions','subscription_payments',
         'subscription_invoices'
       )) AS found_required_tables
FROM information_schema.tables
WHERE table_schema = DATABASE() AND table_type = 'BASE TABLE';

SELECT table_name, column_name, column_type, is_nullable
FROM information_schema.columns
WHERE table_schema = DATABASE()
  AND (table_name, column_name) IN (
    ('users','email'), ('users','password'), ('users','mobile'),
    ('users','preferred_language'), ('users','must_change_password'),
    ('resumes','resume_language'), ('resume_otps','attempts'),
    ('password_reset_history','attempts'), ('language_otps','verified'),
    ('login_verifications','otp_hash'), ('trusted_devices','device_identifier'),
    ('user_sessions','session_token_hash'), ('posts','friend_count_at_posting'),
    ('internship_listings','application_deadline'),
    ('subscription_payments','amount_paise'), ('resume_payments','payment_status')
  )
ORDER BY table_name, ordinal_position;

SELECT table_name, constraint_name, referenced_table_name, update_rule, delete_rule
FROM information_schema.referential_constraints
WHERE constraint_schema = DATABASE()
ORDER BY table_name, constraint_name;

SELECT plan_name, monthly_price, application_limit
FROM subscription_plans
ORDER BY FIELD(plan_name, 'Free', 'Bronze', 'Silver', 'Gold');
