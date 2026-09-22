import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import "./ViewResume.css";

function ViewResume() {
    const { id } = useParams();
    const navigate = useNavigate();

    const [resume, setResume] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [downloading, setDownloading] = useState(false);

    // ==========================================
    // OTP STATES
    // ==========================================

    const [showOtpModal, setShowOtpModal] = useState(false);
    const [otp, setOtp] = useState("");
    const [otpLoading, setOtpLoading] = useState(false);
    const [otpMessage, setOtpMessage] = useState("");
    const [otpError, setOtpError] = useState("");
    const [otpVerified, setOtpVerified] = useState(false);

    // ==========================================
    // DEFAULT SECTION ORDER
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

    // ==========================================
    // PARSE SECTION ORDER
    // ==========================================

    const parseSectionOrder = (value) => {
        try {
            const savedOrder =
                typeof value === "string"
                    ? JSON.parse(value)
                    : value;

            if (!Array.isArray(savedOrder)) {
                return defaultSectionOrder;
            }

            const validOrder = savedOrder.filter(
                (section) =>
                    defaultSectionOrder.includes(section)
            );

            const missingSections =
                defaultSectionOrder.filter(
                    (section) =>
                        !validOrder.includes(section)
                );

            return [
                ...validOrder,
                ...missingSections,
            ];
        } catch (error) {
            console.error(
                "Section Order Parse Error:",
                error
            );

            return defaultSectionOrder;
        }
    };

    // ==========================================
    // FETCH RESUME
    // ==========================================

    useEffect(() => {
        fetchResume();
    }, [id]);

    const fetchResume = async () => {
        try {
            setLoading(true);

            const response = await fetch(
                `http://localhost:5000/api/resumes/${id}`
            );

            const data = await response.json();

            if (!response.ok) {
                throw new Error(
                    data.message ||
                    "Failed to load resume"
                );
            }

            setResume(data);
            setError("");

            console.log(
                "Saved Section Order:",
                data.section_order
            );

            console.log(
                "Parsed Section Order:",
                parseSectionOrder(
                    data.section_order
                )
            );
        } catch (error) {
            console.error(
                "Fetch Resume Error:",
                error
            );

            setError(error.message);
        } finally {
            setLoading(false);
        }
    };

    // ==========================================
    // GENERATE PDF
    // ==========================================

    const generatePDF = async () => {
        const resumeElement =
            document.getElementById("resume-pdf");

        if (!resumeElement) {
            alert("Resume preview not found.");
            return;
        }

        try {
            setDownloading(true);

            const canvas = await html2canvas(
                resumeElement,
                {
                    scale: 3,
                    useCORS: true,
                    allowTaint: true,
                    backgroundColor: "#ffffff",
                    logging: false,
                    imageTimeout: 15000,
                }
            );

            const pdf = new jsPDF(
                "p",
                "mm",
                "a4"
            );

            const pageWidth = 210;
            const pageHeight = 297;

            const margin = 10;

            const contentWidth =
                pageWidth - margin * 2;

            const contentHeight =
                pageHeight - margin * 2;

            const pageNumberSpace = 7;

            const actualContentHeight =
                contentHeight -
                pageNumberSpace;

            const pixelsPerMM =
                canvas.width /
                contentWidth;

            const pageSourceHeight =
                actualContentHeight *
                pixelsPerMM;

            const totalPages = Math.ceil(
                canvas.height /
                pageSourceHeight
            );

            let sourceY = 0;

            for (
                let pageNumber = 1;
                pageNumber <= totalPages;
                pageNumber++
            ) {
                if (pageNumber > 1) {
                    pdf.addPage();
                }

                const remainingPixels =
                    canvas.height -
                    sourceY;

                const currentSourceHeight =
                    Math.min(
                        pageSourceHeight,
                        remainingPixels
                    );

                const currentPdfHeight =
                    currentSourceHeight /
                    pixelsPerMM;

                const pageCanvas =
                    document.createElement(
                        "canvas"
                    );

                pageCanvas.width =
                    canvas.width;

                pageCanvas.height =
                    Math.ceil(
                        currentSourceHeight
                    );

                const pageContext =
                    pageCanvas.getContext("2d");

                pageContext.fillStyle =
                    "#ffffff";

                pageContext.fillRect(
                    0,
                    0,
                    pageCanvas.width,
                    pageCanvas.height
                );

                pageContext.drawImage(
                    canvas,
                    0,
                    sourceY,
                    canvas.width,
                    currentSourceHeight,
                    0,
                    0,
                    canvas.width,
                    currentSourceHeight
                );

                const pageImage =
                    pageCanvas.toDataURL(
                        "image/png",
                        1.0
                    );

                pdf.addImage(
                    pageImage,
                    "PNG",
                    margin,
                    margin,
                    contentWidth,
                    currentPdfHeight,
                    undefined,
                    "FAST"
                );

                if (totalPages > 1) {
                    pdf.setFont(
                        "helvetica",
                        "normal"
                    );

                    pdf.setFontSize(8);

                    pdf.setTextColor(
                        100,
                        100,
                        100
                    );

                    pdf.text(
                        `Page ${pageNumber} of ${totalPages}`,
                        pageWidth - margin,
                        pageHeight - 4,
                        {
                            align: "right",
                        }
                    );
                }

                sourceY +=
                    currentSourceHeight;
            }

            const cleanName = (
                resume.full_name ||
                "Resume"
            )
                .trim()
                .replace(
                    /[^a-zA-Z0-9]+/g,
                    "_"
                );

            pdf.save(
                `${cleanName}_Resume.pdf`
            );
        } catch (error) {
            console.error(
                "PDF Generation Error:",
                error
            );

            alert(
                "Failed to generate PDF. Please try again."
            );
        } finally {
            setDownloading(false);
        }
    };

    // ==========================================
    // SEND OTP
    // ==========================================

    const handleSendOTP = async () => {
        if (!resume?.email) {
            setOtpError(
                "Registered email is not available."
            );
            return;
        }

        try {
            setOtpLoading(true);
            setOtpError("");
            setOtpMessage("");

            const response = await fetch(
                "http://localhost:5000/api/resume-otp/send",
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        user_id: resume.user_id,
                        email: resume.email,
                    }),
                }
            );

            const data = await response.json();

            if (!response.ok) {
                throw new Error(
                    data.message ||
                    "Failed to send OTP"
                );
            }

            setOtpMessage(
                "OTP has been sent to your registered email."
            );
        } catch (error) {
            console.error(
                "Send OTP Error:",
                error
            );

            setOtpError(
                error.message ||
                "Failed to send OTP."
            );
        } finally {
            setOtpLoading(false);
        }
    };

    // ==========================================
    // VERIFY OTP
    // ==========================================

    const handleVerifyOTP = async () => {
        if (otp.length !== 6) {
            setOtpError(
                "Please enter a valid 6-digit OTP."
            );
            return;
        }

        try {
            setOtpLoading(true);
            setOtpError("");
            setOtpMessage("");

            const response = await fetch(
                "http://localhost:5000/api/resume-otp/verify",
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        user_id: resume.user_id,
                        email: resume.email,
                        otp: otp,
                    }),
                }
            );

            const data = await response.json();

            if (!response.ok) {
                throw new Error(
                    data.message ||
                    "OTP verification failed"
                );
            }

            setOtpVerified(true);
            setOtp("");

            setOtpMessage(
                "Email verified successfully."
            );

            setShowOtpModal(false);

            alert(
                "✅ Email verified successfully!\n\nNext step: ₹50 payment."
            );
        } catch (error) {
            console.error(
                "Verify OTP Error:",
                error
            );

            setOtpError(
                error.message ||
                "Invalid or expired OTP."
            );
        } finally {
            setOtpLoading(false);
        }
    };

    // ==========================================
    // DOWNLOAD BUTTON HANDLER
    // ==========================================

    const handleDownloadPDF = () => {
        if (!resume.email) {
            alert(
                "Email is required for verification."
            );
            return;
        }

        // If OTP is already verified,
        // currently generate PDF directly.
        // Later this will be replaced by payment flow.
        if (otpVerified) {
            generatePDF();
            return;
        }

        setOtp("");
        setOtpError("");
        setOtpMessage("");
        setShowOtpModal(true);

        handleSendOTP();
    };

    // ==========================================
    // CLOSE OTP MODAL
    // ==========================================

    const closeOtpModal = () => {
        if (otpLoading) {
            return;
        }

        setShowOtpModal(false);
        setOtp("");
        setOtpError("");
        setOtpMessage("");
    };

    // ==========================================
    // LOADING
    // ==========================================

    if (loading) {
        return (
            <div className="resume-state">
                <div className="loading-card">

                    <div className="loader"></div>

                    <h2>
                        Loading Resume
                    </h2>

                    <p>
                        Please wait while we
                        prepare your resume.
                    </p>

                </div>
            </div>
        );
    }

    // ==========================================
    // ERROR
    // ==========================================

    if (error) {
        return (
            <div className="resume-state">
                <div className="error-card">

                    <div className="error-icon">
                        !
                    </div>

                    <h2>
                        Failed to Load Resume
                    </h2>

                    <p>{error}</p>

                    <button
                        onClick={() =>
                            navigate(
                                "/my-resumes"
                            )
                        }
                        className="primary-button"
                    >
                        ← Back to My Resumes
                    </button>

                </div>
            </div>
        );
    }

    // ==========================================
    // RESUME NOT FOUND
    // ==========================================

    if (!resume) {
        return (
            <div className="resume-state">
                <div className="error-card">

                    <h2>
                        Resume Not Found
                    </h2>

                    <button
                        onClick={() =>
                            navigate(
                                "/my-resumes"
                            )
                        }
                        className="primary-button"
                    >
                        Back to My Resumes
                    </button>

                </div>
            </div>
        );
    }

    // ==========================================
    // SECTION VISIBILITY
    // ==========================================

    let sectionVisibility = {};

    try {
        sectionVisibility =
            typeof resume.section_visibility ===
                "string"
                ? JSON.parse(
                    resume.section_visibility
                )
                : resume.section_visibility ||
                {};
    } catch (error) {
        console.error(
            "Section Visibility Parse Error:",
            error
        );

        sectionVisibility = {};
    }

    const isVisible = (section) => {
        return (
            sectionVisibility[section] !== false
        );
    };

    // ==========================================
    // SECTION ORDER
    // ==========================================

    const sectionOrder =
        parseSectionOrder(
            resume.section_order
        );

    // ==========================================
    // ACCENT COLOR
    // ==========================================

    const accentColor =
        resume.accent_color ||
        "#2563eb";

    // ==========================================
    // RENDER SECTION
    // ==========================================

    const renderSection = (section) => {

        // ======================================
        // CAREER OBJECTIVE
        // ======================================

        if (
            section === "careerObjective" &&
            isVisible("careerObjective") &&
            resume.career_objective
        ) {
            return (
                <ResumeSection
                    key={section}
                    title="Career Objective"
                    content={
                        resume.career_objective
                    }
                />
            );
        }

        // ======================================
        // EDUCATION
        // ======================================

        if (
            section === "education" &&
            isVisible("education") &&
            resume.education
        ) {
            return (
                <ResumeSection
                    key={section}
                    title="Education"
                    content={
                        resume.education
                    }
                />
            );
        }

        // ======================================
        // SKILLS
        // ======================================

        if (
            section === "skills" &&
            isVisible("skills") &&
            resume.skills
        ) {
            return (
                <ResumeSection
                    key={section}
                    title="Skills"
                    content={
                        resume.skills
                    }
                />
            );
        }

        // ======================================
        // EXPERIENCE
        // ======================================

        if (
            section === "experience" &&
            isVisible("experience") &&
            resume.experience
        ) {
            return (
                <ResumeSection
                    key={section}
                    title="Work Experience"
                    content={
                        resume.experience
                    }
                />
            );
        }

        // ======================================
        // INTERNSHIPS
        // ======================================

        if (
            section === "internships" &&
            isVisible("internships") &&
            resume.internships
        ) {
            return (
                <ResumeSection
                    key={section}
                    title="Internships"
                    content={
                        resume.internships
                    }
                />
            );
        }

        // ======================================
        // PROJECTS
        // ======================================

        if (
            section === "projects" &&
            isVisible("projects") &&
            resume.projects
        ) {
            return (
                <ResumeSection
                    key={section}
                    title="Projects"
                    content={
                        resume.projects
                    }
                />
            );
        }

        // ======================================
        // CERTIFICATIONS
        // ======================================

        if (
            section === "certifications" &&
            isVisible("certifications") &&
            resume.certifications
        ) {
            return (
                <ResumeSection
                    key={section}
                    title="Certifications"
                    content={
                        resume.certifications
                    }
                />
            );
        }

        // ======================================
        // ACHIEVEMENTS
        // ======================================

        if (
            section === "achievements" &&
            isVisible("achievements") &&
            resume.achievements
        ) {
            return (
                <ResumeSection
                    key={section}
                    title="Achievements"
                    content={
                        resume.achievements
                    }
                />
            );
        }

        // ======================================
        // LANGUAGES
        // ======================================

        if (
            section === "languages" &&
            isVisible("languages") &&
            resume.languages
        ) {
            return (
                <ResumeSection
                    key={section}
                    title="Languages"
                    content={
                        resume.languages
                    }
                />
            );
        }

        // ======================================
        // SOCIAL LINKS
        // ======================================

        if (
            section === "socialLinks" &&
            isVisible("socialLinks") &&
            (
                resume.linkedin ||
                resume.github ||
                resume.portfolio
            )
        ) {
            return (
                <section
                    className="resume-section"
                    key={section}
                >
                    <h2>
                        Social Links
                    </h2>

                    <div className="section-line"></div>

                    <p className="pre-line">

                        {resume.linkedin && (
                            <>
                                LinkedIn:{" "}
                                {resume.linkedin}
                                {"\n"}
                            </>
                        )}

                        {resume.github && (
                            <>
                                GitHub:{" "}
                                {resume.github}
                                {"\n"}
                            </>
                        )}

                        {resume.portfolio && (
                            <>
                                Portfolio:{" "}
                                {resume.portfolio}
                            </>
                        )}

                    </p>
                </section>
            );
        }

        // ======================================
        // REFERENCES
        // ======================================

        if (
            section === "references" &&
            isVisible("references") &&
            resume.references_info
        ) {
            return (
                <ResumeSection
                    key={section}
                    title="References"
                    content={
                        resume.references_info
                    }
                />
            );
        }

        return null;
    };

    // ==========================================
    // RETURN
    // ==========================================

    return (
        <div className="resume-view-page">

            {/* ==========================================
                TOOLBAR
            ========================================== */}

            <div className="resume-toolbar">

                <div className="toolbar-left">

                    <button
                        onClick={() =>
                            navigate(
                                "/my-resumes"
                            )
                        }
                        className="toolbar-back"
                    >
                        ←
                        <span>
                            My Resumes
                        </span>
                    </button>

                    <div className="toolbar-divider"></div>

                    <div>
                        <h2>
                            {resume.resume_name}
                        </h2>

                        <p>
                            Resume Preview
                        </p>
                    </div>

                </div>

                <div className="toolbar-actions">

                    <button
                        onClick={() =>
                            navigate(
                                `/resume-builder?id=${resume.id}`
                            )
                        }
                        className="edit-button"
                    >
                        ✎ Edit
                    </button>

                    <button
                        onClick={
                            handleDownloadPDF
                        }
                        className="download-button"
                        disabled={
                            downloading
                        }
                    >
                        {downloading
                            ? "Generating..."
                            : "↓ Download PDF"}
                    </button>

                </div>

            </div>

            {/* ==========================================
                RESUME PREVIEW
            ========================================== */}

            <div className="resume-preview-wrapper">

                <div
                    id="resume-pdf"
                    className={`resume-paper ${resume.template ||
                        "classic"
                        }`}
                    style={{
                        "--accent-color":
                            accentColor,

                        fontFamily:
                            resume.font_family ||
                            "Arial",
                    }}
                >

                    {/* ==========================================
                        HEADER
                    ========================================== */}

                    <header className="resume-header">

                        <div className="header-content">

                            <h1>
                                {resume.full_name ||
                                    "Your Name"}
                            </h1>

                            <div className="contact-row">

                                {resume.email && (
                                    <span>
                                        {
                                            resume.email
                                        }
                                    </span>
                                )}

                                {resume.phone && (
                                    <span>
                                        {
                                            resume.phone
                                        }
                                    </span>
                                )}

                                {resume.address && (
                                    <span>
                                        {
                                            resume.address
                                        }
                                    </span>
                                )}

                            </div>

                        </div>

                        {resume.profile_photo && (
                            <img
                                src={
                                    resume.profile_photo
                                }
                                alt="Profile"
                                className="profile-photo"
                            />
                        )}

                    </header>

                    {/* ==========================================
                        DYNAMIC SECTION ORDER
                    ========================================== */}

                    {sectionOrder.map(
                        (section) =>
                            renderSection(
                                section
                            )
                    )}

                </div>

            </div>

            {/* ==========================================
                OTP MODAL
            ========================================== */}

            {showOtpModal && (
                <div
                    className="otp-modal-overlay"
                    onClick={(e) => {
                        if (
                            e.target ===
                            e.currentTarget
                        ) {
                            closeOtpModal();
                        }
                    }}
                >
                    <div className="otp-modal">

                        {/* CLOSE BUTTON */}

                        <button
                            type="button"
                            className="otp-close-button"
                            onClick={
                                closeOtpModal
                            }
                            disabled={
                                otpLoading
                            }
                        >
                            ×
                        </button>

                        {/* ICON */}

                        <div className="otp-icon">
                            ✉
                        </div>

                        <h2>
                            Verify Your Email
                        </h2>

                        <p>
                            We sent a 6-digit
                            verification code to
                        </p>

                        <strong>
                            {resume.email}
                        </strong>

                        {/* OTP INPUT */}

                        <input
                            type="text"
                            inputMode="numeric"
                            autoComplete="one-time-code"
                            value={otp}
                            maxLength={6}
                            placeholder="000000"
                            onChange={(e) =>
                                setOtp(
                                    e.target.value.replace(
                                        /\D/g,
                                        ""
                                    )
                                )
                            }
                            autoFocus
                        />

                        {/* SUCCESS MESSAGE */}

                        {otpMessage && (
                            <div className="otp-success">
                                ✓ {otpMessage}
                            </div>
                        )}

                        {/* ERROR MESSAGE */}

                        {otpError && (
                            <div className="otp-error">
                                {otpError}
                            </div>
                        )}

                        {/* VERIFY BUTTON */}

                        <button
                            type="button"
                            className="otp-verify-button"
                            onClick={
                                handleVerifyOTP
                            }
                            disabled={
                                otpLoading ||
                                otp.length !== 6
                            }
                        >
                            {otpLoading
                                ? "Verifying..."
                                : "Verify OTP"}
                        </button>

                        {/* RESEND */}

                        <button
                            type="button"
                            className="otp-resend-button"
                            onClick={
                                handleSendOTP
                            }
                            disabled={
                                otpLoading
                            }
                        >
                            {otpLoading
                                ? "Please wait..."
                                : "Resend OTP"}
                        </button>

                        <p className="otp-expiry">
                            OTP is valid for 5 minutes.
                        </p>

                    </div>
                </div>
            )}

        </div>
    );
}

// ==========================================
// RESUME SECTION COMPONENT
// ==========================================

function ResumeSection({
    title,
    content,
}) {
    return (
        <section className="resume-section">

            <h2>
                {title}
            </h2>

            <div className="section-line"></div>

            <p className="pre-line">
                {content}
            </p>

        </section>
    );
}

export default ViewResume;