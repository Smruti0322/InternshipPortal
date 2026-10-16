const express = require("express");

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

// Register
router.post("/register", register);

// Login
router.post("/login", login);

// Change Password (Protected)
router.post(
    "/change-password",
    authenticateToken,
    changePassword
);

router.post(
    "/login/request-otp",
    requestLoginOTP
);

router.post(
    "/login/verify-otp",
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
