const { readFileSync } = require("node:fs");
const { join } = require("node:path");
const test = require("node:test");
const assert = require("node:assert/strict");

const source = readFileSync(join(__dirname, "..", "controllers", "forgotPasswordController.js"), "utf8");

test("request and verification enforce the cooldown from successful reset time", () => {
    const cooldownChecks = source.match(/status = 'completed' AND verification_time >= DATE_SUB\(NOW\(\), INTERVAL 24 HOUR\)/g) || [];
    assert.equal(cooldownChecks.length, 2, "request and OTP verification must both check the cooldown");
    const verificationFlow = source.slice(source.indexOf("const verifyOTP = async"));
    assert.ok(verificationFlow.indexOf("SELECT id FROM users WHERE id = ? FOR UPDATE") < verificationFlow.search(/SELECT \*\s+FROM password_reset_history/), "verification must serialize resets using the user row lock");
    assert.match(source, /You can use this option only once per day/);
});
