const jwt = require("jsonwebtoken");

const {
    getActiveSession,
    updateSessionActivity,
} = require("../utils/sessionSecurity");

const authenticateToken = async (req, res, next) => {
    try {
        const authHeader =
            req.headers.authorization;

        if (
            !authHeader ||
            !authHeader.startsWith("Bearer ")
        ) {
            console.warn(
                "AUTH ERROR: Missing Bearer token"
            );

            return res.status(401).json({
                message:
                    "Authentication required.",
            });
        }

        const token =
            authHeader
                .substring(7)
                .trim();

        if (!token) {
            console.warn(
                "AUTH ERROR: Empty token"
            );

            return res.status(401).json({
                message:
                    "Authentication required.",
            });
        }

        // =========================
        // VERIFY JWT
        // =========================
        const decoded =
            jwt.verify(
                token,
                process.env.JWT_SECRET
            );

        // Keep existing user information
        req.user = decoded;

        // Keep current JWT available
        req.token = token;

        // =========================
        // TASK 5:
        // CHECK SESSION REVOCATION
        // =========================
        const session =
            await getActiveSession(token);

        if (!session) {
            console.warn(
                "AUTH ERROR: Session revoked or not found"
            );

            return res.status(401).json({
                message:
                    "Session expired or revoked. Please login again.",
            });
        }

        // =========================
        // UPDATE LAST ACTIVITY
        // =========================
        await updateSessionActivity(
            session.id
        );

        next();

    } catch (error) {

        console.error(
            "JWT AUTH ERROR:",
            {
                name: error.name,
                message: error.message,
            }
        );

        return res.status(401).json({
            message:
                error.name ===
                    "TokenExpiredError"
                    ? "Token expired. Please login again."
                    : "Invalid authentication token.",
        });
    }
};

module.exports =
    authenticateToken;