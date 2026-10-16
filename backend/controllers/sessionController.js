const {
    getActiveSession,
    getUserActiveSessions,
    logoutOtherSessions,
    logoutSession
} = require("../utils/sessionSecurity");
const db = require("../config/db");


// =========================================================
// GET ACTIVE SESSIONS
// =========================================================

const getActiveSessions = async (
    req,
    res
) => {

    try {

        const userId =
            req.user.id;

        const token =
            req.token;


        const currentSession =
            await getActiveSession(
                token
            );


        if (!currentSession) {

            return res.status(401).json({
                success: false,
                message:
                    "Current session is no longer active."
            });
        }


        if (
            Number(currentSession.user_id) !==
            Number(userId)
        ) {

            return res.status(403).json({
                success: false,
                message:
                    "Session does not belong to this user."
            });
        }


        // Update current session activity
        const {
            updateSessionActivity
        } = require("../utils/sessionSecurity");

        await updateSessionActivity(
            currentSession.id
        );


        const sessions =
            await getUserActiveSessions(
                userId,
                token
            );


        return res.status(200).json({
            success: true,
            sessions
        });

    } catch (error) {

        console.error(
            "Get Active Sessions Error:",
            error
        );

        return res.status(500).json({
            success: false,
            message:
                "Unable to load active sessions."
        });
    }
};


// =========================================================
// SIGN OUT OTHER DEVICES
// =========================================================

const signOutOtherDevices = async (
    req,
    res
) => {

    try {

        const userId =
            req.user.id;

        const token =
            req.token;


        const currentSession =
            await getActiveSession(
                token
            );


        if (!currentSession) {

            return res.status(401).json({
                success: false,
                message:
                    "Current session is no longer active."
            });
        }


        if (
            Number(currentSession.user_id) !==
            Number(userId)
        ) {

            return res.status(403).json({
                success: false,
                message:
                    "Session does not belong to this user."
            });
        }


        const loggedOutCount =
            await logoutOtherSessions(
                userId,
                currentSession.id
            );


        return res.status(200).json({
            success: true,

            message:
                loggedOutCount > 0
                    ? "Signed out of all other devices successfully."
                    : "No other active devices found.",

            signed_out_count:
                Number(loggedOutCount)
        });

    } catch (error) {

        console.error(
            "Sign Out Other Devices Error:",
            error
        );

        return res.status(500).json({
            success: false,
            message:
                "Unable to sign out other devices."
        });
    }
};

const revokeSession = async (req, res) => {
    const sessionId = Number(req.params.sessionId);
    if (!Number.isInteger(sessionId) || sessionId <= 0) {
        return res.status(400).json({ success: false, message: "Invalid session ID." });
    }

    try {
        // The owner predicate is part of the mutation so another user's
        // session ID can never revoke their session.
        const [result] = await db.execute(
            `UPDATE user_sessions
             SET is_active = 0, logout_at = NOW()
             WHERE id = ? AND user_id = ? AND is_active = 1`,
            [sessionId, req.user.id]
        );
        if (!result.affectedRows) {
            return res.status(404).json({ success: false, message: "Active session not found for this account." });
        }

        return res.status(200).json({ success: true, revoked_session_id: sessionId });
    } catch (error) {
        console.error("Revoke session error:", error.message);
        return res.status(500).json({ success: false, message: "Unable to revoke this session." });
    }
};

const logoutCurrentSession = async (req, res) => {
    try {
        const session = await getActiveSession(req.token);
        if (!session || Number(session.user_id) !== Number(req.user.id)) {
            return res.status(401).json({ success: false, message: "Current session is no longer active." });
        }
        await logoutSession(session.id);
        return res.status(200).json({ success: true, message: "Signed out successfully." });
    } catch (error) {
        console.error("Logout current session error:", error.message);
        return res.status(500).json({ success: false, message: "Unable to sign out." });
    }
};


module.exports = {
    getActiveSessions,
    signOutOtherDevices,
    revokeSession,
    logoutCurrentSession
};
