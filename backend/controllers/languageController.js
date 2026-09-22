const db = require("../config/db");
const nodemailer = require("nodemailer");
const crypto = require("crypto");

const supportedLanguages = [
    "en",
    "es",
    "hi",
    "pt",
    "zh",
    "fr",
];

/*
=========================================================
OTP EMAIL TRANSLATIONS
=========================================================
*/

const otpEmailTranslations = {
    en: {
        subject: "French Language Verification OTP",
        title: "French Language Verification",
        hello: "Hello",
        request:
            "You requested to change your language preference to French.",
        otpText: "Your verification OTP is:",
        expiry: "This OTP will expire in 5 minutes.",
        ignore:
            "If you did not request this change, please ignore this email.",
        regards: "Regards",
        team: "Internship Portal Team",
    },

    es: {
        subject: "OTP de verificación de idioma francés",
        title: "Verificación del idioma francés",
        hello: "Hola",
        request:
            "Solicitaste cambiar tu preferencia de idioma a francés.",
        otpText: "Tu código OTP de verificación es:",
        expiry: "Este OTP caducará en 5 minutos.",
        ignore:
            "Si no solicitaste este cambio, puedes ignorar este correo.",
        regards: "Saludos",
        team: "Equipo de Internship Portal",
    },

    hi: {
        subject: "फ्रेंच भाषा सत्यापन OTP",
        title: "फ्रेंच भाषा सत्यापन",
        hello: "नमस्ते",
        request:
            "आपने अपनी भाषा की प्राथमिकता फ्रेंच में बदलने का अनुरोध किया है।",
        otpText: "आपका सत्यापन OTP है:",
        expiry: "यह OTP 5 मिनट में समाप्त हो जाएगा।",
        ignore:
            "यदि आपने यह अनुरोध नहीं किया है, तो इस ईमेल को अनदेखा करें।",
        regards: "सादर",
        team: "Internship Portal टीम",
    },

    pt: {
        subject: "OTP de verificação do idioma francês",
        title: "Verificação do idioma francês",
        hello: "Olá",
        request:
            "Você solicitou alterar sua preferência de idioma para francês.",
        otpText: "Seu OTP de verificação é:",
        expiry: "Este OTP expirará em 5 minutos.",
        ignore:
            "Se você não solicitou esta alteração, ignore este e-mail.",
        regards: "Atenciosamente",
        team: "Equipe do Internship Portal",
    },

    zh: {
        subject: "法语语言验证 OTP",
        title: "法语语言验证",
        hello: "您好",
        request: "您请求将语言偏好更改为法语。",
        otpText: "您的验证码是：",
        expiry: "此验证码将在 5 分钟后失效。",
        ignore:
            "如果您没有请求此更改，请忽略此邮件。",
        regards: "此致",
        team: "Internship Portal 团队",
    },

    fr: {
        subject:
            "Code OTP de vérification de la langue française",
        title: "Vérification de la langue française",
        hello: "Bonjour",
        request:
            "Vous avez demandé de modifier votre préférence de langue en français.",
        otpText:
            "Votre code OTP de vérification est :",
        expiry:
            "Ce code OTP expirera dans 5 minutes.",
        ignore:
            "Si vous n'avez pas demandé cette modification, veuillez ignorer cet e-mail.",
        regards: "Cordialement",
        team: "Équipe Internship Portal",
    },
};

/*
=========================================================
GET USER LANGUAGE
=========================================================
*/

const getUserLanguage = async (userId) => {
    const [rows] = await db.query(
        "SELECT preferred_language FROM users WHERE id = ?",
        [userId]
    );

    if (rows.length === 0) {
        return "en";
    }

    const language = rows[0].preferred_language;

    return supportedLanguages.includes(language)
        ? language
        : "en";
};

/*
=========================================================
GET CURRENT USER LANGUAGE
=========================================================
*/

const getLanguage = async (req, res) => {
    try {
        const userId = req.user.id;

        const [rows] = await db.query(
            "SELECT preferred_language FROM users WHERE id = ?",
            [userId]
        );

        if (rows.length === 0) {
            return res.status(404).json({
                message: "User not found.",
            });
        }

        return res.status(200).json({
            language:
                rows[0].preferred_language || "en",
        });
    } catch (error) {
        console.error(
            "Get language error:",
            error
        );

        return res.status(500).json({
            message:
                "Failed to get language preference.",
        });
    }
};

/*
=========================================================
CHANGE LANGUAGE
=========================================================
*/

const changeLanguage = async (req, res) => {
    try {
        const userId = req.user.id;
        const { language } = req.body;

        if (!language) {
            return res.status(400).json({
                message: "Language is required.",
            });
        }

        if (!supportedLanguages.includes(language)) {
            return res.status(400).json({
                message: "Unsupported language.",
            });
        }

        // French requires OTP verification
        if (language === "fr") {
            return res.status(403).json({
                message:
                    "French language requires email OTP verification.",
                requiresOtp: true,
            });
        }

        const [userRows] = await db.query(
            "SELECT preferred_language FROM users WHERE id = ?",
            [userId]
        );

        if (userRows.length === 0) {
            return res.status(404).json({
                message: "User not found.",
            });
        }

        const oldLanguage =
            userRows[0].preferred_language || "en";

        if (oldLanguage === language) {
            return res.status(200).json({
                message: "Language is already selected.",
                language,
            });
        }

        const [result] = await db.query(
            "UPDATE users SET preferred_language = ? WHERE id = ?",
            [language, userId]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({
                message: "User not found.",
            });
        }

        const userAgent =
            req.headers["user-agent"] || "Unknown";

        const ipAddress =
            req.headers["x-forwarded-for"]
                ?.split(",")[0]
                ?.trim() ||
            req.socket.remoteAddress ||
            "Unknown";

        const browser = userAgent;
        const device = userAgent;

        await db.query(
            `INSERT INTO language_change_history
            (user_id, old_language, new_language, ip_address, browser, device)
            VALUES (?, ?, ?, ?, ?, ?)`,
            [
                userId,
                oldLanguage,
                language,
                ipAddress,
                browser,
                device,
            ]
        );

        return res.status(200).json({
            message:
                "Language preference updated successfully.",
            language,
        });
    } catch (error) {
        console.error(
            "Change language error:",
            error
        );

        return res.status(500).json({
            message:
                "Failed to update language preference.",
        });
    }
};

/*
=========================================================
REQUEST / RESEND FRENCH OTP
=========================================================
*/

const requestFrenchOtp = async (req, res) => {
    try {
        const userId = req.user.id;

        const [users] = await db.query(
            `SELECT name, email, preferred_language
             FROM users
             WHERE id = ?`,
            [userId]
        );

        if (users.length === 0) {
            return res.status(404).json({
                message: "User not found.",
            });
        }

        const user = users[0];

        /*
        ---------------------------------------------
        60 SECOND RESEND COOLDOWN
        ---------------------------------------------
        */

        const [recentOtps] = await db.query(
            `SELECT created_at
             FROM language_otps
             WHERE user_id = ?
             ORDER BY created_at DESC
             LIMIT 1`,
            [userId]
        );

        if (recentOtps.length > 0) {
            const createdAt = new Date(
                recentOtps[0].created_at
            );

            const elapsedSeconds =
                Math.floor(
                    (Date.now() - createdAt.getTime()) /
                    1000
                );

            if (elapsedSeconds < 60) {
                const remainingSeconds =
                    60 - elapsedSeconds;

                return res.status(429).json({
                    message:
                        `Please wait ${remainingSeconds} seconds before requesting another OTP.`,
                    cooldown: true,
                    remainingSeconds,
                });
            }
        }

        /*
        ---------------------------------------------
        GENERATE NEW OTP
        ---------------------------------------------
        */

        const otp = crypto
            .randomInt(100000, 1000000)
            .toString();

        const expiresAt = new Date(
            Date.now() + 5 * 60 * 1000
        );

        /*
        ---------------------------------------------
        DELETE PREVIOUS OTP
        ---------------------------------------------
        */

        await db.query(
            "DELETE FROM language_otps WHERE user_id = ?",
            [userId]
        );

        /*
        ---------------------------------------------
        SAVE NEW OTP
        ---------------------------------------------
        */

        await db.query(
            `INSERT INTO language_otps
            (user_id, otp, expires_at)
            VALUES (?, ?, ?)`,
            [
                userId,
                otp,
                expiresAt,
            ]
        );

        /*
        ---------------------------------------------
        EMAIL LANGUAGE
        ---------------------------------------------
        */

        const currentLanguage =
            supportedLanguages.includes(
                user.preferred_language
            )
                ? user.preferred_language
                : "en";

        const emailText =
            otpEmailTranslations[currentLanguage];

        /*
        ---------------------------------------------
        SMTP
        ---------------------------------------------
        */

        const transporter =
            nodemailer.createTransport({
                host: process.env.SMTP_HOST,
                port: Number(
                    process.env.SMTP_PORT
                ),
                secure: false,
                auth: {
                    user: process.env.SMTP_USER,
                    pass: process.env.SMTP_PASS,
                },
            });

        /*
        ---------------------------------------------
        SEND EMAIL
        ---------------------------------------------
        */

        await transporter.sendMail({
            from:
                `"Internship Portal" <${process.env.SMTP_USER}>`,
            to: user.email,
            subject: emailText.subject,

            html: `
                <div style="
                    font-family: Arial, sans-serif;
                    max-width: 600px;
                    margin: auto;
                    padding: 20px;
                    line-height: 1.6;
                ">

                    <h2>
                        ${emailText.title}
                    </h2>

                    <p>
                        ${emailText.hello} ${user.name},
                    </p>

                    <p>
                        ${emailText.request}
                    </p>

                    <p>
                        ${emailText.otpText}
                    </p>

                    <h1 style="
                        letter-spacing: 8px;
                        text-align: center;
                    ">
                        ${otp}
                    </h1>

                    <p>
                        ${emailText.expiry}
                    </p>

                    <p>
                        ${emailText.ignore}
                    </p>

                    <p>
                        ${emailText.regards},
                        <br />
                        ${emailText.team}
                    </p>

                </div>
            `,
        });

        return res.status(200).json({
            message:
                "OTP sent successfully to your registered email.",
            cooldown: true,
            cooldownSeconds: 60,
        });

    } catch (error) {
        console.error(
            "Request French OTP error:",
            error
        );

        return res.status(500).json({
            message: "Failed to send OTP.",
        });
    }
};

/*
=========================================================
VERIFY FRENCH OTP
=========================================================
*/

const verifyFrenchOtp = async (req, res) => {
    try {
        const userId = req.user.id;
        const { otp } = req.body;

        if (!otp) {
            return res.status(400).json({
                message: "OTP is required.",
            });
        }

        const [rows] = await db.query(
            `SELECT *
             FROM language_otps
             WHERE user_id = ?
             ORDER BY created_at DESC
             LIMIT 1`,
            [userId]
        );

        if (rows.length === 0) {
            return res.status(400).json({
                message:
                    "No OTP found. Please request a new OTP.",
            });
        }

        const otpRecord = rows[0];

        /*
        ---------------------------------------------
        OTP EXPIRY
        ---------------------------------------------
        */

        if (
            new Date() >
            new Date(otpRecord.expires_at)
        ) {
            return res.status(400).json({
                message:
                    "OTP has expired. Please request a new OTP.",
            });
        }

        /*
        ---------------------------------------------
        MAX ATTEMPTS
        ---------------------------------------------
        */

        if (otpRecord.attempts >= 5) {
            return res.status(429).json({
                message:
                    "Too many invalid attempts. Please request a new OTP.",
            });
        }

        /*
        ---------------------------------------------
        INVALID OTP
        ---------------------------------------------
        */

        if (otp !== otpRecord.otp) {
            await db.query(
                `UPDATE language_otps
                 SET attempts = attempts + 1
                 WHERE id = ?`,
                [otpRecord.id]
            );

            return res.status(400).json({
                message: "Invalid OTP.",
            });
        }

        /*
        ---------------------------------------------
        VERIFY OTP
        ---------------------------------------------
        */

        await db.query(
            `UPDATE language_otps
             SET verified = TRUE
             WHERE id = ?`,
            [otpRecord.id]
        );

        /*
        ---------------------------------------------
        GET OLD LANGUAGE
        ---------------------------------------------
        */

        const [users] = await db.query(
            `SELECT preferred_language
             FROM users
             WHERE id = ?`,
            [userId]
        );

        if (users.length === 0) {
            return res.status(404).json({
                message: "User not found.",
            });
        }

        const oldLanguage =
            users[0].preferred_language || "en";

        /*
        ---------------------------------------------
        CHANGE TO FRENCH
        ---------------------------------------------
        */

        await db.query(
            `UPDATE users
             SET preferred_language = 'fr'
             WHERE id = ?`,
            [userId]
        );

        /*
        ---------------------------------------------
        AUDIT INFORMATION
        ---------------------------------------------
        */

        const userAgent =
            req.headers["user-agent"] || "Unknown";

        const ipAddress =
            req.headers["x-forwarded-for"]
                ?.split(",")[0]
                ?.trim() ||
            req.socket.remoteAddress ||
            "Unknown";

        await db.query(
            `INSERT INTO language_change_history
            (user_id, old_language, new_language, ip_address, browser, device)
            VALUES (?, ?, ?, ?, ?, ?)`,
            [
                userId,
                oldLanguage,
                "fr",
                ipAddress,
                userAgent,
                userAgent,
            ]
        );

        /*
        ---------------------------------------------
        SUCCESS
        ---------------------------------------------
        */

        return res.status(200).json({
            message:
                "French language verified successfully.",
            language: "fr",
        });

    } catch (error) {
        console.error(
            "Verify French OTP error:",
            error
        );

        return res.status(500).json({
            message: "Failed to verify OTP.",
        });
    }
};

module.exports = {
    getLanguage,
    changeLanguage,
    requestFrenchOtp,
    verifyFrenchOtp,
};