const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const db = require("../config/db");
const { getLoginEnvironment } = require("../utils/loginEnvironment");
const {
  checkTrustedDevice,
  saveLoginHistory,
} = require("../utils/loginSecurity");
const { createUserSession } = require("../utils/sessionSecurity");

// =========================
// REGISTER
// =========================

const register = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        message: "Name, email and password are required",
      });
    }

    // Check existing user
    const [existingUsers] = await db.query(
      "SELECT id FROM users WHERE email = ?",
      [email],
    );

    if (existingUsers.length > 0) {
      return res.status(409).json({
        message: "Email already registered",
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const [result] = await db.query(
      `INSERT INTO users
            (name, email, password, preferred_language)
            VALUES (?, ?, ?, ?)`,
      [name, email, hashedPassword, "en"],
    );

    return res.status(201).json({
      message: "Registration successful",
      userId: result.insertId,
    });
  } catch (error) {
    console.error("Registration error:", error);

    return res.status(500).json({
      message: "Registration failed",
    });
  }
};

// =========================
// LOGIN
// =========================

const login = async (req, res) => {
  try {
    // =====================================================
    // TASK 5 : LOGIN ENVIRONMENT DETECTION
    // =====================================================

    const loginEnvironment = getLoginEnvironment(req);

    console.log("Login Environment:", loginEnvironment);

    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        message: "Email and password are required",
      });
    }

    // =====================================================
    // FIND USER
    // =====================================================

    const [users] = await db.query("SELECT * FROM users WHERE email = ?", [
      email,
    ]);

    if (users.length === 0) {
      return res.status(401).json({
        message: "Invalid email or password",
      });
    }

    const user = users[0];

    // =====================================================
    // COMPARE PASSWORD
    // =====================================================

    const passwordMatch = await bcrypt.compare(password, user.password);

    if (!passwordMatch) {
      return res.status(401).json({
        message: "Invalid email or password",
      });
    }

    // =====================================================
    // CHECK LOGIN ENVIRONMENT
    // =====================================================

    const loginSecurity = await checkTrustedDevice(user.id, loginEnvironment);

    const { isNewDevice, isNewBrowser, isNewIp } = loginSecurity;

    console.log("Login Security Check:", {
      isNewDevice,
      isNewBrowser,
      isNewIp,
    });

    // =====================================================
    // CHROME OTP REQUIREMENT
    // =====================================================

    const browserName = String(
      loginEnvironment.browserName || "",
    ).toLowerCase();

    const requiresChromeOTP = browserName.includes("chrome");

    // =====================================================
    // NEW ENVIRONMENT OTP REQUIREMENT
    // =====================================================

    const requiresEnvironmentOTP = isNewDevice || isNewBrowser || isNewIp;

    const requiresOTP = requiresChromeOTP || requiresEnvironmentOTP;

    console.log("OTP Requirement:", {
      browser: loginEnvironment.browserName,

      requiresChromeOTP,

      requiresEnvironmentOTP,

      requiresOTP,
    });

    // =====================================================
    // MOBILE LOGIN TIME RESTRICTION
    // 10:00 AM - 1:00 PM IST
    // =====================================================

    if (loginEnvironment.deviceType === "mobile") {
      const currentTime = new Intl.DateTimeFormat("en-IN", {
        timeZone: "Asia/Kolkata",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      }).format(new Date());

      const [currentHour, currentMinute] = currentTime.split(":").map(Number);

      const currentMinutes = currentHour * 60 + currentMinute;

      const allowedStart = 10 * 60;

      const allowedEnd = 13 * 60;

      if (currentMinutes < allowedStart || currentMinutes >= allowedEnd) {
        // Save blocked mobile login
        try {
          await saveLoginHistory({
            userId: user.id,

            loginEnvironment,

            loginStatus: "blocked",

            failureReason: "Mobile login attempted outside allowed time.",

            otpRequired: 0,
            otpVerified: 0,

            isNewBrowser: isNewBrowser ? 1 : 0,

            isNewDevice: isNewDevice ? 1 : 0,

            isNewIp: isNewIp ? 1 : 0,
          });
        } catch (historyError) {
          console.error("Blocked login history error:", historyError);
        }

        return res.status(403).json({
          success: false,

          code: "MOBILE_LOGIN_TIME_RESTRICTED",

          message:
            "Mobile login is allowed only between 10:00 AM and 1:00 PM IST.",
        });
      }
    }

    // =====================================================
    // SAVE LOGIN HISTORY
    // =====================================================

    let loginHistoryId = null;

    try {
      loginHistoryId = await saveLoginHistory({
        userId: user.id,

        loginEnvironment,

        loginStatus: requiresOTP ? "otp_required" : "success",

        otpRequired: requiresOTP ? 1 : 0,

        otpVerified: 0,

        isNewBrowser: isNewBrowser ? 1 : 0,

        isNewDevice: isNewDevice ? 1 : 0,

        isNewIp: isNewIp ? 1 : 0,
      });

      console.log("Login history saved:", loginHistoryId);
    } catch (historyError) {
      console.error("Login history save error:", historyError);
    }

    // =====================================================
    // OTP REQUIRED
    // =====================================================

    if (requiresOTP) {
      return res.status(200).json({
        success: true,

        requires_verification: true,

        user_id: user.id,

        login_history_id: loginHistoryId,

        verification_reason: {
          chrome: requiresChromeOTP,

          new_device: isNewDevice,

          new_browser: isNewBrowser,

          new_ip: isNewIp,
        },

        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          mobile: user.mobile || null,
          preferred_language: user.preferred_language || "en",
        },
      });
    }

    // =====================================================
    // CREATE JWT
    // =====================================================

    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
      },
      process.env.JWT_SECRET,
      {
        expiresIn: "1d",
      },
    );

    let sessionId = null;

    try {
      sessionId = await createUserSession({
        userId: user.id,
        token,
        loginEnvironment,
      });

      console.log("User session created:", sessionId);
    } catch (sessionError) {
      console.error("USER SESSION CREATE ERROR:", sessionError);
      throw sessionError;
    }

    // =====================================================
    // LOGIN SUCCESS
    // =====================================================

    return res.status(200).json({
      message: "Login successful",

      token,

      login_history_id: loginHistoryId,

      session_id: sessionId,

      login_environment: {
        browser_name: loginEnvironment.browserName,

        browser_version: loginEnvironment.browserVersion,

        operating_system: loginEnvironment.operatingSystem,

        os_version: loginEnvironment.osVersion,

        device_type: loginEnvironment.deviceType,

        device_model: loginEnvironment.deviceModel,

        ip_address: loginEnvironment.ipAddress,
      },

      must_change_password: user.must_change_password === 1,

      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        mobile: user.mobile || null,
        preferred_language: user.preferred_language || "en",
      },
    });
  } catch (error) {
    console.error("Login error:", error);

    return res.status(500).json({
      message: "Login failed",
    });
  }
};

// ==========================================
// CHANGE PASSWORD
// ==========================================

const changePassword = async (req, res) => {
  try {
    const userId = req.user.id;

    const { currentPassword, newPassword, confirmPassword } = req.body;

    // Validate fields
    if (!currentPassword || !newPassword || !confirmPassword) {
      return res.status(400).json({
        success: false,
        message: "All password fields are required.",
      });
    }

    // Check new password confirmation
    if (newPassword !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: "New passwords do not match.",
      });
    }

    // Password length validation
    if (newPassword.length < 8) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 8 characters long.",
      });
    }

    // Get logged-in user
    const [users] = await db.query(
      `SELECT id, password, must_change_password
             FROM users
             WHERE id = ?
             LIMIT 1`,
      [userId],
    );

    if (users.length === 0) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

    const user = users[0];

    // Verify current password
    const passwordMatch = await bcrypt.compare(currentPassword, user.password);

    if (!passwordMatch) {
      return res.status(401).json({
        success: false,
        message: "Current password is incorrect.",
      });
    }

    // Prevent using the same password
    const samePassword = await bcrypt.compare(newPassword, user.password);

    if (samePassword) {
      return res.status(400).json({
        success: false,
        message: "New password must be different from the current password.",
      });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 12);

    // Update password and reset mandatory flag
    await db.query(
      `UPDATE users
             SET password = ?,
                 must_change_password = 0
             WHERE id = ?`,
      [hashedPassword, userId],
    );

    return res.status(200).json({
      success: true,
      message: "Password changed successfully.",
    });
  } catch (error) {
    console.error("Change Password Error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to change password.",
    });
  }
};

module.exports = {
  register,
  login,
  changePassword,
};
