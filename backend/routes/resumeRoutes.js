
const express = require("express");
const router = express.Router();

const db = require("../config/db");
const authenticateToken = require("../middleware/authMiddleware");

router.use(authenticateToken);

const SUPPORTED_RESUME_LANGUAGES = ["en", "hi", "fr", "es", "pt", "zh"];

function normalizeResumeLanguage(language, fallback = "en") {
    if (typeof language !== "string") {
        return fallback;
    }

    const normalized = language.trim().toLowerCase();

    return SUPPORTED_RESUME_LANGUAGES.includes(normalized)
        ? normalized
        : fallback;
}

function serializeJson(value) {
    if (value === undefined || value === null) {
        return null;
    }

    return typeof value === "string"
        ? value
        : JSON.stringify(value);
}

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
        const resumeLanguage = normalizeResumeLanguage(
            req.body.resume_language ?? req.body.resumeLanguage,
            "en"
        );

        if (!resume_name || !fullName) {
            return res.status(400).json({
                message: "Resume name and full name are required"
            });
        }

        const sql = `
            INSERT INTO resumes (
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
                resume_language
            )
            VALUES (
                ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
                ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
            )
        `;

        const values = [
            user_id,
            resume_name,
            fullName,
            email ?? null,
            phone ?? null,
            address ?? null,
            careerObjective ?? null,
            serializeJson(education),
            serializeJson(skills),
            serializeJson(experience),
            serializeJson(internships),
            serializeJson(projects),
            serializeJson(certifications),
            serializeJson(achievements),
            serializeJson(languages),
            linkedin ?? null,
            github ?? null,
            portfolio ?? null,
            serializeJson(references),
            profilePhoto ?? null,
            template ?? "classic",
            accentColor ?? null,
            fontFamily ?? null,
            serializeJson(sectionVisibility),
            serializeJson(sectionOrder),
            resumeLanguage
        ];

        const [result] = await db.query(sql, values);

        return res.status(201).json({
            message: "Resume saved successfully",
            resumeId: result.insertId,
            resume_language: resumeLanguage
        });
    } catch (error) {
        console.error("Save Resume Error:", error);

        return res.status(500).json({
            message: "Failed to save resume",
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
                COALESCE(resume_language, 'en') AS resume_language,
                is_default,
                created_at,
                updated_at
            FROM resumes
            WHERE user_id = ?
            ORDER BY updated_at DESC
        `;

        const [results] = await db.query(sql, [user_id]);

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
router.get("/:id", async (req, res) => {
    try {
        const [results] = await db.query(
            `SELECT *
             FROM resumes
             WHERE id = ? AND user_id = ?`,
            [req.params.id, req.user.id]
        );

        if (results.length === 0) {
            return res.status(404).json({
                message: "Resume not found"
            });
        }

        const resume = results[0];

        // Legacy rows fall back to English.
        resume.resume_language = normalizeResumeLanguage(
            resume.resume_language,
            "en"
        );

        return res.status(200).json(resume);
    } catch (error) {
        console.error("Get Single Resume Error:", error);

        return res.status(500).json({
            message: "Failed to fetch resume",
            error: error.message
        });
    }
});

// ==========================================
// GET RESUME VERSION HISTORY
// ==========================================
router.get("/:id/versions", async (req, res) => {
    try {
        const [rows] = await db.query(
            `SELECT
                v.id,
                v.version_number,
                v.created_at,
                p.razorpay_order_id,
                p.razorpay_payment_id,
                p.paid_at
             FROM resume_versions v
             LEFT JOIN resume_payments p
                ON p.resume_id = v.resume_id
                AND p.payment_status = 'success'
             WHERE v.resume_id = ? AND v.user_id = ?
             ORDER BY v.version_number DESC`,
            [req.params.id, req.user.id]
        );

        return res.json(rows);
    } catch (error) {
        console.error("Resume versions error:", error.message);

        return res.status(500).json({
            message: "Failed to load resume versions"
        });
    }
});

// ==========================================
// UPDATE RESUME
// ==========================================
router.put("/:id", async (req, res) => {
    try {
        const { id } = req.params;

        const [previousRows] = await db.query(
            `SELECT *
             FROM resumes
             WHERE id = ? AND user_id = ?
             LIMIT 1`,
            [id, req.user.id]
        );

        if (previousRows.length === 0) {
            return res.status(404).json({
                message: "Resume not found"
            });
        }

        const previousResume = previousRows[0];

        // Keep the previous language if the request omits it.
        const requestedLanguage =
            req.body.resume_language ?? req.body.resumeLanguage;

        const resumeLanguage =
            requestedLanguage === undefined || requestedLanguage === null
                ? normalizeResumeLanguage(
                    previousResume.resume_language,
                    "en"
                )
                : normalizeResumeLanguage(requestedLanguage, "en");

        // Preserve the existing version history behavior.
        const [versionRows] = await db.query(
            `SELECT COALESCE(MAX(version_number), 0) + 1 AS next_version
             FROM resume_versions
             WHERE resume_id = ?`,
            [id]
        );

        await db.query(
            `INSERT INTO resume_versions
                (user_id, resume_id, version_number, resume_data)
             VALUES (?, ?, ?, ?)`,
            [
                req.user.id,
                id,
                versionRows[0].next_version,
                JSON.stringify(previousResume)
            ]
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
                section_order = ?,
                resume_language = ?
            WHERE id = ? AND user_id = ?
        `;

        const values = [
            resume_name,
            fullName,
            email ?? null,
            phone ?? null,
            address ?? null,
            careerObjective ?? null,
            serializeJson(education),
            serializeJson(skills),
            serializeJson(experience),
            serializeJson(internships),
            serializeJson(projects),
            serializeJson(certifications),
            serializeJson(achievements),
            serializeJson(languages),
            linkedin ?? null,
            github ?? null,
            portfolio ?? null,
            serializeJson(references),
            profilePhoto ?? null,
            template ?? "classic",
            accentColor ?? null,
            fontFamily ?? null,
            serializeJson(sectionVisibility),
            serializeJson(sectionOrder),
            resumeLanguage,
            id,
            req.user.id
        ];

        const [result] = await db.query(sql, values);

        if (result.affectedRows === 0) {
            return res.status(404).json({
                message: "Resume not found"
            });
        }

        return res.status(200).json({
            message: "Resume updated successfully",
            resume_language: resumeLanguage
        });
    } catch (error) {
        console.error("Update Resume Error:", error);

        return res.status(500).json({
            message: "Failed to update resume",
            error: error.message
        });
    }
});

// ==========================================
// DELETE RESUME
// ==========================================
router.delete("/:id", async (req, res) => {
    try {
        const [result] = await db.query(
            `DELETE FROM resumes
             WHERE id = ? AND user_id = ?`,
            [req.params.id, req.user.id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({
                message: "Resume not found"
            });
        }

        return res.status(200).json({
            message: "Resume deleted successfully"
        });
    } catch (error) {
        console.error("Delete Resume Error:", error);

        return res.status(500).json({
            message: "Failed to delete resume",
            error: error.message
        });
    }
});

// ==========================================
// SET DEFAULT RESUME
// ==========================================
router.put("/:id/default", async (req, res) => {
    try {
        const { id } = req.params;

        const [ownedResume] = await db.query(
            `SELECT id
             FROM resumes
             WHERE id = ? AND user_id = ?
             LIMIT 1`,
            [id, req.user.id]
        );

        if (ownedResume.length === 0) {
            return res.status(404).json({
                message: "Resume not found"
            });
        }

        await db.query(
            `UPDATE resumes
             SET is_default = FALSE
             WHERE user_id = ?`,
            [req.user.id]
        );

        const [result] = await db.query(
            `UPDATE resumes
             SET is_default = TRUE
             WHERE id = ? AND user_id = ?`,
            [id, req.user.id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({
                message: "Resume not found"
            });
        }

        return res.status(200).json({
            message: "Default resume updated successfully"
        });
    } catch (error) {
        console.error("Default Resume Error:", error);

        return res.status(500).json({
            message: "Failed to set default resume",
            error: error.message
        });
    }
});

module.exports = router;
