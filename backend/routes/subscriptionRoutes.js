
const express = require("express");
const crypto = require("crypto");
const Razorpay = require("razorpay");
const db = require("../config/db");
const authenticateToken = require("../middleware/authMiddleware");
const transporter = require("../config/emailTransporter");

const router = express.Router();

router.use(authenticateToken);

const keyId = process.env.RAZORPAY_KEY_ID?.trim();
const keySecret = process.env.RAZORPAY_KEY_SECRET?.trim();

const razorpay =
    keyId && keySecret
        ? new Razorpay({
            key_id: keyId,
            key_secret: keySecret,
        })
        : null;

const CURRENCY = "INR";

function isPaymentWindowOpen() {
    const parts = new Intl.DateTimeFormat("en-GB", {
        timeZone: "Asia/Kolkata",
        hour: "2-digit",
        minute: "2-digit",
        hourCycle: "h23",
    }).formatToParts(new Date());

    const hour = Number(parts.find((p) => p.type === "hour").value);
    const minute = Number(parts.find((p) => p.type === "minute").value);
    const minutes = hour * 60 + minute;

    return minutes >= 300 && minutes < 705;
}

function addError(message, status = 400) {
    return Object.assign(new Error(message), { status });
}

function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, (char) => {
        const entities = {
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#39;",
        };
        return entities[char];
    });
}

function formatDate(value) {
    if (!value) return "N/A";

    return new Date(value).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        timeZone: "Asia/Kolkata",
    });
}

// GET /api/subscriptions/plans
router.get("/plans", async (req, res) => {
    try {
        const [plans] = await db.query(
            `SELECT id, plan_name, monthly_price, application_limit
             FROM subscription_plans
             ORDER BY FIELD(plan_name, 'Free', 'Bronze', 'Silver', 'Gold')`
        );

        res.json(plans);
    } catch (error) {
        console.error("Subscription plans error:", error.message);
        res.status(500).json({
            message: "Could not load subscription plans.",
        });
    }
});

// GET /api/subscriptions/current
router.get("/current", async (req, res) => {
    try {
        const userId = req.user.id;

        await db.query(
            `UPDATE user_subscriptions
             SET status = 'expired'
             WHERE user_id = ?
               AND status = 'active'
               AND expires_at <= NOW()`,
            [userId]
        );

        const [rows] = await db.query(
            `SELECT s.id AS subscription_id,
                    s.status, s.started_at, s.expires_at,
                    s.applications_used,
                    p.id AS plan_id, p.plan_name,
                    p.monthly_price, p.application_limit
             FROM user_subscriptions s
             JOIN subscription_plans p ON p.id = s.plan_id
             WHERE s.user_id = ?
               AND s.status = 'active'
               AND s.expires_at > NOW()
             ORDER BY s.expires_at DESC, s.id DESC
             LIMIT 1`,
            [userId]
        );

        if (!rows.length) {
            return res.json({
                plan_name: "Free",
                monthly_price: 0,
                application_limit: 1,
                applications_used: 0,
                remaining_applications: 1,
                status: "active",
                note: "Free plan will be initialized when you first use the application system.",
            });
        }

        const subscription = rows[0];
        const limit =
            subscription.application_limit === null
                ? null
                : Number(subscription.application_limit);
        const used = Number(subscription.applications_used);

        res.json({
            ...subscription,
            monthly_price: Number(subscription.monthly_price),
            application_limit: limit,
            applications_used: used,
            remaining_applications:
                limit === null ? null : Math.max(0, limit - used),
        });
    } catch (error) {
        console.error("Current subscription error:", error.message);
        res.status(500).json({
            message: "Could not load current subscription.",
        });
    }
});

// POST /api/subscriptions/activate-free
router.post("/activate-free", async (req, res) => {
    let connection;

    try {
        connection = await db.getConnection();
        await connection.beginTransaction();

        const [active] = await connection.query(
            `SELECT id
             FROM user_subscriptions
             WHERE user_id = ?
               AND status = 'active'
               AND expires_at > NOW()
             LIMIT 1
             FOR UPDATE`,
            [req.user.id]
        );

        if (active.length) {
            throw addError("You already have an active subscription.", 409);
        }

        const [plans] = await connection.query(
            `SELECT id
             FROM subscription_plans
             WHERE plan_name = 'Free'
             LIMIT 1`
        );

        if (!plans.length) {
            throw addError("Free plan is not configured.", 500);
        }

        await connection.query(
            `UPDATE user_subscriptions
             SET status = 'expired'
             WHERE user_id = ? AND status = 'active'`,
            [req.user.id]
        );

        await connection.query(
            `INSERT INTO user_subscriptions
             (user_id, plan_id, status, started_at, expires_at, applications_used)
             VALUES (?, ?, 'active', NOW(), DATE_ADD(NOW(), INTERVAL 1 MONTH), 0)`,
            [req.user.id, plans[0].id]
        );

        await connection.commit();

        res.json({
            message: "Free plan activated.",
            plan_name: "Free",
        });
    } catch (error) {
        if (connection) {
            try {
                await connection.rollback();
            } catch (rollbackError) {
                console.error("Free-plan rollback error:", rollbackError.message);
            }
        }

        console.error("Free plan activation error:", error.message);

        res.status(error.status || 500).json({
            message: error.status
                ? error.message
                : "Could not activate Free plan.",
        });
    } finally {
        if (connection) connection.release();
    }
});

// POST /api/subscriptions/create-order
router.post("/create-order", async (req, res) => {
    try {
        if (!razorpay) {
            return res.status(503).json({
                message: "Razorpay is not configured. Check backend/.env.",
            });
        }

        if (!isPaymentWindowOpen()) {
            return res.status(403).json({
                message:
                    "Payments are allowed only between 5:00 AM and 11:45 AM IST. Please try again during this time.",
            });
        }

        const planId = Number(req.body.plan_id);

        if (!Number.isInteger(planId) || planId <= 0) {
            return res.status(400).json({
                message: "A valid plan ID is required.",
            });
        }

        const [plans] = await db.query(
            `SELECT id, plan_name, monthly_price, application_limit
             FROM subscription_plans
             WHERE id = ?
             LIMIT 1`,
            [planId]
        );

        if (!plans.length) {
            return res.status(404).json({
                message: "Subscription plan not found.",
            });
        }

        const plan = plans[0];

        if (plan.plan_name === "Free" || Number(plan.monthly_price) <= 0) {
            return res.status(400).json({
                message:
                    "Use the Free plan activation endpoint for the Free plan.",
            });
        }

        const [active] = await db.query(
            `SELECT id, plan_id
             FROM user_subscriptions
             WHERE user_id = ?
               AND status = 'active'
               AND expires_at > NOW()
             ORDER BY expires_at DESC, id DESC
             LIMIT 1`,
            [req.user.id]
        );

        if (active.length) {
            const [currentPlan] = await db.query(
                `SELECT plan_name
                 FROM subscription_plans
                 WHERE id = ?`,
                [active[0].plan_id]
            );

            if (currentPlan[0]?.plan_name === plan.plan_name) {
                return res.status(409).json({
                    message: "You already have this active plan.",
                });
            }
        }

        const [pending] = await db.query(
            `SELECT razorpay_order_id
             FROM subscription_payments
             WHERE user_id = ? AND status = 'created'
             ORDER BY id DESC
             LIMIT 1`,
            [req.user.id]
        );

        if (pending.length) {
            try {
                const existing = await razorpay.orders.fetch(
                    pending[0].razorpay_order_id
                );

                if (existing.status === "created") {
                    return res.status(409).json({
                        message:
                            "A payment order is already pending. Complete or close that checkout first.",
                        order_id: existing.id,
                    });
                }

                await db.query(
                    `UPDATE subscription_payments
                     SET status = 'failed'
                     WHERE razorpay_order_id = ?
                       AND user_id = ?
                       AND status = 'created'`,
                    [existing.id, req.user.id]
                );
            } catch (fetchError) {
                if (fetchError.status === 409) throw fetchError;

                return res.status(409).json({
                    message:
                        "A previous payment is being checked. Please retry shortly.",
                });
            }
        }

        const amountPaise = Math.round(Number(plan.monthly_price) * 100);

        const order = await razorpay.orders.create({
            amount: amountPaise,
            currency: CURRENCY,
            receipt: `sub_${req.user.id}_${Date.now()}`.slice(0, 40),
            notes: {
                user_id: String(req.user.id),
                plan_id: String(plan.id),
                plan_name: plan.plan_name,
            },
        });

        await db.query(
            `INSERT INTO subscription_payments
             (user_id, plan_id, razorpay_order_id, amount_paise, currency, status)
             VALUES (?, ?, ?, ?, ?, 'created')`,
            [req.user.id, plan.id, order.id, amountPaise, CURRENCY]
        );

        res.json({
            message: "Subscription payment order created.",
            order,
            key_id: keyId,
            plan: {
                id: plan.id,
                name: plan.plan_name,
                amount: Number(plan.monthly_price),
                application_limit: plan.application_limit,
            },
        });
    } catch (error) {
        console.error(
            "Subscription create-order error:",
            error.error?.description || error.message
        );

        res.status(error.status || 500).json({
            message: error.status
                ? error.message
                : "Could not create subscription payment order.",
        });
    }
});

// POST /api/subscriptions/payment-failed
router.post("/payment-failed", async (req, res) => {
    try {
        const orderId = req.body.razorpay_order_id;

        if (!orderId) {
            return res.status(400).json({
                message: "Payment order ID is required.",
            });
        }

        const [result] = await db.query(
            `UPDATE subscription_payments
             SET status = 'failed'
             WHERE razorpay_order_id = ?
               AND user_id = ?
               AND status = 'created'`,
            [orderId, req.user.id]
        );

        res.json({
            message: result.affectedRows
                ? "Failed payment recorded."
                : "Payment status unchanged.",
        });
    } catch (error) {
        console.error("Payment failure update error:", error.message);
        res.status(500).json({
            message: "Could not update failed payment status.",
        });
    }
});

// POST /api/subscriptions/verify-payment
router.post("/verify-payment", async (req, res) => {
    if (!razorpay) {
        return res.status(503).json({
            message: "Razorpay is not configured.",
        });
    }

    const {
        razorpay_order_id: orderId,
        razorpay_payment_id: paymentId,
        razorpay_signature: signature,
    } = req.body;

    if (!orderId || !paymentId || !signature) {
        return res.status(400).json({
            message: "All payment verification fields are required.",
        });
    }

    const expected = crypto
        .createHmac("sha256", keySecret)
        .update(`${orderId}|${paymentId}`)
        .digest("hex");

    let expectedBuffer;
    let suppliedBuffer;

    try {
        expectedBuffer = Buffer.from(expected, "hex");
        suppliedBuffer = Buffer.from(signature, "hex");
    } catch {
        return res.status(400).json({
            message: "Invalid payment signature.",
        });
    }

    if (
        expectedBuffer.length !== suppliedBuffer.length ||
        expectedBuffer.length === 0 ||
        !crypto.timingSafeEqual(expectedBuffer, suppliedBuffer)
    ) {
        return res.status(400).json({
            message: "Invalid payment signature.",
        });
    }

    let connection;
    let transactionStarted = false;

    try {
        // Verify payment directly with Razorpay.
        const payment = await razorpay.payments.fetch(paymentId);

        if (
            payment.order_id !== orderId ||
            payment.status !== "captured" ||
            payment.currency !== CURRENCY
        ) {
            throw addError(
                "Payment is not captured or does not match this order.",
                400
            );
        }

        connection = await db.getConnection();
        await connection.beginTransaction();
        transactionStarted = true;

        const [payments] = await connection.query(
            `SELECT *
             FROM subscription_payments
             WHERE razorpay_order_id = ? AND user_id = ?
             LIMIT 1
             FOR UPDATE`,
            [orderId, req.user.id]
        );

        if (!payments.length) {
            throw addError("Payment order not found for this user.", 404);
        }

        const savedPayment = payments[0];

        if (savedPayment.status === "paid") {
            await connection.commit();
            transactionStarted = false;

            return res.json({
                message: "Payment was already verified.",
                payment_verified: true,
                already_verified: true,
            });
        }

        if (savedPayment.status !== "created") {
            throw addError("This payment order is no longer pending.", 409);
        }

        if (
            Number(payment.amount) !== Number(savedPayment.amount_paise) ||
            savedPayment.currency !== payment.currency
        ) {
            throw addError("The payment amount does not match the order.", 400);
        }

        const [duplicate] = await connection.query(
            `SELECT id
             FROM subscription_payments
             WHERE razorpay_payment_id = ?
             LIMIT 1`,
            [paymentId]
        );

        if (duplicate.length) {
            throw addError("This payment has already been recorded.", 409);
        }

        const [userRows] = await connection.query(
            `SELECT name, email
             FROM users
             WHERE id = ?
             LIMIT 1`,
            [req.user.id]
        );

        const [planRows] = await connection.query(
            `SELECT id, plan_name, monthly_price, application_limit
             FROM subscription_plans
             WHERE id = ?
             LIMIT 1`,
            [savedPayment.plan_id]
        );

        if (!userRows.length || !planRows.length) {
            throw addError("User or subscription plan was not found.", 404);
        }

        const user = userRows[0];
        const plan = planRows[0];

        await connection.query(
            `UPDATE user_subscriptions
             SET status = 'cancelled'
             WHERE user_id = ? AND status = 'active'`,
            [req.user.id]
        );

        const [insertResult] = await connection.query(
            `INSERT INTO user_subscriptions
             (user_id, plan_id, status, started_at, expires_at, applications_used)
             VALUES (?, ?, 'active', NOW(), DATE_ADD(NOW(), INTERVAL 1 MONTH), 0)`,
            [req.user.id, savedPayment.plan_id]
        );

        const subscriptionId = insertResult.insertId;

        const [subscriptionRows] = await connection.query(
            `SELECT started_at, expires_at
             FROM user_subscriptions
             WHERE id = ?
             LIMIT 1`,
            [subscriptionId]
        );

        if (!subscriptionRows.length) {
            throw addError("Could not retrieve subscription validity dates.", 500);
        }

        const subscription = subscriptionRows[0];

        await connection.query(
            `UPDATE subscription_payments
             SET subscription_id = ?,
                 razorpay_payment_id = ?,
                 status = 'paid',
                 paid_at = NOW()
             WHERE id = ?`,
            [subscriptionId, paymentId, savedPayment.id]
        );

        const invoiceNumber =
            `SUB-${new Date().getFullYear()}-${String(savedPayment.id).padStart(6, "0")}`;

        await connection.query(
            `INSERT INTO subscription_invoices
             (payment_id, invoice_number, billing_name, billing_email, amount)
             VALUES (?, ?, ?, ?, ?)`,
            [
                savedPayment.id,
                invoiceNumber,
                user.name,
                user.email,
                Number(savedPayment.amount_paise) / 100,
            ]
        );

        // Commit payment, subscription, and invoice before sending email.
        await connection.commit();
        transactionStarted = false;

        // Email errors must not undo a successful payment.
        try {
            if (!user.email) {
                throw new Error("User email address is missing.");
            }

            const safeName = escapeHtml(user.name || "User");
            const safeEmail = escapeHtml(user.email);
            const safePlan = escapeHtml(plan.plan_name);
            const safeInvoice = escapeHtml(invoiceNumber);
            const safePaymentId = escapeHtml(paymentId);
            const safeStartDate = escapeHtml(formatDate(subscription.started_at));
            const safeExpiryDate = escapeHtml(formatDate(subscription.expires_at));
            const amount = (Number(savedPayment.amount_paise) / 100).toFixed(2);

            await transporter.sendMail({
                from: process.env.SMTP_USER,
                to: user.email,
                subject: `Internship Portal - ${invoiceNumber} Subscription Invoice`,
                html: `
                    <div style="font-family:Arial,sans-serif;max-width:640px;margin:auto;padding:24px;color:#333;line-height:1.6;">
                        <h2>Subscription Payment Successful</h2>
                        <p>Hello ${safeName},</p>
                        <p>Your subscription payment has been verified successfully. Your invoice details are below.</p>

                        <table style="border-collapse:collapse;width:100%;">
                            <tr>
                                <td style="padding:10px;border:1px solid #ddd;">Invoice Number</td>
                                <td style="padding:10px;border:1px solid #ddd;">${safeInvoice}</td>
                            </tr>
                            <tr>
                                <td style="padding:10px;border:1px solid #ddd;">Plan</td>
                                <td style="padding:10px;border:1px solid #ddd;">${safePlan}</td>
                            </tr>
                            <tr>
                                <td style="padding:10px;border:1px solid #ddd;">Amount Paid</td>
                                <td style="padding:10px;border:1px solid #ddd;">₹${amount}</td>
                            </tr>
                            <tr>
                                <td style="padding:10px;border:1px solid #ddd;">Transaction ID</td>
                                <td style="padding:10px;border:1px solid #ddd;">${safePaymentId}</td>
                            </tr>
                            <tr>
                                <td style="padding:10px;border:1px solid #ddd;">Billing Name</td>
                                <td style="padding:10px;border:1px solid #ddd;">${safeName}</td>
                            </tr>
                            <tr>
                                <td style="padding:10px;border:1px solid #ddd;">Billing Email</td>
                                <td style="padding:10px;border:1px solid #ddd;">${safeEmail}</td>
                            </tr>
                            <tr>
                                <td style="padding:10px;border:1px solid #ddd;">Subscription Start</td>
                                <td style="padding:10px;border:1px solid #ddd;">${safeStartDate}</td>
                            </tr>
                            <tr>
                                <td style="padding:10px;border:1px solid #ddd;">Valid Until</td>
                                <td style="padding:10px;border:1px solid #ddd;">${safeExpiryDate}</td>
                            </tr>
                        </table>

                        <p>Please keep this email for your records.</p>
                        <p>Thank you for using Internship Portal.</p>
                    </div>
                `,
            });
        } catch (emailError) {
            console.error(
                "Subscription invoice email failed:",
                emailError.message
            );
        }

        return res.json({
            message: "Subscription activated successfully.",
            payment_verified: true,
            invoice_number: invoiceNumber,
            transaction_id: paymentId,
            plan_name: plan.plan_name,
            amount: Number(savedPayment.amount_paise) / 100,
            validity_months: 1,
            started_at: subscription.started_at,
            expires_at: subscription.expires_at,
        });
    } catch (error) {
        if (connection && transactionStarted) {
            try {
                await connection.rollback();
            } catch (rollbackError) {
                console.error(
                    "Subscription rollback error:",
                    rollbackError.message
                );
            }
        }

        console.error(
            "Subscription verification error:",
            error.error?.description || error.message
        );

        if (!res.headersSent) {
            res.status(error.status || 500).json({
                message: error.status
                    ? error.message
                    : "Payment verification failed. If money was deducted, check payment history before retrying.",
            });
        }
    } finally {
        if (connection) connection.release();
    }
});

// GET /api/subscriptions/history
router.get("/history", async (req, res) => {
    try {
        const [rows] = await db.query(
            `SELECT p.id, p.amount_paise, p.currency, p.status,
                    p.razorpay_order_id, p.razorpay_payment_id,
                    p.created_at, p.paid_at, pl.plan_name,
                    i.invoice_number, i.billing_name, i.billing_email,
                    i.amount AS invoice_amount,
                    s.started_at, s.expires_at
             FROM subscription_payments p
             JOIN subscription_plans pl ON pl.id = p.plan_id
             LEFT JOIN subscription_invoices i ON i.payment_id = p.id
             LEFT JOIN user_subscriptions s ON s.id = p.subscription_id
             WHERE p.user_id = ?
             ORDER BY p.id DESC`,
            [req.user.id]
        );

        res.json(rows);
    } catch (error) {
        console.error("Subscription history error:", error.message);
        res.status(500).json({
            message: "Could not load subscription history.",
        });
    }
});


/* GET /api/subscriptions/invoice/:paymentId */
router.get("/invoice/:paymentId", async (req, res) => {
    try {
        const paymentId = Number(req.params.paymentId);

        if (!Number.isInteger(paymentId) || paymentId <= 0) {
            return res.status(400).json({
                message: "Invalid payment ID.",
            });
        }

        const [rows] = await db.query(
            `SELECT
                p.id AS payment_record_id,
                p.razorpay_payment_id,
                p.status,
                p.currency,
                p.paid_at,
                pl.plan_name,
                i.invoice_number,
                i.billing_name,
                i.billing_email,
                i.amount,
                i.created_at AS invoice_date,
                s.started_at,
                s.expires_at
             FROM subscription_payments p
             INNER JOIN subscription_invoices i
                ON i.payment_id = p.id
             INNER JOIN subscription_plans pl
                ON pl.id = p.plan_id
             LEFT JOIN user_subscriptions s
                ON s.id = p.subscription_id
             WHERE p.id = ?
               AND p.user_id = ?
               AND p.status = 'paid'
             LIMIT 1`,
            [paymentId, req.user.id]
        );

        if (!rows.length) {
            return res.status(404).json({
                message: "Invoice not found for this account.",
            });
        }

        res.json(rows[0]);
    } catch (error) {
        console.error("Invoice retrieval error:", error.message);

        res.status(500).json({
            message: "Could not retrieve invoice details.",
        });
    }
});

// POST /api/subscriptions/cancel
// Cancels the active subscription immediately.
router.post("/cancel", async (req, res) => {
    try {
        const [result] = await db.query(
            `UPDATE user_subscriptions
             SET status = 'cancelled'
             WHERE user_id = ?
               AND status = 'active'
               AND expires_at > NOW()`,
            [req.user.id]
        );

        if (!result.affectedRows) {
            return res.status(404).json({
                message: "No active subscription was found.",
            });
        }

        res.json({
            message: "Subscription cancelled. Paid access ends immediately.",
        });
    } catch (error) {
        console.error("Subscription cancellation error:", error.message);
        res.status(500).json({
            message: "Could not cancel subscription.",
        });
    }
});

module.exports = router;