const express = require("express");
const crypto = require("crypto");
const Razorpay = require("razorpay");
const mysql = require("mysql2/promise");

const router = express.Router();

const pool = mysql.createPool({
    host: "localhost",
    user: "root",
    password: "",
    database: "internship_portal",
    port: 3306,
});

const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// ==========================================
// CREATE RAZORPAY ORDER
// ==========================================

router.post("/create-order", async (req, res) => {
    try {
        const { user_id, resume_id } = req.body;

        if (!user_id || !resume_id) {
            return res.status(400).json({
                message: "User ID and Resume ID are required",
            });
        }

        // Check resume belongs to user
        const [resumes] = await pool.query(
            `SELECT id, user_id, resume_name
             FROM resumes
             WHERE id = ? AND user_id = ?
             LIMIT 1`,
            [resume_id, user_id]
        );

        if (resumes.length === 0) {
            return res.status(404).json({
                message: "Resume not found",
            });
        }

        // ₹50 = 5000 paise
        const options = {
            amount: 5000,
            currency: "INR",
            receipt: `resume_${resume_id}_${Date.now()}`,
        };

        const order = await razorpay.orders.create(options);

        return res.status(200).json({
            message: "Payment order created successfully",
            order,
            key_id: process.env.RAZORPAY_KEY_ID,
        });

    } catch (error) {
        console.error("Create Razorpay Order Error:", error);

        return res.status(500).json({
            message: error.message || "Failed to create payment order",
        });
    }
});

// ==========================================
// VERIFY RAZORPAY PAYMENT
// ==========================================

router.post("/verify-payment", async (req, res) => {
    try {
        const {
            user_id,
            resume_id,
            razorpay_order_id,
            razorpay_payment_id,
            razorpay_signature,
        } = req.body;

        if (
            !user_id ||
            !resume_id ||
            !razorpay_order_id ||
            !razorpay_payment_id ||
            !razorpay_signature
        ) {
            return res.status(400).json({
                message: "Payment details are required",
            });
        }

        // Generate signature
        const generatedSignature = crypto
            .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
            .update(
                `${razorpay_order_id}|${razorpay_payment_id}`
            )
            .digest("hex");

        if (generatedSignature !== razorpay_signature) {
            return res.status(400).json({
                message: "Invalid payment signature",
            });
        }

        // Check resume
        const [resumes] = await pool.query(
            `SELECT id, user_id, resume_name
             FROM resumes
             WHERE id = ? AND user_id = ?
             LIMIT 1`,
            [resume_id, user_id]
        );

        if (resumes.length === 0) {
            return res.status(404).json({
                message: "Resume not found",
            });
        }

        return res.status(200).json({
            message: "Payment verified successfully",
            payment_verified: true,
            resume_id,
            payment_id: razorpay_payment_id,
            order_id: razorpay_order_id,
        });

    } catch (error) {
        console.error("Verify Razorpay Payment Error:", error);

        return res.status(500).json({
            message:
                error.message ||
                "Failed to verify payment",
        });
    }
});

module.exports = router;