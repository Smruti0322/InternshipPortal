-- Initial schema for a NEW, EMPTY development database only.
-- Supported server: MySQL 8.0.16+ (InnoDB, enforced CHECK constraints).
-- This script deliberately has no DROP statements. It creates a separate
-- development database and will stop on existing tables rather than replace
-- them. For an existing database, use a reviewed, additive migration instead.

CREATE DATABASE IF NOT EXISTS internship_portal_dev
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_0900_ai_ci;
USE internship_portal_dev;
SET NAMES utf8mb4 COLLATE utf8mb4_0900_ai_ci;

CREATE TABLE users (
    id INT NOT NULL AUTO_INCREMENT,
    name VARCHAR(150) NOT NULL,
    email VARCHAR(254) NOT NULL,
    password VARCHAR(255) NOT NULL,
    mobile VARCHAR(20) NULL,
    preferred_language VARCHAR(5) NOT NULL DEFAULT 'en',
    must_change_password TINYINT(1) NOT NULL DEFAULT 0,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_users_email (email),
    KEY idx_users_mobile (mobile),
    CONSTRAINT chk_users_language CHECK (preferred_language IN ('en', 'es', 'hi', 'pt', 'zh', 'fr'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE resumes (
    id INT NOT NULL AUTO_INCREMENT,
    user_id INT NOT NULL,
    resume_name VARCHAR(160) NOT NULL,
    full_name VARCHAR(180) NOT NULL,
    email VARCHAR(254) NULL,
    phone VARCHAR(40) NULL,
    address TEXT NULL,
    career_objective TEXT NULL,
    education LONGTEXT NULL,
    skills LONGTEXT NULL,
    experience LONGTEXT NULL,
    internships LONGTEXT NULL,
    projects LONGTEXT NULL,
    certifications LONGTEXT NULL,
    achievements LONGTEXT NULL,
    languages LONGTEXT NULL,
    linkedin VARCHAR(500) NULL,
    github VARCHAR(500) NULL,
    portfolio VARCHAR(500) NULL,
    references_info LONGTEXT NULL,
    profile_photo LONGTEXT NULL,
    template VARCHAR(80) NOT NULL DEFAULT 'classic',
    accent_color VARCHAR(16) NULL DEFAULT '#2563eb',
    font_family VARCHAR(100) NULL DEFAULT 'Arial',
    section_visibility LONGTEXT NULL,
    section_order LONGTEXT NULL,
    resume_language VARCHAR(5) NOT NULL DEFAULT 'en',
    is_default TINYINT(1) NOT NULL DEFAULT 0,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_resumes_user_updated (user_id, updated_at),
    KEY idx_resumes_user_default (user_id, is_default),
    CONSTRAINT fk_resumes_user FOREIGN KEY (user_id) REFERENCES users(id) ON UPDATE CASCADE,
    CONSTRAINT chk_resumes_language CHECK (resume_language IN ('en', 'es', 'hi', 'pt', 'zh', 'fr'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE resume_otps (
    id INT NOT NULL AUTO_INCREMENT,
    user_id INT NOT NULL,
    resume_id INT NOT NULL,
    otp CHAR(6) NOT NULL,
    created_at DATETIME NOT NULL,
    expires_at DATETIME NOT NULL,
    verified TINYINT UNSIGNED NOT NULL DEFAULT 0,
    attempts TINYINT UNSIGNED NOT NULL DEFAULT 0,
    PRIMARY KEY (id),
    KEY idx_resume_otps_user_resume_id (user_id, resume_id, id),
    KEY idx_resume_otps_expiry (expires_at),
    CONSTRAINT fk_resume_otps_user FOREIGN KEY (user_id) REFERENCES users(id) ON UPDATE CASCADE,
    CONSTRAINT fk_resume_otps_resume FOREIGN KEY (resume_id) REFERENCES resumes(id) ON UPDATE CASCADE,
    CONSTRAINT chk_resume_otps_verified CHECK (verified IN (0, 1, 2)),
    CONSTRAINT chk_resume_otps_attempts CHECK (attempts <= 5)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE resume_payments (
    id INT NOT NULL AUTO_INCREMENT,
    user_id INT NOT NULL,
    resume_id INT NOT NULL,
    amount INT NOT NULL,
    currency VARCHAR(8) NOT NULL DEFAULT 'INR',
    razorpay_order_id VARCHAR(100) NOT NULL,
    razorpay_payment_id VARCHAR(100) NULL,
    payment_status ENUM('created', 'success', 'failed') NOT NULL DEFAULT 'created',
    paid_at DATETIME NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_resume_payment_order (razorpay_order_id),
    UNIQUE KEY uq_resume_payment_payment (razorpay_payment_id),
    KEY idx_resume_payments_user_created (user_id, created_at),
    KEY idx_resume_payments_user_resume_status (user_id, resume_id, payment_status),
    CONSTRAINT fk_resume_payments_user FOREIGN KEY (user_id) REFERENCES users(id) ON UPDATE CASCADE,
    CONSTRAINT fk_resume_payments_resume FOREIGN KEY (resume_id) REFERENCES resumes(id) ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE resume_invoices (
    id INT NOT NULL AUTO_INCREMENT,
    payment_id INT NOT NULL,
    invoice_number VARCHAR(40) NOT NULL,
    user_id INT NOT NULL,
    resume_id INT NOT NULL,
    customer_email VARCHAR(254) NULL,
    service_description VARCHAR(255) NOT NULL,
    amount INT NOT NULL,
    currency VARCHAR(8) NOT NULL DEFAULT 'INR',
    payment_date DATETIME NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_resume_invoice_number (invoice_number),
    UNIQUE KEY uq_resume_invoice_payment (payment_id),
    KEY idx_resume_invoices_user (user_id),
    CONSTRAINT fk_resume_invoice_payment FOREIGN KEY (payment_id) REFERENCES resume_payments(id) ON UPDATE CASCADE,
    CONSTRAINT fk_resume_invoice_user FOREIGN KEY (user_id) REFERENCES users(id) ON UPDATE CASCADE,
    CONSTRAINT fk_resume_invoice_resume FOREIGN KEY (resume_id) REFERENCES resumes(id) ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE resume_downloads (
    id INT NOT NULL AUTO_INCREMENT,
    user_id INT NOT NULL,
    resume_id INT NOT NULL,
    payment_id INT NOT NULL,
    version_number INT NULL,
    downloaded_at DATETIME NOT NULL,
    PRIMARY KEY (id),
    KEY idx_resume_downloads_user_resume (user_id, resume_id),
    CONSTRAINT fk_resume_download_user FOREIGN KEY (user_id) REFERENCES users(id) ON UPDATE CASCADE,
    CONSTRAINT fk_resume_download_resume FOREIGN KEY (resume_id) REFERENCES resumes(id) ON UPDATE CASCADE,
    CONSTRAINT fk_resume_download_payment FOREIGN KEY (payment_id) REFERENCES resume_payments(id) ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE resume_versions (
    id INT NOT NULL AUTO_INCREMENT,
    user_id INT NOT NULL,
    resume_id INT NOT NULL,
    version_number INT NOT NULL,
    resume_data JSON NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_resume_version (resume_id, version_number),
    KEY idx_resume_versions_user (user_id, resume_id),
    CONSTRAINT fk_resume_version_user FOREIGN KEY (user_id) REFERENCES users(id) ON UPDATE CASCADE,
    CONSTRAINT fk_resume_version_resume FOREIGN KEY (resume_id) REFERENCES resumes(id) ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE login_history (
    id INT NOT NULL AUTO_INCREMENT,
    user_id INT NOT NULL,
    browser_name VARCHAR(100) NOT NULL DEFAULT 'Unknown',
    browser_version VARCHAR(80) NOT NULL DEFAULT 'Unknown',
    operating_system VARCHAR(100) NOT NULL DEFAULT 'Unknown',
    os_version VARCHAR(80) NOT NULL DEFAULT 'Unknown',
    device_type VARCHAR(40) NOT NULL DEFAULT 'unknown',
    device_model VARCHAR(160) NULL,
    ip_address VARCHAR(45) NULL,
    country VARCHAR(120) NULL,
    state VARCHAR(120) NULL,
    city VARCHAR(120) NULL,
    login_date_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    login_status VARCHAR(40) NOT NULL,
    failure_reason VARCHAR(500) NULL,
    otp_required TINYINT(1) NOT NULL DEFAULT 0,
    otp_verified TINYINT(1) NOT NULL DEFAULT 0,
    is_new_browser TINYINT(1) NOT NULL DEFAULT 0,
    is_new_device TINYINT(1) NOT NULL DEFAULT 0,
    is_new_ip TINYINT(1) NOT NULL DEFAULT 0,
    PRIMARY KEY (id),
    KEY idx_login_history_user_time (user_id, login_date_time),
    CONSTRAINT fk_login_history_user FOREIGN KEY (user_id) REFERENCES users(id) ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE trusted_devices (
    id INT NOT NULL AUTO_INCREMENT,
    user_id INT NOT NULL,
    device_identifier CHAR(64) NOT NULL,
    browser_name VARCHAR(100) NOT NULL,
    browser_version VARCHAR(80) NOT NULL,
    operating_system VARCHAR(100) NOT NULL,
    os_version VARCHAR(80) NOT NULL,
    device_type VARCHAR(40) NOT NULL,
    device_model VARCHAR(160) NULL,
    last_ip_address VARCHAR(45) NULL,
    first_seen_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_seen_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    trusted_at DATETIME NULL,
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    PRIMARY KEY (id),
    UNIQUE KEY uq_trusted_device_user_identifier (user_id, device_identifier),
    KEY idx_trusted_devices_user_active (user_id, is_active),
    CONSTRAINT fk_trusted_devices_user FOREIGN KEY (user_id) REFERENCES users(id) ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE login_verifications (
    id INT NOT NULL AUTO_INCREMENT,
    user_id INT NOT NULL,
    login_history_id INT NOT NULL,
    verification_type VARCHAR(40) NOT NULL,
    otp_hash CHAR(64) NOT NULL,
    expires_at DATETIME NOT NULL,
    attempts TINYINT UNSIGNED NOT NULL DEFAULT 0,
    max_attempts TINYINT UNSIGNED NOT NULL DEFAULT 5,
    status ENUM('pending', 'verified', 'blocked', 'failed', 'expired') NOT NULL DEFAULT 'pending',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    verified_at DATETIME NULL,
    PRIMARY KEY (id),
    KEY idx_login_verifications_user_history_type_time (user_id, login_history_id, verification_type, created_at),
    KEY idx_login_verifications_expiry_status (expires_at, status),
    CONSTRAINT fk_login_verifications_user FOREIGN KEY (user_id) REFERENCES users(id) ON UPDATE CASCADE,
    CONSTRAINT fk_login_verifications_history FOREIGN KEY (login_history_id) REFERENCES login_history(id) ON UPDATE CASCADE,
    CONSTRAINT chk_login_verification_attempts CHECK (attempts <= max_attempts)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE user_sessions (
    id INT NOT NULL AUTO_INCREMENT,
    user_id INT NOT NULL,
    session_token_hash CHAR(64) NOT NULL,
    browser_name VARCHAR(100) NULL,
    browser_version VARCHAR(80) NULL,
    operating_system VARCHAR(100) NULL,
    os_version VARCHAR(80) NULL,
    device_type VARCHAR(40) NULL,
    device_model VARCHAR(160) NULL,
    ip_address VARCHAR(45) NULL,
    login_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_activity_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    logout_at DATETIME NULL,
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    PRIMARY KEY (id),
    UNIQUE KEY uq_user_sessions_token_hash (session_token_hash),
    KEY idx_user_sessions_user_active_activity (user_id, is_active, last_activity_at),
    CONSTRAINT fk_user_sessions_user FOREIGN KEY (user_id) REFERENCES users(id) ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE password_reset_history (
    id INT NOT NULL AUTO_INCREMENT,
    user_id INT NOT NULL,
    otp CHAR(6) NOT NULL,
    otp_expires_at DATETIME NOT NULL,
    reset_method VARCHAR(20) NOT NULL DEFAULT 'email',
    otp_verified TINYINT(1) NOT NULL DEFAULT 0,
    attempts INT UNSIGNED NOT NULL DEFAULT 0,
    status VARCHAR(30) NOT NULL DEFAULT 'pending',
    verification_time DATETIME NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_password_reset_user_created (user_id, created_at),
    KEY idx_password_reset_user_status (user_id, status, otp_expires_at),
    CONSTRAINT fk_password_reset_user FOREIGN KEY (user_id) REFERENCES users(id) ON UPDATE CASCADE,
    CONSTRAINT chk_password_reset_attempts CHECK (attempts <= 5)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE language_otps (
    id INT NOT NULL AUTO_INCREMENT,
    user_id INT NOT NULL,
    otp CHAR(6) NOT NULL,
    expires_at DATETIME NOT NULL,
    attempts TINYINT UNSIGNED NOT NULL DEFAULT 0,
    verified TINYINT(1) NOT NULL DEFAULT 0,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_language_otps_user_created (user_id, created_at),
    CONSTRAINT fk_language_otps_user FOREIGN KEY (user_id) REFERENCES users(id) ON UPDATE CASCADE,
    CONSTRAINT chk_language_otp_attempts CHECK (attempts <= 5)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE language_change_history (
    id INT NOT NULL AUTO_INCREMENT,
    user_id INT NOT NULL,
    old_language VARCHAR(5) NOT NULL,
    new_language VARCHAR(5) NOT NULL,
    ip_address VARCHAR(45) NULL,
    browser VARCHAR(160) NULL,
    device VARCHAR(160) NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_language_history_user_time (user_id, created_at),
    CONSTRAINT fk_language_history_user FOREIGN KEY (user_id) REFERENCES users(id) ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE friend_requests (
    id INT NOT NULL AUTO_INCREMENT,
    sender_id INT NOT NULL,
    receiver_id INT NOT NULL,
    status ENUM('pending', 'accepted', 'rejected', 'cancelled') NOT NULL DEFAULT 'pending',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_friend_requests_receiver_status_time (receiver_id, status, created_at),
    KEY idx_friend_requests_sender_time (sender_id, created_at),
    KEY idx_friend_requests_pair_status (sender_id, receiver_id, status),
    CONSTRAINT fk_friend_requests_sender FOREIGN KEY (sender_id) REFERENCES users(id) ON UPDATE CASCADE,
    CONSTRAINT fk_friend_requests_receiver FOREIGN KEY (receiver_id) REFERENCES users(id) ON UPDATE CASCADE,
    CONSTRAINT chk_friend_request_distinct_users CHECK (sender_id <> receiver_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE friendships (
    id INT NOT NULL AUTO_INCREMENT,
    user_id INT NOT NULL,
    friend_id INT NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_friendships_pair (user_id, friend_id),
    KEY idx_friendships_reverse (friend_id, user_id),
    CONSTRAINT fk_friendships_user FOREIGN KEY (user_id) REFERENCES users(id) ON UPDATE CASCADE,
    CONSTRAINT fk_friendships_friend FOREIGN KEY (friend_id) REFERENCES users(id) ON UPDATE CASCADE,
    CONSTRAINT chk_friendship_distinct_users CHECK (user_id <> friend_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE follows (
    id INT NOT NULL AUTO_INCREMENT,
    follower_id INT NOT NULL,
    following_id INT NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_follows_pair (follower_id, following_id),
    KEY idx_follows_following_time (following_id, created_at),
    CONSTRAINT fk_follows_follower FOREIGN KEY (follower_id) REFERENCES users(id) ON UPDATE CASCADE,
    CONSTRAINT fk_follows_following FOREIGN KEY (following_id) REFERENCES users(id) ON UPDATE CASCADE,
    CONSTRAINT chk_follows_distinct_users CHECK (follower_id <> following_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE posts (
    id INT NOT NULL AUTO_INCREMENT,
    user_id INT NOT NULL,
    content LONGTEXT NULL,
    media_type ENUM('text', 'image', 'video', 'mixed') NOT NULL DEFAULT 'text',
    privacy ENUM('public', 'friends') NOT NULL DEFAULT 'public',
    friend_count_at_posting INT UNSIGNED NOT NULL DEFAULT 0,
    likes_count INT UNSIGNED NOT NULL DEFAULT 0,
    comments_count INT UNSIGNED NOT NULL DEFAULT 0,
    shares_count INT UNSIGNED NOT NULL DEFAULT 0,
    saves_count INT UNSIGNED NOT NULL DEFAULT 0,
    views_count INT UNSIGNED NOT NULL DEFAULT 0,
    is_edited TINYINT(1) NOT NULL DEFAULT 0,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at DATETIME NULL,
    PRIMARY KEY (id),
    KEY idx_posts_user_created (user_id, created_at),
    KEY idx_posts_feed (deleted_at, privacy, created_at),
    CONSTRAINT fk_posts_user FOREIGN KEY (user_id) REFERENCES users(id) ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE post_media (
    id INT NOT NULL AUTO_INCREMENT,
    post_id INT NOT NULL,
    media_type ENUM('image', 'video') NOT NULL,
    media_url VARCHAR(500) NOT NULL,
    original_name VARCHAR(255) NOT NULL,
    file_size BIGINT UNSIGNED NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    media_order TINYINT UNSIGNED NOT NULL DEFAULT 0,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_post_media_post_order (post_id, media_order),
    CONSTRAINT fk_post_media_post FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE hashtags (
    id INT NOT NULL AUTO_INCREMENT,
    name VARCHAR(191) NOT NULL,
    posts_count INT UNSIGNED NOT NULL DEFAULT 0,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_hashtags_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE post_hashtags (
    id INT NOT NULL AUTO_INCREMENT,
    post_id INT NOT NULL,
    hashtag_id INT NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_post_hashtags_pair (post_id, hashtag_id),
    KEY idx_post_hashtags_hashtag (hashtag_id, post_id),
    CONSTRAINT fk_post_hashtags_post FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_post_hashtags_hashtag FOREIGN KEY (hashtag_id) REFERENCES hashtags(id) ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE post_mentions (
    id INT NOT NULL AUTO_INCREMENT,
    post_id INT NOT NULL,
    mentioned_user_id INT NOT NULL,
    mentioned_text VARCHAR(191) NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_post_mentions_user (mentioned_user_id, created_at),
    KEY idx_post_mentions_post (post_id),
    CONSTRAINT fk_post_mentions_post FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_post_mentions_user FOREIGN KEY (mentioned_user_id) REFERENCES users(id) ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE post_likes (
    id INT NOT NULL AUTO_INCREMENT,
    post_id INT NOT NULL,
    user_id INT NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_post_likes_pair (post_id, user_id),
    KEY idx_post_likes_user (user_id, post_id),
    CONSTRAINT fk_post_likes_post FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_post_likes_user FOREIGN KEY (user_id) REFERENCES users(id) ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE post_saves (
    id INT NOT NULL AUTO_INCREMENT,
    post_id INT NOT NULL,
    user_id INT NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_post_saves_pair (post_id, user_id),
    KEY idx_post_saves_user_time (user_id, created_at),
    CONSTRAINT fk_post_saves_post FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_post_saves_user FOREIGN KEY (user_id) REFERENCES users(id) ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE post_comments (
    id INT NOT NULL AUTO_INCREMENT,
    post_id INT NOT NULL,
    user_id INT NOT NULL,
    parent_comment_id INT NULL,
    content TEXT NOT NULL,
    is_edited TINYINT(1) NOT NULL DEFAULT 0,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at DATETIME NULL,
    PRIMARY KEY (id),
    KEY idx_post_comments_post_created (post_id, created_at),
    KEY idx_post_comments_parent (parent_comment_id),
    KEY idx_post_comments_user (user_id, created_at),
    CONSTRAINT fk_post_comments_post FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_post_comments_user FOREIGN KEY (user_id) REFERENCES users(id) ON UPDATE CASCADE,
    CONSTRAINT fk_post_comments_parent FOREIGN KEY (parent_comment_id) REFERENCES post_comments(id) ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE post_shares (
    id INT NOT NULL AUTO_INCREMENT,
    post_id INT NOT NULL,
    user_id INT NOT NULL,
    share_type ENUM('internal', 'external') NOT NULL DEFAULT 'internal',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_post_shares_post (post_id, created_at),
    KEY idx_post_shares_user (user_id, created_at),
    CONSTRAINT fk_post_shares_post FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_post_shares_user FOREIGN KEY (user_id) REFERENCES users(id) ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE post_reports (
    id INT NOT NULL AUTO_INCREMENT,
    post_id INT NOT NULL,
    reporter_id INT NOT NULL,
    reason VARCHAR(40) NOT NULL DEFAULT 'other',
    description TEXT NULL,
    status ENUM('pending', 'reviewed', 'resolved', 'rejected') NOT NULL DEFAULT 'pending',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_post_reports_post_reporter_status (post_id, reporter_id, status),
    KEY idx_post_reports_status_time (status, created_at),
    CONSTRAINT fk_post_reports_post FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_post_reports_user FOREIGN KEY (reporter_id) REFERENCES users(id) ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE post_views (
    id INT NOT NULL AUTO_INCREMENT,
    post_id INT NOT NULL,
    user_id INT NOT NULL,
    ip_address VARCHAR(255) NULL,
    user_agent VARCHAR(1024) NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_post_views_post_time (post_id, created_at),
    KEY idx_post_views_user_time (user_id, created_at),
    CONSTRAINT fk_post_views_post FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_post_views_user FOREIGN KEY (user_id) REFERENCES users(id) ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE notifications (
    id INT NOT NULL AUTO_INCREMENT,
    user_id INT NOT NULL,
    sender_id INT NULL,
    type VARCHAR(40) NOT NULL,
    post_id INT NULL,
    comment_id INT NULL,
    friend_request_id INT NULL,
    message VARCHAR(500) NOT NULL,
    is_read TINYINT(1) NOT NULL DEFAULT 0,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_notifications_user_read_time (user_id, is_read, created_at),
    KEY idx_notifications_sender (sender_id),
    CONSTRAINT fk_notifications_user FOREIGN KEY (user_id) REFERENCES users(id) ON UPDATE CASCADE,
    CONSTRAINT fk_notifications_sender FOREIGN KEY (sender_id) REFERENCES users(id) ON UPDATE CASCADE,
    CONSTRAINT fk_notifications_post FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT fk_notifications_comment FOREIGN KEY (comment_id) REFERENCES post_comments(id) ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT fk_notifications_friend_request FOREIGN KEY (friend_request_id) REFERENCES friend_requests(id) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE internship_listings (
    id INT NOT NULL AUTO_INCREMENT,
    title VARCHAR(200) NOT NULL,
    company_name VARCHAR(200) NOT NULL,
    description LONGTEXT NOT NULL,
    location VARCHAR(200) NULL,
    stipend VARCHAR(100) NULL,
    duration VARCHAR(100) NULL,
    application_deadline DATE NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'open',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_internship_listings_status_deadline_created (status, application_deadline, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE subscription_plans (
    id INT NOT NULL AUTO_INCREMENT,
    plan_name VARCHAR(40) NOT NULL,
    monthly_price DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    application_limit INT UNSIGNED NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_subscription_plans_name (plan_name),
    CONSTRAINT chk_subscription_plan_price CHECK (monthly_price >= 0),
    CONSTRAINT chk_subscription_plan_limit CHECK (application_limit IS NULL OR application_limit > 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE user_subscriptions (
    id INT NOT NULL AUTO_INCREMENT,
    user_id INT NOT NULL,
    plan_id INT NOT NULL,
    status ENUM('active', 'expired', 'cancelled') NOT NULL DEFAULT 'active',
    started_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    expires_at DATETIME NOT NULL,
    applications_used INT UNSIGNED NOT NULL DEFAULT 0,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_user_subscriptions_user_status_expiry (user_id, status, expires_at, id),
    KEY idx_user_subscriptions_plan (plan_id),
    CONSTRAINT fk_user_subscriptions_user FOREIGN KEY (user_id) REFERENCES users(id) ON UPDATE CASCADE,
    CONSTRAINT fk_user_subscriptions_plan FOREIGN KEY (plan_id) REFERENCES subscription_plans(id) ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE subscription_payments (
    id INT NOT NULL AUTO_INCREMENT,
    user_id INT NOT NULL,
    plan_id INT NOT NULL,
    subscription_id INT NULL,
    razorpay_order_id VARCHAR(100) NOT NULL,
    razorpay_payment_id VARCHAR(100) NULL,
    amount_paise INT UNSIGNED NOT NULL,
    currency VARCHAR(8) NOT NULL DEFAULT 'INR',
    status ENUM('created', 'paid', 'failed') NOT NULL DEFAULT 'created',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    paid_at DATETIME NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uq_subscription_payment_order (razorpay_order_id),
    UNIQUE KEY uq_subscription_payment_gateway_id (razorpay_payment_id),
    KEY idx_subscription_payments_user_status (user_id, status, id),
    KEY idx_subscription_payments_plan (plan_id),
    CONSTRAINT fk_subscription_payments_user FOREIGN KEY (user_id) REFERENCES users(id) ON UPDATE CASCADE,
    CONSTRAINT fk_subscription_payments_plan FOREIGN KEY (plan_id) REFERENCES subscription_plans(id) ON UPDATE CASCADE,
    CONSTRAINT fk_subscription_payments_subscription FOREIGN KEY (subscription_id) REFERENCES user_subscriptions(id) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE subscription_invoices (
    id INT NOT NULL AUTO_INCREMENT,
    payment_id INT NOT NULL,
    invoice_number VARCHAR(50) NOT NULL,
    billing_name VARCHAR(180) NULL,
    billing_email VARCHAR(254) NULL,
    amount DECIMAL(10,2) NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_subscription_invoice_payment (payment_id),
    UNIQUE KEY uq_subscription_invoice_number (invoice_number),
    CONSTRAINT fk_subscription_invoice_payment FOREIGN KEY (payment_id) REFERENCES subscription_payments(id) ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE internship_applications (
    id INT NOT NULL AUTO_INCREMENT,
    user_id INT NOT NULL,
    internship_id INT NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'submitted',
    applied_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_internship_application_user_listing (user_id, internship_id),
    KEY idx_internship_applications_user_applied (user_id, applied_at),
    KEY idx_internship_applications_listing (internship_id, applied_at),
    CONSTRAINT fk_internship_applications_user FOREIGN KEY (user_id) REFERENCES users(id) ON UPDATE CASCADE,
    CONSTRAINT fk_internship_applications_listing FOREIGN KEY (internship_id) REFERENCES internship_listings(id) ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Required plan rows only; no users, passwords, internships, or credentials.
INSERT INTO subscription_plans (plan_name, monthly_price, application_limit)
SELECT 'Free', 0.00, 1
WHERE NOT EXISTS (SELECT 1 FROM subscription_plans WHERE plan_name = 'Free');
INSERT INTO subscription_plans (plan_name, monthly_price, application_limit)
SELECT 'Bronze', 100.00, 3
WHERE NOT EXISTS (SELECT 1 FROM subscription_plans WHERE plan_name = 'Bronze');
INSERT INTO subscription_plans (plan_name, monthly_price, application_limit)
SELECT 'Silver', 300.00, 5
WHERE NOT EXISTS (SELECT 1 FROM subscription_plans WHERE plan_name = 'Silver');
INSERT INTO subscription_plans (plan_name, monthly_price, application_limit)
SELECT 'Gold', 1000.00, NULL
WHERE NOT EXISTS (SELECT 1 FROM subscription_plans WHERE plan_name = 'Gold');
