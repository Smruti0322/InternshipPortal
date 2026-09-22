const express = require("express");
const crypto = require("crypto");
const nodemailer = require("nodemailer");

const db = require("../config/db");

const router = express.Router();

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
        const {
            user_id,
            resume_id,
            email,
        } = req.body;

        // ---------------------------------------------
        // VALIDATION
        // ---------------------------------------------

        if (!user_id || !resume_id || !email) {
            return res.status(400).json({
                success: false,
                message:
                    "User ID, resume ID and email are required",
            });
        }

        // ---------------------------------------------
        // CHECK RESUME
        // ---------------------------------------------

        const [resumeRows] = await db.query(
            `
            SELECT
                id,
                user_id,
                full_name,
                email
            FROM resumes
            WHERE id = ?
            AND user_id = ?
            LIMIT 1
            `,
            [resume_id, user_id]
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

        const resumeEmail =
            resume.email || email;

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
                    created_at
                FROM resume_otps
                WHERE user_id = ?
                AND resume_id = ?
                ORDER BY created_at DESC
                LIMIT 1
                `,
                [user_id, resume_id]
            );

        if (recentOtpRows.length > 0) {
            const createdAt =
                new Date(
                    recentOtpRows[0].created_at
                );

            const currentTime =
                new Date();

            const difference =
                currentTime.getTime() -
                createdAt.getTime();

            const secondsPassed =
                Math.floor(
                    difference / 1000
                );

            if (secondsPassed < 60) {
                const remaining =
                    60 - secondsPassed;

                return res.status(429).json({
                    success: false,
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

        // OTP valid for 5 minutes
        const expiresAt =
            new Date(
                Date.now() +
                5 * 60 * 1000
            );

        // MySQL DATETIME format
        const mysqlExpiresAt =
            expiresAt
                .toISOString()
                .slice(0, 19)
                .replace("T", " ");

        // ---------------------------------------------
        // DELETE OLD OTPs
        // ---------------------------------------------

        await db.query(
            `
            DELETE FROM resume_otps
            WHERE user_id = ?
            AND resume_id = ?
            `,
            [user_id, resume_id]
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
                email,
                otp,
                expires_at,
                verified
            )
            VALUES (?, ?, ?, ?, ?, 0)
            `,
            [
                user_id,
                resume_id,
                resumeEmail,
                otp,
                mysqlExpiresAt,
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
    try {
        const {
            user_id,
            resume_id,
            otp,
        } = req.body;

        // ---------------------------------------------
        // VALIDATION
        // ---------------------------------------------

        if (!user_id || !resume_id || !otp) {
            return res.status(400).json({
                success: false,
                message:
                    "User ID, resume ID and OTP are required",
            });
        }

        // ---------------------------------------------
        // FIND OTP
        // ---------------------------------------------

        const [otpRows] =
            await db.query(
                `
                SELECT *
                FROM resume_otps
                WHERE user_id = ?
                AND resume_id = ?
                ORDER BY created_at DESC
                LIMIT 1
                `,
                [user_id, resume_id]
            );

        if (otpRows.length === 0) {
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

        if (otpRecord.verified === 1) {
            return res.status(200).json({
                success: true,
                verified: true,
                message:
                    "OTP already verified",
            });
        }

        // ---------------------------------------------
        // CHECK EXPIRY
        // ---------------------------------------------

        const currentTime =
            new Date();

        const expiryTime =
            new Date(
                otpRecord.expires_at
            );

        if (currentTime > expiryTime) {
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
            return res.status(400).json({
                success: false,
                message:
                    "Invalid OTP. Please try again.",
            });
        }

        // ---------------------------------------------
        // MARK VERIFIED
        // ---------------------------------------------

        await db.query(
            `
            UPDATE resume_otps
            SET verified = 1
            WHERE id = ?
            `,
            [otpRecord.id]
        );

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
    }
});


module.exports = router;