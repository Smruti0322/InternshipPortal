const express = require("express");

const authenticateToken = require("../middleware/authMiddleware");

const {
    getLanguage,
    getLanguageHistory,
    changeLanguage,
    requestFrenchOtp,
    verifyFrenchOtp,
} = require("../controllers/languageController");

const router = express.Router();

// Get user's language
router.get(
    "/",
    authenticateToken,
    getLanguage
);

router.get("/history", authenticateToken, getLanguageHistory);

// Change language
router.put(
    "/",
    authenticateToken,
    changeLanguage
);

// Request French OTP
router.post(
    "/request-french-otp",
    authenticateToken,
    requestFrenchOtp
);

// Verify French OTP
router.post(
    "/verify-french-otp",
    authenticateToken,
    verifyFrenchOtp
);

module.exports = router;
