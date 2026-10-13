
const express = require("express");
const db = require("../config/db");
const authenticateToken = require("../middleware/authMiddleware");

const router = express.Router();

router.use(authenticateToken);

// GET /api/internships
router.get("/", async (req, res) => {
    try {
        const [internships] = await db.query(
            `SELECT id, title, company_name, description, location,
                    stipend, duration, application_deadline, created_at
             FROM internship_listings
             WHERE status = 'open'
               AND (application_deadline IS NULL
                    OR application_deadline >= CURDATE())
             ORDER BY created_at DESC`
        );

        res.json(internships);
    } catch (error) {
        console.error("Internship listing error:", error.message);
        res.status(500).json({ message: "Could not load internships." });
    }
});

// GET /api/internships/my-applications
router.get("/my-applications", async (req, res) => {
    try {
        const [applications] = await db.query(
            `SELECT a.id AS application_id, a.status, a.applied_at,
                    i.id AS internship_id, i.title, i.company_name,
                    i.location, i.stipend, i.duration
             FROM internship_applications a
             JOIN internship_listings i ON i.id = a.internship_id
             WHERE a.user_id = ?
             ORDER BY a.applied_at DESC`,
            [req.user.id]
        );

        res.json(applications);
    } catch (error) {
        console.error("My applications error:", error.message);
        res.status(500).json({ message: "Could not load your applications." });
    }
});

// POST /api/internships/:id/apply

router.post("/:id/apply", async (req, res) => {
    const connection = await db.getConnection();
    let transactionStarted = false;

    try {
        const userId = Number(req.user.id);
        const internshipId = Number(req.params.id);

        if (!Number.isInteger(internshipId) || internshipId <= 0) {
            return res.status(400).json({
                message: "Invalid internship ID."
            });
        }

        await connection.beginTransaction();
        transactionStarted = true;

        const [listings] = await connection.query(
            `SELECT id, status, application_deadline
             FROM internship_listings
             WHERE id = ?
             LIMIT 1`,
            [internshipId]
        );

        if (!listings.length) {
            const error = new Error("Internship not found.");
            error.status = 404;
            throw error;
        }

        const listing = listings[0];

        if (
            listing.status !== "open" ||
            (
                listing.application_deadline &&
                new Date(listing.application_deadline) <
                new Date(new Date().toISOString().slice(0, 10))
            )
        ) {
            const error = new Error(
                "Applications are closed for this internship."
            );
            error.status = 400;
            throw error;
        }

        const [existing] = await connection.query(
            `SELECT id
             FROM internship_applications
             WHERE user_id = ? AND internship_id = ?
             LIMIT 1`,
            [userId, internshipId]
        );

        if (existing.length) {
            const error = new Error(
                "You have already applied for this internship."
            );
            error.status = 409;
            throw error;
        }

        // Expire subscriptions whose validity has ended.
        await connection.query(
            `UPDATE user_subscriptions
             SET status = 'expired'
             WHERE user_id = ?
               AND status = 'active'
               AND expires_at <= NOW()`,
            [userId]
        );

        // Lock the user's subscription while checking quota.
        let [subscriptions] = await connection.query(
            `SELECT s.id, s.applications_used,
                    s.started_at, s.expires_at,
                    p.plan_name, p.application_limit
             FROM user_subscriptions s
             JOIN subscription_plans p ON p.id = s.plan_id
             WHERE s.user_id = ?
               AND s.status = 'active'
               AND s.expires_at > NOW()
             ORDER BY s.expires_at DESC, s.id DESC
             LIMIT 1
             FOR UPDATE`,
            [userId]
        );

        // Initialize the Free plan if no valid subscription exists.
        if (!subscriptions.length) {
            const [freePlans] = await connection.query(
                `SELECT id, application_limit
                 FROM subscription_plans
                 WHERE plan_name = 'Free'
                 LIMIT 1`
            );

            if (!freePlans.length) {
                const error = new Error(
                    "Free plan is not configured."
                );
                error.status = 500;
                throw error;
            }

            const [inserted] = await connection.query(
                `INSERT INTO user_subscriptions
                 (user_id, plan_id, status, started_at,
                  expires_at, applications_used)
                 VALUES (
                    ?, ?, 'active', NOW(),
                    DATE_ADD(NOW(), INTERVAL 1 MONTH), 0
                 )`,
                [userId, freePlans[0].id]
            );

            const [createdSubscription] = await connection.query(
                `SELECT s.id, s.applications_used,
                        s.started_at, s.expires_at,
                        p.plan_name, p.application_limit
                 FROM user_subscriptions s
                 JOIN subscription_plans p ON p.id = s.plan_id
                 WHERE s.id = ?
                 LIMIT 1`,
                [inserted.insertId]
            );

            subscriptions = createdSubscription;
        }

        const subscription = subscriptions[0];

        // Count applications inside this subscription's billing cycle.
        const [counts] = await connection.query(
            `SELECT COUNT(*) AS total
             FROM internship_applications
             WHERE user_id = ?
               AND applied_at >= ?
               AND applied_at < ?`,
            [
                userId,
                subscription.started_at,
                subscription.expires_at
            ]
        );

        const usedThisMonth = Number(counts[0].total);

        const limit =
            subscription.application_limit === null
                ? null
                : Number(subscription.application_limit);

        if (limit !== null && usedThisMonth >= limit) {
            const error = new Error(
                `Your ${subscription.plan_name} plan allows ` +
                `${limit} application(s) per billing cycle. ` +
                "Upgrade your plan or try again after your quota renews."
            );
            error.status = 403;
            throw error;
        }

        await connection.query(
            `INSERT INTO internship_applications
             (user_id, internship_id)
             VALUES (?, ?)`,
            [userId, internshipId]
        );

        const newUsedCount = usedThisMonth + 1;

        await connection.query(
            `UPDATE user_subscriptions
             SET applications_used = ?
             WHERE id = ?`,
            [newUsedCount, subscription.id]
        );

        await connection.commit();
        transactionStarted = false;

        res.status(201).json({
            message: "Application submitted successfully.",
            plan_name: subscription.plan_name,
            applications_used: newUsedCount,
            application_limit: limit,
            remaining_applications:
                limit === null
                    ? null
                    : Math.max(0, limit - newUsedCount)
        });
    } catch (error) {
        if (transactionStarted) {
            await connection.rollback();
        }

        console.error(
            "Apply internship error:",
            error.message
        );

        res.status(error.status || 500).json({
            message: error.status
                ? error.message
                : "Could not submit your application."
        });
    } finally {
        connection.release();
    }
});

module.exports = router;