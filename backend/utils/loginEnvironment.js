const UAParser = require("ua-parser-js");
const crypto = require("crypto");

// =========================================================
// GET CLIENT IP
// =========================================================

const getClientIp = (req) => {
    // Express req.ip already applies the configured trust proxy policy.
    // Reading forwarding headers directly would let clients spoof their IP.
    let ip = req.ip || req.socket?.remoteAddress || "";

    // Convert IPv4-mapped IPv6
    if (ip.startsWith("::ffff:")) {
        ip = ip.substring(7);
    }

    // Localhost IPv6
    if (ip === "::1") {
        ip = "127.0.0.1";
    }

    return ip || null;
};


// =========================================================
// DEVICE TYPE
// =========================================================

const getDeviceType = (device, os) => {
    const deviceType = device?.type?.toLowerCase();

    if (deviceType === "mobile") {
        return "mobile";
    }

    if (deviceType === "tablet") {
        return "tablet";
    }

    // UAParser generally reports laptops/desktops as undefined.
    // For login security, both are treated as desktop-class devices.
    if (
        os?.name ||
        device?.vendor ||
        device?.model
    ) {
        return "desktop";
    }

    return "unknown";
};


// =========================================================
// ENVIRONMENT DETECTION
// =========================================================

const getLoginEnvironment = (req) => {
    const userAgent =
        req.headers["user-agent"] || "";

    const parser = new UAParser(userAgent);

    const browser = parser.getBrowser();
    const operatingSystem = parser.getOS();
    const device = parser.getDevice();

    const ipAddress = getClientIp(req);

    const browserName =
        browser.name || "Unknown";

    const browserVersion =
        browser.version || "Unknown";

    const operatingSystemName =
        operatingSystem.name || "Unknown";

    const osVersion =
        operatingSystem.version || "Unknown";

    const deviceType = getDeviceType(
        device,
        operatingSystem
    );

    const deviceModel =
        device.model ||
        device.vendor ||
        null;

    // =====================================================
    // DEVICE FINGERPRINT
    // =====================================================
    // This is used only for identifying the login
    // environment. It is NOT the authentication token.
    // =====================================================

    const fingerprintSource = [
        browserName,
        browserVersion,
        operatingSystemName,
        osVersion,
        deviceType,
        deviceModel || "",
    ].join("|");

    const deviceIdentifier =
        crypto
            .createHash("sha256")
            .update(fingerprintSource)
            .digest("hex");

    return {
        browserName,
        browserVersion,

        operatingSystem:
            operatingSystemName,

        osVersion,

        deviceType,

        deviceModel,

        ipAddress,

        deviceIdentifier,

        userAgent,
    };
};


module.exports = {
    getLoginEnvironment,
    getClientIp,
};
