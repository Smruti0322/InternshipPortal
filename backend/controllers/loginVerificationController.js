const crypto = require("crypto");
const nodemailer = require("nodemailer");
const jwt = require("jsonwebtoken");
const db = require("../config/db");

const {
    createUserSession
} = require("../utils/sessionSecurity");

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
// GENERATE OTP
// =========================================================

const generateOTP = () => {
    return Math.floor(
        100000 + Math.random() * 900000
    ).toString();
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
        [
            loginHistoryId,
            userId
        ]
    );

    if (historyRows.length === 0) {
        throw new Error(
            "Login history not found while marking trusted device."
        );
    }

    const history = historyRows[0];

    const deviceIdentifier =
        createDeviceIdentifier({
            browserName:
                history.browser_name,

            browserVersion:
                history.browser_version,

            operatingSystem:
                history.operating_system,

            osVersion:
                history.os_version,

            deviceType:
                history.device_type,

            deviceModel:
                history.device_model
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
            NOW(),
            1
        )
        ON DUPLICATE KEY UPDATE
            browser_name = VALUES(browser_name),
            browser_version = VALUES(browser_version),
            operating_system = VALUES(operating_system),
            os_version = VALUES(os_version),
            device_type = VALUES(device_type),
            device_model = VALUES(device_model),
            last_ip_address = VALUES(last_ip_address),
            last_seen_at = NOW(),
            trusted_at = COALESCE(
                trusted_at,
                NOW()
            ),
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

    try {

        const {
            user_id,
            login_history_id
        } = req.body;

        // -----------------------------------------------------
        // VALIDATION
        // -----------------------------------------------------

        if (!user_id || !login_history_id) {

            return res.status(400).json({
                success: false,
                message:
                    "User ID and login history ID are required."
            });
        }

        // -----------------------------------------------------
        // FIND USER
        // -----------------------------------------------------

        const [users] = await db.execute(
            `
            SELECT
                id,
                name,
                email
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

        // -----------------------------------------------------
        // VERIFY LOGIN HISTORY
        // -----------------------------------------------------

        const [history] = await db.execute(
            `
            SELECT
                id,
                login_status
            FROM login_history
            WHERE id = ?
              AND user_id = ?
            LIMIT 1
            `,
            [
                login_history_id,
                user_id
            ]
        );

        if (history.length === 0) {

            return res.status(400).json({
                success: false,
                message:
                    "Invalid login verification request."
            });
        }

        // -----------------------------------------------------
        // EXPIRE PREVIOUS PENDING OTPs
        // -----------------------------------------------------

        await db.execute(
            `
            UPDATE login_verifications
            SET status = 'expired'
            WHERE user_id = ?
              AND login_history_id = ?
              AND status = 'pending'
            `,
            [
                user_id,
                login_history_id
            ]
        );

        // -----------------------------------------------------
        // GENERATE OTP
        // -----------------------------------------------------

        const otp = generateOTP();

        const otpHash = hashOTP(otp);

        const expiresAt =
            new Date(
                Date.now() + 10 * 60 * 1000
            );

        // -----------------------------------------------------
        // STORE OTP HASH
        // -----------------------------------------------------

        const [result] = await db.execute(
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
            VALUES
            (
                ?,
                ?,
                'login_otp',
                ?,
                ?,
                0,
                5,
                'pending',
                NOW()
            )
            `,
            [
                user_id,
                login_history_id,
                otpHash,
                expiresAt
            ]
        );

        // -----------------------------------------------------
        // SEND OTP EMAIL
        // -----------------------------------------------------

        await transporter.sendMail({

            from: process.env.SMTP_USER,

            to: user.email,

            subject:
                "Internship Portal - Login Verification OTP",

            html: `
                <div
                    style="
                        font-family: Arial, sans-serif;
                        padding: 20px;
                        line-height: 1.6;
                    "
                >

                    <h2>
                        Login Verification
                    </h2>

                    <p>
                        Hello ${user.name || "User"},
                    </p>

                    <p>
                        A login attempt was made on your
                        Internship Portal account.
                    </p>

                    <p>
                        Your verification OTP is:
                    </p>

                    <h1
                        style="
                            letter-spacing: 8px;
                            font-size: 32px;
                        "
                    >
                        ${otp}
                    </h1>

                    <p>
                        This OTP is valid for
                        <strong>10 minutes</strong>.
                    </p>

                    <p>
                        You have a maximum of
                        <strong>5 verification attempts</strong>.
                    </p>

                    <p>
                        If you did not attempt to login,
                        please secure your account immediately.
                    </p>

                </div>
            `
        });

        // -----------------------------------------------------
        // UPDATE LOGIN HISTORY
        // -----------------------------------------------------

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
            [
                login_history_id,
                user_id
            ]
        );

        return res.status(200).json({

            success: true,

            message:
                "Login verification OTP sent successfully.",

            verification_id:
                result.insertId
        });

    } catch (error) {

        console.error(
            "REQUEST LOGIN OTP ERROR:",
            error
        );

        return res.status(500).json({

            success: false,

            message:
                "Unable to send login verification OTP."
        });
    }
};

// =========================================================
// VERIFY LOGIN OTP
// POST /api/auth/login/verify-otp
// =========================================================

const verifyLoginOTP = async (req, res) => {

    try {

        const {
            user_id,
            login_history_id,
            verification_id,
            otp
        } = req.body;

        // -----------------------------------------------------
        // VALIDATION
        // -----------------------------------------------------

        if (
            !user_id ||
            !login_history_id ||
            !verification_id ||
            !otp
        ) {

            return res.status(400).json({
                success: false,

                message:
                    "Verification details are required."
            });
        }

        // -----------------------------------------------------
        // GET VERIFICATION
        // -----------------------------------------------------

        const [rows] = await db.execute(
            `
            SELECT *
            FROM login_verifications
            WHERE id = ?
              AND user_id = ?
              AND login_history_id = ?
            LIMIT 1
            `,
            [
                verification_id,
                user_id,
                login_history_id
            ]
        );

        if (rows.length === 0) {

            return res.status(400).json({
                success: false,

                message:
                    "Invalid verification request."
            });
        }

        const verification = rows[0];

        // -----------------------------------------------------
        // ALREADY VERIFIED
        // -----------------------------------------------------

        if (
            verification.status === "verified"
        ) {

            return res.status(400).json({
                success: false,

                message:
                    "This OTP has already been verified."
            });
        }

        // -----------------------------------------------------
        // BLOCKED / FAILED
        // -----------------------------------------------------

        if (
            verification.status === "blocked" ||
            verification.status === "failed"
        ) {

            return res.status(403).json({
                success: false,

                message:
                    "Too many failed OTP attempts. Please request a new OTP."
            });
        }

        // -----------------------------------------------------
        // CHECK EXPIRATION
        // -----------------------------------------------------

        if (
            new Date(
                verification.expires_at
            ).getTime() < Date.now()
        ) {

            await db.execute(
                `
                UPDATE login_verifications
                SET status = 'expired'
                WHERE id = ?
                `,
                [verification_id]
            );

            return res.status(400).json({
                success: false,

                message:
                    "OTP has expired. Please request a new OTP."
            });
        }

        // -----------------------------------------------------
        // CHECK MAX ATTEMPTS
        // -----------------------------------------------------

        if (
            verification.attempts >=
            verification.max_attempts
        ) {

            await db.execute(
                `
                UPDATE login_verifications
                SET status = 'blocked'
                WHERE id = ?
                `,
                [verification_id]
            );

            return res.status(403).json({
                success: false,

                message:
                    "Maximum OTP attempts exceeded. Please request a new OTP."
            });
        }

        // -----------------------------------------------------
        // VERIFY OTP
        // -----------------------------------------------------

        const enteredOtpHash =
            hashOTP(
                String(otp).trim()
            );

        if (
            enteredOtpHash !==
            verification.otp_hash
        ) {

            const newAttempts =
                verification.attempts + 1;

            const newStatus =
                newAttempts >=
                    verification.max_attempts
                    ? "blocked"
                    : "pending";

            await db.execute(
                `
                UPDATE login_verifications
                SET
                    attempts = ?,
                    status = ?
                WHERE id = ?
                `,
                [
                    newAttempts,
                    newStatus,
                    verification_id
                ]
            );

            if (
                newStatus === "blocked"
            ) {

                return res.status(403).json({
                    success: false,

                    message:
                        "Maximum OTP attempts exceeded. Please request a new OTP."
                });
            }

            return res.status(400).json({
                success: false,

                message:
                    `Invalid OTP. ${verification.max_attempts -
                    newAttempts
                    } attempts remaining.`
            });
        }

        // =====================================================
        // OTP SUCCESS
        // =====================================================

        // -----------------------------------------------------
        // MARK OTP VERIFIED
        // -----------------------------------------------------

        await db.execute(
            `
            UPDATE login_verifications
            SET
                status = 'verified',
                verified_at = NOW()
            WHERE id = ?
            `,
            [verification_id]
        );

        // -----------------------------------------------------
        // UPDATE LOGIN HISTORY
        // -----------------------------------------------------

        await db.execute(
            `
            UPDATE login_history
            SET
                login_status = 'success',
                otp_required = 1,
                otp_verified = 1
            WHERE id = ?
              AND user_id = ?
            `,
            [
                login_history_id,
                user_id
            ]
        );

        // -----------------------------------------------------
        // MARK DEVICE AS TRUSTED
        // -----------------------------------------------------

        try {

            await markDeviceAsTrusted({
                userId: user_id,

                loginHistoryId:
                    login_history_id
            });

            console.log(
                "Trusted device saved successfully."
            );

        } catch (trustedDeviceError) {

            console.error(
                "TRUSTED DEVICE SAVE ERROR:",
                trustedDeviceError
            );

            // Login should still continue.
        }

        // -----------------------------------------------------
        // GET USER
        // -----------------------------------------------------

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

                message:
                    "User not found."
            });
        }

        const user = users[0];

        // -----------------------------------------------------
        // CREATE JWT
        // -----------------------------------------------------

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

        // -----------------------------------------------------
        // CREATE USER SESSION
        // IMPORTANT: THIS MUST BE INSIDE verifyLoginOTP
        // -----------------------------------------------------

        let sessionId = null;

        try {

            const [loginHistoryRows] =
                await db.execute(
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
                    [
                        login_history_id,
                        user_id
                    ]
                );

            if (
                loginHistoryRows.length > 0
            ) {

                const loginEnvironment =
                    loginHistoryRows[0];

                sessionId =
                    await createUserSession({
                        userId: user.id,

                        token,

                        loginEnvironment
                    });

                console.log(
                    "OTP login session created:",
                    sessionId
                );
            }

        } catch (sessionError) {

            console.error(
                "OTP USER SESSION CREATE ERROR:",
                sessionError
            );

            // Login should continue even if
            // session logging fails.
        }

        // -----------------------------------------------------
        // LOGIN SUCCESS RESPONSE
        // -----------------------------------------------------

        return res.status(200).json({

            success: true,

            message:
                "Login OTP verified successfully.",

            token,

            login_history_id:
                login_history_id,

            session_id:
                sessionId,

            must_change_password:
                user.must_change_password === 1,

            user: {

                id: user.id,

                name: user.name,

                email: user.email,

                mobile:
                    user.mobile || null,

                preferred_language:
                    user.preferred_language ||
                    "en"
            }
        });

    } catch (error) {

        console.error(
            "VERIFY LOGIN OTP ERROR:",
            error
        );

        return res.status(500).json({

            success: false,

            message:
                "Unable to verify login OTP."
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