const express = require("express");
const rateLimit = require("../middleware/rateLimit");

const {
    requestOTP,
    verifyOTP
} = require("../controllers/forgotPasswordController");

const router = express.Router();
const limitRecoveryRequests = rateLimit({ windowMs: 60 * 60 * 1000, max: 5, message: "Too many recovery requests. Try again later." });
const limitOtpChecks = rateLimit({ windowMs: 15 * 60 * 1000, max: 10, message: "Too many verification attempts. Try again later." });

// Request OTP
router.post("/request", limitRecoveryRequests, requestOTP);

// Verify OTP
router.post("/verify-otp", limitOtpChecks, verifyOTP);

module.exports = router;
