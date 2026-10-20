const express = require("express");
const rateLimit = require("../middleware/rateLimit");

const {
    register,
    login,
    changePassword
} = require("../controllers/authController");
const {
    requestLoginOTP,
    verifyLoginOTP
} = require("../controllers/loginVerificationController");
const {
    getLoginHistory
} = require("../controllers/loginHistoryController");
const {
    getActiveSessions,
    signOutOtherDevices,
    revokeSession,
    logoutCurrentSession
} = require("../controllers/sessionController");


const authenticateToken = require("../middleware/authMiddleware");

const router = express.Router();
const limitLogin = rateLimit({ windowMs: 15 * 60 * 1000, max: 20, message: "Too many login attempts. Try again later." });
const limitLoginOtp = rateLimit({ windowMs: 15 * 60 * 1000, max: 10, message: "Too many verification attempts. Try again later." });

// Register
router.post("/register", limitLogin, register);

// Login
router.post("/login", limitLogin, login);

// Change Password (Protected)
router.post(
    "/change-password",
    authenticateToken,
    changePassword
);

router.post(
    "/login/request-otp",
    limitLoginOtp,
    requestLoginOTP
);

router.post(
    "/login/verify-otp",
    limitLoginOtp,
    verifyLoginOTP
);

router.get(
    "/login-history",
    authenticateToken,
    getLoginHistory
);

// =========================================================
// ACTIVE SESSIONS
// =========================================================

router.get(
    "/sessions",
    authenticateToken,
    getActiveSessions
);


// =========================================================
// SIGN OUT OTHER DEVICES
// =========================================================

router.post(
    "/sessions/sign-out-others",
    authenticateToken,
    signOutOtherDevices
);

router.post("/sessions/:sessionId/revoke", authenticateToken, revokeSession);
router.post("/sessions/logout", authenticateToken, logoutCurrentSession);

module.exports = router;
