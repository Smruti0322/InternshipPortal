const express = require("express");
const crypto = require("crypto");
const Razorpay = require("razorpay");
const db = require("../config/db");
const authenticateToken = require("../middleware/authMiddleware");

const router = express.Router();
const PRICE_PAISE = 5000;
const CURRENCY = "INR";
const keyId = process.env.RAZORPAY_KEY_ID?.trim();
const keySecret = process.env.RAZORPAY_KEY_SECRET?.trim();

if (!keyId || !keySecret) throw new Error("RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET must be set in backend/.env");
const razorpay = new Razorpay({ key_id: keyId, key_secret: keySecret });
router.use(authenticateToken);

async function getOwnedResume(resumeId, userId) {
    const [rows] = await db.query("SELECT id, resume_name, email, full_name, phone, education, skills FROM resumes WHERE id = ? AND user_id = ? LIMIT 1", [resumeId, userId]);
    return rows[0];
}

async function hasVerifiedOtp(resumeId, userId) {
    const [rows] = await db.query(`SELECT (verified = 1 AND expires_at > UTC_TIMESTAMP()) AS is_valid FROM resume_otps WHERE user_id = ? AND resume_id = ? ORDER BY id DESC LIMIT 1`, [userId, resumeId]);
    return rows.length > 0 && Number(rows[0].is_valid) === 1;
}

// A checkout order is only created after a still-valid OTP. Amount is server-owned.
router.post("/create-order", async (req, res) => {
    try {
        const { resume_id: resumeId } = req.body;
        const userId = req.user.id;
        if (!resumeId) return res.status(400).json({ message: "Resume ID is required." });
        const resume = await getOwnedResume(resumeId, userId);
        if (!resume) return res.status(404).json({ message: "Resume not found." });
        if (!resume.full_name?.trim() || !resume.email?.trim() || !resume.phone?.trim() || !resume.education?.trim() || !resume.skills?.trim()) {
            return res.status(400).json({ message: "Add your name, email, phone, education and skills before paying." });
        }
        if (!await hasVerifiedOtp(resumeId, userId)) return res.status(403).json({ message: "Verify the email OTP before starting payment." });
        const [priorPayments] = await db.query("SELECT razorpay_order_id, payment_status FROM resume_payments WHERE user_id = ? AND resume_id = ? ORDER BY id DESC LIMIT 1", [userId, resumeId]);
        if (priorPayments[0]?.payment_status === "success") return res.status(409).json({ message: "This resume has already been paid for." });
        if (priorPayments[0]?.payment_status === "created") {
            const existingOrder = await razorpay.orders.fetch(priorPayments[0].razorpay_order_id);
            if (existingOrder.status === "created") return res.json({ message: "Existing payment order returned.", order: existingOrder, key_id: keyId });
            return res.status(409).json({ message: "A prior payment is still being processed. Retry verification before creating another order." });
        }
        const order = await razorpay.orders.create({ amount: PRICE_PAISE, currency: CURRENCY, receipt: `resume_${resumeId}_${Date.now()}`.slice(0, 40), notes: { user_id: String(userId), resume_id: String(resumeId) } });
        await db.query(`INSERT INTO resume_payments (user_id, resume_id, amount, currency, razorpay_order_id, payment_status) VALUES (?, ?, ?, ?, ?, 'created')`, [userId, resumeId, PRICE_PAISE, CURRENCY, order.id]);
        res.json({ message: "Payment order created.", order, key_id: keyId });
    } catch (error) {
        console.error("Create Razorpay Order Error:", error.statusCode, error.error?.description || error.message);
        res.status(error.statusCode === 401 ? 502 : 500).json({ message: error.statusCode === 401 ? "Razorpay authentication failed. Check the test key ID and secret in backend/.env." : "Failed to create payment order." });
    }
});

router.post("/verify-payment", async (req, res) => {
    const connection = await db.getConnection();
    try {
        const { resume_id: resumeId, razorpay_order_id: orderId, razorpay_payment_id: paymentId, razorpay_signature: signature } = req.body;
        const userId = req.user.id;
        if (!resumeId || !orderId || !paymentId || !signature) return res.status(400).json({ message: "Payment details are required." });
        if (!await getOwnedResume(resumeId, userId)) return res.status(404).json({ message: "Resume not found." });
        const expected = crypto.createHmac("sha256", keySecret).update(`${orderId}|${paymentId}`).digest("hex");
        if (expected.length !== signature.length || !crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature))) return res.status(400).json({ message: "Invalid payment signature." });
        await connection.beginTransaction();
        const [payments] = await connection.query(`SELECT id, payment_status FROM resume_payments WHERE razorpay_order_id = ? AND user_id = ? AND resume_id = ? FOR UPDATE`, [orderId, userId, resumeId]);
        if (!payments.length) throw Object.assign(new Error("Unknown payment order."), { status: 400 });
        if (payments[0].payment_status === "success") { await connection.commit(); return res.json({ message: "Payment was already verified.", payment_verified: true, already_verified: true }); }
        const [orderRows] = await connection.query("SELECT amount, currency FROM resume_payments WHERE id = ?", [payments[0].id]);
        if (Number(orderRows[0].amount) !== PRICE_PAISE || orderRows[0].currency !== CURRENCY) throw Object.assign(new Error("Payment amount does not match the resume price."), { status: 400 });
        const [duplicate] = await connection.query("SELECT id FROM resume_payments WHERE razorpay_payment_id = ? LIMIT 1", [paymentId]);
        if (duplicate.length) throw Object.assign(new Error("This payment has already been recorded."), { status: 409 });
        await connection.query(`UPDATE resume_payments SET razorpay_payment_id = ?, payment_status = 'success', paid_at = NOW() WHERE id = ?`, [paymentId, payments[0].id]);
        const invoiceNumber = `INV-${new Date().getFullYear()}-${String(payments[0].id).padStart(6, "0")}`;
        const [resume] = await connection.query("SELECT email FROM resumes WHERE id = ?", [resumeId]);
        await connection.query(`INSERT INTO resume_invoices (payment_id, invoice_number, user_id, resume_id, customer_email, service_description, amount, currency, payment_date) VALUES (?, ?, ?, ?, ?, 'Premium Resume PDF', ?, ?, NOW())`, [payments[0].id, invoiceNumber, userId, resumeId, resume[0].email, PRICE_PAISE, CURRENCY]);
        await connection.commit();
        res.json({ message: "Payment verified successfully.", payment_verified: true, invoice_number: invoiceNumber });
    } catch (error) {
        await connection.rollback(); console.error("Verify Razorpay Payment Error:", error.message);
        res.status(error.status || 500).json({ message: error.status ? error.message : "Failed to verify payment." });
    } finally { connection.release(); }
});

router.post("/fail-order", async (req, res) => {
    try {
        const { razorpay_order_id: orderId } = req.body;
        if (!orderId) return res.status(400).json({ message: "Payment order ID is required." });
        const [result] = await db.query("UPDATE resume_payments SET payment_status = 'failed' WHERE razorpay_order_id = ? AND user_id = ? AND payment_status = 'created'", [orderId, req.user.id]);
        if (!result.affectedRows) return res.status(404).json({ message: "Pending payment order not found." });
        res.json({ payment_status: "failed" });
    } catch (error) {
        console.error("Mark payment failed error:", error.message);
        res.status(500).json({ message: "Could not update payment status." });
    }
});

// Existing client-side PDF rendering is allowed only after this server-side authorization.
router.post("/authorize-download", async (req, res) => {
    try {
        const { resume_id: resumeId } = req.body;
        const [payments] = await db.query(`SELECT id FROM resume_payments WHERE user_id = ? AND resume_id = ? AND payment_status = 'success' ORDER BY paid_at DESC LIMIT 1`, [req.user.id, resumeId]);
        if (!payments.length) {
            await connection.rollback();
            return res.status(403).json({ message: "A successful payment is required before download." });
        }
        res.json({ authorized: true, payment_id: payments[0].id });
    } catch (error) { console.error("Authorize download error:", error.message); res.status(500).json({ message: "Could not authorize download." }); }
});

router.post("/record-download", async (req, res) => {
    const connection = await db.getConnection();
    try {
        const { resume_id: resumeId } = req.body;
        const userId = req.user.id;
        if (!resumeId) return res.status(400).json({ message: "Resume ID is required." });
        await connection.beginTransaction();
        const [payments] = await connection.query("SELECT id FROM resume_payments WHERE user_id = ? AND resume_id = ? AND payment_status = 'success' ORDER BY paid_at DESC LIMIT 1 FOR UPDATE", [userId, resumeId]);
        if (!payments.length) return res.status(403).json({ message: "A successful payment is required before download." });
        const [versions] = await connection.query("SELECT COALESCE(MAX(version_number), 0) AS version_number FROM resume_versions WHERE resume_id = ? AND user_id = ?", [resumeId, userId]);
        await connection.query("INSERT INTO resume_downloads (user_id, resume_id, payment_id, version_number, downloaded_at) VALUES (?, ?, ?, ?, NOW())", [userId, resumeId, payments[0].id, versions[0].version_number]);
        await connection.query("UPDATE resumes SET is_default = FALSE WHERE user_id = ?", [userId]);
        await connection.query("UPDATE resumes SET is_default = TRUE WHERE id = ? AND user_id = ?", [resumeId, userId]);
        await connection.commit();
        res.json({ recorded: true });
    } catch (error) {
        await connection.rollback();
        console.error("Record download error:", error.message);
        res.status(500).json({ message: "Could not record the download." });
    } finally { connection.release(); }
});

router.get("/history", async (req, res) => {
    try {
        const [rows] = await db.query(`SELECT p.resume_id, r.resume_name, p.amount, p.currency, p.payment_status, p.razorpay_order_id, p.razorpay_payment_id, p.paid_at, i.invoice_number FROM resume_payments p JOIN resumes r ON r.id = p.resume_id LEFT JOIN resume_invoices i ON i.payment_id = p.id WHERE p.user_id = ? ORDER BY p.created_at DESC`, [req.user.id]);
        res.json(rows);
    } catch (error) { console.error("Payment history error:", error.message); res.status(500).json({ message: "Failed to load payment history." }); }
});

module.exports = router;
