
const jwt = require("jsonwebtoken");

const {
    getActiveSession,
    updateSessionActivity,
} = require("../utils/sessionSecurity");

const authenticateToken = async (req, res, next) => {
    let stage = "reading authorization header";

    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return res.status(401).json({
                message: "Authentication required.",
            });
        }

        const token = authHeader.substring(7).trim();

        if (!token) {
            return res.status(401).json({
                message: "Authentication required.",
            });
        }

        stage = "verifying JWT";

        const decoded = jwt.verify(
            token,
            process.env.JWT_SECRET
        );

        req.user = decoded;
        req.token = token;

        stage = "checking active session";

        const session = await getActiveSession(token);

        if (!session) {
            return res.status(401).json({
                message:
                    "Session expired or revoked. Please login again.",
            });
        }

        stage = "updating session activity";

        await updateSessionActivity(session.id);

        return next();
    } catch (error) {
        // Invalid or expired JWT: return an authentication error.
        if (
            error.name === "TokenExpiredError" ||
            error.name === "JsonWebTokenError" ||
            error.name === "NotBeforeError"
        ) {
            console.warn("JWT verification failed:", {
                name: error.name,
                stage,
            });

            return res.status(401).json({
                message:
                    error.name === "TokenExpiredError"
                        ? "Token expired. Please login again."
                        : "Invalid authentication token.",
            });
        }

        // Infrastructure or unexpected error: do not mislabel it as an invalid token.
        console.error("Authentication middleware failure:", {
            stage,
            name: error.name,
            code: error.code,
            errno: error.errno,
            syscall: error.syscall,
            message: error.message,
        });

        if (res.headersSent) {
            return next(error);
        }

        const isConnectionError = [
            "ECONNRESET",
            "ECONNREFUSED",
            "ETIMEDOUT",
            "PROTOCOL_CONNECTION_LOST",
            "ER_CON_COUNT_ERROR",
        ].includes(error.code);

        return res.status(isConnectionError ? 503 : 500).json({
            message: isConnectionError
                ? "Authentication service temporarily unavailable. Please try again."
                : "Authentication could not be completed.",
        });
    }
};

module.exports = authenticateToken;
