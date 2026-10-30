const { sendEmail } = require("../utils/sendEmail");

// Backwards-compatible wrapper for existing transporter.sendMail(...) call sites.
module.exports = {
    sendMail(options) {
        return sendEmail(options);
    },
};
