const express = require("express");

const {
    requestOTP,
    verifyOTP
} = require("../controllers/forgotPasswordController");

const router = express.Router();

// Request OTP
router.post("/request", requestOTP);

// Verify OTP
router.post("/verify-otp", verifyOTP);

module.exports = router;