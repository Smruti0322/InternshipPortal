const test = require("node:test");
const assert = require("node:assert/strict");
const { generateOTP, generateTemporaryPassword, isExpired, hasAttemptsRemaining } = require("../utils/recoverySecurity");
const { getDailyPostLimit } = require("../utils/postingRules");
const crypto = require("crypto");
const { verifyRazorpaySignature, isExpectedCapturedPayment } = require("../utils/razorpaySecurity");

test("OTP generation returns six decimal digits", () => {
    for (let i = 0; i < 100; i += 1) assert.match(generateOTP(), /^\d{6}$/);
});

test("temporary passwords contain only English letters", () => {
    for (let i = 0; i < 100; i += 1) assert.match(generateTemporaryPassword(), /^[A-Za-z]{16}$/);
});

test("OTP expiry boundary and attempt cap are enforced", () => {
    assert.equal(isExpired(10_000, 9_999), false);
    assert.equal(isExpired(10_000, 10_000), true);
    assert.equal(hasAttemptsRemaining(4), true);
    assert.equal(hasAttemptsRemaining(5), false);
});

test("community daily post limit follows friend count tiers", () => {
    assert.equal(getDailyPostLimit(0), 0);
    assert.equal(getDailyPostLimit(1), 1);
    assert.equal(getDailyPostLimit(2), 2);
    assert.equal(getDailyPostLimit(5), 2);
    assert.equal(getDailyPostLimit(6), 5);
    assert.equal(getDailyPostLimit(10), 5);
    assert.equal(getDailyPostLimit(11), null);
});

test("Razorpay signatures require a valid HMAC and reject malformed input", () => {
    const signature = crypto.createHmac("sha256", "test-secret").update("order_1|payment_1").digest("hex");
    assert.equal(verifyRazorpaySignature("order_1", "payment_1", signature, "test-secret"), true);
    assert.equal(verifyRazorpaySignature("order_1", "payment_1", `${"x".repeat(63)}💥`, "test-secret"), false);
    assert.equal(verifyRazorpaySignature("order_1", "payment_1", "0".repeat(64), "test-secret"), false);
});

test("Razorpay payment must match order, amount, currency, and captured status", () => {
    const expected = { orderId: "order_1", amountPaise: 5000, currency: "INR" };
    const payment = { order_id: "order_1", amount: 5000, currency: "INR", status: "captured" };
    assert.equal(isExpectedCapturedPayment(payment, expected), true);
    assert.equal(isExpectedCapturedPayment({ ...payment, amount: 4900 }, expected), false);
    assert.equal(isExpectedCapturedPayment({ ...payment, currency: "USD" }, expected), false);
    assert.equal(isExpectedCapturedPayment({ ...payment, status: "authorized" }, expected), false);
});
