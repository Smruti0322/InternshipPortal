const {
    getActiveSession,
    getUserActiveSessions,
    logoutOtherSessions
} = require("../utils/sessionSecurity");


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


module.exports = {
    getActiveSessions,
    signOutOtherDevices
};