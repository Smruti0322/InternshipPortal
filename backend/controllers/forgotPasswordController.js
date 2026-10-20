const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const nodemailer = require("nodemailer");
const db = require("../config/db");
const { generateOTP, generateTemporaryPassword, isExpired, hasAttemptsRemaining } = require("../utils/recoverySecurity");

const escapeHtml = (value = "") => String(value).replace(/[&<>\"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "\"": "&quot;",
    "'": "&#39;",
})[character]);

/*
=========================================
EMAIL TRANSPORTER
=========================================
*/

const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
    }
});


/*
=========================================
GENERATE OTP
=========================================
*/

/*
=========================================
REQUEST OTP
POST /api/forgot-password/request
=========================================
*/

const requestOTP = async (req, res) => {
    let connection = null;
    let transactionStarted = false;
    try {
        const { identifier, method } = req.body;

        if (!identifier || !identifier.trim()) {
            return res.status(400).json({
                message: "Email or phone number is required."
            });
        }

        const cleanIdentifier = identifier.trim();
        const resetMethod = method === "phone" ? "phone" : "email";

        /*
        -----------------------------------------
        FIND USER
        -----------------------------------------
        */

        // FIND USER
        let user;

        if (resetMethod === "phone") {
            const normalizedPhone = cleanIdentifier.replace(/[^\d+]/g, "");
            if (!/^\+?[1-9]\d{7,14}$/.test(normalizedPhone)) {
                return res.status(400).json({ message: "Enter a valid registered mobile number." });
            }
            return res.status(501).json({ message: "Mobile recovery is unavailable until an SMS provider is configured." });
        }
        if (resetMethod !== "email") {
            return res.status(400).json({ message: "Unsupported recovery method." });
        }

        const [rows] = await db.execute(
            `
    SELECT id, name, email
    FROM users
    WHERE email = ?
    LIMIT 1
    `,
            [cleanIdentifier]
        );

        user = rows[0];

        if (!user) {
            return res.status(200).json({
                success: true,
                message: "If an account matches that email address, recovery instructions will be sent.",
                user_id: crypto.randomInt(1, 2 ** 31),
                reset_history_id: crypto.randomInt(1, 2 ** 31)
            });
        }

        connection = await db.getConnection();
        await connection.beginTransaction();
        transactionStarted = true;
        await connection.execute("SELECT id FROM users WHERE id = ? FOR UPDATE", [user.id]);
        const [recentSuccessfulResets] = await connection.execute(
            "SELECT id FROM password_reset_history WHERE user_id = ? AND status = 'completed' AND verification_time >= DATE_SUB(NOW(), INTERVAL 24 HOUR) LIMIT 1 FOR UPDATE",
            [user.id]
        );
        if (recentSuccessfulResets.length) {
            await connection.rollback();
            transactionStarted = false;
            connection.release();
            connection = null;
            return res.status(429).json({ message: "You can use this option only once per day" });
        }
        /*
        -----------------------------------------
        GENERATE OTP
        -----------------------------------------
        */

        const otp = generateOTP();

        /*
        OTP valid for 10 minutes
        */

        const expiresAt = new Date(Date.now() + 10 * 60 * 1000);


        /*
        -----------------------------------------
        STORE OTP
        -----------------------------------------
        */

        /*
        NOTE:
        This query expects a password_reset_history
        table with these columns:

        id
        user_id
        otp
        otp_expires_at
        method
        verified
        created_at
        */

        const [result] = await connection.execute(
            `
    INSERT INTO password_reset_history
    (
        user_id,
        otp,
        otp_expires_at,
        reset_method,
        otp_verified,
        status,
        created_at
    )
    VALUES (?, ?, ?, ?, 0, 'pending', NOW())
    `,
            [
                user.id,
                otp,
                expiresAt,
                resetMethod
            ]
        );
        const resetHistoryId = result.insertId;

        /*
        -----------------------------------------
        SEND EMAIL OTP
        -----------------------------------------
        */

        if (resetMethod === "email") {
            const safeName = escapeHtml(user.name || "User");

            await transporter.sendMail({
                from: process.env.SMTP_USER,
                to: user.email,
                subject: "Internship Portal - Password Reset OTP",
                html: `
                    <div style="font-family: Arial, sans-serif; padding: 20px;">
                        <h2>Password Reset</h2>

                        <p>Hello ${safeName},</p>

                        <p>
                            Your OTP for resetting your Internship Portal
                            password is:
                        </p>

                        <h1 style="letter-spacing: 8px;">
                            ${otp}
                        </h1>

                        <p>
                            This OTP is valid for <strong>10 minutes</strong>.
                        </p>

                        <p>
                            If you did not request a password reset,
                            please ignore this email.
                        </p>
                    </div>
                `
            });

        }

        // Commit the request only after SMTP accepted the OTP. A mail delivery
        // failure rolls back the OTP row and allows a safe retry.
        await connection.commit();
        transactionStarted = false;
        connection.release();
        connection = null;


        /*
        -----------------------------------------
        RESPONSE
        -----------------------------------------
        */

        return res.status(200).json({
            success: true,
            message: "If an account matches that email address, recovery instructions will be sent.",
            user_id: user.id,
            reset_history_id: resetHistoryId
        });

    } catch (error) {

        if (connection) {
            if (transactionStarted) await connection.rollback().catch(() => {});
            connection.release();
        }

        console.error("REQUEST OTP ERROR:", error);

        return res.status(500).json({
            message: "Unable to send OTP."
        });
    }
};


/*
=========================================
VERIFY OTP
POST /api/forgot-password/verify-otp
=========================================
*/

const verifyOTP = async (req, res) => {
    let connection = null;
    let transactionStarted = false;
    try {

        const { user_id, reset_history_id, otp } = req.body;


        /*
        -----------------------------------------
        VALIDATION
        -----------------------------------------
        */

        if (!user_id || !reset_history_id || !otp) {
            return res.status(400).json({
                message: "User ID, reset history ID and OTP are required."
            });
        }


        /*
        -----------------------------------------
        FIND OTP
        -----------------------------------------
        */

        connection = await db.getConnection();
        await connection.beginTransaction();
        transactionStarted = true;
        // Keep the lock order consistent with requestOTP and serialize reset success per user.
        await connection.execute("SELECT id FROM users WHERE id = ? FOR UPDATE", [user_id]);
        const [rows] = await connection.execute(
            `
    SELECT *
    FROM password_reset_history
    WHERE id = ?
      AND user_id = ?
      AND otp_verified = 0
      AND status = 'pending'
    LIMIT 1
    FOR UPDATE
    `,
            [
                reset_history_id,
                user_id
            ]
        );


        if (rows.length === 0) {
            await connection.rollback();
            transactionStarted = false;
            connection.release();
            connection = null;
            return res.status(400).json({
                message: "Invalid OTP."
            });
        }


        const resetRequest = rows[0];

        if (!hasAttemptsRemaining(resetRequest.attempts)) {
            await connection.rollback();
            transactionStarted = false;
            connection.release();
            connection = null;
            return res.status(429).json({ message: "Too many invalid attempts. Request recovery again later." });
        }


        /*
        -----------------------------------------
        CHECK OTP EXPIRATION
        -----------------------------------------
        */

        if (
            isExpired(resetRequest.otp_expires_at)
        ) {

            await connection.rollback();
            transactionStarted = false;
            connection.release();
            connection = null;

            return res.status(400).json({
                message: "OTP has expired. Please request a new OTP."
            });

        }

        if (String(resetRequest.otp) !== String(otp).trim()) {
            await connection.execute("UPDATE password_reset_history SET attempts = attempts + 1 WHERE id = ? AND otp_verified = 0", [reset_history_id]);
            const attempts = Number(resetRequest.attempts || 0) + 1;
            await connection.commit();
            transactionStarted = false;
            connection.release();
            connection = null;
            return res.status(attempts >= 5 ? 429 : 400).json({ message: attempts >= 5 ? "Too many invalid attempts." : "Invalid OTP." });
        }

        const [recentSuccessfulResets] = await connection.execute(
            "SELECT id FROM password_reset_history WHERE user_id = ? AND status = 'completed' AND verification_time >= DATE_SUB(NOW(), INTERVAL 24 HOUR) LIMIT 1 FOR UPDATE",
            [user_id]
        );
        if (recentSuccessfulResets.length) {
            await connection.rollback();
            transactionStarted = false;
            connection.release();
            connection = null;
            return res.status(429).json({ message: "You can use this option only once per day" });
        }


        /*
        -----------------------------------------
        MARK OTP VERIFIED
        -----------------------------------------
        */

        /*
        -----------------------------------------
        GENERATE TEMPORARY PASSWORD
        -----------------------------------------
        */

        const temporaryPassword = generateTemporaryPassword();


        const hashedPassword =
            await bcrypt.hash(temporaryPassword, 10);


        /*
        -----------------------------------------
        UPDATE USER PASSWORD
        -----------------------------------------
        */

        /*
        -----------------------------------------
        SEND TEMPORARY PASSWORD
        -----------------------------------------
        */

        if (resetRequest.reset_method === "email") {

            const [userRows] = await db.execute(
                `
                SELECT name, email
                FROM users
                WHERE id = ?
                LIMIT 1
                `,
                [user_id]
            );

            if (userRows.length > 0) {

                const user = userRows[0];

                const safeName = escapeHtml(user.name || "User");
                await transporter.sendMail({
                    from: process.env.SMTP_USER,
                    to: user.email,
                    subject: "Internship Portal - Temporary Password",
                    html: `
                        <div style="font-family: Arial, sans-serif; padding: 20px;">

                            <h2>Password Reset Successful</h2>

                            <p>
                                Hello ${safeName},
                            </p>

                            <p>
                                Your password has been reset successfully.
                            </p>

                            <p>
                                Your temporary password is:
                            </p>

                            <h2>
                                ${temporaryPassword}
                            </h2>

                            <p>
                                Please login using this temporary password
                                and change your password after login.
                            </p>

                        </div>
                    `
                });

            }
        }


        /*
        -----------------------------------------
        SUCCESS RESPONSE
        -----------------------------------------
        */

        try {
            const [lockedRows] = await connection.execute(
                "SELECT id FROM password_reset_history WHERE id = ? AND user_id = ? AND otp_verified = 0 AND status = 'pending' AND otp_expires_at > NOW() AND attempts < 5 FOR UPDATE",
                [reset_history_id, user_id]
            );
            if (!lockedRows.length) throw Object.assign(new Error("This recovery request is no longer valid."), { status: 409 });
            await connection.execute("UPDATE users SET password = ?, must_change_password = 1 WHERE id = ?", [hashedPassword, user_id]);
            await connection.execute("UPDATE password_reset_history SET otp_verified = 1, verification_time = NOW(), status = 'completed' WHERE id = ?", [reset_history_id]);
            await connection.commit();
            transactionStarted = false;
        } catch (error) {
            await connection.rollback();
            transactionStarted = false;
            throw error;
        }
        if (connection) {
            connection.release();
            connection = null;
        }

        return res.status(200).json({
            success: true,
            message:
                "OTP verified successfully. Temporary password has been sent.",
            user_id
        });

    } catch (error) {

        if (connection) {
            if (transactionStarted) await connection.rollback().catch(() => {});
            connection.release();
        }

        console.error("VERIFY OTP ERROR:", error);

        return res.status(error.status || 500).json({
            message: "Unable to verify OTP.",
        });
    }
};


module.exports = {
    requestOTP,
    verifyOTP
};
