-- Add a defaulted attempt counter used by the password recovery OTP verifier.
-- Verified against the current internship_portal schema: the table exists and
-- this column is absent. Apply once before deploying the updated controller.
ALTER TABLE password_reset_history
    ADD COLUMN attempts INT UNSIGNED NOT NULL DEFAULT 0 AFTER otp_verified;
