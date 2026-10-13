const db = require("../config/db");

// =========================================================
// GET LOGIN HISTORY
// GET /api/auth/login-history
// =========================================================

const getLoginHistory = async (req, res) => {
    try {

        const userId = req.user.id;

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
                country,
                state,
                city,
                login_date_time,
                login_status,
                failure_reason,
                otp_required,
                otp_verified,
                is_new_browser,
                is_new_device,
                is_new_ip
            FROM login_history
            WHERE user_id = ?
            ORDER BY login_date_time DESC
            `,
            [userId]
        );

        return res.status(200).json({
            success: true,
            login_history: rows
        });

    } catch (error) {

        console.error(
            "GET LOGIN HISTORY ERROR:",
            error
        );

        return res.status(500).json({
            success: false,
            message:
                "Unable to fetch login history."
        });
    }
};

module.exports = {
    getLoginHistory
};