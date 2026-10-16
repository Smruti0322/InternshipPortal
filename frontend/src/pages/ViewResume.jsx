import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useToast } from "../hooks/useToast";
import { useTranslation } from "react-i18next";
import jsPDF from "jspdf";
import "./ViewResume.css";
import { API_BASE_URL } from "../config/api.js";


const loadPdfFont = async (pdf, fileName, fontName) => {
    const response = await fetch(`/fonts/${fileName}`);

    if (!response.ok) {
        throw new Error(`Font file not found: ${fileName}`);
    }

    const buffer = await response.arrayBuffer();
    const bytes = new Uint8Array(buffer);

    let binary = "";
    const chunkSize = 0x8000;

    for (let i = 0; i < bytes.length; i += chunkSize) {
        binary += String.fromCharCode(
            ...bytes.subarray(i, i + chunkSize)
        );
    }

    const base64 = btoa(binary);

    pdf.addFileToVFS(`${fontName}.ttf`, base64);
    pdf.addFont(`${fontName}.ttf`, fontName, "normal");
};


const DEFAULT_SECTION_ORDER = [
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

const A4_WIDTH_PX = 210 * 3.779527559;
const A4_HEIGHT_PX = 297 * 3.779527559;

const parseSectionOrder = (value) => {
    if (!value) return DEFAULT_SECTION_ORDER;

    try {
        const parsed =
            typeof value === "string"
                ? JSON.parse(value)
                : value;

        if (!Array.isArray(parsed)) {
            return DEFAULT_SECTION_ORDER;
        }

        const filtered = parsed.filter((item) =>
            DEFAULT_SECTION_ORDER.includes(item)
        );

        DEFAULT_SECTION_ORDER.forEach((item) => {
            if (!filtered.includes(item)) {
                filtered.push(item);
            }
        });

        return filtered;
    } catch {
        return DEFAULT_SECTION_ORDER;
    }
};

const isPersistentImageData = (value) =>
    typeof value === "string" &&
    /^data:image\/(?:jpeg|png|webp);base64,[a-z0-9+/]+={0,2}$/i.test(
        value
    );


const RESUME_LABELS = {
    en: {
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
        linkedin: "LinkedIn",
        github: "GitHub",
        portfolio: "Portfolio",
        email: "Email",
        phone: "Phone",
        address: "Address",
        technologies: "Technologies",
    },
    hi: {
        careerObjective: "करियर उद्देश्य",
        education: "शिक्षा",
        skills: "कौशल",
        experience: "कार्य अनुभव",
        internships: "इंटर्नशिप",
        projects: "प्रोजेक्ट",
        certifications: "प्रमाणपत्र",
        achievements: "उपलब्धियाँ",
        languages: "भाषाएँ",
        socialLinks: "सोशल लिंक",
        references: "संदर्भ",
        linkedin: "लिंक्डइन",
        github: "गिटहब",
        portfolio: "पोर्टफोलियो",
        email: "ईमेल",
        phone: "फोन",
        address: "पता",
        technologies: "तकनीकें",
    },
    fr: {
        careerObjective: "Objectif professionnel",
        education: "Formation",
        skills: "Compétences",
        experience: "Expérience professionnelle",
        internships: "Stages",
        projects: "Projets",
        certifications: "Certifications",
        achievements: "Réalisations",
        languages: "Langues",
        socialLinks: "Liens sociaux",
        references: "Références",
        linkedin: "LinkedIn",
        github: "GitHub",
        portfolio: "Portfolio",
        email: "E-mail",
        phone: "Téléphone",
        address: "Adresse",
        technologies: "Technologies",
    },
    es: {
        careerObjective: "Objetivo profesional",
        education: "Educación",
        skills: "Habilidades",
        experience: "Experiencia laboral",
        internships: "Prácticas",
        projects: "Proyectos",
        certifications: "Certificaciones",
        achievements: "Logros",
        languages: "Idiomas",
        socialLinks: "Enlaces sociales",
        references: "Referencias",
        linkedin: "LinkedIn",
        github: "GitHub",
        portfolio: "Portafolio",
        email: "Correo electrónico",
        phone: "Teléfono",
        address: "Dirección",
        technologies: "Tecnologías",
    },
    pt: {
        careerObjective: "Objetivo profissional",
        education: "Educação",
        skills: "Competências",
        experience: "Experiência profissional",
        internships: "Estágios",
        projects: "Projetos",
        certifications: "Certificações",
        achievements: "Conquistas",
        languages: "Idiomas",
        socialLinks: "Links sociais",
        references: "Referências",
        linkedin: "LinkedIn",
        github: "GitHub",
        portfolio: "Portfólio",
        email: "E-mail",
        phone: "Telefone",
        address: "Endereço",
        technologies: "Tecnologias",
    },
    zh: {
        careerObjective: "职业目标",
        education: "教育经历",
        skills: "技能",
        experience: "工作经验",
        internships: "实习经历",
        projects: "项目",
        certifications: "证书",
        achievements: "成就",
        languages: "语言",
        socialLinks: "社交链接",
        references: "推荐人",
        linkedin: "领英",
        github: "GitHub",
        portfolio: "作品集",
        email: "电子邮件",
        phone: "电话",
        address: "地址",
        technologies: "技术",
    },
};

const normalizeResumeLanguage = (value) => {
    const language = String(value || "en")
        .trim()
        .toLowerCase()
        .split("-")[0];

    return Object.prototype.hasOwnProperty.call(
        RESUME_LABELS,
        language
    )
        ? language
        : "en";
};

function ViewResume() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { showToast } = useToast();
    const { t } = useTranslation();

    const [resume, setResume] = useState(null);

    const resumeLanguage = normalizeResumeLanguage(
        resume?.resume_language ?? resume?.resumeLanguage
    );

    const resumeLabels = RESUME_LABELS[resumeLanguage];

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [downloading, setDownloading] = useState(false);

    // Mobile A4 preview scale
    const [resumeScale, setResumeScale] = useState(1);

    const [showOtpModal, setShowOtpModal] = useState(false);
    const [otp, setOtp] = useState("");
    const [otpLoading, setOtpLoading] = useState(false);
    const [otpMessage, setOtpMessage] = useState("");
    const [otpError, setOtpError] = useState("");
    const [resendSeconds, setResendSeconds] = useState(0);

    const [paymentLoading, setPaymentLoading] = useState(false);

    const [pendingPayment, setPendingPayment] = useState(() => {
        try {
            const saved = sessionStorage.getItem(
                "resume_pending_payment"
            );

            return saved ? JSON.parse(saved) : null;
        } catch {
            return null;
        }
    });

    const paymentRestoreAttempted = useRef(false);

    const authHeaders = useCallback(() => {
        const token = localStorage.getItem("token");

        if (!token) {
            throw new Error("AUTH_REQUIRED");
        }

        return {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
        };
    }, []);

    /* =========================================================
       OTP RESEND COUNTDOWN
    ========================================================= */

    useEffect(() => {
        if (resendSeconds <= 0) return;

        const timer = window.setInterval(() => {
            setResendSeconds((seconds) => {
                if (seconds <= 1) {
                    window.clearInterval(timer);
                    return 0;
                }

                return seconds - 1;
            });
        }, 1000);

        return () => window.clearInterval(timer);
    }, [resendSeconds]);

    /* =========================================================
       MOBILE RESUME SCALE
    ========================================================= */

    useEffect(() => {
        const updateResumeScale = () => {
            const screenWidth = window.innerWidth;

            // Keep a small margin on both sides.
            const availableWidth = Math.max(
                screenWidth - 16,
                280
            );

            const scale = Math.min(
                1,
                availableWidth / A4_WIDTH_PX
            );

            setResumeScale(scale);
        };

        updateResumeScale();

        window.addEventListener(
            "resize",
            updateResumeScale
        );

        return () => {
            window.removeEventListener(
                "resize",
                updateResumeScale
            );
        };
    }, []);

    /* =========================================================
       FETCH RESUME
    ========================================================= */

    const fetchResume = useCallback(async () => {
        try {
            setLoading(true);
            setError("");

            const headers = authHeaders();

            const response = await fetch(
                `${API_BASE_URL}/api/resumes/${id}`,
                {
                    headers,
                }
            );

            if (!response.ok) {
                if (response.status === 401) {
                    throw new Error("AUTH_EXPIRED");
                }

                throw new Error("RESUME_LOAD_FAILED");
            }

            const data = await response.json();
            const loadedResume = data.resume || data;

            setResume(loadedResume);

            console.log(
                "Resume section order:",
                parseSectionOrder(
                    loadedResume.section_order ??
                    loadedResume.sectionOrder
                )
            );
        } catch (err) {
            console.error(
                "Fetch resume error:",
                err
            );

            if (
                err.message === "AUTH_REQUIRED" ||
                err.message === "AUTH_EXPIRED"
            ) {
                setError(
                    t(
                        "viewResume.pleaseLoginAgain"
                    )
                );
            } else {
                setError(
                    t(
                        "viewResume.unableLoadResume"
                    )
                );
            }
        } finally {
            setLoading(false);
        }
    }, [authHeaders, id, t]);

    useEffect(() => {
        if (!id) return undefined;
        const initialLoad = window.setTimeout(() => fetchResume(), 0);
        return () => window.clearTimeout(initialLoad);
    }, [fetchResume, id]);

    /* =========================================================
       SECTION DATA
    ========================================================= */

    const getSectionData = useCallback((key) => {
        if (!resume) return null;

        const mapping = {
            careerObjective:
                resume.career_objective ??
                resume.careerObjective ??
                "",

            education:
                resume.education ?? [],

            skills:
                resume.skills ?? [],

            experience:
                resume.experience ??
                resume.workExperience ??
                [],

            internships:
                resume.internships ?? [],

            projects:
                resume.projects ?? [],

            certifications:
                resume.certifications ?? [],

            achievements:
                resume.achievements ?? [],

            languages:
                resume.languages ?? [],

            socialLinks: {
                linkedin:
                    resume.linkedin ??
                    resume.linkedinUrl ??
                    "",

                github:
                    resume.github ??
                    resume.githubUrl ??
                    "",

                portfolio:
                    resume.portfolio ??
                    resume.portfolioUrl ??
                    "",
            },

            references:
                resume.references ??
                resume.references_info ??
                [],
        };

        return mapping[key];
    }, [resume]);

    const sectionVisibility = useMemo(() => {
        if (!resume) return {};

        const value =
            resume.section_visibility ??
            resume.sectionVisibility ??
            resume.visible_sections;

        if (!value) return {};

        try {
            return typeof value === "string"
                ? JSON.parse(value)
                : value;
        } catch {
            return {};
        }
    }, [resume]);

    const isVisible = useCallback((key) => {
        if (
            sectionVisibility[key] ===
            undefined
        ) {
            return true;
        }

        return Boolean(
            sectionVisibility[key]
        );
    }, [sectionVisibility]);

    const sectionOrder = useMemo(() => parseSectionOrder(
        resume?.section_order ??
        resume?.sectionOrder
    ), [resume?.section_order, resume?.sectionOrder]);

    const accentColor =
        resume?.accent_color ||
        resume?.accentColor ||
        "#2563eb";

    const getResumeName = useCallback(() =>
        resume?.resume_name ||
        resume?.resumeName ||
        resume?.name ||
        "Resume", [resume]);

    const getFullName = useCallback(() =>
        resume?.full_name ||
        resume?.fullName ||
        resume?.name ||
        "Resume", [resume]);

    /* =========================================================
       GENERATE PDF
    ========================================================= */

    const generatePDF = useCallback(async (
        skipAuthorization = false
    ) => {
        try {
            setDownloading(true);

            const headers = authHeaders();

            /* -------------------------------------------------
               DOWNLOAD AUTHORIZATION
            ------------------------------------------------- */

            if (!skipAuthorization) {
                const authorizeResponse =
                    await fetch(
                        `${API_BASE_URL}/api/resume-payment/authorize-download`,
                        {
                            method: "POST",
                            headers,
                            body: JSON.stringify({
                                resume_id: id,
                            }),
                        }
                    );

                if (!authorizeResponse.ok) {
                    throw new Error(
                        "DOWNLOAD_NOT_AUTHORIZED"
                    );
                }
            }

            /* -------------------------------------------------
               PDF SETUP
            ------------------------------------------------- */

            const pdf = new jsPDF(
                "p",
                "mm",
                "a4"
            );


            const pdfLanguage = normalizeResumeLanguage(
                resume?.resume_language ?? resume?.resumeLanguage
            );

            let pdfFont = "helvetica";

            if (pdfLanguage === "hi") {
                await loadPdfFont(
                    pdf,
                    "NotoSansDevanagari-Regular.ttf",
                    "NotoDevanagari"
                );
                pdfFont = "NotoDevanagari";
            } else if (pdfLanguage === "zh") {
                await loadPdfFont(
                    pdf,
                    "NotoSansSC-Regular.ttf",
                    "NotoSansSC"
                );
                pdfFont = "NotoSansSC";
            } else {
                await loadPdfFont(
                    pdf,
                    "Poppins-Regular.ttf",
                    "Poppins"
                );
                pdfFont = "Poppins";
            }


            const pageWidth =
                pdf.internal.pageSize.getWidth();

            const pageHeight =
                pdf.internal.pageSize.getHeight();

            const margin = 16;

            const contentWidth =
                pageWidth - margin * 2;

            const bottomMargin = 18;

            let y = 18;

            const template =
                resume?.template ||
                resume?.template_name ||
                resume?.templateName ||
                "classic";

            const fontFamily =
                resume?.font_family ||
                resume?.fontFamily ||
                "helvetica";

            
            const name = getFullName();
            const resumeName =
                getResumeName();

            /* -------------------------------------------------
               COLOR HELPERS
            ------------------------------------------------- */

            const hexToRgb = (hex) => {
                const fallback = {
                    r: 37,
                    g: 99,
                    b: 235,
                };

                if (
                    typeof hex !== "string" ||
                    !/^#[0-9a-f]{6}$/i.test(
                        hex
                    )
                ) {
                    return fallback;
                }

                return {
                    r: parseInt(
                        hex.slice(1, 3),
                        16
                    ),

                    g: parseInt(
                        hex.slice(3, 5),
                        16
                    ),

                    b: parseInt(
                        hex.slice(5, 7),
                        16
                    ),
                };
            };

            const accent =
                hexToRgb(accentColor);

            const darkText = {
                r: 35,
                g: 35,
                b: 35,
            };

            const mutedText = {
                r: 95,
                g: 95,
                b: 95,
            };

            const lightLine = {
                r: 215,
                g: 215,
                b: 215,
            };

            /* -------------------------------------------------
               BASIC HELPERS
            ------------------------------------------------- */

            const addFooter = () => {
                const pageNumber =
                    pdf.getCurrentPageInfo()
                        .pageNumber;

                pdf.setDrawColor(
                    lightLine.r,
                    lightLine.g,
                    lightLine.b
                );

                pdf.setLineWidth(0.2);

                pdf.line(
                    margin,
                    pageHeight - 11,
                    pageWidth - margin,
                    pageHeight - 11
                );

                pdf.setFont(
                    pdfFont,
                    "normal"
                );

                pdf.setFontSize(7.5);

                pdf.setTextColor(
                    125,
                    125,
                    125
                );

                pdf.text(
                    String(pageNumber),
                    pageWidth - margin,
                    pageHeight - 6,
                    {
                        align: "right",
                    }
                );
            };

            const addPage = () => {
                pdf.addPage();
                y = 18;
            };

            const ensureSpace = (
                height = 10
            ) => {
                if (
                    y + height >
                    pageHeight - bottomMargin
                ) {
                    addPage();
                    return true;
                }

                return false;
            };

            const addWrappedText = (
                value,
                options = {}
            ) => {
                if (
                    value === null ||
                    value === undefined ||
                    String(value).trim() === ""
                ) {
                    return;
                }

                const {
                    size = 9.5,
                    bold = false,
                    color = darkText,
                    indent = 0,
                    width = contentWidth,
                    lineHeight = 4.7,
                    after = 2,
                } = options;

                pdf.setFont(
                    pdfFont,
                    bold ? "bold" : "normal"
                );

                pdf.setFontSize(size);

                pdf.setTextColor(
                    color.r,
                    color.g,
                    color.b
                );

                const lines =
                    pdf.splitTextToSize(
                        String(value),
                        width
                    );

                lines.forEach((line) => {
                    ensureSpace(
                        lineHeight + 1
                    );

                    pdf.text(
                        line,
                        margin + indent,
                        y
                    );

                    y += lineHeight;
                });

                y += after;
            };

            const getObjectValue = (
                item,
                keys
            ) => {
                if (
                    !item ||
                    typeof item !== "object"
                ) {
                    return "";
                }

                for (const key of keys) {
                    if (
                        item[key] !==
                        undefined &&
                        item[key] !== null &&
                        String(
                            item[key]
                        ).trim() !== ""
                    ) {
                        return item[key];
                    }
                }

                return "";
            };

            const addBullet = (
                value,
                options = {}
            ) => {
                if (
                    value === null ||
                    value === undefined ||
                    String(value).trim() === ""
                ) {
                    return;
                }

                const {
                    size = 9.3,
                    after = 1.5,
                } = options;

                const bulletX =
                    margin + 1;

                const textX =
                    margin + 6;

                const textWidth =
                    contentWidth - 6;

                pdf.setFont(
                    pdfFont,
                    "normal"
                );

                pdf.setFontSize(size);

                pdf.setTextColor(
                    darkText.r,
                    darkText.g,
                    darkText.b
                );

                const lines =
                    pdf.splitTextToSize(
                        String(value),
                        textWidth
                    );

                lines.forEach(
                    (line, index) => {
                        ensureSpace(4.8);

                        if (index === 0) {
                            pdf.text(
                                "•",
                                bulletX,
                                y
                            );
                        }

                        pdf.text(
                            line,
                            textX,
                            y
                        );

                        y += 4.8;
                    }
                );

                y += after;
            };

            const addSectionTitle = (
                title
            ) => {
                if (
                    !title ||
                    String(title).trim() === ""
                ) {
                    return;
                }

                ensureSpace(13);

                y += 3;

                pdf.setFont(
                    pdfFont,
                    "bold"
                );

                pdf.setFontSize(11);

                pdf.setTextColor(
                    accent.r,
                    accent.g,
                    accent.b
                );

                pdf.text(
                    String(title).toUpperCase(),
                    margin,
                    y
                );

                y += 2.5;

                pdf.setDrawColor(
                    accent.r,
                    accent.g,
                    accent.b
                );

                pdf.setLineWidth(0.7);

                pdf.line(
                    margin,
                    y,
                    margin + 18,
                    y
                );

                pdf.setDrawColor(
                    225,
                    225,
                    225
                );

                pdf.setLineWidth(0.25);

                pdf.line(
                    margin + 20,
                    y,
                    pageWidth - margin,
                    y
                );

                y += 6;
            };

            const addItemGap = () => {
                y += 2;
            };

            /* -------------------------------------------------
               HEADER
            ------------------------------------------------- */

            const email =
                resume?.email || "";

            const phone =
                resume?.phone_number ||
                resume?.phoneNumber ||
                resume?.phone ||
                "";

            const address =
                resume?.address || "";

            const photo =
                resume?.profile_photo ||
                resume?.profilePhoto ||
                resume?.photo ||
                resume?.image ||
                "";

            const hasPhoto =
                isPersistentImageData(
                    photo
                );

            const photoSize = 31;

            const photoX =
                pageWidth -
                margin -
                photoSize;

            const photoY = 16;

            /* -------------------------------------------------
               MODERN HEADER
            ------------------------------------------------- */

            if (template === "modern") {
                pdf.setFillColor(
                    accent.r,
                    accent.g,
                    accent.b
                );

                pdf.rect(
                    0,
                    0,
                    pageWidth,
                    43,
                    "F"
                );

                pdf.setTextColor(
                    255,
                    255,
                    255
                );

                pdf.setFont(
                    pdfFont,
                    "bold"
                );

                pdf.setFontSize(23);

                const headerNameWidth =
                    hasPhoto
                        ? contentWidth -
                        photoSize -
                        8
                        : contentWidth;

                const nameLines =
                    pdf.splitTextToSize(
                        name,
                        headerNameWidth
                    );

                let nameY = 22;

                nameLines.forEach(
                    (line) => {
                        pdf.text(
                            line,
                            margin,
                            nameY
                        );

                        nameY += 8;
                    }
                );

                if (
                    resumeName &&
                    resumeName !== name
                ) {
                    pdf.setFont(
                        pdfFont,
                        "normal"
                    );

                    pdf.setFontSize(8.5);

                    pdf.setTextColor(
                        235,
                        235,
                        235
                    );

                    pdf.text(
                        resumeName,
                        margin,
                        34
                    );
                }

                if (hasPhoto) {
                    try {
                        pdf.addImage(
                            photo,
                            "JPEG",
                            photoX,
                            photoY,
                            photoSize,
                            photoSize
                        );
                    } catch (photoError) {
                        console.error(
                            "PDF photo error:",
                            photoError
                        );
                    }
                }

                y = 52;
            } else {
                /* -------------------------------------------------
                   CLASSIC / MINIMAL HEADER
                ------------------------------------------------- */

                const headerNameWidth =
                    hasPhoto
                        ? contentWidth -
                        photoSize -
                        8
                        : contentWidth;

                pdf.setFont(
                    pdfFont,
                    "bold"
                );

                pdf.setFontSize(
                    template ===
                        "minimal"
                        ? 21
                        : 23
                );

                pdf.setTextColor(
                    darkText.r,
                    darkText.g,
                    darkText.b
                );

                const nameLines =
                    pdf.splitTextToSize(
                        name,
                        headerNameWidth
                    );

                nameLines.forEach(
                    (line) => {
                        pdf.text(
                            line,
                            margin,
                            y
                        );

                        y += 8;
                    }
                );

                if (
                    resumeName &&
                    resumeName !== name
                ) {
                    pdf.setFont(
                        pdfFont,
                        "normal"
                    );

                    pdf.setFontSize(8.5);

                    pdf.setTextColor(
                        mutedText.r,
                        mutedText.g,
                        mutedText.b
                    );

                    pdf.text(
                        resumeName,
                        margin,
                        y
                    );

                    y += 5;
                }

                if (hasPhoto) {
                    try {
                        pdf.addImage(
                            photo,
                            "JPEG",
                            photoX,
                            photoY,
                            photoSize,
                            photoSize
                        );
                    } catch (photoError) {
                        console.error(
                            "PDF photo error:",
                            photoError
                        );
                    }
                }

                y += 2;

                pdf.setDrawColor(
                    accent.r,
                    accent.g,
                    accent.b
                );

                pdf.setLineWidth(
                    template ===
                        "minimal"
                        ? 0.5
                        : 1
                );

                pdf.line(
                    margin,
                    y,
                    pageWidth - margin,
                    y
                );

                y += 5;
            }

            /* -------------------------------------------------
               CONTACT INFORMATION
            ------------------------------------------------- */

            const contacts = [
                email,
                phone,
                address,
            ].filter(
                (item) =>
                    item !== null &&
                    item !== undefined &&
                    String(item).trim() !== ""
            );

            if (contacts.length > 0) {
                pdf.setFont(
                    pdfFont,
                    "normal"
                );

                pdf.setFontSize(8.8);

                pdf.setTextColor(
                    mutedText.r,
                    mutedText.g,
                    mutedText.b
                );

                const contactText =
                    contacts.join(
                        "   •   "
                    );

                const contactLines =
                    pdf.splitTextToSize(
                        contactText,
                        contentWidth
                    );

                contactLines.forEach(
                    (line) => {
                        ensureSpace(5);

                        pdf.text(
                            line,
                            margin,
                            y
                        );

                        y += 4.8;
                    }
                );

                y += 3;
            }

            /* =================================================
               SECTION CONTENT HELPERS
            ================================================= */

            const renderSimpleList = (
                items
            ) => {
                if (!Array.isArray(items)) {
                    addWrappedText(items);
                    return;
                }

                items.forEach(
                    (item) => {
                        if (
                            typeof item ===
                            "string" ||
                            typeof item ===
                            "number"
                        ) {
                            addBullet(item);
                            return;
                        }

                        if (
                            item &&
                            typeof item ===
                            "object"
                        ) {
                            const value =
                                getObjectValue(
                                    item,
                                    [
                                        "name",
                                        "title",
                                        "description",
                                        "degree",
                                        "skill",
                                        "text",
                                    ]
                                );

                            if (value) {
                                addBullet(
                                    value
                                );
                            }
                        }
                    }
                );
            };

            const renderEducation = (
                items
            ) => {
                if (!Array.isArray(items)) {
                    addWrappedText(items);
                    return;
                }

                items.forEach(
                    (item) => {
                        if (
                            typeof item ===
                            "string"
                        ) {
                            addWrappedText(
                                item,
                                {
                                    size: 9.5,
                                    after: 2,
                                }
                            );

                            return;
                        }

                        if (
                            !item ||
                            typeof item !==
                            "object"
                        ) {
                            return;
                        }

                        const title =
                            getObjectValue(
                                item,
                                [
                                    "degree",
                                    "title",
                                    "course",
                                    "name",
                                ]
                            );

                        const institution =
                            getObjectValue(
                                item,
                                [
                                    "institution",
                                    "college",
                                    "school",
                                ]
                            );

                        const year =
                            getObjectValue(
                                item,
                                [
                                    "year",
                                    "startYear",
                                    "endYear",
                                ]
                            );

                        if (title) {
                            addWrappedText(
                                title,
                                {
                                    size: 10,
                                    bold: true,
                                    after: 1,
                                }
                            );
                        }

                        if (
                            institution ||
                            year
                        ) {
                            const secondary =
                                [
                                    institution,
                                    year,
                                ]
                                    .filter(
                                        Boolean
                                    )
                                    .join(
                                        "  |  "
                                    );

                            addWrappedText(
                                secondary,
                                {
                                    size: 8.8,
                                    color: mutedText,
                                    after: 3,
                                }
                            );
                        }

                        addItemGap();
                    }
                );
            };

            const renderExperience = (
                items
            ) => {
                if (!Array.isArray(items)) {
                    addWrappedText(items);
                    return;
                }

                items.forEach(
                    (item) => {
                        if (
                            typeof item ===
                            "string"
                        ) {
                            addWrappedText(
                                item,
                                {
                                    size: 9.5,
                                    after: 2,
                                }
                            );

                            return;
                        }

                        if (
                            !item ||
                            typeof item !==
                            "object"
                        ) {
                            return;
                        }

                        const title =
                            getObjectValue(
                                item,
                                [
                                    "jobTitle",
                                    "title",
                                    "position",
                                    "role",
                                ]
                            );

                        const company =
                            getObjectValue(
                                item,
                                [
                                    "company",
                                    "companyName",
                                    "organization",
                                ]
                            );

                        const description =
                            getObjectValue(
                                item,
                                [
                                    "description",
                                    "responsibilities",
                                    "details",
                                ]
                            );

                        const duration =
                            getObjectValue(
                                item,
                                [
                                    "duration",
                                    "year",
                                    "date",
                                ]
                            );

                        if (title) {
                            addWrappedText(
                                title,
                                {
                                    size: 10,
                                    bold: true,
                                    after: 1,
                                }
                            );
                        }

                        if (
                            company ||
                            duration
                        ) {
                            const secondary =
                                [
                                    company,
                                    duration,
                                ]
                                    .filter(
                                        Boolean
                                    )
                                    .join(
                                        "  |  "
                                    );

                            addWrappedText(
                                secondary,
                                {
                                    size: 8.8,
                                    color: mutedText,
                                    after: 2,
                                }
                            );
                        }

                        if (description) {
                            addWrappedText(
                                description,
                                {
                                    size: 9,
                                    after: 3,
                                }
                            );
                        }

                        addItemGap();
                    }
                );
            };

            const renderInternships = (
                items
            ) => {
                if (!Array.isArray(items)) {
                    addWrappedText(items);
                    return;
                }

                items.forEach(
                    (item) => {
                        if (
                            typeof item ===
                            "string"
                        ) {
                            addWrappedText(
                                item,
                                {
                                    size: 9.5,
                                    after: 2,
                                }
                            );

                            return;
                        }

                        if (
                            !item ||
                            typeof item !==
                            "object"
                        ) {
                            return;
                        }

                        const title =
                            getObjectValue(
                                item,
                                [
                                    "title",
                                    "role",
                                    "position",
                                ]
                            );

                        const company =
                            getObjectValue(
                                item,
                                [
                                    "company",
                                    "companyName",
                                ]
                            );

                        const description =
                            getObjectValue(
                                item,
                                [
                                    "description",
                                    "details",
                                ]
                            );

                        const duration =
                            getObjectValue(
                                item,
                                [
                                    "duration",
                                    "year",
                                    "date",
                                ]
                            );

                        if (title) {
                            addWrappedText(
                                title,
                                {
                                    size: 10,
                                    bold: true,
                                    after: 1,
                                }
                            );
                        }

                        if (
                            company ||
                            duration
                        ) {
                            addWrappedText(
                                [
                                    company,
                                    duration,
                                ]
                                    .filter(
                                        Boolean
                                    )
                                    .join(
                                        "  |  "
                                    ),
                                {
                                    size: 8.8,
                                    color: mutedText,
                                    after: 2,
                                }
                            );
                        }

                        if (description) {
                            addWrappedText(
                                description,
                                {
                                    size: 9,
                                    after: 3,
                                }
                            );
                        }

                        addItemGap();
                    }
                );
            };

            const renderProjects = (
                items
            ) => {
                if (!Array.isArray(items)) {
                    addWrappedText(items);
                    return;
                }

                items.forEach(
                    (item) => {
                        if (
                            typeof item ===
                            "string"
                        ) {
                            addWrappedText(
                                item,
                                {
                                    size: 9.5,
                                    after: 2,
                                }
                            );

                            return;
                        }

                        if (
                            !item ||
                            typeof item !==
                            "object"
                        ) {
                            return;
                        }

                        const title =
                            getObjectValue(
                                item,
                                [
                                    "title",
                                    "name",
                                ]
                            );

                        const description =
                            getObjectValue(
                                item,
                                [
                                    "description",
                                    "details",
                                ]
                            );

                        const technologies =
                            getObjectValue(
                                item,
                                [
                                    "technologies",
                                    "techStack",
                                ]
                            );

                        const link =
                            getObjectValue(
                                item,
                                [
                                    "link",
                                    "url",
                                ]
                            );

                        if (title) {
                            addWrappedText(
                                title,
                                {
                                    size: 10,
                                    bold: true,
                                    after: 1,
                                }
                            );
                        }

                        if (description) {
                            addWrappedText(
                                description,
                                {
                                    size: 9,
                                    after: 1.5,
                                }
                            );
                        }

                        if (technologies) {
                            addWrappedText(
                                `${resumeLabels.technologies}: ${technologies}`,
                                {
                                    size: 8.7,
                                    color: mutedText,
                                    after: 1.5,
                                }
                            );
                        }

                        if (link) {
                            addWrappedText(
                                String(link),
                                {
                                    size: 8.3,
                                    color: accent,
                                    after: 3,
                                }
                            );
                        }

                        addItemGap();
                    }
                );
            };

            /* =================================================
               RESUME SECTIONS
            ================================================= */

            sectionOrder.forEach(
                (sectionKey) => {
                    if (
                        !isVisible(
                            sectionKey
                        )
                    ) {
                        return;
                    }

                    const value =
                        getSectionData(
                            sectionKey
                        );

                    if (
                        value === null ||
                        value === undefined ||
                        value === "" ||
                        (Array.isArray(
                            value
                        ) &&
                            value.length === 0)
                    ) {
                        return;
                    }

                    switch (sectionKey) {
                        case "careerObjective":
                            addSectionTitle(resumeLabels.careerObjective);
                            addWrappedText(value, {
                                size: 9.5,
                                lineHeight: 4.9,
                                after: 1,
                            });
                            break;

                        case "education":
                            addSectionTitle(resumeLabels.education);
                            renderEducation(value);
                            break;

                        case "skills":
                            addSectionTitle(resumeLabels.skills);
                            renderSimpleList(value);
                            break;

                        case "experience":
                            addSectionTitle(resumeLabels.experience);
                            renderExperience(value);
                            break;

                        case "internships":
                            addSectionTitle(resumeLabels.internships);
                            renderInternships(value);
                            break;

                        case "projects":
                            addSectionTitle(resumeLabels.projects);
                            renderProjects(value);
                            break;

                        case "certifications":
                            addSectionTitle(resumeLabels.certifications);
                            renderSimpleList(value);
                            break;

                        case "achievements":
                            addSectionTitle(resumeLabels.achievements);
                            renderSimpleList(value);
                            break;

                        case "languages":
                            addSectionTitle(resumeLabels.languages);
                            renderSimpleList(value);
                            break;

                        case "references":
                            addSectionTitle(resumeLabels.references);
                            renderSimpleList(value);
                            break;

                        case "socialLinks": {
                            addSectionTitle(resumeLabels.socialLinks);

                            if (value && typeof value === "object") {
                                const linkedin = value.linkedin || value.linkedinUrl || "";
                                const github = value.github || value.githubUrl || "";
                                const portfolio = value.portfolio || value.portfolioUrl || "";

                                if (linkedin) {
                                    addWrappedText(`${resumeLabels.linkedin}: ${linkedin}`, {
                                        size: 8.8,
                                        color: accent,
                                        after: 1.5,
                                    });
                                }

                                if (github) {
                                    addWrappedText(`${resumeLabels.github}: ${github}`, {
                                        size: 8.8,
                                        color: accent,
                                        after: 1.5,
                                    });
                                }

                                if (portfolio) {
                                    addWrappedText(`${resumeLabels.portfolio}: ${portfolio}`, {
                                        size: 8.8,
                                        color: accent,
                                        after: 1.5,
                                    });
                                }
                            }

                            break;
                        }
                        default:
                            break;
                    }
                }
            );

            /* =================================================
               FOOTERS
            ================================================= */

            const totalPages =
                pdf.getNumberOfPages();

            for (
                let page = 1;
                page <= totalPages;
                page++
            ) {
                pdf.setPage(page);
                addFooter();
            }

            /* =================================================
               PDF METADATA
            ================================================= */

            pdf.setProperties({
                title: `${name} - Resume`,
                subject:
                    "Professional Resume",
                author: name,
                creator:
                    "Resume Builder",
            });

            /* =================================================
               FILE NAME
            ================================================= */

            const cleanName =
                resumeName
                    .replace(
                        /[<>:"/\\|?*]+/g,
                        ""
                    )
                    .replace(
                        /\s+/g,
                        "_"
                    )
                    .replace(
                        /_+/g,
                        "_"
                    );

            pdf.save(
                `${cleanName ||
                "Resume"
                }_Resume.pdf`
            );

            /* =================================================
               DOWNLOAD HISTORY
            ================================================= */

            try {
                await fetch(
                    `${API_BASE_URL}/api/resume-payment/record-download`,
                    {
                        method: "POST",
                        headers,
                        body: JSON.stringify({
                            resume_id: id,
                        }),
                    }
                );
            } catch (
            downloadHistoryError
            ) {
                console.error(
                    "Download history error:",
                    downloadHistoryError
                );
            }

            showToast(
                t(
                    "viewResume.resumeDownloaded"
                ),
                "success"
            );
        } catch (err) {
            console.error(
                "PDF generation error:",
                err
            );

            if (
                err.message ===
                "AUTH_REQUIRED"
            ) {
                showToast(
                    t(
                        "viewResume.pleaseLoginAgain"
                    ),
                    "error"
                );
            } else if (
                err.message ===
                "DOWNLOAD_NOT_AUTHORIZED"
            ) {
                showToast(
                    t(
                        "viewResume.paymentRequired"
                    ),
                    "error"
                );
            } else {
                showToast(
                    t(
                        "viewResume.pdfGenerationFailed"
                    ),
                    "error"
                );
            }

            throw err;
        } finally {
            setDownloading(false);
        }
    }, [
        accentColor,
        authHeaders,
        getFullName,
        getResumeName,
        getSectionData,
        id,
        isVisible,
        resume,
        resumeLabels,
        sectionOrder,
        showToast,
        t,
    ]);

    /* =========================================================
       VERIFY PAYMENT
    ========================================================= */

    const verifyPendingPayment = useCallback(async (
        paymentData
    ) => {
        try {
            const headers = authHeaders();

            const response = await fetch(
                `${API_BASE_URL}/api/resume-payment/verify-payment`,
                {
                    method: "POST",
                    headers,
                    body: JSON.stringify(
                        paymentData
                    ),
                }
            );

            const data =
                await response.json();

            if (!response.ok) {
                throw new Error(
                    data.message ||
                    t(
                        "viewResume.paymentVerificationFailed"
                    )
                );
            }

            sessionStorage.removeItem(
                "resume_pending_payment"
            );

            setPendingPayment(null);

            showToast(
                t(
                    "viewResume.paymentSuccess"
                ),
                "success"
            );

            // This function already generates the PDF.
            // Do not call generatePDF() again after this.
            await generatePDF(true);
        } catch (err) {
            console.error(
                "Pending payment verification error:",
                err
            );

            showToast(
                err.message ||
                t(
                    "viewResume.paymentVerificationFailed"
                ),
                "error"
            );
        } finally {
            setPaymentLoading(false);
        }
    }, [authHeaders, generatePDF, showToast, t]);

    /* =========================================================
       RESTORE PENDING PAYMENT
    ========================================================= */

    useEffect(() => {
        if (
            !pendingPayment ||
            paymentRestoreAttempted.current
        ) {
            return;
        }

        paymentRestoreAttempted.current =
            true;

        verifyPendingPayment(
            pendingPayment
        );
    }, [pendingPayment, verifyPendingPayment]);

    /* =========================================================
       SEND OTP
    ========================================================= */

    const handleSendOTP = async () => {
        if (resendSeconds > 0) return;

        try {
            setOtpLoading(true);
            setOtpError("");
            setOtpMessage("");

            const headers =
                authHeaders();

            const response = await fetch(
                `${API_BASE_URL}/api/resume-download/request-otp`,
                {
                    method: "POST",
                    headers,
                    body: JSON.stringify({
                        resume_id: id,
                    }),
                }
            );

            const data =
                await response.json();

            if (response.status === 429) {
                const retrySeconds =
                    Number(
                        data.retry_after_seconds
                    ) ||
                    Number(
                        data.retryAfterSeconds
                    ) ||
                    60;

                setResendSeconds(
                    retrySeconds
                );

                setOtpError(
                    data.message ||
                    t(
                        "viewResume.otpSent"
                    )
                );

                return;
            }

            if (!response.ok) {
                throw new Error(
                    data.message ||
                    t(
                        "viewResume.unableSendOtp"
                    )
                );
            }

            setOtpMessage(
                data.message ||
                t(
                    "viewResume.otpSent"
                )
            );

            setResendSeconds(60);
        } catch (err) {
            console.error(
                "Send OTP error:",
                err
            );

            if (
                err.message ===
                "AUTH_REQUIRED"
            ) {
                setOtpError(
                    t(
                        "viewResume.pleaseLoginAgain"
                    )
                );
            } else {
                setOtpError(
                    err.message ||
                    t(
                        "viewResume.unableSendOtp"
                    )
                );
            }
        } finally {
            setOtpLoading(false);
        }
    };

    /* =========================================================
       VERIFY OTP
    ========================================================= */

    const handleVerifyOTP = async () => {
        if (!otp.trim()) {
            setOtpError(
                t(
                    "viewResume.otpRequired"
                )
            );

            return;
        }

        if (
            !/^\d{6}$/.test(
                otp.trim()
            )
        ) {
            setOtpError(
                t(
                    "viewResume.otpMustBeSixDigits"
                )
            );

            return;
        }

        try {
            setOtpLoading(true);
            setOtpError("");

            const headers =
                authHeaders();

            const response = await fetch(
                `${API_BASE_URL}/api/resume-download/verify-otp`,
                {
                    method: "POST",
                    headers,
                    body: JSON.stringify({
                        resume_id: id,
                        otp: otp.trim(),
                    }),
                }
            );

            const data =
                await response.json();

            if (!response.ok) {
                throw new Error(
                    data.message ||
                    t(
                        "viewResume.otpVerificationFailed"
                    )
                );
            }

            setOtpMessage(
                data.message ||
                t(
                    "viewResume.otpVerified"
                )
            );

            await handlePayment();
        } catch (err) {
            console.error(
                "Verify OTP error:",
                err
            );

            if (
                err.message ===
                "AUTH_REQUIRED"
            ) {
                setOtpError(
                    t(
                        "viewResume.pleaseLoginAgain"
                    )
                );
            } else {
                setOtpError(
                    err.message ||
                    t(
                        "viewResume.unableVerifyOtp"
                    )
                );
            }
        } finally {
            setOtpLoading(false);
        }
    };

    /* =========================================================
       PAYMENT
    ========================================================= */

    const handlePayment = async () => {
        try {
            setPaymentLoading(true);

            const headers =
                authHeaders();

            if (!window.Razorpay) {
                await new Promise(
                    (resolve, reject) => {
                        const script =
                            document.createElement(
                                "script"
                            );

                        script.src =
                            "https://checkout.razorpay.com/v1/checkout.js";

                        script.onload =
                            resolve;

                        script.onerror =
                            reject;

                        document.body.appendChild(
                            script
                        );
                    }
                );
            }

            const orderResponse =
                await fetch(
                    `${API_BASE_URL}/api/resume-payment/create-order`,
                    {
                        method: "POST",
                        headers,
                        body: JSON.stringify({
                            resume_id: id,
                        }),
                    }
                );

            const orderData =
                await orderResponse.json();

            if (!orderResponse.ok) {
                throw new Error(
                    orderData.message ||
                    t(
                        "viewResume.unableProcessPayment"
                    )
                );
            }

            const options = {
                key: orderData.key_id || orderData.keyId,

                amount: orderData.order?.amount,

                currency: orderData.order?.currency || "INR",
                name:
                    "Resume Builder",

                description:
                    t(
                        "viewResume.premiumDownloadDescription"
                    ),

                order_id: orderData.order?.id,
                
                handler:
                    async function (
                        response
                    ) {
                        const paymentData =
                        {
                            resume_id: id,

                            razorpay_payment_id:
                                response.razorpay_payment_id,

                            razorpay_order_id:
                                response.razorpay_order_id,

                            razorpay_signature:
                                response.razorpay_signature,
                        };

                        try {
                            sessionStorage.setItem(
                                "resume_pending_payment",
                                JSON.stringify(
                                    paymentData
                                )
                            );

                            setPendingPayment(
                                paymentData
                            );

                            
                            await verifyPendingPayment(
                                paymentData
                            );
                        } catch (
                        paymentError
                        ) {
                            console.error(
                                "Payment handler error:",
                                paymentError
                            );

                            setPaymentLoading(
                                false
                            );

                            showToast(
                                t(
                                    "viewResume.paymentVerificationFailed"
                                ),
                                "error"
                            );
                        }
                    },

                modal: {
                    ondismiss:
                        function () {
                            setPaymentLoading(
                                false
                            );

                            showToast(
                                t(
                                    "viewResume.paymentCancelled"
                                ),
                                "error"
                            );
                        },
                },

                theme: {
                    color:
                        accentColor,
                },
            };

            const razorpay =
                new window.Razorpay(
                    options
                );

            razorpay.on(
                "payment.failed",
                async (response) => {
                    console.error(
                        "Razorpay payment failed:",
                        response
                    );

                    try {
                        await fetch(
                            `${API_BASE_URL}/api/resume-payment/fail-order`,
                            {
                                method: "POST",
                                headers,
                                body: JSON.stringify(
                                    {
                                        resume_id:
                                            id,

                                        razorpay_order_id:
                                            response
                                                .error
                                                ?.metadata
                                                ?.order_id,

                                        reason:
                                            response
                                                .error
                                                ?.description,
                                    }
                                ),
                            }
                        );
                    } catch (
                    paymentError
                    ) {
                        console.error(
                            "Fail payment recording error:",
                            paymentError
                        );
                    }

                    setPaymentLoading(
                        false
                    );

                    showToast(
                        t(
                            "viewResume.paymentFailed"
                        ),
                        "error"
                    );
                }
            );

            razorpay.open();
        } catch (err) {
            console.error(
                "Payment error:",
                err
            );

            setPaymentLoading(
                false
            );

            if (
                err.message ===
                "AUTH_REQUIRED"
            ) {
                showToast(
                    t(
                        "viewResume.pleaseLoginAgain"
                    ),
                    "error"
                );
            } else {
                showToast(
                    err.message ||
                    t(
                        "viewResume.unableProcessPayment"
                    ),
                    "error"
                );
            }
        }
    };

    /* =========================================================
       DOWNLOAD PDF
    ========================================================= */

    const handleDownloadPDF =
        async () => {
            if (
                downloading ||
                paymentLoading
            ) {
                return;
            }

            try {
                setDownloading(true);

                const headers =
                    authHeaders();

                const authorizeResponse =
                    await fetch(
                        `${API_BASE_URL}/api/resume-payment/authorize-download`,
                        {
                            method: "POST",
                            headers,
                            body: JSON.stringify({
                                resume_id: id,
                            }),
                        }
                    );

                if (
                    authorizeResponse.ok
                ) {
                    setDownloading(false);

                    try {
                        await generatePDF();
                    } catch {
                        // Error already handled.
                    }

                    return;
                }

                setDownloading(false);

                setShowOtpModal(true);
                setOtp("");
                setOtpMessage("");
                setOtpError("");

                await handleSendOTP();
            } catch (err) {
                console.error(
                    "Download authorization check error:",
                    err
                );

                setDownloading(false);

                if (
                    err.message ===
                    "AUTH_REQUIRED"
                ) {
                    showToast(
                        t(
                            "viewResume.pleaseLoginAgain"
                        ),
                        "error"
                    );

                    return;
                }

                setShowOtpModal(true);
                setOtp("");
                setOtpMessage("");
                setOtpError("");

                await handleSendOTP();
            }
        };

    /* =========================================================
       CLOSE OTP MODAL
    ========================================================= */

    const closeOtpModal = () => {
        if (
            otpLoading ||
            paymentLoading
        ) {
            return;
        }

        setShowOtpModal(false);
        setOtp("");
        setOtpMessage("");
        setOtpError("");
    };

    /* =========================================================
       RENDER SECTION
    ========================================================= */

    const renderSection = (
        key
    ) => {
        if (
            !resume ||
            !isVisible(key)
        ) {
            return null;
        }

        const value =
            getSectionData(key);

        if (
            value === null ||
            value === undefined ||
            value === "" ||
            (Array.isArray(value) &&
                value.length === 0)
        ) {
            return null;
        }

        const titles = {
            careerObjective: resumeLabels.careerObjective,
            education: resumeLabels.education,
            skills: resumeLabels.skills,
            experience: resumeLabels.experience,
            internships: resumeLabels.internships,
            projects: resumeLabels.projects,
            certifications: resumeLabels.certifications,
            achievements: resumeLabels.achievements,
            languages: resumeLabels.languages,
            socialLinks: resumeLabels.socialLinks,
            references: resumeLabels.references,
        };

        return (
            <ResumeSection
                key={key}
                title={titles[key]}
                data={value}
                accentColor={accentColor}
                socialLinks={key === "socialLinks"}
                t={t}
                labels={resumeLabels}
            />
        );
    };

    /* =========================================================
       LOADING
    ========================================================= */

    if (loading) {
        return (
            <div className="view-resume-page">
                <div className="view-resume-loading">
                    <div className="spinner"></div>

                    <h3>
                        {t(
                            "viewResume.loadingResume"
                        )}
                    </h3>

                    <p>
                        {t(
                            "viewResume.pleaseWait"
                        )}
                    </p>
                </div>
            </div>
        );
    }

    /* =========================================================
       ERROR
    ========================================================= */

    if (error) {
        return (
            <div className="view-resume-page">
                <div className="view-resume-error">
                    <h2>
                        {t(
                            "viewResume.failedLoadResume"
                        )}
                    </h2>

                    <p>{error}</p>

                    <button
                        type="button"
                        onClick={() =>
                            navigate(
                                "/my-resumes"
                            )
                        }
                        className="back-button"
                    >
                        {t(
                            "viewResume.backToMyResumes"
                        )}
                    </button>
                </div>
            </div>
        );
    }

    /* =========================================================
       RESUME NOT FOUND
    ========================================================= */

    if (!resume) {
        return (
            <div className="view-resume-page">
                <div className="view-resume-error">
                    <h2>
                        {t(
                            "viewResume.resumeNotFound"
                        )}
                    </h2>

                    <p>
                        {t(
                            "viewResume.resumeNotAvailable"
                        )}
                    </p>

                    <button
                        type="button"
                        onClick={() =>
                            navigate(
                                "/my-resumes"
                            )
                        }
                        className="back-button"
                    >
                        {t(
                            "viewResume.backToResumes"
                        )}
                    </button>
                </div>
            </div>
        );
    }

    /* =========================================================
       RESUME DISPLAY DATA
    ========================================================= */

    const fullName =
        getFullName();

    const email =
        resume.email || "";

    const phone =
        resume.phone_number ||
        resume.phoneNumber ||
        resume.phone ||
        "";

    const address =
        resume.address || "";

    const photo =
        resume.profile_photo ||
        resume.profilePhoto ||
        resume.photo ||
        resume.image ||
        "";

    /*
     * Width and height of the scaled wrapper.
     * The inner resume itself remains A4 size.
     */
    const scaledResumeWidth =
        A4_WIDTH_PX *
        resumeScale;

    const scaledResumeHeight =
        A4_HEIGHT_PX *
        resumeScale;

    return (
        <div className="view-resume-page">

            {/* =================================================
                TOOLBAR
            ================================================= */}

            <div className="view-resume-toolbar">
                <button
                    type="button"
                    className="back-button"
                    onClick={() =>
                        navigate(
                            "/my-resumes"
                        )
                    }
                >
                    ←{" "}
                    {t(
                        "viewResume.backToMyResumes"
                    )}
                </button>

                <div className="toolbar-actions">
                    <span className="preview-label">
                        {t(
                            "viewResume.resumePreview"
                        )}
                    </span>

                    <button
                        type="button"
                        className="edit-button"
                        onClick={() =>
                            navigate(
                                `/resume-builder?id=${resume.id}`
                            )
                        }
                    >
                        {t(
                            "viewResume.editResume"
                        )}
                    </button>

                    <button
                        type="button"
                        className="download-button"
                        onClick={
                            handleDownloadPDF
                        }
                        disabled={
                            downloading ||
                            paymentLoading
                        }
                    >
                        {downloading
                            ? t(
                                "viewResume.generatingPdf"
                            )
                            : paymentLoading
                                ? t(
                                    "viewResume.paymentProcessing"
                                )
                                : t(
                                    "viewResume.downloadPdf"
                                )}
                    </button>
                </div>
            </div>

            {/* =================================================
                RESPONSIVE A4 WRAPPER
            ================================================= */}

            <div
                className="resume-preview-wrapper"
                style={{
                    width: `${scaledResumeWidth}px`,
                    height: `${scaledResumeHeight}px`,
                }}
            >
                <div
                    className={`resume-preview resume-template-${resume.template ||
                        resume.template_name ||
                        "classic"
                        }`}
                    style={{
                        transform: `scale(${resumeScale})`,
                        transformOrigin:
                            "top left",
                    }}
                >
                    {/* =============================================
                        RESUME HEADER
                    ============================================= */}

                    <div
                        className="resume-header"
                        style={{
                            "--resume-accent-color":
                                accentColor,
                        }}
                    >
                        <div className="resume-header-content">
                            <h1>
                                {fullName}
                            </h1>

                            {resume.resume_name && (
                                <p className="resume-name">
                                    {
                                        resume.resume_name
                                    }
                                </p>
                            )}

                            <div className="resume-contact-info">
                                {email && (
                                    <span>
                                        <strong>
                                            {resumeLabels.email}
                                            :
                                        </strong>{" "}
                                        {email}
                                    </span>
                                )}

                                {phone && (
                                    <span>
                                        <strong>
                                            {resumeLabels.phone}
                                            :
                                        </strong>{" "}
                                        {phone}
                                    </span>
                                )}

                                {address && (
                                    <span>
                                        <strong>
                                            {resumeLabels.address}
                                            :
                                        </strong>{" "}
                                        {address}
                                    </span>
                                )}
                            </div>
                        </div>

                        {isPersistentImageData(
                            photo
                        ) && (
                                <img
                                    src={photo}
                                    alt={t(
                                        "viewResume.profilePhoto"
                                    )}
                                    className="resume-profile-photo"
                                />
                            )}
                    </div>

                    {/* =============================================
                        RESUME BODY
                    ============================================= */}

                    <div className="resume-body">
                        {sectionOrder.map(
                            (
                                sectionKey
                            ) =>
                                renderSection(
                                    sectionKey
                                )
                        )}
                    </div>
                </div>
            </div>

            {/* =================================================
                OTP MODAL
            ================================================= */}

            {showOtpModal && (
                <div
                    className="otp-modal-overlay"
                    onClick={(
                        event
                    ) => {
                        if (
                            event.target ===
                            event.currentTarget
                        ) {
                            closeOtpModal();
                        }
                    }}
                >
                    <div className="otp-modal">

                        <button
                            type="button"
                            className="otp-close-button"
                            onClick={
                                closeOtpModal
                            }
                            disabled={
                                otpLoading ||
                                paymentLoading
                            }
                            aria-label={t(
                                "viewResume.close"
                            )}
                        >
                            ×
                        </button>

                        <h2>
                            {t(
                                "viewResume.verifyEmail"
                            )}
                        </h2>

                        <p className="otp-modal-subtitle">
                            {t(
                                "viewResume.emailOtpVerification"
                            )}
                        </p>

                        <p className="otp-info">
                            {t(
                                "viewResume.otpSentMessage"
                            )}
                        </p>

                        {otpMessage && (
                            <div className="otp-success-message">
                                {otpMessage}
                            </div>
                        )}

                        {otpError && (
                            <div className="otp-error-message">
                                {otpError}
                            </div>
                        )}

                        <label htmlFor="resume-otp">
                            {t(
                                "viewResume.enterOtp"
                            )}
                        </label>

                        <input
                            id="resume-otp"
                            type="text"
                            inputMode="numeric"
                            maxLength={6}
                            value={otp}
                            onChange={(
                                event
                            ) => {
                                const value =
                                    event.target.value
                                        .replace(
                                            /\D/g,
                                            ""
                                        )
                                        .slice(
                                            0,
                                            6
                                        );

                                setOtp(
                                    value
                                );

                                setOtpError(
                                    ""
                                );
                            }}
                            placeholder={t(
                                "viewResume.enterSixDigitOtp"
                            )}
                            disabled={
                                otpLoading ||
                                paymentLoading
                            }
                        />

                        <div className="otp-actions">
                            <button
                                type="button"
                                className="verify-otp-button"
                                onClick={
                                    handleVerifyOTP
                                }
                                disabled={
                                    otpLoading ||
                                    paymentLoading ||
                                    otp.length !==
                                    6
                                }
                            >
                                {otpLoading
                                    ? t(
                                        "viewResume.verifyingOtp"
                                    )
                                    : paymentLoading
                                        ? t(
                                            "viewResume.paymentProcessing"
                                        )
                                        : t(
                                            "viewResume.verifyOtp"
                                        )}
                            </button>

                            <button
                                type="button"
                                className="resend-otp-button"
                                onClick={
                                    handleSendOTP
                                }
                                disabled={
                                    otpLoading ||
                                    paymentLoading ||
                                    resendSeconds >
                                    0
                                }
                            >
                                {resendSeconds >
                                    0
                                    ? `${t(
                                        "viewResume.resendOtp"
                                    )} (${resendSeconds}s)`
                                    : t(
                                        "viewResume.resendOtp"
                                    )}
                            </button>
                        </div>

                        <p className="otp-validity">
                            {t(
                                "viewResume.pleaseWait"
                            )}
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
}

/* =============================================================
   RESUME SECTION
============================================================= */

function ResumeSection({
    title,
    data,
    accentColor,
    socialLinks = false,
    t,
    labels = RESUME_LABELS.en,
}) {
        const renderValue = (
        value
    ) => {
        if (
            value === null ||
            value === undefined
        ) {
            return null;
        }

        if (
            typeof value === "string" ||
            typeof value === "number"
        ) {
            return (
                <p className="resume-section-text">
                    {String(value)}
                </p>
            );
        }

        if (Array.isArray(value)) {
            return (
                <div className="resume-section-list">
                    {value.map(
                        (
                            item,
                            index
                        ) => (
                            <div
                                className="resume-section-item"
                                key={index}
                            >
                                {typeof item ===
                                    "object" &&
                                    item !== null ? (
                                    <>
                                        {(item.title ||
                                            item.name ||
                                            item.degree ||
                                            item.role ||
                                            item.position) && (
                                                <h4>
                                                    {item.title ||
                                                        item.name ||
                                                        item.degree ||
                                                        item.role ||
                                                        item.position}
                                                </h4>
                                            )}

                                        {(item.company ||
                                            item.companyName ||
                                            item.institution ||
                                            item.college ||
                                            item.school) && (
                                                <p>
                                                    {item.company ||
                                                        item.companyName ||
                                                        item.institution ||
                                                        item.college ||
                                                        item.school}
                                                </p>
                                            )}

                                        {(item.description ||
                                            item.details ||
                                            item.responsibilities) && (
                                                <p>
                                                    {item.description ||
                                                        item.details ||
                                                        item.responsibilities}
                                                </p>
                                            )}

                                        {(item.duration ||
                                            item.year ||
                                            item.date ||
                                            item.startDate ||
                                            item.endDate) && (
                                                <small>
                                                    {item.duration ||
                                                        item.year ||
                                                        item.date ||
                                                        `${item.startDate || ""}${item.endDate
                                                            ? ` - ${item.endDate}`
                                                            : ""
                                                        }`}
                                                </small>
                                            )}

                                        {item.link && (
                                            <a
                                                href={
                                                    item.link
                                                }
                                                target="_blank"
                                                rel="noreferrer"
                                            >
                                                {
                                                    item.link
                                                }
                                            </a>
                                        )}
                                    </>
                                ) : (
                                    <p>
                                        {String(
                                            item
                                        )}
                                    </p>
                                )}
                            </div>
                        )
                    )}
                </div>
            );
        }

        if (
            typeof value ===
            "object"
        ) {
            return (
                <div className="resume-object-content">
                    {Object.entries(
                        value
                    ).map(
                        ([
                            key,
                            objectValue,
                        ]) => {
                            if (
                                objectValue ===
                                null ||
                                objectValue ===
                                undefined ||
                                objectValue ===
                                ""
                            ) {
                                return null;
                            }

                            return (
                                <div
                                    className="resume-object-item"
                                    key={key}
                                >
                                    <strong>
                                        {key}:
                                    </strong>{" "}
                                    <span>
                                        {typeof objectValue ===
                                            "object"
                                            ? JSON.stringify(
                                                objectValue
                                            )
                                            : String(
                                                objectValue
                                            )}
                                    </span>
                                </div>
                            );
                        }
                    )}
                </div>
            );
        }

        return null;
    };

    if (
        data === null ||
        data === undefined ||
        data === "" ||
        (Array.isArray(data) &&
            data.length === 0)
    ) {
        return null;
    }

    return (
        <section className="resume-section">
            <h2
                className="resume-section-title"
                style={{
                    borderBottomColor:
                        accentColor,
                    color: accentColor,
                }}
            >
                {title}
            </h2>

            {socialLinks &&
                typeof data ===
                "object" &&
                !Array.isArray(
                    data
                ) ? (
                <div className="social-links">
                    {(data.linkedin ||
                        data.linkedinUrl) && (
                            <a
                                href={
                                    data.linkedin ||
                                    data.linkedinUrl
                                }
                                target="_blank"
                                rel="noreferrer"
                            >
                                <strong>
                                    {labels.linkedin}:
                                    
                                </strong>{" "}
                                {data.linkedin ||
                                    data.linkedinUrl}
                            </a>
                        )}

                    {(data.github ||
                        data.githubUrl) && (
                            <a
                                href={
                                    data.github ||
                                    data.githubUrl
                                }
                                target="_blank"
                                rel="noreferrer"
                            >
                                <strong>
                                    {labels.github}:
                                    
                                </strong>{" "}
                                {data.github ||
                                    data.githubUrl}
                            </a>
                        )}

                    {(data.portfolio ||
                        data.portfolioUrl) && (
                            <a
                                href={
                                    data.portfolio ||
                                    data.portfolioUrl
                                }
                                target="_blank"
                                rel="noreferrer"
                            >
                                <strong>
                                    {labels.portfolio}:
                                </strong>{" "}
                                {data.portfolio ||
                                    data.portfolioUrl}
                            </a>
                        )}
                </div>
            ) : (
                renderValue(data)
            )}
        </section>
    );
}

export default ViewResume;
