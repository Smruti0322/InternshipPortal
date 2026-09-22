const express = require("express");
const router = express.Router();
const mysql = require("mysql2/promise");
const nodemailer = require("nodemailer");
const crypto = require("crypto");

const pool = mysql.createPool({
    host: "localhost",
    user: "root",
    password: "",
    database: "internship_portal",
    port: 3306,
});

// ==========================================
// GMAIL TRANSPORTER
// ==========================================

const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    secure: false,
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
    },
});

// Check Gmail connection
transporter.verify((error, success) => {
    if (error) {
        console.error("Gmail Configuration Error:", error.message);
    } else {
        console.log("Gmail transporter is ready.");
    }
});

// ==========================================
// SEND OTP
// ==========================================

router.post("/send", async (req, res) => {
    try {
        const { user_id, email } = req.body;

        if (!user_id || !email) {
            return res.status(400).json({
                message: "User ID and email are required",
            });
        }

        // Check SMTP configuration
        if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
            return res.status(500).json({
                message: "Email configuration is missing in .env file",
            });
        }

        // Generate 6-digit OTP
        const otp = crypto
            .randomInt(100000, 1000000)
            .toString();

        // OTP expires in 5 minutes
        const expiresAt = new Date(
            Date.now() + 5 * 60 * 1000
        );

        // Save OTP in database
        await pool.query(
            `INSERT INTO resume_otps
            (user_id, email, otp, expires_at)
            VALUES (?, ?, ?, ?)`,
            [user_id, email, otp, expiresAt]
        );

        // Send email
        const mailInfo = await transporter.sendMail({
            from: `"Resume Builder" <${process.env.SMTP_USER}>`,
            to: email,
            subject: "Resume Builder - Email Verification OTP",
            html: `
                <div style="
                    font-family: Arial, sans-serif;
                    max-width: 600px;
                    margin: auto;
                    padding: 30px;
                    border: 1px solid #ddd;
                    border-radius: 10px;
                ">
                    <h2 style="margin-bottom: 10px;">
                        Resume Builder Email Verification
                    </h2>

                    <p>Your OTP for Resume Builder is:</p>

                    <div style="
                        font-size: 32px;
                        font-weight: bold;
                        letter-spacing: 8px;
                        padding: 15px;
                        background: #f5f5f5;
                        text-align: center;
                        border-radius: 8px;
                        margin: 20px 0;
                    ">
                        ${otp}
                    </div>

                    <p>
                        This OTP will expire in
                        <strong>5 minutes</strong>.
                    </p>

                    <p style="color: #666;">
                        Please do not share this OTP with anyone.
                    </p>

                    <p>
                        Regards,<br>
                        <strong>Internship Portal Team</strong>
                    </p>
                </div>
            `,
            text: `Your Resume Builder OTP is ${otp}.

This OTP will expire in 5 minutes.

Please do not share this OTP with anyone.`,
        });

        console.log("OTP Email Sent:", mailInfo.messageId);

        return res.status(200).json({
            message: "OTP sent successfully",
        });

    } catch (error) {
        console.error("Send OTP Error:", error);

        return res.status(500).json({
            message: error.message || "Failed to send OTP",
        });
    }
});

// ==========================================
// VERIFY OTP
// ==========================================

router.post("/verify", async (req, res) => {
    try {
        const { user_id, email, otp } = req.body;

        if (!user_id || !email || !otp) {
            return res.status(400).json({
                message: "User ID, email and OTP are required",
            });
        }

        const [rows] = await pool.query(
            `SELECT *
             FROM resume_otps
             WHERE user_id = ?
             AND email = ?
             AND otp = ?
             AND verified = FALSE
             AND expires_at > NOW()
             ORDER BY id DESC
             LIMIT 1`,
            [user_id, email, otp]
        );

        if (rows.length === 0) {
            return res.status(400).json({
                message: "Invalid or expired OTP",
            });
        }

        await pool.query(
            `UPDATE resume_otps
             SET verified = TRUE
             WHERE id = ?`,
            [rows[0].id]
        );

        return res.status(200).json({
            message: "OTP verified successfully",
            verified: true,
        });

    } catch (error) {
        console.error("Verify OTP Error:", error);

        return res.status(500).json({
            message: error.message || "Failed to verify OTP",
        });
    }
});

module.exports = router;