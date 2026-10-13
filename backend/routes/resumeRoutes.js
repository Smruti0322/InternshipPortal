const express = require("express");
const router = express.Router();

const db = require("../config/db");
const authenticateToken = require("../middleware/authMiddleware");
router.use(authenticateToken);

// ==========================================
// SAVE RESUME
// ==========================================
router.post("/", async (req, res) => {
    try {
        const {
            resume_name,
            fullName,
            email,
            phone,
            address,
            careerObjective,
            education,
            skills,
            experience,
            internships,
            projects,
            certifications,
            achievements,
            languages,
            linkedin,
            github,
            portfolio,
            references,
            profilePhoto,
            template,
            accentColor,
            fontFamily,
            sectionVisibility,
            sectionOrder
        } = req.body;
        const user_id = req.user.id;

        // Required fields
        if (!resume_name || !fullName) {
            return res.status(400).json({
                message:
                    "User ID, resume name and full name are required"
            });
        }

        const sql = `
            INSERT INTO resumes
            (
                user_id,
                resume_name,
                full_name,
                email,
                phone,
                address,
                career_objective,
                education,
                skills,
                experience,
                internships,
                projects,
                certifications,
                achievements,
                languages,
                linkedin,
                github,
                portfolio,
                references_info,
                profile_photo,
                template,
                accent_color,
                font_family,
                section_visibility,
                section_order
            )
            VALUES
            (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;

        const values = [
            user_id,
            resume_name,
            fullName,
            email,
            phone,
            address,
            careerObjective,
            education,
            skills,
            experience,
            internships,
            projects,
            certifications,
            achievements,
            languages,
            linkedin,
            github,
            portfolio,
            references,
            profilePhoto,
            template,
            accentColor,
            fontFamily,

            // SECTION VISIBILITY
            sectionVisibility
                ? JSON.stringify(sectionVisibility)
                : null,

            // SECTION ORDER
            sectionOrder
                ? JSON.stringify(sectionOrder)
                : null
        ];

        const [result] = await db.query(
            sql,
            values
        );

        return res.status(201).json({
            message:
                "Resume saved successfully",
            resumeId: result.insertId
        });

    } catch (error) {
        console.error(
            "Save Resume Error:",
            error
        );

        return res.status(500).json({
            message:
                "Failed to save resume",
            error: error.message
        });
    }
});


// ==========================================
// GET LOGGED-IN USER RESUMES
// ==========================================
router.get("/", async (req, res) => {
    try {
        const user_id = req.user.id;

        console.log("GET RESUMES REQUEST RECEIVED");
        console.log("Logged-in User ID:", user_id);

        const sql = `
            SELECT
                id,
                user_id,
                resume_name,
                full_name,
                email,
                phone,
                address,
                career_objective,
                education,
                skills,
                experience,
                internships,
                projects,
                certifications,
                achievements,
                languages,
                linkedin,
                github,
                portfolio,
                references_info,
                profile_photo,
                template,
                accent_color,
                font_family,
                section_visibility,
                section_order,
                is_default,
                created_at,
                updated_at
            FROM resumes
            WHERE user_id = ?
            ORDER BY updated_at DESC
        `;

        const [results] = await db.query(sql, [user_id]);

        console.log("Resumes found:", results.length);

        return res.status(200).json(results);

    } catch (error) {
        console.error("Get Resumes Error:", error);

        return res.status(500).json({
            message: "Failed to fetch resumes",
            error: error.message
        });
    }
});


// ==========================================
// GET SINGLE RESUME
// ==========================================
router.get(
    "/:id",
    async (req, res) => {
        try {
            const { id } =
                req.params;

            const sql = `
                SELECT *
                FROM resumes
                WHERE id = ?
                AND user_id = ?
            `;

            const [results] =
                await db.query(
                    sql,
                    [id, req.user.id]
                );

            if (
                results.length === 0
            ) {
                return res.status(404).json({
                    message:
                        "Resume not found"
                });
            }

            return res.status(200).json(
                results[0]
            );

        } catch (error) {
            console.error(
                "Database Error:",
                error
            );

            return res.status(500).json({
                message:
                    "Failed to fetch resume",
                error: error.message
            });
        }
    }
);

// Previous snapshots are retained before every edit and are visible only to the owner.
router.get("/:id/versions", async (req, res) => {
    try {
        const [rows] = await db.query(
            `SELECT v.id, v.version_number, v.created_at, p.razorpay_order_id, p.razorpay_payment_id, p.paid_at
             FROM resume_versions v
             LEFT JOIN resume_payments p ON p.resume_id = v.resume_id AND p.payment_status = 'success'
             WHERE v.resume_id = ? AND v.user_id = ? ORDER BY v.version_number DESC`,
            [req.params.id, req.user.id]
        );
        res.json(rows);
    } catch (error) {
        console.error("Resume versions error:", error.message);
        res.status(500).json({ message: "Failed to load resume versions" });
    }
});


// ==========================================
// UPDATE RESUME
// ==========================================
router.put(
    "/:id",
    async (req, res) => {
        try {
            const { id } =
                req.params;

            const [previousRows] = await db.query(
                "SELECT * FROM resumes WHERE id = ? AND user_id = ? LIMIT 1",
                [id, req.user.id]
            );
            if (previousRows.length === 0) {
                return res.status(404).json({ message: "Resume not found" });
            }
            const [versionRows] = await db.query(
                "SELECT COALESCE(MAX(version_number), 0) + 1 AS next_version FROM resume_versions WHERE resume_id = ?",
                [id]
            );
            await db.query(
                "INSERT INTO resume_versions (user_id, resume_id, version_number, resume_data) VALUES (?, ?, ?, ?)",
                [req.user.id, id, versionRows[0].next_version, JSON.stringify(previousRows[0])]
            );

            const {
                resume_name,
                fullName,
                email,
                phone,
                address,
                careerObjective,
                education,
                skills,
                experience,
                internships,
                projects,
                certifications,
                achievements,
                languages,
                linkedin,
                github,
                portfolio,
                references,
                profilePhoto,
                template,
                accentColor,
                fontFamily,
                sectionVisibility,
                sectionOrder
            } = req.body;

            const sql = `
                UPDATE resumes
                SET
                    resume_name = ?,
                    full_name = ?,
                    email = ?,
                    phone = ?,
                    address = ?,
                    career_objective = ?,
                    education = ?,
                    skills = ?,
                    experience = ?,
                    internships = ?,
                    projects = ?,
                    certifications = ?,
                    achievements = ?,
                    languages = ?,
                    linkedin = ?,
                    github = ?,
                    portfolio = ?,
                    references_info = ?,
                    profile_photo = ?,
                    template = ?,
                    accent_color = ?,
                    font_family = ?,
                    section_visibility = ?,
                    section_order = ?
                WHERE id = ? AND user_id = ?
            `;

            const values = [
                resume_name,
                fullName,
                email,
                phone,
                address,
                careerObjective,
                education,
                skills,
                experience,
                internships,
                projects,
                certifications,
                achievements,
                languages,
                linkedin,
                github,
                portfolio,
                references,
                profilePhoto,
                template,
                accentColor,
                fontFamily,

                // SECTION VISIBILITY
                sectionVisibility
                    ? JSON.stringify(
                        sectionVisibility
                    )
                    : null,

                // SECTION ORDER
                sectionOrder
                    ? JSON.stringify(
                        sectionOrder
                    )
                    : null,

                id,
                req.user.id
            ];

            const [result] =
                await db.query(
                    sql,
                    values
                );

            if (
                result.affectedRows === 0
            ) {
                return res.status(404).json({
                    message:
                        "Resume not found"
                });
            }

            return res.status(200).json({
                message:
                    "Resume updated successfully"
            });

        } catch (error) {
            console.error(
                "Update Resume Error:",
                error
            );

            return res.status(500).json({
                message:
                    "Failed to update resume",
                error: error.message
            });
        }
    }
);


// ==========================================
// DELETE RESUME
// ==========================================
router.delete(
    "/:id",
    async (req, res) => {
        try {
            const { id } =
                req.params;

            const sql = `
                DELETE FROM resumes
                WHERE id = ? AND user_id = ?
            `;

            const [result] =
                await db.query(
                    sql,
                    [id, req.user.id]
                );

            if (
                result.affectedRows === 0
            ) {
                return res.status(404).json({
                    message:
                        "Resume not found"
                });
            }

            return res.status(200).json({
                message:
                    "Resume deleted successfully"
            });

        } catch (error) {
            console.error(
                "Delete Resume Error:",
                error
            );

            return res.status(500).json({
                message:
                    "Failed to delete resume",
                error: error.message
            });
        }
    }
);


// ==========================================
// SET DEFAULT RESUME
// ==========================================
router.put(
    "/:id/default",
    async (req, res) => {
        try {
            const { id } =
                req.params;

            const [ownedResume] = await db.query(
                "SELECT id FROM resumes WHERE id = ? AND user_id = ? LIMIT 1",
                [id, req.user.id]
            );
            if (ownedResume.length === 0) {
                return res.status(404).json({ message: "Resume not found" });
            }

            // Remove default from all resumes
            await db.query(`
                UPDATE resumes
                SET is_default = FALSE
                WHERE user_id = ?
            `, [req.user.id]);

            // Set selected resume as default
            const [result] =
                await db.query(
                    `
                    UPDATE resumes
                    SET is_default = TRUE
                    WHERE id = ? AND user_id = ?
                    `,
                    [id, req.user.id]
                );

            if (
                result.affectedRows === 0
            ) {
                return res.status(404).json({
                    message:
                        "Resume not found"
                });
            }

            return res.status(200).json({
                message:
                    "Default resume updated successfully"
            });

        } catch (error) {
            console.error(
                "Default Resume Error:",
                error
            );

            return res.status(500).json({
                message:
                    "Failed to set default resume",
                error: error.message
            });
        }
    }
);


module.exports = router;
