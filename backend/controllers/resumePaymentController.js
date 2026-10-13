const crypto = require("crypto");
const Razorpay = require("razorpay");
const db = require("../config/db");

const PRICE_PAISE = 5000; // ₹50
const CURRENCY = "INR";

const keyId = process.env.RAZORPAY_KEY_ID?.trim();
const keySecret = process.env.RAZORPAY_KEY_SECRET?.trim();

if (!keyId || !keySecret) {
    console.warn(
        "⚠️ Razorpay credentials are missing. Check RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in .env"
    );
}

const razorpay = new Razorpay({
    key_id: keyId,
    key_secret: keySecret,
});

/*
=========================================================
CREATE RAZORPAY ORDER
POST /api/resume-payment/create-order
=========================================================
*/
const createOrder = async (req, res) => {
    try {
        const userId = req.user?.id || req.body.user_id;
        const { resume_id } = req.body;

        console.log("Create Order Request:", {
            user_id: userId,
            resume_id,
        });

        if (!userId) {
            return res.status(401).json({
                success: false,
                message: "User authentication required",
            });
        }

        if (!resume_id) {
            return res.status(400).json({
                success: false,
                message: "resume_id is required",
            });
        }

        /*
        -------------------------------------------------
        Check whether resume exists
        -------------------------------------------------
        */
        const [resumeRows] = await db.query(
            `
            SELECT id, user_id
            FROM resumes
            WHERE id = ? AND user_id = ?
            LIMIT 1
            `,
            [resume_id, userId]
        );

        if (resumeRows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Resume not found",
            });
        }

        /*
        -------------------------------------------------
        Create Razorpay order
        -------------------------------------------------
        */
        const razorpayOrder = await razorpay.orders.create({
            amount: PRICE_PAISE,
            currency: CURRENCY,
            receipt: `resume_${resume_id}_${Date.now()}`,
            notes: {
                user_id: String(userId),
                resume_id: String(resume_id),
            },
        });

        console.log("Razorpay Order Created:", razorpayOrder.id);

        /*
        -------------------------------------------------
        Save payment record
        -------------------------------------------------
        */
        const [paymentResult] = await db.query(
            `
            INSERT INTO resume_payments
            (
                user_id,
                resume_id,
                amount,
                currency,
                razorpay_order_id,
                payment_status
            )
            VALUES (?, ?, ?, ?, ?, ?)
            `,
            [
                userId,
                resume_id,
                PRICE_PAISE,
                CURRENCY,
                razorpayOrder.id,
                "created",
            ]
        );

        console.log(
            "Payment Record Created:",
            paymentResult.insertId
        );

        return res.status(200).json({
            success: true,
            message: "Razorpay order created successfully",

            order: {
                id: razorpayOrder.id,
                amount: razorpayOrder.amount,
                currency: razorpayOrder.currency,
            },

            payment_id: paymentResult.insertId,

            razorpay_key_id: keyId,
        });
    } catch (error) {
        console.error(
            "Create Razorpay Order Error:",
            error?.error || error
        );

        return res.status(500).json({
            success: false,
            message: "Failed to create Razorpay order",
            error:
                error?.error?.description ||
                error?.message ||
                "Unknown error",
        });
    }
};


/*
=========================================================
VERIFY RAZORPAY PAYMENT
POST /api/resume-payment/verify-payment
=========================================================
*/
const verifyPayment = async (req, res) => {
    try {
        const userId = req.user?.id || req.body.user_id;

        const {
            resume_id,
            razorpay_order_id,
            razorpay_payment_id,
            razorpay_signature,
        } = req.body;

        console.log("Verify Payment Request:", {
            user_id: userId,
            resume_id,
            razorpay_order_id,
            razorpay_payment_id,
        });

        if (!userId) {
            return res.status(401).json({
                success: false,
                message: "User authentication required",
            });
        }

        if (
            !resume_id ||
            !razorpay_order_id ||
            !razorpay_payment_id ||
            !razorpay_signature
        ) {
            return res.status(400).json({
                success: false,
                message: "Payment verification data is incomplete",
            });
        }

        /*
        -------------------------------------------------
        Find payment record
        -------------------------------------------------
        */
        const [paymentRows] = await db.query(
            `
            SELECT *
            FROM resume_payments
            WHERE razorpay_order_id = ?
              AND user_id = ?
              AND resume_id = ?
            LIMIT 1
            `,
            [
                razorpay_order_id,
                userId,
                resume_id,
            ]
        );

        if (paymentRows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Payment record not found",
            });
        }

        const payment = paymentRows[0];

        /*
        -------------------------------------------------
        Generate Razorpay signature
        -------------------------------------------------
        */
        const generatedSignature = crypto
            .createHmac("sha256", keySecret)
            .update(
                `${razorpay_order_id}|${razorpay_payment_id}`
            )
            .digest("hex");

        /*
        -------------------------------------------------
        Compare signatures
        -------------------------------------------------
        */
        const isSignatureValid = crypto.timingSafeEqual(
            Buffer.from(generatedSignature),
            Buffer.from(razorpay_signature)
        );

        if (!isSignatureValid) {
            await db.query(
                `
                UPDATE resume_payments
                SET
                    payment_status = 'failed',
                    razorpay_payment_id = ?
                WHERE id = ?
                `,
                [
                    razorpay_payment_id,
                    payment.id,
                ]
            );

            return res.status(400).json({
                success: false,
                message: "Payment signature verification failed",
            });
        }

        /*
        -------------------------------------------------
        Update payment as SUCCESS
        -------------------------------------------------
        */
        await db.query(
            `
            UPDATE resume_payments
            SET
                razorpay_payment_id = ?,
                payment_status = 'success',
                paid_at = NOW()
            WHERE id = ?
            `,
            [
                razorpay_payment_id,
                payment.id,
            ]
        );

        /*
        -------------------------------------------------
        Create Invoice
        -------------------------------------------------
        */
        const invoiceNumber =
            `INV-${new Date().getFullYear()}-${String(
                payment.id
            ).padStart(6, "0")}`;

        /*
        Check if invoice already exists
        */
        const [existingInvoice] = await db.query(
            `
            SELECT id, invoice_number
            FROM resume_invoices
            WHERE payment_id = ?
            LIMIT 1
            `,
            [payment.id]
        );

        let invoiceId;
        let finalInvoiceNumber;

        if (existingInvoice.length > 0) {
            invoiceId = existingInvoice[0].id;
            finalInvoiceNumber =
                existingInvoice[0].invoice_number;
        } else {
            /*
            Get user email
            */
            let customerEmail = null;

            try {
                const [userRows] = await db.query(
                    `
                    SELECT email
                    FROM users
                    WHERE id = ?
                    LIMIT 1
                    `,
                    [userId]
                );

                if (userRows.length > 0) {
                    customerEmail = userRows[0].email;
                }
            } catch (userError) {
                console.warn(
                    "Could not fetch user email:",
                    userError.message
                );
            }

            const [invoiceResult] = await db.query(
                `
                INSERT INTO resume_invoices
                (
                    payment_id,
                    invoice_number,
                    user_id,
                    resume_id,
                    customer_email,
                    service_description,
                    amount,
                    currency,
                    payment_date
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())
                `,
                [
                    payment.id,
                    invoiceNumber,
                    userId,
                    resume_id,
                    customerEmail,
                    "Premium Resume Generation",
                    PRICE_PAISE,
                    CURRENCY,
                ]
            );

            invoiceId = invoiceResult.insertId;
            finalInvoiceNumber = invoiceNumber;
        }

        /*
        -------------------------------------------------
        SUCCESS RESPONSE
        -------------------------------------------------
        */
        return res.status(200).json({
            success: true,
            message: "Payment verified successfully",

            payment: {
                id: payment.id,
                razorpay_order_id,
                razorpay_payment_id,
                status: "success",
                amount: PRICE_PAISE,
                currency: CURRENCY,
            },

            invoice: {
                id: invoiceId,
                invoice_number: finalInvoiceNumber,
            },
        });
    } catch (error) {
        console.error(
            "Verify Razorpay Payment Error:",
            error?.error || error
        );

        return res.status(500).json({
            success: false,
            message: "Payment verification failed",
            error:
                error?.error?.description ||
                error?.message ||
                "Unknown error",
        });
    }
};


module.exports = {
    createOrder,
    verifyPayment,
};