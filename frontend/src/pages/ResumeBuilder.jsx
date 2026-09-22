import { useEffect, useState } from "react";
import "./ResumeBuilder.css";
import { useSearchParams, useNavigate } from "react-router-dom";

function ResumeBuilder() {
    const [formData, setFormData] = useState({
        fullName: "",
        email: "",
        phone: "",
        address: "",
        careerObjective: "",
        education: "",
        skills: "",
        experience: "",
        internships: "",
        projects: "",
        certifications: "",
        achievements: "",
        languages: "",
        linkedin: "",
        github: "",
        portfolio: "",
        references: "",
    });

    // ==========================================
    // SECTION VISIBILITY
    // ==========================================

    const [sectionVisibility, setSectionVisibility] = useState({
        careerObjective: true,
        education: true,
        skills: true,
        experience: true,
        internships: true,
        projects: true,
        certifications: true,
        achievements: true,
        languages: true,
        socialLinks: true,
        references: true,
    });

    // ==========================================
    // SECTION ORDER
    // ==========================================

    const defaultSectionOrder = [
        "careerObjective",
        "education",
        "skills",
        "experience",
        "internships",
        "projects",
        "certifications",
        "achievements",
        "languages",
        "socialLinks",
        "references",
    ];

    const [sectionOrder, setSectionOrder] = useState(
        defaultSectionOrder
    );

    // ==========================================
    // SECTION LABELS
    // ==========================================

    const sectionLabels = {
        careerObjective: "Career Objective",
        education: "Education",
        skills: "Skills",
        experience: "Work Experience",
        internships: "Internships",
        projects: "Projects",
        certifications: "Certifications",
        achievements: "Achievements",
        languages: "Languages",
        socialLinks: "Social Links",
        references: "References",
    };

    const [profilePhoto, setProfilePhoto] = useState("");
    const [template, setTemplate] = useState("classic");
    const [accentColor, setAccentColor] = useState("#2563eb");
    const [fontFamily, setFontFamily] = useState("Arial");

    const [searchParams] = useSearchParams();
    const navigate = useNavigate();

    const editId = searchParams.get("id");

    const [isEditMode, setIsEditMode] = useState(false);
    const [loadingResume, setLoadingResume] = useState(false);

    // ==========================================
    // HANDLE INPUT CHANGE
    // ==========================================

    const handleChange = (e) => {
        const { name, value } = e.target;

        setFormData((previous) => ({
            ...previous,
            [name]: value,
        }));
    };

    // ==========================================
    // HANDLE PROFILE PHOTO
    // ==========================================

    const handlePhotoChange = (e) => {
        const file = e.target.files[0];

        if (file) {
            setProfilePhoto(URL.createObjectURL(file));
        }
    };

    // ==========================================
    // TOGGLE SECTION
    // ==========================================

    const toggleSection = (section) => {
        setSectionVisibility((previous) => ({
            ...previous,
            [section]: !previous[section],
        }));
    };

    // ==========================================
    // MOVE SECTION UP
    // ==========================================

    const moveSectionUp = (index) => {
        if (index === 0) {
            return;
        }

        setSectionOrder((previous) => {
            const newOrder = [...previous];

            [newOrder[index - 1], newOrder[index]] = [
                newOrder[index],
                newOrder[index - 1],
            ];

            return newOrder;
        });
    };

    // ==========================================
    // MOVE SECTION DOWN
    // ==========================================

    const moveSectionDown = (index) => {
        if (index === sectionOrder.length - 1) {
            return;
        }

        setSectionOrder((previous) => {
            const newOrder = [...previous];

            [newOrder[index], newOrder[index + 1]] = [
                newOrder[index + 1],
                newOrder[index],
            ];

            return newOrder;
        });
    };

    // ==========================================
    // LOAD EXISTING RESUME FOR EDIT
    // ==========================================

    useEffect(() => {
        if (editId) {
            loadResume(editId);
        } else {
            setIsEditMode(false);
            setSectionOrder(defaultSectionOrder);
        }
    }, [editId]);

    const loadResume = async (id) => {
        try {
            setLoadingResume(true);

            const response = await fetch(
                `http://localhost:5000/api/resumes/${id}`
            );

            const data = await response.json();

            if (!response.ok) {
                throw new Error(
                    data.message || "Failed to load resume"
                );
            }

            setFormData({
                fullName: data.full_name || "",
                email: data.email || "",
                phone: data.phone || "",
                address: data.address || "",
                careerObjective:
                    data.career_objective || "",
                education: data.education || "",
                skills: data.skills || "",
                experience: data.experience || "",
                internships: data.internships || "",
                projects: data.projects || "",
                certifications:
                    data.certifications || "",
                achievements:
                    data.achievements || "",
                languages: data.languages || "",
                linkedin: data.linkedin || "",
                github: data.github || "",
                portfolio: data.portfolio || "",
                references:
                    data.references_info || "",
            });

            setProfilePhoto(
                data.profile_photo || ""
            );

            setTemplate(
                data.template || "classic"
            );

            setAccentColor(
                data.accent_color || "#2563eb"
            );

            setFontFamily(
                data.font_family || "Arial"
            );

            // ==========================================
            // LOAD SECTION VISIBILITY
            // ==========================================

            if (data.section_visibility) {
                try {
                    const savedVisibility =
                        typeof data.section_visibility ===
                            "string"
                            ? JSON.parse(
                                data.section_visibility
                            )
                            : data.section_visibility;

                    setSectionVisibility({
                        careerObjective:
                            savedVisibility
                                .careerObjective !== false,

                        education:
                            savedVisibility.education !==
                            false,

                        skills:
                            savedVisibility.skills !==
                            false,

                        experience:
                            savedVisibility.experience !==
                            false,

                        internships:
                            savedVisibility.internships !==
                            false,

                        projects:
                            savedVisibility.projects !==
                            false,

                        certifications:
                            savedVisibility.certifications !==
                            false,

                        achievements:
                            savedVisibility.achievements !==
                            false,

                        languages:
                            savedVisibility.languages !==
                            false,

                        socialLinks:
                            savedVisibility.socialLinks !==
                            false,

                        references:
                            savedVisibility.references !==
                            false,
                    });
                } catch (visibilityError) {
                    console.error(
                        "Visibility Parse Error:",
                        visibilityError
                    );
                }
            }

            // ==========================================
            // LOAD SECTION ORDER
            // ==========================================

            if (data.section_order) {
                try {
                    const savedOrder =
                        typeof data.section_order ===
                            "string"
                            ? JSON.parse(
                                data.section_order
                            )
                            : data.section_order;

                    if (
                        Array.isArray(savedOrder) &&
                        savedOrder.length > 0
                    ) {
                        // Make sure newly added sections
                        // are also included.
                        const validOrder =
                            savedOrder.filter((section) =>
                                defaultSectionOrder.includes(
                                    section
                                )
                            );

                        const missingSections =
                            defaultSectionOrder.filter(
                                (section) =>
                                    !validOrder.includes(
                                        section
                                    )
                            );

                        setSectionOrder([
                            ...validOrder,
                            ...missingSections,
                        ]);
                    } else {
                        setSectionOrder(
                            defaultSectionOrder
                        );
                    }
                } catch (orderError) {
                    console.error(
                        "Section Order Parse Error:",
                        orderError
                    );

                    setSectionOrder(
                        defaultSectionOrder
                    );
                }
            } else {
                setSectionOrder(
                    defaultSectionOrder
                );
            }

            setIsEditMode(true);

        } catch (error) {
            console.error(
                "Load Resume Error:",
                error
            );

            alert(
                "Failed to load resume: " +
                error.message
            );

            navigate("/my-resumes");

        } finally {
            setLoadingResume(false);
        }
    };

    // ==========================================
    // SAVE / UPDATE RESUME
    // ==========================================

    const handleSubmit = async (e) => {
        e.preventDefault();

        const defaultName = isEditMode
            ? "Updated Resume"
            : "";

        const resumeName = prompt(
            "Enter a name for this resume:",
            defaultName
        );

        if (!resumeName) {
            return;
        }

        try {
            const data = {
                resume_name: resumeName,

                fullName: formData.fullName,
                email: formData.email,
                phone: formData.phone,
                address: formData.address,

                careerObjective:
                    formData.careerObjective,

                education: formData.education,
                skills: formData.skills,
                experience: formData.experience,
                internships: formData.internships,
                projects: formData.projects,

                certifications:
                    formData.certifications,

                achievements:
                    formData.achievements,

                languages: formData.languages,

                linkedin: formData.linkedin,
                github: formData.github,
                portfolio: formData.portfolio,

                references: formData.references,

                profilePhoto: profilePhoto,

                template: template,

                accentColor: accentColor,

                fontFamily: fontFamily,

                // SECTION VISIBILITY
                sectionVisibility:
                    sectionVisibility,

                // SECTION ORDER
                sectionOrder:
                    sectionOrder,
            };

            let response;

            // ==========================================
            // UPDATE EXISTING RESUME
            // ==========================================

            if (isEditMode) {
                response = await fetch(
                    `http://localhost:5000/api/resumes/${editId}`,
                    {
                        method: "PUT",

                        headers: {
                            "Content-Type":
                                "application/json",
                        },

                        body: JSON.stringify(data),
                    }
                );

            } else {

                // ==========================================
                // CREATE NEW RESUME
                // ==========================================

                response = await fetch(
                    "http://localhost:5000/api/resumes",
                    {
                        method: "POST",

                        headers: {
                            "Content-Type":
                                "application/json",
                        },

                        body: JSON.stringify({
                            user_id: 1,
                            ...data,
                        }),
                    }
                );
            }

            const result =
                await response.json();

            if (!response.ok) {
                throw new Error(
                    result.message ||
                    "Failed to save resume"
                );
            }

            alert(
                isEditMode
                    ? "✅ Resume updated successfully!"
                    : "✅ Resume saved successfully!"
            );

            navigate("/my-resumes");

        } catch (error) {
            console.error(
                "Save/Update Resume Error:",
                error
            );

            alert(
                "❌ " + error.message
            );
        }
    };

    // ==========================================
    // RENDER PREVIEW SECTION
    // ==========================================

    const renderPreviewSection = (section) => {
        if (!sectionVisibility[section]) {
            return null;
        }

        switch (section) {
            case "careerObjective":
                return formData.careerObjective ? (
                    <ResumeSection
                        key={section}
                        title="Career Objective"
                        content={
                            formData.careerObjective
                        }
                    />
                ) : null;

            case "education":
                return formData.education ? (
                    <ResumeSection
                        key={section}
                        title="Education"
                        content={
                            formData.education
                        }
                    />
                ) : null;

            case "skills":
                return formData.skills ? (
                    <ResumeSection
                        key={section}
                        title="Skills"
                        content={formData.skills}
                    />
                ) : null;

            case "experience":
                return formData.experience ? (
                    <ResumeSection
                        key={section}
                        title="Work Experience"
                        content={
                            formData.experience
                        }
                    />
                ) : null;

            case "internships":
                return formData.internships ? (
                    <ResumeSection
                        key={section}
                        title="Internships"
                        content={
                            formData.internships
                        }
                    />
                ) : null;

            case "projects":
                return formData.projects ? (
                    <ResumeSection
                        key={section}
                        title="Projects"
                        content={
                            formData.projects
                        }
                    />
                ) : null;

            case "certifications":
                return formData.certifications ? (
                    <ResumeSection
                        key={section}
                        title="Certifications"
                        content={
                            formData.certifications
                        }
                    />
                ) : null;

            case "achievements":
                return formData.achievements ? (
                    <ResumeSection
                        key={section}
                        title="Achievements"
                        content={
                            formData.achievements
                        }
                    />
                ) : null;

            case "languages":
                return formData.languages ? (
                    <ResumeSection
                        key={section}
                        title="Languages"
                        content={
                            formData.languages
                        }
                    />
                ) : null;

            case "socialLinks":
                if (
                    !formData.linkedin &&
                    !formData.github &&
                    !formData.portfolio
                ) {
                    return null;
                }

                return (
                    <div
                        className="resume-section"
                        key={section}
                    >
                        <h3>Social Links</h3>

                        {formData.linkedin && (
                            <p>
                                {formData.linkedin}
                            </p>
                        )}

                        {formData.github && (
                            <p>
                                {formData.github}
                            </p>
                        )}

                        {formData.portfolio && (
                            <p>
                                {formData.portfolio}
                            </p>
                        )}
                    </div>
                );

            case "references":
                return formData.references ? (
                    <ResumeSection
                        key={section}
                        title="References"
                        content={
                            formData.references
                        }
                    />
                ) : null;

            default:
                return null;
        }
    };

    // ==========================================
    // LOADING SCREEN
    // ==========================================

    if (loadingResume) {
        return (
            <div
                style={{
                    textAlign: "center",
                    padding: "100px 20px",
                }}
            >
                <h2>
                    Loading Resume...
                </h2>

                <p>
                    Please wait...
                </p>
            </div>
        );
    }

    return (
        <div className="resume-builder">

            {/* ==========================================
                LEFT SIDE - FORM
            ========================================== */}

            <div className="builder-panel">

                {/* BACK BUTTON */}

                <button
                    type="button"
                    onClick={() =>
                        navigate("/my-resumes")
                    }
                    style={{
                        marginBottom: "20px",
                        padding: "10px 18px",
                        border: "none",
                        borderRadius: "6px",
                        background: "#6b7280",
                        color: "white",
                        cursor: "pointer",
                        fontWeight: "600",
                    }}
                >
                    ← Back to My Resumes
                </button>

                {/* HEADER */}

                <div className="builder-header">

                    <h1>
                        {isEditMode
                            ? "Edit Resume"
                            : "Resume Builder"}
                    </h1>

                    <p>
                        {isEditMode
                            ? "Update your professional resume"
                            : "Create your professional ATS-friendly resume"}
                    </p>

                </div>

                {/* ==========================================
    CUSTOMIZATION
========================================== */}

                <div className="customization-section">

                    <div className="customization-header">
                        <div>
                            <h2>Customize Resume</h2>
                            <p>
                                Personalize your resume appearance
                                and section layout.
                            </p>
                        </div>
                    </div>

                    {/* ==========================================
        TEMPLATE
    ========================================== */}

                    <div className="customization-group">

                        <label className="customization-label">
                            Resume Template
                        </label>

                        <div className="template-grid">

                            <button
                                type="button"
                                className={`template-card ${template === "classic"
                                    ? "active"
                                    : ""
                                    }`}
                                onClick={() =>
                                    setTemplate("classic")
                                }
                            >
                                <div className="template-preview classic-preview">
                                    <div className="template-line large"></div>
                                    <div className="template-line"></div>
                                    <div className="template-line"></div>
                                    <div className="template-line short"></div>
                                </div>

                                <div className="template-info">
                                    <strong>Classic</strong>
                                    <span>Traditional ATS</span>
                                </div>

                                {template === "classic" && (
                                    <span className="template-check">
                                        ✓
                                    </span>
                                )}
                            </button>

                            <button
                                type="button"
                                className={`template-card ${template === "modern"
                                    ? "active"
                                    : ""
                                    }`}
                                onClick={() =>
                                    setTemplate("modern")
                                }
                            >
                                <div className="template-preview modern-preview">
                                    <div className="template-line large"></div>
                                    <div className="template-line"></div>
                                    <div className="template-line"></div>
                                    <div className="template-line short"></div>
                                </div>

                                <div className="template-info">
                                    <strong>Modern</strong>
                                    <span>Clean & Professional</span>
                                </div>

                                {template === "modern" && (
                                    <span className="template-check">
                                        ✓
                                    </span>
                                )}
                            </button>

                            <button
                                type="button"
                                className={`template-card ${template === "minimal"
                                    ? "active"
                                    : ""
                                    }`}
                                onClick={() =>
                                    setTemplate("minimal")
                                }
                            >
                                <div className="template-preview minimal-preview">
                                    <div className="template-line large"></div>
                                    <div className="template-line"></div>
                                    <div className="template-line"></div>
                                    <div className="template-line short"></div>
                                </div>

                                <div className="template-info">
                                    <strong>Minimal</strong>
                                    <span>Simple & Elegant</span>
                                </div>

                                {template === "minimal" && (
                                    <span className="template-check">
                                        ✓
                                    </span>
                                )}
                            </button>

                        </div>

                    </div>

                    {/* ==========================================
        ACCENT COLOR
    ========================================== */}

                    <div className="customization-group">

                        <label className="customization-label">
                            Accent Color
                        </label>

                        <div className="color-picker-row">

                            <input
                                type="color"
                                value={accentColor}
                                onChange={(e) =>
                                    setAccentColor(
                                        e.target.value
                                    )
                                }
                                className="color-picker"
                            />

                            <div>
                                <strong>
                                    {accentColor.toUpperCase()}
                                </strong>

                                <span>
                                    Choose your resume theme color
                                </span>
                            </div>

                        </div>

                        <div className="color-presets">

                            {[
                                "#2563eb",
                                "#7c3aed",
                                "#059669",
                                "#dc2626",
                                "#ea580c",
                                "#0891b2",
                                "#111827",
                                "#4b5563",
                            ].map((color) => (
                                <button
                                    key={color}
                                    type="button"
                                    className={`color-preset ${accentColor === color
                                        ? "active"
                                        : ""
                                        }`}
                                    style={{
                                        backgroundColor: color,
                                    }}
                                    onClick={() =>
                                        setAccentColor(color)
                                    }
                                    title={color}
                                >
                                    {accentColor === color && (
                                        <span>✓</span>
                                    )}
                                </button>
                            ))}

                        </div>

                    </div>

                    {/* ==========================================
        FONT
    ========================================== */}

                    <div className="customization-group">

                        <label className="customization-label">
                            Font Family
                        </label>

                        <select
                            value={fontFamily}
                            onChange={(e) =>
                                setFontFamily(
                                    e.target.value
                                )
                            }
                            className="customization-select"
                        >
                            <option value="Arial">
                                Arial
                            </option>

                            <option value="Georgia">
                                Georgia
                            </option>

                            <option value="Verdana">
                                Verdana
                            </option>

                            <option value="Times New Roman">
                                Times New Roman
                            </option>
                        </select>

                        <div
                            className="font-preview"
                            style={{
                                fontFamily: fontFamily,
                            }}
                        >
                            Your Resume Name
                        </div>

                    </div>

                    {/* ==========================================
        SECTION VISIBILITY
    ========================================== */}

                    <div className="section-customization">

                        <h3>
                            Show / Hide Sections
                        </h3>

                        <p className="customization-description">
                            Select the sections you want
                            to display on your resume.
                        </p>

                        <div className="section-toggle-grid">

                            {defaultSectionOrder.map(
                                (key) => (
                                    <label
                                        className="section-toggle"
                                        key={key}
                                    >
                                        <input
                                            type="checkbox"
                                            checked={
                                                sectionVisibility[
                                                key
                                                ]
                                            }
                                            onChange={() =>
                                                toggleSection(
                                                    key
                                                )
                                            }
                                        />

                                        <span>
                                            {
                                                sectionLabels[
                                                key
                                                ]
                                            }
                                        </span>
                                    </label>
                                )
                            )}

                        </div>

                    </div>

                    {/* ==========================================
                    SECTION ORDER
                    ========================================== */}

                    <div className="section-customization">

                        <h3>
                            Section Order
                        </h3>

                        <p className="customization-description">
                            Use the arrows to change the
                            order of resume sections.
                        </p>

                        <div className="section-order-list">

                            {sectionOrder.map(
                                (section, index) => (
                                    <div
                                        className="section-order-item"
                                        key={section}
                                    >
                                        <span className="section-order-number">
                                            {index + 1}
                                        </span>

                                        <span className="section-order-name">
                                            {
                                                sectionLabels[
                                                section
                                                ]
                                            }
                                        </span>

                                        <div className="section-order-buttons">

                                            <button
                                                type="button"
                                                onClick={() =>
                                                    moveSectionUp(
                                                        index
                                                    )
                                                }
                                                disabled={
                                                    index === 0
                                                }
                                                title="Move Up"
                                            >
                                                ↑
                                            </button>

                                            <button
                                                type="button"
                                                onClick={() =>
                                                    moveSectionDown(
                                                        index
                                                    )
                                                }
                                                disabled={
                                                    index ===
                                                    sectionOrder.length -
                                                    1
                                                }
                                                title="Move Down"
                                            >
                                                ↓
                                            </button>

                                        </div>
                                    </div>
                                )
                            )}

                        </div>

                    </div>

                </div>

                {/* ==========================================
                    PERSONAL DETAILS
                ========================================== */}

                <div className="form-section">

                    <h2>
                        Personal Details
                    </h2>

                    <input
                        name="fullName"
                        placeholder="Full Name"
                        value={
                            formData.fullName
                        }
                        onChange={
                            handleChange
                        }
                    />

                    <div className="two-column">

                        <input
                            name="email"
                            placeholder="Email Address"
                            value={
                                formData.email
                            }
                            onChange={
                                handleChange
                            }
                        />

                        <input
                            name="phone"
                            placeholder="Phone Number"
                            value={
                                formData.phone
                            }
                            onChange={
                                handleChange
                            }
                        />

                    </div>

                    <input
                        name="address"
                        placeholder="Address"
                        value={
                            formData.address
                        }
                        onChange={
                            handleChange
                        }
                    />

                    <label>
                        Profile Photo
                    </label>

                    <input
                        type="file"
                        accept="image/*"
                        onChange={
                            handlePhotoChange
                        }
                    />

                </div>

                {/* ==========================================
                    CAREER OBJECTIVE
                ========================================== */}

                <div className="form-section">

                    <h2>
                        Career Objective
                    </h2>

                    <textarea
                        name="careerObjective"
                        placeholder="Write your career objective..."
                        value={
                            formData.careerObjective
                        }
                        onChange={
                            handleChange
                        }
                    />

                </div>

                {/* ==========================================
                    EDUCATION
                ========================================== */}

                <div className="form-section">

                    <h2>
                        Education
                    </h2>

                    <textarea
                        name="education"
                        placeholder="Example: MCA - XYZ University - 2026"
                        value={
                            formData.education
                        }
                        onChange={
                            handleChange
                        }
                    />

                </div>

                {/* ==========================================
                    SKILLS
                ========================================== */}

                <div className="form-section">

                    <h2>
                        Skills
                    </h2>

                    <textarea
                        name="skills"
                        placeholder="Example: React.js, Node.js, Express.js, MySQL"
                        value={
                            formData.skills
                        }
                        onChange={
                            handleChange
                        }
                    />

                </div>

                {/* ==========================================
                    EXPERIENCE
                ========================================== */}

                <div className="form-section">

                    <h2>
                        Work Experience
                    </h2>

                    <textarea
                        name="experience"
                        placeholder="Add your work experience..."
                        value={
                            formData.experience
                        }
                        onChange={
                            handleChange
                        }
                    />

                </div>

                {/* ==========================================
                    INTERNSHIPS
                ========================================== */}

                <div className="form-section">

                    <h2>
                        Internships
                    </h2>

                    <textarea
                        name="internships"
                        placeholder="Add internship details..."
                        value={
                            formData.internships
                        }
                        onChange={
                            handleChange
                        }
                    />

                </div>

                {/* ==========================================
                    PROJECTS
                ========================================== */}

                <div className="form-section">

                    <h2>
                        Projects
                    </h2>

                    <textarea
                        name="projects"
                        placeholder="Add your projects..."
                        value={
                            formData.projects
                        }
                        onChange={
                            handleChange
                        }
                    />

                </div>

                {/* ==========================================
                    CERTIFICATIONS
                ========================================== */}

                <div className="form-section">

                    <h2>
                        Certifications
                    </h2>

                    <textarea
                        name="certifications"
                        placeholder="Add certifications..."
                        value={
                            formData.certifications
                        }
                        onChange={
                            handleChange
                        }
                    />

                </div>

                {/* ==========================================
                    ACHIEVEMENTS
                ========================================== */}

                <div className="form-section">

                    <h2>
                        Achievements
                    </h2>

                    <textarea
                        name="achievements"
                        placeholder="Add achievements..."
                        value={
                            formData.achievements
                        }
                        onChange={
                            handleChange
                        }
                    />

                </div>

                {/* ==========================================
                    LANGUAGES
                ========================================== */}

                <div className="form-section">

                    <h2>
                        Languages
                    </h2>

                    <input
                        name="languages"
                        placeholder="English, Hindi, Gujarati..."
                        value={
                            formData.languages
                        }
                        onChange={
                            handleChange
                        }
                    />

                </div>

                {/* ==========================================
                    SOCIAL LINKS
                ========================================== */}

                <div className="form-section">

                    <h2>
                        Social Links
                    </h2>

                    <input
                        name="linkedin"
                        placeholder="LinkedIn URL"
                        value={
                            formData.linkedin
                        }
                        onChange={
                            handleChange
                        }
                    />

                    <input
                        name="github"
                        placeholder="GitHub URL"
                        value={
                            formData.github
                        }
                        onChange={
                            handleChange
                        }
                    />

                    <input
                        name="portfolio"
                        placeholder="Portfolio URL"
                        value={
                            formData.portfolio
                        }
                        onChange={
                            handleChange
                        }
                    />

                </div>

                {/* ==========================================
                    REFERENCES
                ========================================== */}

                <div className="form-section">

                    <h2>
                        References
                    </h2>

                    <textarea
                        name="references"
                        placeholder="Add references..."
                        value={
                            formData.references
                        }
                        onChange={
                            handleChange
                        }
                    />

                </div>

                {/* ==========================================
                    SAVE BUTTON
                ========================================== */}

                <button
                    type="button"
                    className="save-btn"
                    onClick={handleSubmit}
                >
                    {isEditMode
                        ? "Update Resume"
                        : "Save Resume"}
                </button>

            </div>

            {/* ==========================================
                RIGHT SIDE - LIVE PREVIEW
            ========================================== */}

            <div className="preview-panel">

                <div className="preview-header">

                    <h2>
                        Live Preview
                    </h2>

                    <span>
                        ATS Friendly
                    </span>

                </div>

                <div
                    className={`resume-paper ${template}`}
                    style={{
                        fontFamily:
                            fontFamily,

                        "--accent-color":
                            accentColor,
                    }}
                >

                    {/* HEADER */}

                    <div
                        className="resume-header"
                        style={{
                            borderColor:
                                accentColor,
                        }}
                    >

                        {profilePhoto && (
                            <img
                                src={
                                    profilePhoto
                                }
                                alt="Profile"
                                className="resume-photo"
                            />
                        )}

                        <div>

                            <h1>
                                {formData.fullName ||
                                    "Your Name"}
                            </h1>

                            <div className="contact-info">

                                {formData.email && (
                                    <span>
                                        {
                                            formData.email
                                        }
                                    </span>
                                )}

                                {formData.phone && (
                                    <span>
                                        {
                                            formData.phone
                                        }
                                    </span>
                                )}

                                {formData.address && (
                                    <span>
                                        {
                                            formData.address
                                        }
                                    </span>
                                )}

                            </div>

                        </div>

                    </div>

                    {/* ==========================================
                        DYNAMIC SECTION ORDER
                    ========================================== */}

                    {sectionOrder.map(
                        (section) =>
                            renderPreviewSection(
                                section
                            )
                    )}

                </div>

            </div>

        </div>
    );
}

// ==========================================
// RESUME SECTION
// ==========================================

function ResumeSection({
    title,
    content,
}) {
    return (
        <div className="resume-section">

            <h3>
                {title}
            </h3>

            <p>
                {content}
            </p>

        </div>
    );
}

export default ResumeBuilder;