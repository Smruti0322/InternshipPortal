const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const test = require('node:test');
const assert = require('node:assert/strict');

const schemaPath = join(__dirname, '..', 'database', 'initial_schema.sql');
const schema = readFileSync(schemaPath, 'utf8');

function tableDefinitions(sql) {
    const tables = new Map();
    const header = /CREATE\s+TABLE\s+([a-z_]+)\s*\(/gi;
    let match;
    while ((match = header.exec(sql))) {
        let depth = 1;
        let cursor = header.lastIndex;
        let quote = null;
        for (; cursor < sql.length && depth; cursor += 1) {
            const char = sql[cursor];
            if (quote) {
                if (char === quote && sql[cursor - 1] !== '\\') quote = null;
                continue;
            }
            if (char === "'" || char === '"' || char === '`') quote = char;
            else if (char === '(') depth += 1;
            else if (char === ')') depth -= 1;
        }
        assert.equal(depth, 0, `Unclosed CREATE TABLE ${match[1]}`);
        tables.set(match[1], sql.slice(header.lastIndex, cursor - 1));
        header.lastIndex = cursor;
    }
    return tables;
}

const requiredColumns = {
    users: ['email', 'password', 'mobile', 'preferred_language', 'must_change_password'],
    resumes: ['user_id', 'resume_language', 'section_visibility', 'section_order'],
    resume_otps: ['user_id', 'resume_id', 'otp', 'expires_at', 'verified', 'attempts'],
    resume_payments: ['amount', 'payment_status', 'razorpay_order_id', 'razorpay_payment_id'],
    resume_invoices: ['payment_id', 'invoice_number', 'service_description', 'amount'],
    resume_downloads: ['payment_id', 'version_number', 'downloaded_at'],
    resume_versions: ['version_number', 'resume_data'],
    login_history: ['login_status', 'failure_reason', 'otp_required', 'is_new_device'],
    trusted_devices: ['device_identifier', 'last_ip_address', 'is_active'],
    login_verifications: ['login_history_id', 'otp_hash', 'max_attempts', 'status'],
    user_sessions: ['session_token_hash', 'last_activity_at', 'logout_at', 'is_active'],
    password_reset_history: ['otp_expires_at', 'otp_verified', 'attempts', 'status'],
    language_otps: ['expires_at', 'attempts', 'verified'],
    language_change_history: ['old_language', 'new_language', 'ip_address'],
    friend_requests: ['sender_id', 'receiver_id', 'status', 'created_at'],
    friendships: ['user_id', 'friend_id', 'created_at'],
    follows: ['follower_id', 'following_id', 'created_at'],
    posts: ['friend_count_at_posting', 'likes_count', 'comments_count', 'deleted_at'],
    post_media: ['media_url', 'original_name', 'file_size', 'mime_type', 'media_order'],
    hashtags: ['name', 'posts_count'],
    post_hashtags: ['post_id', 'hashtag_id'],
    post_mentions: ['mentioned_user_id', 'mentioned_text'],
    post_likes: ['post_id', 'user_id', 'created_at'],
    post_saves: ['post_id', 'user_id', 'created_at'],
    post_comments: ['parent_comment_id', 'content', 'is_edited', 'deleted_at'],
    post_shares: ['share_type', 'created_at'],
    post_reports: ['reporter_id', 'reason', 'description', 'status'],
    post_views: ['ip_address', 'user_agent', 'created_at'],
    notifications: ['sender_id', 'type', 'comment_id', 'friend_request_id', 'message', 'is_read'],
    internship_listings: ['title', 'company_name', 'application_deadline', 'status'],
    internship_applications: ['user_id', 'internship_id', 'status', 'applied_at'],
    subscription_plans: ['plan_name', 'monthly_price', 'application_limit'],
    user_subscriptions: ['plan_id', 'status', 'expires_at', 'applications_used'],
    subscription_payments: ['subscription_id', 'amount_paise', 'razorpay_payment_id', 'status'],
    subscription_invoices: ['payment_id', 'invoice_number', 'billing_email', 'amount'],
};

test('initial MySQL schema defines all query-contract tables and columns', () => {
    const tables = tableDefinitions(schema);
    const communityTables = [
        'friend_requests', 'friendships', 'follows', 'posts', 'post_media', 'hashtags',
        'post_hashtags', 'post_mentions', 'post_likes', 'post_saves', 'post_comments',
        'post_shares', 'post_reports', 'post_views', 'notifications',
    ];
    for (const table of communityTables) requiredColumns[table] ??= ['id'];

    for (const [table, columns] of Object.entries(requiredColumns)) {
        assert.ok(tables.has(table), `Missing table ${table}`);
        const definition = tables.get(table);
        for (const column of columns) {
            assert.match(definition, new RegExp(`(?:^|[,\\n])\\s*${column}\\s+(?:[A-Z]|ENUM)`, 'i'), `${table}.${column} missing`);
        }
    }
    assert.equal(tables.size, 35, 'Unexpected base table inventory; review query/schema contract');
});

test('initial schema is safe for a new development DB and seeds only required plans', () => {
    assert.match(schema, /CREATE DATABASE IF NOT EXISTS internship_portal_dev/i);
    assert.doesNotMatch(schema, /\bDROP\s+(?:DATABASE|TABLE)\b|\bTRUNCATE\b/i);
    assert.match(schema, /WHERE NOT EXISTS\s*\(SELECT 1 FROM subscription_plans WHERE plan_name = 'Free'\)/i);
    for (const plan of ['Free', 'Bronze', 'Silver', 'Gold']) assert.match(schema, new RegExp(`SELECT '${plan}'`));
    assert.doesNotMatch(schema, /INSERT INTO\s+users/i);
});

test('every foreign key targets a table declared in the initial schema', () => {
    const tables = tableDefinitions(schema);
    for (const target of schema.matchAll(/REFERENCES\s+([a-z_]+)\s*\(/gi)) {
        assert.ok(tables.has(target[1]), `Foreign key target ${target[1]} is not declared`);
    }
});
