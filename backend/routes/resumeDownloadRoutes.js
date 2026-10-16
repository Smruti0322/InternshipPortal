const express = require("express");
const crypto = require("crypto");
const nodemailer = require("nodemailer");

const db = require("../config/db");
const authenticateToken = require("../middleware/authMiddleware");

const router = express.Router();
router.use(authenticateToken);

// =====================================================
// EMAIL CONFIGURATION
// =====================================================

const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT),
    secure: false,
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
    },
});

// =====================================================
// REQUEST OTP FOR RESUME DOWNLOAD
// POST /api/resume-download/request-otp
// =====================================================

router.post("/request-otp", async (req, res) => {
    try {
        const { resume_id } = req.body;
        const userId = req.user.id;

        // ---------------------------------------------
        // VALIDATION
        // ---------------------------------------------

        if (!resume_id) {
            return res.status(400).json({
                success: false,
                message:
                    "Resume ID is required",
            });
        }

        // ---------------------------------------------
        // CHECK RESUME
        // ---------------------------------------------

        const [resumeRows] = await db.query(
            `
            SELECT
                resumes.id,
                resumes.user_id,
                resumes.full_name,
                u.email AS registered_email
            FROM resumes
            JOIN users u ON u.id = resumes.user_id
            WHERE resumes.id = ?
            AND resumes.user_id = ?
            LIMIT 1
            `,
            [resume_id, userId]
        );

        if (resumeRows.length === 0) {
            return res.status(404).json({
                success: false,
                message:
                    "Resume not found",
            });
        }

        const resume = resumeRows[0];

        // ---------------------------------------------
        // USE RESUME EMAIL
        // ---------------------------------------------

        const resumeEmail = resume.registered_email;

        if (!resumeEmail) {
            return res.status(400).json({
                success: false,
                message:
                    "Please add an email address to your resume first",
            });
        }

        // ---------------------------------------------
        // CHECK RECENT OTP
        // Prevent OTP spam
        // ---------------------------------------------

        const [recentOtpRows] =
            await db.query(
                `
                SELECT
                    id,
                    TIMESTAMPDIFF(SECOND, created_at, UTC_TIMESTAMP()) AS age_seconds,
                    TIMESTAMPDIFF(SECOND, created_at, expires_at) AS validity_seconds
                FROM resume_otps
                WHERE user_id = ?
                AND resume_id = ?
                ORDER BY id DESC
                LIMIT 1
                `,
                [userId, resume_id]
            );

        if (recentOtpRows.length > 0) {
            const recentOtp = recentOtpRows[0];
            const ageSeconds = Number(recentOtp.age_seconds);

            // Older rows mixed UTC expiry values with MySQL local creation
            // timestamps. Discard malformed rows before applying the limit.
            if (Number(recentOtp.validity_seconds) !== 300 || ageSeconds < 0) {
                await db.query(
                    "DELETE FROM resume_otps WHERE user_id = ? AND resume_id = ?",
                    [userId, resume_id]
                );
            } else if (ageSeconds < 60) {
                const remaining = 60 - ageSeconds;

                return res.status(429).json({
                    success: false,
                    retry_after_seconds: remaining,
                    message:
                        `Please wait ${remaining} seconds before requesting another OTP.`,
                });
            }
        }

        // ---------------------------------------------
        // GENERATE 6 DIGIT OTP
        // ---------------------------------------------

        const otp = crypto
            .randomInt(100000, 1000000)
            .toString();

        // ---------------------------------------------
        // DELETE OLD OTPs
        // ---------------------------------------------

        await db.query(
            `
            DELETE FROM resume_otps
            WHERE user_id = ?
            AND resume_id = ?
            `,
            [userId, resume_id]
        );

        // ---------------------------------------------
        // SAVE NEW OTP
        // ---------------------------------------------

        await db.query(
            `
            INSERT INTO resume_otps
            (
                user_id,
                resume_id,
                otp,
                created_at,
                expires_at,
                verified
            )
            VALUES (?, ?, ?, UTC_TIMESTAMP(), DATE_ADD(UTC_TIMESTAMP(), INTERVAL 5 MINUTE), 0)
            `,
            [
                userId,
                resume_id,
                otp,
            ]
        );

        // ---------------------------------------------
        // SEND EMAIL
        // ---------------------------------------------

        await transporter.sendMail({
            from: `"Resume Builder" <${process.env.SMTP_USER}>`,
            to: resumeEmail,
            subject:
                "Resume Download Verification OTP",
            html: `
                <div style="
                    font-family: Arial, sans-serif;
                    max-width: 600px;
                    margin: auto;
                    padding: 30px;
                    border: 1px solid #e5e7eb;
                    border-radius: 12px;
                    background: #ffffff;
                ">

                    <h2 style="
                        color: #2563eb;
                        margin-bottom: 10px;
                    ">
                        Resume Download Verification
                    </h2>

                    <p>
                        Hello ${resume.full_name || "User"},
                    </p>

                    <p>
                        You requested to download your resume.
                        Please use the OTP below to continue.
                    </p>

                    <div style="
                        margin: 25px 0;
                        padding: 18px;
                        text-align: center;
                        background: #f3f4f6;
                        border-radius: 10px;
                    ">
                        <span style="
                            font-size: 32px;
                            font-weight: bold;
                            letter-spacing: 8px;
                            color: #111827;
                        ">
                            ${otp}
                        </span>
                    </div>

                    <p>
                        This OTP is valid for
                        <strong>5 minutes</strong>.
                    </p>

                    <p style="
                        color: #6b7280;
                        font-size: 13px;
                    ">
                        If you did not request this,
                        please ignore this email.
                    </p>

                    <hr style="
                        border: none;
                        border-top: 1px solid #e5e7eb;
                        margin: 25px 0;
                    ">

                    <p style="
                        color: #6b7280;
                        font-size: 12px;
                    ">
                        Resume Builder
                    </p>

                </div>
            `,
        });

        // ---------------------------------------------
        // SUCCESS
        // ---------------------------------------------

        return res.status(200).json({
            success: true,
            message:
                "OTP sent successfully to your email",
        });

    } catch (error) {
        console.error(
            "Resume Download OTP Error:",
            error
        );

        return res.status(500).json({
            success: false,
            message:
                "Failed to send OTP",
            error: error.message,
        });
    }
});


// =====================================================
// VERIFY OTP
// POST /api/resume-download/verify-otp
// =====================================================

router.post("/verify-otp", async (req, res) => {
    const connection = await db.getConnection();
    let transactionStarted = false;
    try {
        const { resume_id, otp } = req.body;
        const userId = req.user.id;

        // ---------------------------------------------
        // VALIDATION
        // ---------------------------------------------

        if (!resume_id || !otp) {
            return res.status(400).json({
                success: false,
                message:
                    "Resume ID and OTP are required",
            });
        }

        const [ownedResume] = await connection.query(
            "SELECT id FROM resumes WHERE id = ? AND user_id = ? LIMIT 1",
            [resume_id, userId]
        );
        if (!ownedResume.length) {
            return res.status(404).json({ success: false, message: "Resume not found." });
        }

        await connection.beginTransaction();
        transactionStarted = true;

        // ---------------------------------------------
        // FIND OTP
        // ---------------------------------------------

        const [otpRows] =
            await connection.query(
                `
                SELECT *, (expires_at <= UTC_TIMESTAMP()) AS is_expired
                FROM resume_otps
                WHERE user_id = ?
                AND resume_id = ?
                ORDER BY id DESC
                LIMIT 1
                FOR UPDATE
                `,
                [userId, resume_id]
            );

        if (otpRows.length === 0) {
            await connection.rollback();
            transactionStarted = false;
            return res.status(404).json({
                success: false,
                message:
                    "OTP not found. Please request a new OTP.",
            });
        }

        const otpRecord =
            otpRows[0];

        // ---------------------------------------------
        // CHECK ALREADY VERIFIED
        // ---------------------------------------------

        if (Number(otpRecord.verified) === 1) {
            await connection.rollback();
            transactionStarted = false;
            return res.status(409).json({
                success: false,
                verified: false,
                message: "This OTP has already been used. Request a new OTP to continue.",
            });
        }
        if (Number(otpRecord.verified) === 2) {
            await connection.rollback();
            transactionStarted = false;
            return res.status(400).json({ success: false, message: "This OTP was invalidated. Request a new OTP." });
        }

        if (Number(otpRecord.attempts || 0) >= 5) {
            await connection.rollback();
            transactionStarted = false;
            return res.status(429).json({ success: false, message: "Too many invalid attempts. Request a new OTP." });
        }

        // ---------------------------------------------
        // CHECK EXPIRY
        // ---------------------------------------------

        if (Number(otpRecord.is_expired) === 1) {
            await connection.rollback();
            transactionStarted = false;
            return res.status(400).json({
                success: false,
                message:
                    "OTP has expired. Please request a new OTP.",
            });
        }

        // ---------------------------------------------
        // CHECK OTP
        // ---------------------------------------------

        if (
            String(otpRecord.otp).trim() !==
            String(otp).trim()
        ) {
            await connection.query("UPDATE resume_otps SET attempts = attempts + 1 WHERE id = ? AND verified = 0", [otpRecord.id]);
            await connection.commit();
            transactionStarted = false;
            return res.status(Number(otpRecord.attempts || 0) + 1 >= 5 ? 429 : 400).json({
                success: false,
                message:
                    "Invalid OTP. Please try again.",
            });
        }

        // ---------------------------------------------
        // MARK VERIFIED
        // ---------------------------------------------

        const [updateResult] = await connection.query(
            `
            UPDATE resume_otps
            SET verified = 1
            WHERE id = ? AND verified = 0
            `,
            [otpRecord.id]
        );
        if (!updateResult.affectedRows) {
            await connection.rollback();
            transactionStarted = false;
            return res.status(409).json({ success: false, message: "This OTP has already been used." });
        }
        await connection.commit();
        transactionStarted = false;

        // ---------------------------------------------
        // SUCCESS
        // ---------------------------------------------

        return res.status(200).json({
            success: true,
            verified: true,
            message:
                "OTP verified successfully",
        });

    } catch (error) {
        if (transactionStarted) await connection.rollback();
        console.error(
            "Verify Resume OTP Error:",
            error
        );

        return res.status(500).json({
            success: false,
            message:
                "Failed to verify OTP",
            error: error.message,
        });
    } finally {
        connection.release();
    }
});


module.exports = router;
