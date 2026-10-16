const crypto = require("crypto");

const verifyRazorpaySignature = (orderId, paymentId, signature, secret) => {
    if (!orderId || !paymentId || typeof signature !== "string" || !secret) return false;
    const expected = crypto
        .createHmac("sha256", secret)
        .update(`${orderId}|${paymentId}`)
        .digest();
    if (!/^[a-f\d]{64}$/i.test(signature)) return false;
    const supplied = Buffer.from(signature, "hex");
    return supplied.length === expected.length && crypto.timingSafeEqual(expected, supplied);
};

const isExpectedCapturedPayment = (payment, { orderId, amountPaise, currency }) => Boolean(
    payment &&
    payment.order_id === orderId &&
    Number(payment.amount) === Number(amountPaise) &&
    payment.currency === currency &&
    payment.status === "captured"
);

module.exports = { verifyRazorpaySignature, isExpectedCapturedPayment };
