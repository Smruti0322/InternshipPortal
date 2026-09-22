const express = require("express");
const router = express.Router();

const db = require("../config/db");

// ==========================================
// SAVE RESUME
// ==========================================
router.post("/", async (req, res) => {
    try {
        const {
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
            sectionVisibility,
            sectionOrder
        } = req.body;

        // Required fields
        if (!user_id || !resume_name || !fullName) {
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
// GET USER RESUMES
// ==========================================
router.get(
    "/user/:userId",
    async (req, res) => {
        try {
            const { userId } =
                req.params;

            console.log(
                "GET RESUMES REQUEST RECEIVED"
            );

            console.log(
                "User ID:",
                userId
            );

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

            const [results] =
                await db.query(
                    sql,
                    [userId]
                );

            console.log(
                "Resumes found:",
                results.length
            );

            return res.status(200).json(
                results
            );

        } catch (error) {
            console.error(
                "Database Error:",
                error
            );

            return res.status(500).json({
                success: false,
                message:
                    "Failed to fetch resumes",
                error: error.message
            });
        }
    }
);


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
            `;

            const [results] =
                await db.query(
                    sql,
                    [id]
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


// ==========================================
// UPDATE RESUME
// ==========================================
router.put(
    "/:id",
    async (req, res) => {
        try {
            const { id } =
                req.params;

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
                WHERE id = ?
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

                id
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
                WHERE id = ?
            `;

            const [result] =
                await db.query(
                    sql,
                    [id]
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

            // Remove default from all resumes
            await db.query(`
                UPDATE resumes
                SET is_default = FALSE
                WHERE user_id = 1
            `);

            // Set selected resume as default
            const [result] =
                await db.query(
                    `
                    UPDATE resumes
                    SET is_default = TRUE
                    WHERE id = ?
                    `,
                    [id]
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