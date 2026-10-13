const crypto = require("crypto");
const db = require("../config/db");

// =========================================================
// HASH SESSION TOKEN
// =========================================================

const hashSessionToken = (token) => {
    return crypto
        .createHash("sha256")
        .update(String(token))
        .digest("hex");
};


// =========================================================
// CREATE USER SESSION
// =========================================================

const createUserSession = async ({
    userId,
    token,
    loginEnvironment
}) => {

    const environment =
        loginEnvironment || {};

    const browserName =
        environment.browser_name ??
        environment.browserName ??
        null;

    const browserVersion =
        environment.browser_version ??
        environment.browserVersion ??
        null;

    const operatingSystem =
        environment.operating_system ??
        environment.operatingSystem ??
        null;

    const osVersion =
        environment.os_version ??
        environment.osVersion ??
        null;

    const deviceType =
        environment.device_type ??
        environment.deviceType ??
        null;

    const deviceModel =
        environment.device_model ??
        environment.deviceModel ??
        null;

    const ipAddress =
        environment.ip_address ??
        environment.ipAddress ??
        null;


    if (!userId) {
        throw new Error(
            "User ID is required to create session."
        );
    }

    if (!token) {
        throw new Error(
            "Session token is required to create session."
        );
    }


    const sessionTokenHash =
        hashSessionToken(token);


    const [result] = await db.execute(
        `
        INSERT INTO user_sessions
        (
            user_id,
            session_token_hash,
            browser_name,
            browser_version,
            operating_system,
            os_version,
            device_type,
            device_model,
            ip_address,
            login_at,
            last_activity_at,
            is_active
        )
        VALUES
        (
            ?,
            ?,
            ?,
            ?,
            ?,
            ?,
            ?,
            ?,
            ?,
            NOW(),
            NOW(),
            1
        )
        `,
        [
            userId,
            sessionTokenHash,
            browserName,
            browserVersion,
            operatingSystem,
            osVersion,
            deviceType,
            deviceModel,
            ipAddress
        ]
    );

    return result.insertId;
};


// =========================================================
// GET CURRENT ACTIVE SESSION
// =========================================================

const getActiveSession = async (token) => {

    if (!token) {
        return null;
    }

    const sessionTokenHash =
        hashSessionToken(token);

    const [rows] = await db.execute(
        `
        SELECT
            id,
            user_id,
            browser_name,
            browser_version,
            operating_system,
            os_version,
            device_type,
            device_model,
            ip_address,
            login_at,
            last_activity_at,
            logout_at,
            is_active
        FROM user_sessions
        WHERE session_token_hash = ?
          AND is_active = 1
        LIMIT 1
        `,
        [sessionTokenHash]
    );

    return rows.length > 0
        ? rows[0]
        : null;
};


// =========================================================
// GET ALL ACTIVE SESSIONS FOR USER
// =========================================================

const getUserActiveSessions = async (
    userId,
    currentToken = null
) => {

    if (!userId) {
        return [];
    }

    let currentSessionId = null;

    // -----------------------------------------------------
    // Identify current session
    // -----------------------------------------------------

    if (currentToken) {

        const currentSession =
            await getActiveSession(
                currentToken
            );

        if (currentSession) {
            currentSessionId =
                currentSession.id;
        }
    }


    // -----------------------------------------------------
    // Get all active sessions
    // -----------------------------------------------------

    const [rows] = await db.execute(
        `
        SELECT
            id,
            browser_name,
            browser_version,
            operating_system,
            os_version,
            device_type,
            device_model,
            ip_address,
            login_at,
            last_activity_at,
            is_active
        FROM user_sessions
        WHERE user_id = ?
          AND is_active = 1
        ORDER BY last_activity_at DESC
        `,
        [userId]
    );


    // -----------------------------------------------------
    // Add current_session flag
    // -----------------------------------------------------

    return rows.map((session) => ({
        ...session,

        id: Number(session.id),

        is_current:
            Number(session.id) ===
            Number(currentSessionId)
    }));
};


// =========================================================
// UPDATE SESSION ACTIVITY
// =========================================================

const updateSessionActivity = async (
    sessionId
) => {

    if (!sessionId) {
        return;
    }

    await db.execute(
        `
        UPDATE user_sessions
        SET last_activity_at = NOW()
        WHERE id = ?
          AND is_active = 1
        `,
        [sessionId]
    );
};


// =========================================================
// LOGOUT SESSION
// =========================================================

const logoutSession = async (
    sessionId
) => {

    if (!sessionId) {
        return;
    }

    await db.execute(
        `
        UPDATE user_sessions
        SET
            is_active = 0,
            logout_at = NOW()
        WHERE id = ?
          AND is_active = 1
        `,
        [sessionId]
    );
};


// =========================================================
// SIGN OUT OTHER DEVICES
// =========================================================

const logoutOtherSessions = async (
    userId,
    currentSessionId
) => {

    if (!userId) {
        throw new Error(
            "User ID is required."
        );
    }

    if (!currentSessionId) {
        throw new Error(
            "Current session ID is required."
        );
    }


    const [result] = await db.execute(
        `
        UPDATE user_sessions
        SET
            is_active = 0,
            logout_at = NOW()
        WHERE user_id = ?
          AND id != ?
          AND is_active = 1
        `,
        [
            userId,
            currentSessionId
        ]
    );


    return result.affectedRows;
};


// =========================================================
// EXPORT
// =========================================================

module.exports = {
    hashSessionToken,
    createUserSession,
    getActiveSession,
    getUserActiveSessions,
    updateSessionActivity,
    logoutSession,
    logoutOtherSessions
};