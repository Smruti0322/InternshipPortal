const express = require("express");
const router = express.Router();
const nodemailer = require("nodemailer");
const crypto = require("crypto");
const db = require("../config/db");
const authenticateToken = require("../middleware/authMiddleware");

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

router.use(authenticateToken);

router.post("/send", async (req, res) => {
    try {
        const { email, resume_id: resumeId } = req.body;
        const user_id = req.user.id;

        if (!email || !resumeId) {
            return res.status(400).json({
                message: "User ID and email are required",
            });
        }

        const [ownedResume] = await db.query(
            "SELECT id FROM resumes WHERE id = ? AND user_id = ? LIMIT 1",
            [resumeId, user_id]
        );
        if (!ownedResume.length) return res.status(404).json({ message: "Resume not found." });

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
        const [recent] = await db.query(
            "SELECT created_at FROM resume_otps WHERE user_id = ? AND resume_id = ? ORDER BY id DESC LIMIT 1",
            [user_id, resumeId]
        );
        if (recent.length && Date.now() - new Date(recent[0].created_at).getTime() < 60_000) {
            const retryAfter = Math.ceil((60_000 - (Date.now() - new Date(recent[0].created_at).getTime())) / 1000);
            return res.status(429).json({ message: "Please wait before requesting another OTP.", retry_after_seconds: retryAfter });
        }

        const [userRows] = await db.query("SELECT email FROM users WHERE id = ? LIMIT 1", [user_id]);
        if (!userRows.length || userRows[0].email.toLowerCase() !== String(email).trim().toLowerCase()) {
            return res.status(400).json({ message: "Use the email address registered to your account." });
        }

        await db.query(
            "DELETE FROM resume_otps WHERE user_id = ? AND resume_id = ? AND verified = 0",
            [user_id, resumeId]
        );

        await db.query(
            `INSERT INTO resume_otps
            (user_id, resume_id, otp, created_at, expires_at, verified, attempts)
            VALUES (?, ?, ?, UTC_TIMESTAMP(), ?, 0, 0)`,
            [user_id, resumeId, otp, expiresAt]
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

        res.setHeader("Cache-Control", "no-store");

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
        const { email, resume_id: resumeId, otp } = req.body;
        const user_id = req.user.id;

        if (!email || !resumeId || !otp) {
            return res.status(400).json({
                message: "User ID, email and OTP are required",
            });
        }

        const [rows] = await db.query(
            `SELECT *
             FROM resume_otps
             WHERE user_id = ?
             AND resume_id = ?
             AND verified = FALSE
             AND expires_at > NOW()
             ORDER BY id DESC
             LIMIT 1`,
            [user_id, resumeId]
        );

        if (rows.length === 0) {
            return res.status(400).json({
                message: "Invalid or expired OTP",
            });
        }

        const record = rows[0];
        if (Number(record.attempts || 0) >= 5) {
            return res.status(429).json({ message: "Too many invalid attempts. Request a new OTP." });
        }
        if (String(record.otp) !== String(otp).trim()) {
            await db.query("UPDATE resume_otps SET attempts = attempts + 1 WHERE id = ? AND verified = 0", [record.id]);
            return res.status(Number(record.attempts || 0) + 1 >= 5 ? 429 : 400).json({ message: "Invalid or expired OTP." });
        }

        await db.query(
            `UPDATE resume_otps
             SET verified = TRUE
             WHERE id = ? AND verified = FALSE AND expires_at > UTC_TIMESTAMP() AND attempts < 5`,
            [record.id]
        );
        const [updated] = await db.query("SELECT verified FROM resume_otps WHERE id = ?", [record.id]);
        if (!updated.length || Number(updated[0].verified) !== 1) {
            return res.status(409).json({ message: "OTP expired or was already used." });
        }

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
