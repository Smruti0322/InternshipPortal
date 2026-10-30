
const nodemailer = require("nodemailer");
const { Resend } = require("resend");

let smtpTransporter = null;
let resendClient = null;

const resolveEmailProvider = (env = process.env) => {
    if (
        env.BREVO_API_KEY?.trim() &&
        env.BREVO_FROM_EMAIL?.trim()
    ) {
        return "brevo";
    }

    if (env.RESEND_API_KEY?.trim() && env.RESEND_FROM_EMAIL?.trim()) {
        return "resend";
    }

    if (env.SMTP_USER?.trim() && env.SMTP_PASS?.trim()) {
        return "smtp";
    }

    return null;
};

const describeEmailError = (error, provider = resolveEmailProvider()) => ({
    provider,
    name: error?.name,
    code: error?.code,
    command: error?.command,
    statusCode: error?.statusCode,
    message: String(error?.message || "unknown").slice(0, 200),
});

const getMailFrom = (displayName) => {
    const provider = resolveEmailProvider();

    if (provider === "brevo") {
        const name = process.env.BREVO_FROM_NAME?.trim() || "Internship Portal";
        return `"${name}" <${process.env.BREVO_FROM_EMAIL.trim()}>`;
    }

    if (provider === "resend") {
        return process.env.RESEND_FROM_EMAIL.trim();
    }

    const smtpUser = process.env.SMTP_USER?.trim();

    if (displayName && smtpUser) {
        return `"${displayName}" <${smtpUser}>`;
    }

    return smtpUser;
};

const getResendClient = () => {
    if (!resendClient) {
        resendClient = new Resend(process.env.RESEND_API_KEY.trim());
    }

    return resendClient;
};

const getSmtpTransporter = () => {
    if (!smtpTransporter) {
        const port = Number(process.env.SMTP_PORT || 587);

        smtpTransporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST || "smtp.gmail.com",
            port,
            secure: port === 465,
            connectionTimeout: 10000,
            greetingTimeout: 10000,
            socketTimeout: 20000,
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS,
            },
        });
    }

    return smtpTransporter;
};

const normalizeRecipients = (to) => {
    if (Array.isArray(to)) {
        return to.filter(Boolean);
    }

    return to ? [to] : [];
};

const sendViaBrevo = async ({ to, subject, html, text }) => {
    const recipients = normalizeRecipients(to).map((recipient) => {
        if (typeof recipient === "string") {
            return { email: recipient };
        }

        return recipient;
    });

    const payload = {
        sender: {
            name: process.env.BREVO_FROM_NAME?.trim() || "Internship Portal",
            email: process.env.BREVO_FROM_EMAIL.trim(),
        },
        to: recipients,
        subject,
    };

    if (html) payload.htmlContent = html;
    if (text) payload.textContent = text;

    const response = await fetch("https://api.brevo.com/v3/smtp/email", {
        method: "POST",
        headers: {
            accept: "application/json",
            "api-key": process.env.BREVO_API_KEY.trim(),
            "content-type": "application/json",
        },
        body: JSON.stringify(payload),
    });

    const result = await response.json().catch(() => ({}));

    if (!response.ok) {
        const error = new Error(
            result.message || "Brevo failed to send email."
        );
        error.name = "BrevoError";
        error.statusCode = response.status;
        throw error;
    }

    if (!result.messageId) {
        throw new Error("Brevo did not confirm the email request.");
    }

    return { provider: "brevo", id: result.messageId };
};

const sendViaResend = async ({ to, subject, html, text }) => {
    const { data, error } = await getResendClient().emails.send({
        from: process.env.RESEND_FROM_EMAIL.trim(),
        to: normalizeRecipients(to),
        subject,
        html,
        text,
    });

    if (error) {
        const wrapped = new Error(error.message || "Resend failed to send email.");
        wrapped.name = error.name || "ResendError";
        wrapped.statusCode = error.statusCode;
        throw wrapped;
    }

    if (!data?.id) {
        throw new Error("Email provider did not confirm the email request.");
    }

    return { provider: "resend", id: data.id };
};

const sendViaSmtp = async ({ from, to, subject, html, text }) => {
    const info = await getSmtpTransporter().sendMail({
        from: from || getMailFrom(),
        to: normalizeRecipients(to).join(", "),
        subject,
        html,
        text,
    });

    return { provider: "smtp", id: info.messageId };
};

const sendEmail = async (options) => {
    const provider = resolveEmailProvider();

    if (!provider) {
        throw new Error("Email provider is not configured.");
    }

    const recipients = normalizeRecipients(options.to);

    if (!recipients.length) {
        throw new Error("Email recipient is required.");
    }

    try {
        if (provider === "brevo") {
            return await sendViaBrevo(options);
        }

        if (provider === "resend") {
            return await sendViaResend(options);
        }

        return await sendViaSmtp(options);
    } catch (error) {
        console.error("EMAIL SEND ERROR:", describeEmailError(error, provider));
        throw error;
    }
};

module.exports = {
    sendEmail,
    resolveEmailProvider,
    describeEmailError,
    getMailFrom,
};
