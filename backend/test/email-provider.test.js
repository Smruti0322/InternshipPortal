const test = require("node:test");
const assert = require("node:assert/strict");
const { resolveEmailProvider, describeEmailError } = require("../utils/sendEmail");
const { isAllowedOrigin } = require("../utils/corsOrigins");

test("Resend is selected when its API credentials are present", () => {
    assert.equal(
        resolveEmailProvider({
            RESEND_API_KEY: "re_test",
            RESEND_FROM_EMAIL: "Portal <noreply@example.com>",
            SMTP_USER: "smtp@example.com",
            SMTP_PASS: "secret",
        }),
        "resend"
    );
});

test("SMTP is used only when Resend is not configured", () => {
    assert.equal(
        resolveEmailProvider({
            SMTP_USER: "smtp@example.com",
            SMTP_PASS: "secret",
        }),
        "smtp"
    );
    assert.equal(resolveEmailProvider({}), null);
});

test("email error diagnostics omit secret values", () => {
    const details = describeEmailError(
        { name: "Error", code: "ETIMEDOUT", command: "CONN", message: "timeout" },
        "smtp"
    );

    assert.equal(details.provider, "smtp");
    assert.equal(details.code, "ETIMEDOUT");
    assert.doesNotMatch(JSON.stringify(details), /SMTP_PASS|RESEND_API_KEY|secret/i);
});

test("production Vercel origins are allowed for CORS", () => {
    const allowed = ["http://localhost:5173"];

    assert.equal(isAllowedOrigin(undefined, allowed), true);
    assert.equal(isAllowedOrigin("http://localhost:5173", allowed), true);
    assert.equal(
        isAllowedOrigin("https://internship-portal-seven.vercel.app", allowed),
        true
    );
    assert.equal(
        isAllowedOrigin("https://internship-portal-seven-git-main-team.vercel.app", allowed),
        true
    );
    assert.equal(isAllowedOrigin("https://evil.example", allowed), false);
});
