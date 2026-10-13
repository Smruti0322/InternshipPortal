const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const nodemailer = require("nodemailer");
const db = require("../config/db");

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

const generateOTP = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
};


/*
=========================================
REQUEST OTP
POST /api/forgot-password/request
=========================================
*/

const requestOTP = async (req, res) => {
    try {
        const { identifier, method } = req.body;

        if (!identifier || !identifier.trim()) {
            return res.status(400).json({
                message: "Email or phone number is required."
            });
        }

        const cleanIdentifier = identifier.trim();

        /*
        -----------------------------------------
        FIND USER
        -----------------------------------------
        */

        // FIND USER
        let user;

        if (method === "phone") {
            return res.status(400).json({
                message: "Phone OTP is not configured yet. Please use email."
            });
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
            return res.status(404).json({
                message: "No account found with this email address."
            });
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

        const [result] = await db.execute(
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
                method || "email"
            ]
        );

        const resetHistoryId = result.insertId;

        /*
        -----------------------------------------
        SEND EMAIL OTP
        -----------------------------------------
        */

        if (method === "email") {

            await transporter.sendMail({
                from: process.env.SMTP_USER,
                to: user.email,
                subject: "Internship Portal - Password Reset OTP",
                html: `
                    <div style="font-family: Arial, sans-serif; padding: 20px;">
                        <h2>Password Reset</h2>

                        <p>Hello ${user.name || "User"},</p>

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


        /*
        -----------------------------------------
        RESPONSE
        -----------------------------------------
        */

        return res.status(200).json({
            success: true,
            message: "OTP sent successfully.",
            user_id: user.id,
            reset_history_id: resetHistoryId
        });

    } catch (error) {

        console.error("REQUEST OTP ERROR:", error);

        return res.status(500).json({
            message: "Unable to send OTP.",
            error: error.message
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
    try {

        const {
            user_id,
            reset_history_id,
            otp,
            method
        } = req.body;


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

        const [rows] = await db.execute(
            `
    SELECT *
    FROM password_reset_history
    WHERE id = ?
      AND user_id = ?
      AND otp = ?
      AND otp_verified = 0
    LIMIT 1
    `,
            [
                reset_history_id,
                user_id,
                otp
            ]
        );


        if (rows.length === 0) {
            return res.status(400).json({
                message: "Invalid OTP."
            });
        }


        const resetRequest = rows[0];


        /*
        -----------------------------------------
        CHECK OTP EXPIRATION
        -----------------------------------------
        */

        if (
            new Date(resetRequest.otp_expires_at).getTime() <
            Date.now()
        ) {

            return res.status(400).json({
                message: "OTP has expired. Please request a new OTP."
            });

        }


        /*
        -----------------------------------------
        MARK OTP VERIFIED
        -----------------------------------------
        */

        await db.execute(
            `
            UPDATE password_reset_history
            SET otp_verified = 1,
            verification_time = NOW(),
            status = 'completed'
            WHERE id = ?
            `,
            [reset_history_id]
        );


        /*
        -----------------------------------------
        GENERATE TEMPORARY PASSWORD
        -----------------------------------------
        */

        const temporaryPassword =
            crypto.randomBytes(5).toString("hex");


        const hashedPassword =
            await bcrypt.hash(temporaryPassword, 10);


        /*
        -----------------------------------------
        UPDATE USER PASSWORD
        -----------------------------------------
        */

        await db.execute(
            `
    UPDATE users
    SET password = ?,
        must_change_password = 1
    WHERE id = ?
    `,
            [
                hashedPassword,
                user_id
            ]
        );


        /*
        -----------------------------------------
        SEND TEMPORARY PASSWORD
        -----------------------------------------
        */

        if (method === "email") {

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

                await transporter.sendMail({
                    from: process.env.SMTP_USER,
                    to: user.email,
                    subject: "Internship Portal - Temporary Password",
                    html: `
                        <div style="font-family: Arial, sans-serif; padding: 20px;">

                            <h2>Password Reset Successful</h2>

                            <p>
                                Hello ${user.name || "User"},
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

        return res.status(200).json({
            success: true,
            message:
                "OTP verified successfully. Temporary password has been sent.",
            user_id
        });

    } catch (error) {

        console.error("VERIFY OTP ERROR:", error);

        return res.status(500).json({
            message: "Unable to verify OTP.",
            error: error.message
        });
    }
};


module.exports = {
    requestOTP,
    verifyOTP
};