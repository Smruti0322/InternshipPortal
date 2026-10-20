const crypto = require("crypto");
const nodemailer = require("nodemailer");
const jwt = require("jsonwebtoken");
const db = require("../config/db");
const { generateOTP } = require("../utils/recoverySecurity");

const { createUserSession } = require("../utils/sessionSecurity");

// =========================================================
// EMAIL TRANSPORTER
// =========================================================

const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
    }
});

// =========================================================
// LOGIN OTP EMAIL TRANSLATIONS
// Supported languages: en, hi, fr, es, pt, zh
// =========================================================

const LOGIN_OTP_EMAILS = {
    en: {
        subject: "Internship Portal - Login Verification OTP",
        title: "Login Verification",
        greeting: "Hello",
        intro: "A login attempt was made on your Internship Portal account.",
        code: "Your verification OTP is:",
        expiry: "This OTP is valid for 10 minutes.",
        attempts: "You have a maximum of 5 verification attempts.",
        security: "If you did not attempt to log in, please secure your account immediately."
    },

    hi: {
        subject: "इंटर्नशिप पोर्टल - लॉगिन सत्यापन OTP",
        title: "लॉगिन सत्यापन",
        greeting: "नमस्ते",
        intro: "आपके इंटर्नशिप पोर्टल खाते में लॉगिन करने का प्रयास किया गया है।",
        code: "आपका सत्यापन OTP है:",
        expiry: "यह OTP 10 मिनट तक मान्य है।",
        attempts: "आप अधिकतम 5 बार OTP सत्यापित करने का प्रयास कर सकते हैं।",
        security: "यदि आपने लॉगिन करने का प्रयास नहीं किया है, तो कृपया तुरंत अपने खाते को सुरक्षित करें।"
    },

    fr: {
        subject: "Portail de stages - Code OTP de connexion",
        title: "Vérification de connexion",
        greeting: "Bonjour",
        intro: "Une tentative de connexion à votre compte du portail de stages a été détectée.",
        code: "Votre code OTP de vérification est :",
        expiry: "Ce code OTP est valable pendant 10 minutes.",
        attempts: "Vous disposez de 5 tentatives maximum de vérification.",
        security: "Si vous n'êtes pas à l'origine de cette connexion, sécurisez immédiatement votre compte."
    },

    es: {
        subject: "Portal de prácticas - Código OTP de inicio de sesión",
        title: "Verificación de inicio de sesión",
        greeting: "Hola",
        intro: "Se ha intentado iniciar sesión en tu cuenta del portal de prácticas.",
        code: "Tu código OTP de verificación es:",
        expiry: "Este código OTP es válido durante 10 minutos.",
        attempts: "Dispones de un máximo de 5 intentos de verificación.",
        security: "Si no intentaste iniciar sesión, protege tu cuenta inmediatamente."
    },

    pt: {
        subject: "Portal de Estágios - Código OTP de Login",
        title: "Verificação de Login",
        greeting: "Olá",
        intro: "Foi realizada uma tentativa de acesso à sua conta do portal de estágios.",
        code: "O seu código OTP de verificação é:",
        expiry: "Este código OTP é válido por 10 minutos.",
        attempts: "Você tem no máximo 5 tentativas de verificação.",
        security: "Se não tentou iniciar sessão, proteja imediatamente a sua conta."
    },

    zh: {
        subject: "实习门户 - 登录验证码",
        title: "登录验证",
        greeting: "您好",
        intro: "有人尝试登录您的实习门户账户。",
        code: "您的登录验证码是：",
        expiry: "此验证码有效期为10分钟。",
        attempts: "您最多有5次验证机会。",
        security: "如果这不是您本人的登录操作，请立即保护您的账户。"
    }
};

// =========================================================
// ESCAPE HTML
// =========================================================

const escapeHtml = (value = "") => {
    return String(value).replace(/[&<>"']/g, (character) => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    })[character]);
};

// =========================================================
// HASH OTP
// =========================================================

const hashOTP = (otp) => {
    return crypto
        .createHash("sha256")
        .update(otp)
        .digest("hex");
};

// =========================================================
// CREATE DEVICE IDENTIFIER
// =========================================================

const createDeviceIdentifier = ({
    browserName,
    browserVersion,
    operatingSystem,
    osVersion,
    deviceType,
    deviceModel
}) => {
    const fingerprintSource = [
        browserName || "",
        browserVersion || "",
        operatingSystem || "",
        osVersion || "",
        deviceType || "",
        deviceModel || ""
    ].join("|");

    return crypto
        .createHash("sha256")
        .update(fingerprintSource)
        .digest("hex");
};

// =========================================================
// MARK DEVICE AS TRUSTED
// =========================================================

const markDeviceAsTrusted = async ({
    userId,
    loginHistoryId
}) => {
    const [historyRows] = await db.execute(
        `
        SELECT
            browser_name,
            browser_version,
            operating_system,
            os_version,
            device_type,
            device_model,
            ip_address
        FROM login_history
        WHERE id = ?
          AND user_id = ?
        LIMIT 1
        `,
        [loginHistoryId, userId]
    );

    if (historyRows.length === 0) {
        throw new Error(
            "Login history not found while marking trusted device."
        );
    }

    const history = historyRows[0];

    const deviceIdentifier = createDeviceIdentifier({
        browserName: history.browser_name,
        browserVersion: history.browser_version,
        operatingSystem: history.operating_system,
        osVersion: history.os_version,
        deviceType: history.device_type,
        deviceModel: history.device_model
    });

    await db.execute(
        `
        INSERT INTO trusted_devices
        (
            user_id,
            device_identifier,
            browser_name,
            browser_version,
            operating_system,
            os_version,
            device_type,
            device_model,
            last_ip_address,
            first_seen_at,
            last_seen_at,
            trusted_at,
            is_active
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW(), NOW(), 1)
        ON DUPLICATE KEY UPDATE
            browser_name = VALUES(browser_name),
            browser_version = VALUES(browser_version),
            operating_system = VALUES(operating_system),
            os_version = VALUES(os_version),
            device_type = VALUES(device_type),
            device_model = VALUES(device_model),
            last_ip_address = VALUES(last_ip_address),
            last_seen_at = NOW(),
            trusted_at = COALESCE(trusted_at, NOW()),
            is_active = 1
        `,
        [
            userId,
            deviceIdentifier,
            history.browser_name,
            history.browser_version,
            history.operating_system,
            history.os_version,
            history.device_type,
            history.device_model,
            history.ip_address
        ]
    );

    return deviceIdentifier;
};

// =========================================================
// REQUEST LOGIN OTP
// POST /api/auth/login/request-otp
// =========================================================

const requestLoginOTP = async (req, res) => {
    let connection = null;
    let transactionStarted = false;
    let verificationRecordId = null;

    try {
        const { user_id, login_history_id } = req.body;

        // VALIDATION
        if (!user_id || !login_history_id) {
            return res.status(400).json({
                success: false,
                message: "User ID and login history ID are required."
            });
        }

        // FIND USER AND SAVED LANGUAGE
        const [users] = await db.execute(
            `
            SELECT
                id,
                name,
                email,
                preferred_language
            FROM users
            WHERE id = ?
            LIMIT 1
            `,
            [user_id]
        );

        if (users.length === 0) {
            return res.status(404).json({
                success: false,
                message: "User not found."
            });
        }

        const user = users[0];

        // VERIFY LOGIN HISTORY
        connection = await db.getConnection();
        await connection.beginTransaction();
        transactionStarted = true;

        const [history] = await connection.execute(
            `
            SELECT id, login_status
            FROM login_history
            WHERE id = ?
              AND user_id = ?
            LIMIT 1
            FOR UPDATE
            `,
            [login_history_id, user_id]
        );

        if (history.length === 0) {
            await connection.rollback();
            transactionStarted = false;
            connection.release();
            connection = null;

            return res.status(400).json({
                success: false,
                message: "Invalid login verification request."
            });
        }

        // RESEND OTP RATE LIMIT: 60 SECONDS
        const [recentVerifications] = await connection.execute(
            `
            SELECT created_at
            FROM login_verifications
            WHERE user_id = ?
              AND login_history_id = ?
              AND verification_type = 'login_otp'
            ORDER BY created_at DESC
            LIMIT 1
            `,
            [user_id, login_history_id]
        );

        if (recentVerifications.length > 0) {
            const elapsed = Math.floor(
                (
                    Date.now() -
                    new Date(recentVerifications[0].created_at).getTime()
                ) / 1000
            );

            if (elapsed >= 0 && elapsed < 60) {
                await connection.rollback();
                transactionStarted = false;
                connection.release();
                connection = null;

                const remaining = 60 - elapsed;

                return res.status(429).json({
                    success: false,
                    message: `Please wait ${remaining} seconds before requesting another OTP.`,
                    retry_after_seconds: remaining
                });
            }
        }

        // EXPIRE PREVIOUS PENDING OTPs
        await connection.execute(
            `
            UPDATE login_verifications
            SET status = 'expired'
            WHERE user_id = ?
              AND login_history_id = ?
              AND status = 'pending'
            `,
            [user_id, login_history_id]
        );

        // GENERATE OTP
        const otp = generateOTP();
        const otpHash = hashOTP(otp);
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

        // STORE OTP HASH
        const [result] = await connection.execute(
            `
            INSERT INTO login_verifications
            (
                user_id,
                login_history_id,
                verification_type,
                otp_hash,
                expires_at,
                attempts,
                max_attempts,
                status,
                created_at
            )
            VALUES (?, ?, 'login_otp', ?, ?, 0, 5, 'pending', NOW())
            `,
            [
                user_id,
                login_history_id,
                otpHash,
                expiresAt
            ]
        );

        verificationRecordId = result.insertId;

        await connection.commit();
        transactionStarted = false;
        connection.release();
        connection = null;

        // =====================================================
        // SEND OTP EMAIL IN USER'S SAVED LANGUAGE
        // =====================================================

        const emailLanguage = String(
            user.preferred_language || "en"
        )
            .trim()
            .toLowerCase()
            .split(/[-_]/)[0];

        const emailText =
            LOGIN_OTP_EMAILS[emailLanguage] || LOGIN_OTP_EMAILS.en;

        const safeName = escapeHtml(user.name || "User");

        await transporter.sendMail({
            from: process.env.SMTP_USER,
            to: user.email,
            subject: emailText.subject,

            text: [
                `${emailText.greeting} ${user.name || "User"},`,
                "",
                emailText.intro,
                "",
                `${emailText.code} ${otp}`,
                emailText.expiry,
                emailText.attempts,
                "",
                emailText.security
            ].join("\n"),

            html: `
                <div style="
                    font-family: Arial, sans-serif;
                    max-width: 600px;
                    margin: 0 auto;
                    padding: 24px;
                    line-height: 1.7;
                    color: #1e293b;
                    background-color: #ffffff;
                ">
                    <h2 style="
                        margin-top: 0;
                        color: #1d4ed8;
                    ">
                        ${emailText.title}
                    </h2>

                    <p>
                        ${emailText.greeting} ${safeName},
                    </p>

                    <p>
                        ${emailText.intro}
                    </p>

                    <p>
                        ${emailText.code}
                    </p>

                    <div style="
                        margin: 24px 0;
                        padding: 18px;
                        text-align: center;
                        background-color: #f1f5f9;
                        border-radius: 8px;
                    ">
                        <span style="
                            font-size: 32px;
                            font-weight: bold;
                            letter-spacing: 8px;
                            color: #1d4ed8;
                        ">
                            ${otp}
                        </span>
                    </div>

                    <p>
                        ${emailText.expiry}
                    </p>

                    <p>
                        ${emailText.attempts}
                    </p>

                    <p style="
                        margin-top: 24px;
                        color: #475569;
                    ">
                        ${emailText.security}
                    </p>
                </div>
            `
        });

        // UPDATE LOGIN HISTORY
        await db.execute(
            `
            UPDATE login_history
            SET
                login_status = 'otp_required',
                otp_required = 1,
                otp_verified = 0
            WHERE id = ?
              AND user_id = ?
            `,
            [login_history_id, user_id]
        );

        return res.status(200).json({
            success: true,
            message: "Login verification OTP sent successfully.",
            verification_id: verificationRecordId
        });

    } catch (error) {
        if (connection) {
            if (transactionStarted) {
                await connection.rollback().catch(() => { });
            }

            connection.release();
        }

        if (verificationRecordId) {
            await db.execute(
                `
                UPDATE login_verifications
                SET status = 'failed'
                WHERE id = ?
                  AND status = 'pending'
                `,
                [verificationRecordId]
            ).catch(() => { });
        }

        console.error("REQUEST LOGIN OTP ERROR:", error);

        return res.status(500).json({
            success: false,
            message: "Unable to send login verification OTP."
        });
    }
};

// =========================================================
// VERIFY LOGIN OTP
// POST /api/auth/login/verify-otp
// =========================================================

const verifyLoginOTP = async (req, res) => {
    let connection = null;
    let transactionStarted = false;

    try {
        const {
            user_id,
            login_history_id,
            verification_id,
            otp
        } = req.body;

        // VALIDATION
        if (
            !user_id ||
            !login_history_id ||
            !verification_id ||
            !otp
        ) {
            return res.status(400).json({
                success: false,
                message: "Verification details are required."
            });
        }

        // GET VERIFICATION RECORD
        connection = await db.getConnection();
        await connection.beginTransaction();
        transactionStarted = true;

        const [rows] = await connection.execute(
            `
            SELECT *
            FROM login_verifications
            WHERE id = ?
              AND user_id = ?
              AND login_history_id = ?
            LIMIT 1
            FOR UPDATE
            `,
            [verification_id, user_id, login_history_id]
        );

        if (rows.length === 0) {
            await connection.rollback();
            transactionStarted = false;
            connection.release();
            connection = null;

            return res.status(400).json({
                success: false,
                message: "Invalid verification request."
            });
        }

        const verification = rows[0];

        // ALREADY VERIFIED
        if (verification.status === "verified") {
            await connection.rollback();
            transactionStarted = false;
            connection.release();
            connection = null;

            return res.status(400).json({
                success: false,
                message: "This OTP has already been verified."
            });
        }

        // BLOCKED / FAILED
        if (
            verification.status === "blocked" ||
            verification.status === "failed"
        ) {
            await connection.rollback();
            transactionStarted = false;
            connection.release();
            connection = null;

            return res.status(403).json({
                success: false,
                message: "Too many failed OTP attempts. Please request a new OTP."
            });
        }

        // CHECK EXPIRATION
        if (
            new Date(verification.expires_at).getTime() <= Date.now()
        ) {
            await connection.execute(
                `
                UPDATE login_verifications
                SET status = 'expired'
                WHERE id = ?
                `,
                [verification_id]
            );

            await connection.commit();
            transactionStarted = false;
            connection.release();
            connection = null;

            return res.status(400).json({
                success: false,
                message: "OTP has expired. Please request a new OTP."
            });
        }

        // CHECK MAXIMUM ATTEMPTS
        if (verification.attempts >= verification.max_attempts) {
            await connection.execute(
                `
                UPDATE login_verifications
                SET status = 'blocked'
                WHERE id = ?
                `,
                [verification_id]
            );

            await connection.commit();
            transactionStarted = false;
            connection.release();
            connection = null;

            return res.status(403).json({
                success: false,
                message: "Maximum OTP attempts exceeded. Please request a new OTP."
            });
        }

        // VERIFY OTP HASH
        const enteredOtpHash = hashOTP(String(otp).trim());

        if (enteredOtpHash !== verification.otp_hash) {
            const newAttempts = verification.attempts + 1;

            const newStatus =
                newAttempts >= verification.max_attempts
                    ? "blocked"
                    : "pending";

            await connection.execute(
                `
                UPDATE login_verifications
                SET
                    attempts = ?,
                    status = ?
                WHERE id = ?
                `,
                [newAttempts, newStatus, verification_id]
            );

            await connection.commit();
            transactionStarted = false;
            connection.release();
            connection = null;

            if (newStatus === "blocked") {
                return res.status(403).json({
                    success: false,
                    message: "Maximum OTP attempts exceeded. Please request a new OTP."
                });
            }

            return res.status(400).json({
                success: false,
                message: `Invalid OTP. ${verification.max_attempts - newAttempts} attempts remaining.`
            });
        }

        // =====================================================
        // OTP SUCCESS
        // =====================================================

        // MARK OTP VERIFIED
        await connection.execute(
            `
            UPDATE login_verifications
            SET
                status = 'verified',
                verified_at = NOW()
            WHERE id = ?
            `,
            [verification_id]
        );

        // UPDATE LOGIN HISTORY
        await connection.execute(
            `
            UPDATE login_history
            SET
                login_status = 'success',
                otp_required = 1,
                otp_verified = 1
            WHERE id = ?
              AND user_id = ?
            `,
            [login_history_id, user_id]
        );

        await connection.commit();
        transactionStarted = false;
        connection.release();
        connection = null;

        // MARK DEVICE AS TRUSTED
        try {
            await markDeviceAsTrusted({
                userId: user_id,
                loginHistoryId: login_history_id
            });

            console.log("Trusted device saved successfully.");

        } catch (trustedDeviceError) {
            console.error(
                "TRUSTED DEVICE SAVE ERROR:",
                trustedDeviceError
            );

            // Login continues even if trusted-device saving fails.
        }

        // GET USER DETAILS
        const [users] = await db.execute(
            `
            SELECT
                id,
                name,
                email,
                mobile,
                preferred_language,
                must_change_password
            FROM users
            WHERE id = ?
            LIMIT 1
            `,
            [user_id]
        );

        if (users.length === 0) {
            return res.status(404).json({
                success: false,
                message: "User not found."
            });
        }

        const user = users[0];

        // CREATE JWT
        const token = jwt.sign(
            {
                id: user.id,
                email: user.email
            },
            process.env.JWT_SECRET,
            {
                expiresIn: "1d"
            }
        );

        // CREATE USER SESSION
        let sessionId = null;

        try {
            const [loginHistoryRows] = await db.execute(
                `
                SELECT
                    browser_name,
                    browser_version,
                    operating_system,
                    os_version,
                    device_type,
                    device_model,
                    ip_address
                FROM login_history
                WHERE id = ?
                  AND user_id = ?
                LIMIT 1
                `,
                [login_history_id, user_id]
            );

            if (loginHistoryRows.length > 0) {
                const loginEnvironment = loginHistoryRows[0];

                sessionId = await createUserSession({
                    userId: user.id,
                    token,
                    loginEnvironment
                });

                console.log("OTP login session created:", sessionId);
            }

        } catch (sessionError) {
            console.error(
                "OTP USER SESSION CREATE ERROR:",
                sessionError
            );

            throw sessionError;
        }

        // LOGIN SUCCESS RESPONSE
        return res.status(200).json({
            success: true,
            message: "Login OTP verified successfully.",
            token,
            login_history_id,
            session_id: sessionId,
            must_change_password: user.must_change_password === 1,

            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                mobile: user.mobile || null,
                preferred_language: user.preferred_language || "en"
            }
        });

    } catch (error) {
        if (connection) {
            if (transactionStarted) {
                await connection.rollback().catch(() => { });
            }

            connection.release();
        }

        console.error("VERIFY LOGIN OTP ERROR:", error);

        return res.status(500).json({
            success: false,
            message: "Unable to verify login OTP."
        });
    }
};

// =========================================================
// EXPORT
// =========================================================

module.exports = {
    requestLoginOTP,
    verifyLoginOTP
};
