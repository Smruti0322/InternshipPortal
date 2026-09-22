const db = require("../config/db");
const nodemailer = require("nodemailer");
const crypto = require("crypto");

// =====================================================
// EMAIL TRANSPORTER
// =====================================================

const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT),
    secure: false,
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
    },
});

// =====================================================
// CREATE RESUME
// =====================================================

const createResume = async (req, res) => {
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
            sectionOrder,
        } = req.body;

        if (!user_id) {
            return res.status(400).json({
                message: "User ID is required.",
            });
        }

        if (!resume_name) {
            return res.status(400).json({
                message: "Resume name is required.",
            });
        }

        const [result] = await db.query(
            `INSERT INTO resumes
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
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                user_id,
                resume_name,
                fullName || null,
                email || null,
                phone || null,
                address || null,
                careerObjective || null,
                education || null,
                skills || null,
                experience || null,
                internships || null,
                projects || null,
                certifications || null,
                achievements || null,
                languages || null,
                linkedin || null,
                github || null,
                portfolio || null,
                references || null,
                profilePhoto || null,
                template || "classic",
                accentColor || "#2563eb",
                fontFamily || "Arial",
                JSON.stringify(
                    sectionVisibility || {}
                ),
                JSON.stringify(
                    sectionOrder || []
                ),
            ]
        );

        return res.status(201).json({
            message: "Resume created successfully.",
            resumeId: result.insertId,
        });
    } catch (error) {
        console.error(
            "Create Resume Error:",
            error
        );

        return res.status(500).json({
            message: "Failed to create resume.",
        });
    }
};

// =====================================================
// GET SINGLE RESUME
// =====================================================

const getResumeById = async (req, res) => {
    try {
        const { id } = req.params;

        const [rows] = await db.query(
            `SELECT *
             FROM resumes
             WHERE id = ?`,
            [id]
        );

        if (rows.length === 0) {
            return res.status(404).json({
                message: "Resume not found.",
            });
        }

        return res.status(200).json(
            rows[0]
        );
    } catch (error) {
        console.error(
            "Get Resume Error:",
            error
        );

        return res.status(500).json({
            message: "Failed to get resume.",
        });
    }
};

// =====================================================
// GET ALL RESUMES
// =====================================================

const getAllResumes = async (req, res) => {
    try {
        const userId =
            req.query.user_id || 1;

        const [rows] = await db.query(
            `SELECT *
             FROM resumes
             WHERE user_id = ?
             ORDER BY updated_at DESC`,
            [userId]
        );

        return res.status(200).json(
            rows
        );
    } catch (error) {
        console.error(
            "Get All Resumes Error:",
            error
        );

        return res.status(500).json({
            message:
                "Failed to get resumes.",
        });
    }
};

// =====================================================
// UPDATE RESUME
// =====================================================

const updateResume = async (req, res) => {
    try {
        const { id } = req.params;

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
            sectionOrder,
        } = req.body;

        const [result] = await db.query(
            `UPDATE resumes
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
             WHERE id = ?`,
            [
                resume_name,
                fullName || null,
                email || null,
                phone || null,
                address || null,
                careerObjective || null,
                education || null,
                skills || null,
                experience || null,
                internships || null,
                projects || null,
                certifications || null,
                achievements || null,
                languages || null,
                linkedin || null,
                github || null,
                portfolio || null,
                references || null,
                profilePhoto || null,
                template || "classic",
                accentColor || "#2563eb",
                fontFamily || "Arial",
                JSON.stringify(
                    sectionVisibility || {}
                ),
                JSON.stringify(
                    sectionOrder || []
                ),
                id,
            ]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({
                message: "Resume not found.",
            });
        }

        return res.status(200).json({
            message:
                "Resume updated successfully.",
        });
    } catch (error) {
        console.error(
            "Update Resume Error:",
            error
        );

        return res.status(500).json({
            message:
                "Failed to update resume.",
        });
    }
};

// =====================================================
// DELETE RESUME
// =====================================================

const deleteResume = async (req, res) => {
    try {
        const { id } = req.params;

        const [result] = await db.query(
            `DELETE FROM resumes
             WHERE id = ?`,
            [id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({
                message: "Resume not found.",
            });
        }

        return res.status(200).json({
            message:
                "Resume deleted successfully.",
        });
    } catch (error) {
        console.error(
            "Delete Resume Error:",
            error
        );

        return res.status(500).json({
            message:
                "Failed to delete resume.",
        });
    }
};

module.exports = {
    createResume,
    getResumeById,
    getAllResumes,
    updateResume,
    deleteResume,
};