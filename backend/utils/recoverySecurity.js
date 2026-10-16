const crypto = require("crypto");

const generateOTP = () => crypto.randomInt(100000, 1000000).toString();

const generateTemporaryPassword = (length = 16) => {
    const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
    const bytes = crypto.randomBytes(length);
    return Array.from(bytes, (byte) => letters[byte % letters.length]).join("");
};

const isExpired = (expiresAt, now = Date.now()) => new Date(expiresAt).getTime() <= now;
const hasAttemptsRemaining = (attempts, maxAttempts = 5) => Number(attempts || 0) < maxAttempts;

module.exports = { generateOTP, generateTemporaryPassword, isExpired, hasAttemptsRemaining };
