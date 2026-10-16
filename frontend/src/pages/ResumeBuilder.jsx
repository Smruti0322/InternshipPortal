
import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import "./ResumeBuilder.css";
import { API_BASE_URL } from "../config/api.js";
import { useToast } from "../hooks/useToast";

/* IMAGE VALIDATION */
const isPersistentImageData = (value) =>
    typeof value === "string" &&
    /^data:image\/(?:jpeg|png|webp);base64,[a-z0-9+/]+={0,2}$/i.test(value);

/* PHOTO CROP CONSTANTS */
const CROP_PREVIEW_SIZE = 320;
const CROP_OUTPUT_SIZE = 500;
const CROP_MIN_ZOOM = 1;
const CROP_MAX_ZOOM = 3;
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

/* RESUME BUILDER */
function ResumeBuilder() {
    const { showToast } = useToast();
    const { t, i18n } = useTranslation();

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

    const [resumeLanguage, setResumeLanguage] = useState(
        () => {
            const currentLanguage =
                i18n.resolvedLanguage?.split("-")[0] || "en";

            return ["en", "hi", "fr", "es", "pt", "zh"].includes(
                currentLanguage
            )
                ? currentLanguage
                : "en";
        }
    );

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

    const [sectionOrder, setSectionOrder] = useState(DEFAULT_SECTION_ORDER);

    const RESUME_SECTION_TRANSLATIONS = {
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
            yourName: "Your Name",
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
            yourName: "आपका नाम",
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
            yourName: "Votre nom",
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
            yourName: "Tu nombre",
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
            yourName: "Seu nome",
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
            yourName: "您的姓名",
        },
    };

    const RESUME_LANGUAGES = [
        { code: "en", label: "English" },
        { code: "hi", label: "हिन्दी (Hindi)" },
        { code: "fr", label: "Français (French)" },
        { code: "es", label: "Español (Spanish)" },
        { code: "pt", label: "Português (Portuguese)" },
        { code: "zh", label: "中文 (Chinese)" },
    ];

    const resumeLabels =
        RESUME_SECTION_TRANSLATIONS[resumeLanguage] ||
        RESUME_SECTION_TRANSLATIONS.en;

    const sectionLabels = {
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

    const [profilePhoto, setProfilePhoto] = useState("");
    const [template, setTemplate] = useState("classic");
    const [accentColor, setAccentColor] = useState("#2563eb");
    const [fontFamily, setFontFamily] = useState("Arial");

    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const editId = searchParams.get("id");

    const [isEditMode, setIsEditMode] = useState(false);
    const [loadingResume, setLoadingResume] = useState(false);
    const [saving, setSaving] = useState(false);
    const [isDirty, setIsDirty] = useState(false);

    const [showResumeNameModal, setShowResumeNameModal] = useState(false);
    const [resumeName, setResumeName] = useState("");

    const [cropModalOpen, setCropModalOpen] = useState(false);
    const [cropImage, setCropImage] = useState("");
    const [cropZoom, setCropZoom] = useState(1);

    const [cropPosition, setCropPosition] = useState({
        x: 0,
        y: 0,
    });

    const [photoProcessing, setPhotoProcessing] = useState(false);

    const cropAreaRef = useRef(null);
    const draggingRef = useRef(false);

    const dragStartRef = useRef({
        x: 0,
        y: 0,
    });

    const authHeaders = useCallback(
        () => ({
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("token") || ""}`,
        }),
        [],
    );

    const openCropModal = (imageData) => {
        if (!imageData) return;

        setCropImage(imageData);
        setCropZoom(CROP_MIN_ZOOM);
        setCropPosition({ x: 0, y: 0 });
        setCropModalOpen(true);
    };

    const handleChange = (e) => {
        const { name, value } = e.target;

        setFormData((previous) => ({
            ...previous,
            [name]: value,
        }));

        setIsDirty(true);
    };

    useEffect(() => {
        const warnBeforeUnload = (event) => {
            if (!isDirty) return;

            event.preventDefault();
            event.returnValue = "";
        };

        window.addEventListener("beforeunload", warnBeforeUnload);

        return () => {
            window.removeEventListener("beforeunload", warnBeforeUnload);
        };
    }, [isDirty]);

    useEffect(() => {
        if (!cropModalOpen) return;

        const handleKeyDown = (event) => {
            if (event.key === "Escape" && !photoProcessing) {
                setCropModalOpen(false);
                setCropImage("");
                setCropZoom(CROP_MIN_ZOOM);
                setCropPosition({ x: 0, y: 0 });
            }
        };

        window.addEventListener("keydown", handleKeyDown);

        return () => {
            window.removeEventListener("keydown", handleKeyDown);
        };
    }, [cropModalOpen, photoProcessing]);

    useEffect(() => {
        if (!showResumeNameModal) return;

        const handleKeyDown = (event) => {
            if (event.key === "Escape" && !saving) {
                setShowResumeNameModal(false);
                setResumeName("");
            }
        };

        window.addEventListener("keydown", handleKeyDown);

        return () => {
            window.removeEventListener("keydown", handleKeyDown);
        };
    }, [showResumeNameModal, saving]);

    const goBackToResumes = () => {
        if (isDirty && !window.confirm(t("resumeBuilder.unsavedChangesLeave"))) {
            return;
        }

        navigate("/my-resumes");
    };

    const handlePhotoChange = (e) => {
        const file = e.target.files?.[0];

        e.target.value = "";

        if (!file) return;

        const allowedTypes = ["image/jpeg", "image/png", "image/webp"];

        if (!allowedTypes.includes(file.type)) {
            showToast(t("resumeBuilder.chooseImageFormat"), "warning");
            return;
        }

        if (file.size > 2 * 1024 * 1024) {
            showToast(t("resumeBuilder.profilePhotoMaxSize"), "warning");
            return;
        }

        setPhotoProcessing(true);

        const reader = new FileReader();

        reader.onload = () => {
            const result = reader.result;

            if (typeof result !== "string") {
                setPhotoProcessing(false);
                showToast(t("resumeBuilder.unableReadSelectedPhoto"), "error");
                return;
            }

            const image = new Image();

            image.onload = () => {
                setPhotoProcessing(false);
                openCropModal(result);
            };

            image.onerror = () => {
                setPhotoProcessing(false);
                showToast(t("resumeBuilder.invalidImageFile"), "error");
            };

            image.src = result;
        };

        reader.onerror = () => {
            setPhotoProcessing(false);
            showToast(t("resumeBuilder.unableReadPhotoTryAgain"), "error");
        };

        reader.readAsDataURL(file);
    };

    const handleEditExistingPhoto = () => {
        if (!profilePhoto) {
            showToast(t("resumeBuilder.noProfilePhoto"), "error");
            return;
        }

        openCropModal(profilePhoto);
    };

    const resetCrop = () => {
        setCropZoom(CROP_MIN_ZOOM);
        setCropPosition({ x: 0, y: 0 });
    };

    const closeCropModal = () => {
        if (photoProcessing) return;

        setCropModalOpen(false);
        setCropImage("");
        setCropZoom(CROP_MIN_ZOOM);
        setCropPosition({ x: 0, y: 0 });
    };

    const moveCrop = (direction, amount = 10) => {
        if (photoProcessing) return;

        setCropPosition((previous) => {
            const next = { ...previous };

            if (direction === "left") next.x -= amount;
            if (direction === "right") next.x += amount;
            if (direction === "up") next.y -= amount;
            if (direction === "down") next.y += amount;

            return next;
        });
    };

    const handleCropPointerDown = (event) => {
        if (photoProcessing || !cropImage) return;

        event.preventDefault();
        event.stopPropagation();

        draggingRef.current = true;

        dragStartRef.current = {
            x: event.clientX,
            y: event.clientY,
        };

        if (cropAreaRef.current) {
            cropAreaRef.current.setPointerCapture?.(event.pointerId);
        }
    };

    const handleCropPointerMove = (event) => {
        if (!draggingRef.current || photoProcessing) return;

        event.preventDefault();

        const deltaX = event.clientX - dragStartRef.current.x;
        const deltaY = event.clientY - dragStartRef.current.y;

        if (deltaX === 0 && deltaY === 0) return;

        dragStartRef.current = {
            x: event.clientX,
            y: event.clientY,
        };

        setCropPosition((previous) => ({
            x: previous.x + deltaX,
            y: previous.y + deltaY,
        }));
    };

    const handleCropPointerUp = (event) => {
        draggingRef.current = false;

        if (event?.pointerId !== undefined && cropAreaRef.current) {
            cropAreaRef.current.releasePointerCapture?.(event.pointerId);
        }
    };

    const applyCrop = () => {
        if (!cropImage || photoProcessing) return;

        setPhotoProcessing(true);

        const image = new Image();

        image.onload = () => {
            try {
                const previewSize = CROP_PREVIEW_SIZE;
                const outputSize = CROP_OUTPUT_SIZE;

                const baseScale = Math.max(
                    previewSize / image.width,
                    previewSize / image.height,
                );

                const zoomedScale = baseScale * cropZoom;
                const drawWidth = image.width * zoomedScale;
                const drawHeight = image.height * zoomedScale;

                const left = (previewSize - drawWidth) / 2 + cropPosition.x;
                const top = (previewSize - drawHeight) / 2 + cropPosition.y;

                let sourceX = -left / zoomedScale;
                let sourceY = -top / zoomedScale;
                let sourceWidth = previewSize / zoomedScale;
                let sourceHeight = previewSize / zoomedScale;

                sourceX = Math.max(0, Math.min(sourceX, image.width - sourceWidth));
                sourceY = Math.max(0, Math.min(sourceY, image.height - sourceHeight));

                sourceWidth = Math.min(sourceWidth, image.width);
                sourceHeight = Math.min(sourceHeight, image.height);

                const canvas = document.createElement("canvas");
                canvas.width = outputSize;
                canvas.height = outputSize;

                const context = canvas.getContext("2d");

                if (!context) {
                    throw new Error(t("resumeBuilder.canvasNotSupported"));
                }

                context.fillStyle = "#ffffff";
                context.fillRect(0, 0, outputSize, outputSize);

                context.drawImage(
                    image,
                    sourceX,
                    sourceY,
                    sourceWidth,
                    sourceHeight,
                    0,
                    0,
                    outputSize,
                    outputSize,
                );

                let quality = 0.86;
                let croppedPhoto = canvas.toDataURL("image/jpeg", quality);

                while (croppedPhoto.length > 90000 && quality > 0.5) {
                    quality -= 0.05;
                    croppedPhoto = canvas.toDataURL("image/jpeg", quality);
                }

                if (!isPersistentImageData(croppedPhoto)) {
                    throw new Error(t("resumeBuilder.invalidCroppedImage"));
                }

                if (croppedPhoto.length > 90000) {
                    throw new Error(t("resumeBuilder.croppedPhotoTooLarge"));
                }

                setProfilePhoto(croppedPhoto);
                setIsDirty(true);
                setCropModalOpen(false);
                setCropImage("");
                setCropZoom(CROP_MIN_ZOOM);
                setCropPosition({ x: 0, y: 0 });

                showToast(
                    t("resumeBuilder.profilePhotoUpdatedSuccessfully"),
                    "success",
                );
            } catch (error) {
                console.error("Crop Error:", error);

                showToast(
                    error?.message === t("resumeBuilder.croppedPhotoTooLarge")
                        ? t("resumeBuilder.photoStillTooLarge")
                        : t("resumeBuilder.unableCropPhoto"),
                    "error",
                );
            } finally {
                setPhotoProcessing(false);
            }
        };

        image.onerror = () => {
            setPhotoProcessing(false);
            showToast(t("resumeBuilder.unableProcessPhoto"), "error");
        };

        image.src = cropImage;
    };

    const toggleSection = (section) => {
        setIsDirty(true);

        setSectionVisibility((previous) => ({
            ...previous,
            [section]: !previous[section],
        }));
    };

    const moveSectionUp = (index) => {
        if (index === 0) return;

        setIsDirty(true);

        setSectionOrder((previous) => {
            const newOrder = [...previous];

            [newOrder[index - 1], newOrder[index]] = [
                newOrder[index],
                newOrder[index - 1],
            ];

            return newOrder;
        });
    };

    const moveSectionDown = (index) => {
        if (index === sectionOrder.length - 1) return;

        setIsDirty(true);

        setSectionOrder((previous) => {
            const newOrder = [...previous];

            [newOrder[index], newOrder[index + 1]] = [
                newOrder[index + 1],
                newOrder[index],
            ];

            return newOrder;
        });
    };

    const loadResume = useCallback(
        async (id) => {
            try {
                setLoadingResume(true);

                const response = await fetch(`${API_BASE_URL}/api/resumes/${id}`, {
                    headers: authHeaders(),
                });

                const data = await response.json();

                if (!response.ok) {
                    throw new Error(
                        data.message || t("resumeBuilder.failedLoadResume"),
                    );
                }

                setFormData({
                    fullName: data.full_name || "",
                    email: data.email || "",
                    phone: data.phone || "",
                    address: data.address || "",
                    careerObjective: data.career_objective || "",
                    education: data.education || "",
                    skills: data.skills || "",
                    experience: data.experience || "",
                    internships: data.internships || "",
                    projects: data.projects || "",
                    certifications: data.certifications || "",
                    achievements: data.achievements || "",
                    languages: data.languages || "",
                    linkedin: data.linkedin || "",
                    github: data.github || "",
                    portfolio: data.portfolio || "",
                    references: data.references_info || "",
                });

                const savedLanguage = [
                    "en", "hi", "fr", "es", "pt", "zh"
                ].includes(data.resume_language)
                    ? data.resume_language
                    : "en";

                setResumeLanguage(savedLanguage);

                setProfilePhoto(
                    isPersistentImageData(data.profile_photo) ? data.profile_photo : "",
                );

                setTemplate(data.template || "classic");
                setAccentColor(data.accent_color || "#2563eb");
                setFontFamily(data.font_family || "Arial");

                if (data.section_visibility) {
                    try {
                        const savedVisibility =
                            typeof data.section_visibility === "string"
                                ? JSON.parse(data.section_visibility)
                                : data.section_visibility;

                        setSectionVisibility({
                            careerObjective: savedVisibility.careerObjective !== false,
                            education: savedVisibility.education !== false,
                            skills: savedVisibility.skills !== false,
                            experience: savedVisibility.experience !== false,
                            internships: savedVisibility.internships !== false,
                            projects: savedVisibility.projects !== false,
                            certifications: savedVisibility.certifications !== false,
                            achievements: savedVisibility.achievements !== false,
                            languages: savedVisibility.languages !== false,
                            socialLinks: savedVisibility.socialLinks !== false,
                            references: savedVisibility.references !== false,
                        });
                    } catch (visibilityError) {
                        console.error("Visibility Parse Error:", visibilityError);
                    }
                }

                if (data.section_order) {
                    try {
                        const savedOrder =
                            typeof data.section_order === "string"
                                ? JSON.parse(data.section_order)
                                : data.section_order;

                        if (Array.isArray(savedOrder) && savedOrder.length > 0) {
                            const validOrder = savedOrder.filter((section) =>
                                DEFAULT_SECTION_ORDER.includes(section),
                            );

                            const missingSections = DEFAULT_SECTION_ORDER.filter(
                                (section) => !validOrder.includes(section),
                            );

                            setSectionOrder([...validOrder, ...missingSections]);
                        } else {
                            setSectionOrder(DEFAULT_SECTION_ORDER);
                        }
                    } catch (orderError) {
                        console.error("Section Order Parse Error:", orderError);
                        setSectionOrder(DEFAULT_SECTION_ORDER);
                    }
                } else {
                    setSectionOrder(DEFAULT_SECTION_ORDER);
                }

                setIsEditMode(true);
                setIsDirty(false);
            } catch (error) {
                console.error("Load Resume Error:", error);
                showToast(t("resumeBuilder.unableLoadResume"), "error");
                navigate("/my-resumes");
            } finally {
                setLoadingResume(false);
            }
        },
        [authHeaders, navigate, showToast, t],
    );

    useEffect(() => {
        const loadTimer = window.setTimeout(() => {
            if (editId) {
                loadResume(editId);
            } else {
                setIsEditMode(false);
                setSectionOrder(DEFAULT_SECTION_ORDER);
            }
        }, 0);

        return () => window.clearTimeout(loadTimer);
    }, [editId, loadResume]);

    const saveResume = async (name) => {
        const trimmedResumeName = name.trim();

        if (!trimmedResumeName) {
            showToast(t("resumeBuilder.pleaseEnterResumeName"), "warning");
            return;
        }

        if (trimmedResumeName.length > 100) {
            showToast(t("resumeBuilder.resumeNameMaxLength"), "warning");
            return;
        }

        setSaving(true);

        try {
            const data = {
                resume_name: trimmedResumeName,
                resume_language: resumeLanguage,
                fullName: formData.fullName,
                email: formData.email,
                phone: formData.phone,
                address: formData.address,
                careerObjective: formData.careerObjective,
                education: formData.education,
                skills: formData.skills,
                experience: formData.experience,
                internships: formData.internships,
                projects: formData.projects,
                certifications: formData.certifications,
                achievements: formData.achievements,
                languages: formData.languages,
                linkedin: formData.linkedin,
                github: formData.github,
                portfolio: formData.portfolio,
                references: formData.references,
                profilePhoto: isPersistentImageData(profilePhoto) ? profilePhoto : "",
                template,
                accentColor,
                fontFamily,
                sectionVisibility,
                sectionOrder,
            };

            let resumeId;

            if (isEditMode && editId) {
                const response = await fetch(
                    `${API_BASE_URL}/api/resumes/${editId}`,
                    {
                        method: "PUT",
                        headers: authHeaders(),
                        body: JSON.stringify(data),
                    },
                );

                const result = await response.json();

                if (!response.ok) {
                    throw new Error(
                        result.message || t("resumeBuilder.failedUpdateResume"),
                    );
                }

                resumeId = editId;
            } else {
                const response = await fetch(`${API_BASE_URL}/api/resumes`, {
                    method: "POST",
                    headers: authHeaders(),
                    body: JSON.stringify(data),
                });

                const result = await response.json();

                if (!response.ok) {
                    throw new Error(
                        result.message || t("resumeBuilder.failedCreateResume"),
                    );
                }

                resumeId = result.resumeId;
            }

            console.log("Resume ID:", resumeId);

            setIsDirty(false);
            setShowResumeNameModal(false);
            setResumeName("");

            showToast(
                isEditMode
                    ? t("resumeBuilder.resumeUpdatedSuccessfully")
                    : t("resumeBuilder.resumeSavedSuccessfully"),
                "success",
            );

            navigate(`/view-resume/${resumeId}`);
        } catch (error) {
            console.error("Save Resume Error:", error);

            const message = error?.message || "";

            const isFormValidation =
                /^(Enter |Resume name|.*too long|Choose |Profile photos|This photo|Please enter)/i.test(
                    message,
                );

            showToast(
                isFormValidation ? message : t("resumeBuilder.unableSaveResume"),
                isFormValidation ? "warning" : "error",
            );
        } finally {
            setSaving(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (saving || photoProcessing || cropModalOpen) return;

        try {
            if (
                !formData.fullName.trim() ||
                !formData.email.trim() ||
                !formData.education.trim() ||
                !formData.skills.trim()
            ) {
                throw new Error(t("resumeBuilder.requiredResumeFields"));
            }

            if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
                throw new Error(t("resumeBuilder.invalidEmail"));
            }

            if (
                formData.phone &&
                (!/^[+\d() .-]{7,20}$/.test(formData.phone.trim()) ||
                    formData.phone.replace(/\D/g, "").length < 7 ||
                    formData.phone.replace(/\D/g, "").length > 15)
            ) {
                throw new Error(t("resumeBuilder.invalidPhone"));
            }

            for (const [field, value] of Object.entries(formData)) {
                if (value.length > 20000) {
                    throw new Error(t("resumeBuilder.fieldTooLong", { field }));
                }
            }

            for (const field of ["linkedin", "github", "portfolio"]) {
                if (formData[field]) {
                    try {
                        const url = new URL(formData[field].trim());

                        if (
                            !["http:", "https:"].includes(url.protocol) ||
                            !url.hostname.includes(".")
                        ) {
                            throw new Error();
                        }
                    } catch {
                        throw new Error(
                            t("resumeBuilder.invalidUrlFor", { field }),
                        );
                    }
                }
            }

            setResumeName("");
            setShowResumeNameModal(true);
        } catch (error) {
            console.error("Resume Validation Error:", error);

            const message = error?.message || "";

            const isFormValidation =
                /^(Enter |Resume name|.*too long|Choose |Profile photos|This photo)/i.test(
                    message,
                );

            showToast(
                isFormValidation ? message : t("resumeBuilder.checkResumeDetails"),
                isFormValidation ? "warning" : "error",
            );
        }
    };


    const renderPreviewSection = (section) => {
        if (!sectionVisibility[section]) return null;

        switch (section) {
            case "careerObjective":
                return formData.careerObjective ? (
                    <ResumeSection
                        key={section}
                        title={resumeLabels.careerObjective}
                        content={formData.careerObjective}
                    />
                ) : null;

            case "education":
                return formData.education ? (
                    <ResumeSection
                        key={section}
                        title={resumeLabels.education}
                        content={formData.education}
                    />
                ) : null;

            case "skills":
                return formData.skills ? (
                    <ResumeSection
                        key={section}
                        title={resumeLabels.skills}
                        content={formData.skills}
                    />
                ) : null;

            case "experience":
                return formData.experience ? (
                    <ResumeSection
                        key={section}
                        title={resumeLabels.experience}
                        content={formData.experience}
                    />
                ) : null;

            case "internships":
                return formData.internships ? (
                    <ResumeSection
                        key={section}
                        title={resumeLabels.internships}
                        content={formData.internships}
                    />
                ) : null;

            case "projects":
                return formData.projects ? (
                    <ResumeSection
                        key={section}
                        title={resumeLabels.projects}
                        content={formData.projects}
                    />
                ) : null;

            case "certifications":
                return formData.certifications ? (
                    <ResumeSection
                        key={section}
                        title={resumeLabels.certifications}
                        content={formData.certifications}
                    />
                ) : null;

            case "achievements":
                return formData.achievements ? (
                    <ResumeSection
                        key={section}
                        title={resumeLabels.achievements}
                        content={formData.achievements}
                    />
                ) : null;

            case "languages":
                return formData.languages ? (
                    <ResumeSection
                        key={section}
                        title={resumeLabels.languages}
                        content={formData.languages}
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
                    <div className="resume-section" key={section}>
                        <h3>{resumeLabels.socialLinks}</h3>

                        {formData.linkedin && (
                            <p>{formData.linkedin}</p>
                        )}

                        {formData.github && (
                            <p>{formData.github}</p>
                        )}

                        {formData.portfolio && (
                            <p>{formData.portfolio}</p>
                        )}
                    </div>
                );

            case "references":
                return formData.references ? (
                    <ResumeSection
                        key={section}
                        title={resumeLabels.references}
                        content={formData.references}
                    />
                ) : null;

            default:
                return null;
        }
    };


    if (loadingResume) {
        return (
            <div
                style={{
                    minHeight: "100vh",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexDirection: "column",
                    padding: "40px 20px",
                    textAlign: "center",
                }}
            >
                <h2>{t("resumeBuilder.loadingResume")}</h2>
                <p>{t("resumeBuilder.pleaseWait")}</p>
            </div>
        );
    }

    return (
        <div className="resume-builder">
            <div className="builder-panel">
                <button
                    type="button"
                    onClick={goBackToResumes}
                    style={{
                        marginBottom: "20px",
                        padding: "10px 18px",
                        border: "none",
                        borderRadius: "6px",
                        background: "#195feb",
                        color: "white",
                        cursor: "pointer",
                        fontWeight: "600",
                    }}
                >
                    {t("resumeBuilder.backToMyResumes")}
                </button>

                <div className="builder-header">
                    <h1>
                        {isEditMode
                            ? t("resumeBuilder.editResume")
                            : t("resumeBuilder.resumeBuilder")}
                    </h1>
                    <p>
                        {isEditMode
                            ? t("resumeBuilder.updateProfessionalResume")
                            : t("resumeBuilder.createProfessionalAtsResume")}
                    </p>
                </div>

                <div className="customization-section">
                    <div className="customization-header">
                        <div>
                            <h2>{t("resumeBuilder.customizeResume")}</h2>
                            <p>{t("resumeBuilder.personalizeResumeAppearance")}</p>
                        </div>
                    </div>
                    <div className="customization-group">
                        <label
                            className="customization-label"
                            htmlFor="resume-language"
                        >
                            Resume Language
                        </label>

                        <select
                            id="resume-language"
                            className="customization-select"
                            value={resumeLanguage}
                            onChange={(event) => {
                                setResumeLanguage(event.target.value);
                                setIsDirty(true);
                            }}
                            disabled={loadingResume || saving}
                        >
                            {RESUME_LANGUAGES.map((language) => (
                                <option
                                    key={language.code}
                                    value={language.code}
                                >
                                    {language.label}
                                </option>
                            ))}
                        </select>

                        <p className="customization-description">
                            This language controls resume headings and labels.
                            Your personal information and descriptions will remain
                            as you entered them.
                        </p>
                    </div>

                    <div className="customization-group">
                        <label className="customization-label">
                            {t("resumeBuilder.accentColor")}
                        </label>

                        <div className="color-picker-row">
                            <input
                                type="color"
                                value={accentColor}
                                onChange={(e) => {
                                    setAccentColor(e.target.value);
                                    setIsDirty(true);
                                }}
                                className="color-picker"
                            />

                            <div>
                                <strong>{accentColor.toUpperCase()}</strong>
                                <span>{t("resumeBuilder.chooseResumeThemeColor")}</span>
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
                                    className={`color-preset ${accentColor === color ? "active" : ""
                                        }`}
                                    style={{ backgroundColor: color }}
                                    onClick={() => {
                                        setAccentColor(color);
                                        setIsDirty(true);
                                    }}
                                    title={color}
                                    aria-label={`Select accent color ${color}`}
                                    aria-pressed={accentColor === color}
                                >
                                    {accentColor === color && (
                                        <span aria-hidden="true">✓</span>
                                    )}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="customization-group">
                        <label className="customization-label">
                            {t("resumeBuilder.fontFamily")}
                        </label>

                        <select
                            value={fontFamily}
                            onChange={(e) => {
                                setFontFamily(e.target.value);
                                setIsDirty(true);
                            }}
                            className="customization-select"
                        >
                            <option value="Arial">Arial</option>
                            <option value="Georgia">Georgia</option>
                            <option value="Verdana">Verdana</option>
                            <option value="Times New Roman">Times New Roman</option>
                        </select>

                        {/* <div className="font-preview" style={{ fontFamily }}>
                            {t("resumeBuilder.yourResumeName")}
                        </div> */}
                    </div>

                    <div className="section-customization">
                        <h3>{t("resumeBuilder.showHideSections")}</h3>
                        <p className="customization-description">
                            {t("resumeBuilder.selectSectionsToDisplay")}
                        </p>

                        <div className="section-toggle-grid">
                            {DEFAULT_SECTION_ORDER.map((key) => (
                                <label className="section-toggle" key={key}>
                                    <input
                                        type="checkbox"
                                        checked={sectionVisibility[key]}
                                        onChange={() => toggleSection(key)}
                                    />
                                    <span>{sectionLabels[key]}</span>
                                </label>
                            ))}
                        </div>
                    </div>

                    <div className="section-customization">
                        <h3>{t("resumeBuilder.sectionOrder")}</h3>
                        <p className="customization-description">
                            {t("resumeBuilder.changeSectionOrderDescription")}
                        </p>

                        <div className="section-order-list">
                            {sectionOrder.map((section, index) => (
                                <div className="section-order-item" key={section}>
                                    <span className="section-order-number">{index + 1}</span>
                                    <span className="section-order-name">
                                        {sectionLabels[section]}
                                    </span>

                                    <div className="section-order-buttons">
                                        <button
                                            type="button"
                                            onClick={() => moveSectionUp(index)}
                                            disabled={index === 0}
                                            title={t("resumeBuilder.moveUp")}
                                            aria-label={t("resumeBuilder.moveUp")}
                                        >
                                            ↑
                                        </button>

                                        <button
                                            type="button"
                                            onClick={() => moveSectionDown(index)}
                                            disabled={index === sectionOrder.length - 1}
                                            title={t("resumeBuilder.moveDown")}
                                            aria-label={t("resumeBuilder.moveDown")}
                                        >
                                            ↓
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="form-section">
                    <h2>{t("resumeBuilder.personalDetails")}</h2>
                    <input
                        name="fullName"
                        placeholder={t("resumeBuilder.fullName")}
                        value={formData.fullName}
                        onChange={handleChange}
                    />

                    <div className="two-column">
                        <input
                            name="email"
                            placeholder={t("resumeBuilder.emailAddress")}
                            value={formData.email}
                            onChange={handleChange}
                        />
                        <input
                            name="phone"
                            placeholder={t("resumeBuilder.phoneNumber")}
                            value={formData.phone}
                            onChange={handleChange}
                        />
                    </div>

                    <input
                        name="address"
                        placeholder={t("resumeBuilder.address")}
                        value={formData.address}
                        onChange={handleChange}
                    />

                    <label>{t("resumeBuilder.profilePhoto")}</label>
                    <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        onChange={handlePhotoChange}
                        disabled={photoProcessing || cropModalOpen}
                    />

                    {isPersistentImageData(profilePhoto) && (
                        <div
                            style={{
                                marginTop: "12px",
                                padding: "12px",
                                border: "1px solid #e2e8f0",
                                borderRadius: "12px",
                                display: "flex",
                                alignItems: "center",
                                gap: "12px",
                                background: "#f8fafc",
                                flexWrap: "wrap",
                            }}
                        >
                            <img
                                src={profilePhoto}
                                alt={t("resumeBuilder.profilePreview")}
                                style={{
                                    width: "70px",
                                    height: "70px",
                                    objectFit: "cover",
                                    borderRadius: "10px",
                                    border: "1px solid #d1d5db",
                                }}
                            />

                            <div style={{ flex: 1, minWidth: "150px" }}>
                                <strong
                                    style={{
                                        display: "block",
                                        color: "#1e293b",
                                        marginBottom: "4px",
                                    }}
                                >
                                    {t("resumeBuilder.profilePhoto")}
                                </strong>
                                <span style={{ fontSize: "13px", color: "#64748b" }}>
                                    {t("resumeBuilder.photoReadyForResume")}
                                </span>
                            </div>

                            <button
                                type="button"
                                onClick={handleEditExistingPhoto}
                                disabled={photoProcessing || cropModalOpen}
                                style={{
                                    padding: "9px 14px",
                                    border: "1px solid #2563eb",
                                    borderRadius: "8px",
                                    background: "#eff6ff",
                                    color: "#2563eb",
                                    fontWeight: "600",
                                    cursor: "pointer",
                                }}
                            >
                                {t("resumeBuilder.editCrop")}
                            </button>
                        </div>
                    )}
                </div>

                {[
                    {
                        name: "careerObjective",
                        title: t("resumeBuilder.careerObjective"),
                        placeholder: t("resumeBuilder.careerObjectivePlaceholder"),
                        type: "textarea",
                    },
                    {
                        name: "education",
                        title: t("resumeBuilder.education"),
                        placeholder: t("resumeBuilder.educationPlaceholder"),
                        type: "textarea",
                    },
                    {
                        name: "skills",
                        title: t("resumeBuilder.skills"),
                        placeholder: t("resumeBuilder.skillsPlaceholder"),
                        type: "textarea",
                    },
                    {
                        name: "experience",
                        title: t("resumeBuilder.workExperience"),
                        placeholder: t("resumeBuilder.workExperiencePlaceholder"),
                        type: "textarea",
                    },
                    {
                        name: "internships",
                        title: t("resumeBuilder.internships"),
                        placeholder: t("resumeBuilder.internshipsPlaceholder"),
                        type: "textarea",
                    },
                    {
                        name: "projects",
                        title: t("resumeBuilder.projects"),
                        placeholder: t("resumeBuilder.projectsPlaceholder"),
                        type: "textarea",
                    },
                    {
                        name: "certifications",
                        title: t("resumeBuilder.certifications"),
                        placeholder: t("resumeBuilder.certificationsPlaceholder"),
                        type: "textarea",
                    },
                    {
                        name: "achievements",
                        title: t("resumeBuilder.achievements"),
                        placeholder: t("resumeBuilder.achievementsPlaceholder"),
                        type: "textarea",
                    },
                    {
                        name: "languages",
                        title: t("resumeBuilder.languages"),
                        placeholder: t("resumeBuilder.languagesPlaceholder"),
                        type: "input",
                    },
                    {
                        name: "linkedin",
                        title: t("resumeBuilder.socialLinks"),
                        placeholder: t("resumeBuilder.linkedinUrl"),
                        type: "input",
                    },
                    {
                        name: "github",
                        title: t("resumeBuilder.socialLinks"),
                        placeholder: t("resumeBuilder.githubUrl"),
                        type: "input",
                    },
                    {
                        name: "portfolio",
                        title: t("resumeBuilder.socialLinks"),
                        placeholder: t("resumeBuilder.portfolioUrl"),
                        type: "input",
                    },
                    {
                        name: "references",
                        title: t("resumeBuilder.references"),
                        placeholder: t("resumeBuilder.referencesPlaceholder"),
                        type: "textarea",
                    },
                ].map((field) => (
                    <div className="form-section" key={field.name}>
                        <h2>{field.title}</h2>
                        {field.type === "textarea" ? (
                            <textarea
                                name={field.name}
                                placeholder={field.placeholder}
                                value={formData[field.name]}
                                onChange={handleChange}
                            />
                        ) : (
                            <input
                                name={field.name}
                                placeholder={field.placeholder}
                                value={formData[field.name]}
                                onChange={handleChange}
                            />
                        )}
                    </div>
                ))}

                <button
                    type="button"
                    className="save-btn"
                    onClick={handleSubmit}
                    disabled={saving || photoProcessing || cropModalOpen}
                >
                    {saving
                        ? t("resumeBuilder.saving")
                        : isEditMode
                            ? t("resumeBuilder.updateResume")
                            : t("resumeBuilder.saveResume")}
                </button>
            </div>

            <div className="preview-panel">
                <div className="preview-header">
                    <h2>{t("resumeBuilder.livePreview")}</h2>
                    <span>{t("resumeBuilder.atsFriendly")}</span>
                </div>

                <div
                    className={`resume-paper ${template}`}
                    style={{
                        fontFamily,
                        "--accent-color": accentColor,
                    }}
                >
                    <div className="resume-header" style={{ borderColor: accentColor }}>
                        {isPersistentImageData(profilePhoto) && (
                            <img
                                src={profilePhoto}
                                alt={t("common.profile")}
                                className="resume-photo"
                            />
                        )}

                        <div>
                            <h1>{formData.fullName || resumeLabels.yourName}</h1>                            <div className="contact-info">
                                {formData.email && <span>{formData.email}</span>}
                                {formData.phone && <span>{formData.phone}</span>}
                                {formData.address && <span>{formData.address}</span>}
                            </div>
                        </div>
                    </div>

                    {sectionOrder.map((section) => renderPreviewSection(section))}
                </div>
            </div>

            {showResumeNameModal && (
                <div
                    className="resume-name-modal-overlay"
                    onMouseDown={(event) => {
                        if (event.target === event.currentTarget && !saving) {
                            setShowResumeNameModal(false);
                            setResumeName("");
                        }
                    }}
                >
                    <div
                        className="resume-name-modal"
                        onMouseDown={(event) => event.stopPropagation()}
                    >
                        <div className="resume-name-modal-icon">
                            <span aria-hidden="true">✓</span>
                        </div>

                        <h3>{t("resumeBuilder.saveYourResume")}</h3>
                        <p>{t("resumeBuilder.resumeNameDescription")}</p>

                        <div className="resume-name-input-wrapper">
                            <label>{t("resumeBuilder.resumeName")}</label>
                            <input
                                type="text"
                                value={resumeName}
                                onChange={(e) => setResumeName(e.target.value)}
                                placeholder={t("resumeBuilder.resumeNamePlaceholder")}
                                maxLength={100}
                                autoFocus
                                disabled={saving}
                                onKeyDown={(e) => {
                                    if (e.key === "Enter") {
                                        e.preventDefault();
                                        const trimmedName = resumeName.trim();

                                        if (!trimmedName) {
                                            showToast(
                                                t("resumeBuilder.pleaseEnterResumeName"),
                                                "warning",
                                            );
                                            return;
                                        }

                                        saveResume(trimmedName);
                                    }

                                    if (e.key === "Escape" && !saving) {
                                        setShowResumeNameModal(false);
                                        setResumeName("");
                                    }
                                }}
                            />

                            <small>
                                {resumeName.length}/100 {t("resumeBuilder.characters")}
                            </small>
                        </div>

                        <div className="resume-name-modal-actions">
                            <button
                                type="button"
                                className="resume-name-cancel-btn"
                                disabled={saving}
                                onClick={() => {
                                    setShowResumeNameModal(false);
                                    setResumeName("");
                                }}
                            >
                                {t("resumeBuilder.cancel")}
                            </button>

                            <button
                                type="button"
                                className="resume-name-save-btn"
                                disabled={saving}
                                onClick={() => {
                                    const trimmedName = resumeName.trim();

                                    if (!trimmedName) {
                                        showToast(
                                            t("resumeBuilder.pleaseEnterResumeName"),
                                            "warning",
                                        );
                                        return;
                                    }

                                    saveResume(trimmedName);
                                }}
                            >
                                {saving
                                    ? t("resumeBuilder.saving")
                                    : t("resumeBuilder.saveResume")}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {cropModalOpen && (
                <div
                    style={{
                        position: "fixed",
                        inset: 0,
                        zIndex: 9999,
                        background: "rgba(15, 23, 42, 0.72)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        padding: "20px",
                    }}
                >
                    <div
                        style={{
                            width: "min(520px, 100%)",
                            maxHeight: "calc(100vh - 40px)",
                            overflowY: "auto",
                            background: "#ffffff",
                            borderRadius: "18px",
                            boxShadow: "0 25px 70px rgba(0,0,0,0.25)",
                            padding: "24px",
                        }}
                    >
                        <div
                            style={{
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "flex-start",
                                gap: "15px",
                                marginBottom: "20px",
                            }}
                        >
                            <div>
                                <h2
                                    style={{
                                        margin: 0,
                                        fontSize: "22px",
                                        color: "#111827",
                                    }}
                                >
                                    {t("resumeBuilder.editProfilePhoto")}
                                </h2>

                                <p
                                    style={{
                                        margin: "6px 0 0",
                                        color: "#64748b",
                                        fontSize: "14px",
                                    }}
                                >
                                    {t("resumeBuilder.adjustPhotoBeforeAdding")}
                                </p>
                            </div>

                            <button
                                type="button"
                                onClick={closeCropModal}
                                disabled={photoProcessing}
                                aria-label="Close crop dialog"
                                style={{
                                    width: "36px",
                                    height: "36px",
                                    border: "1px solid #e2e8f0",
                                    borderRadius: "50%",
                                    background: "#f8fafc",
                                    color: "#475569",
                                    fontSize: "20px",
                                    cursor: "pointer",
                                }}
                            >
                                ×
                            </button>
                        </div>

                        <div
                            ref={cropAreaRef}
                            onPointerDown={handleCropPointerDown}
                            onPointerMove={handleCropPointerMove}
                            onPointerUp={handleCropPointerUp}
                            onPointerCancel={handleCropPointerUp}
                            onLostPointerCapture={handleCropPointerUp}
                            style={{
                                width: `${CROP_PREVIEW_SIZE}px`,
                                height: `${CROP_PREVIEW_SIZE}px`,
                                maxWidth: "100%",
                                margin: "0 auto",
                                position: "relative",
                                overflow: "hidden",
                                background: "#0f172a",
                                borderRadius: "14px",
                                cursor: photoProcessing ? "default" : "grab",
                                touchAction: "none",
                                userSelect: "none",
                            }}
                        >
                            {cropImage && (
                                <img
                                    src={cropImage}
                                    alt={t("resumeBuilder.cropPreview")}
                                    draggable={false}
                                    onDragStart={(event) => event.preventDefault()}
                                    onPointerDown={handleCropPointerDown}
                                    style={{
                                        position: "absolute",
                                        width: "100%",
                                        height: "100%",
                                        objectFit: "cover",
                                        transform: `translate(${cropPosition.x}px, ${cropPosition.y}px) scale(${cropZoom})`,
                                        transformOrigin: "center",
                                        pointerEvents: "auto",
                                        userSelect: "none",
                                    }}
                                />
                            )}

                            <div
                                style={{
                                    position: "absolute",
                                    inset: 0,
                                    pointerEvents: "none",
                                    background: "rgba(0,0,0,0.18)",
                                }}
                            />

                            <div
                                style={{
                                    position: "absolute",
                                    width: "300px",
                                    height: "300px",
                                    left: "50%",
                                    top: "50%",
                                    transform: "translate(-50%, -50%)",
                                    border: "2px solid #ffffff",
                                    borderRadius: "50%",
                                    boxShadow: "0 0 0 9999px rgba(0,0,0,0.28)",
                                    pointerEvents: "none",
                                }}
                            />

                            <div
                                style={{
                                    position: "absolute",
                                    left: "50%",
                                    top: "50%",
                                    transform: "translate(-50%, -50%)",
                                    color: "#ffffff",
                                    fontSize: "20px",
                                    fontWeight: "700",
                                    pointerEvents: "none",
                                }}
                            >
                                +
                            </div>
                        </div>

                        <p
                            style={{
                                textAlign: "center",
                                margin: "12px 0 18px",
                                color: "#64748b",
                                fontSize: "13px",
                            }}
                        >
                            {t("resumeBuilder.dragImageToReposition")}
                        </p>

                        <div style={{ marginBottom: "18px" }}>
                            <div
                                style={{
                                    display: "flex",
                                    justifyContent: "space-between",
                                    alignItems: "center",
                                    marginBottom: "8px",
                                }}
                            >
                                <label style={{ fontWeight: "600", color: "#334155" }}>
                                    {t("resumeBuilder.zoom")}
                                </label>

                                <span style={{ fontSize: "13px", color: "#64748b" }}>
                                    {cropZoom.toFixed(1)}×
                                </span>
                            </div>

                            <input
                                type="range"
                                min={CROP_MIN_ZOOM}
                                max={CROP_MAX_ZOOM}
                                step="0.05"
                                value={cropZoom}
                                onChange={(e) => setCropZoom(Number(e.target.value))}
                                disabled={photoProcessing}
                                style={{ width: "100%" }}
                            />
                        </div>

                        <div
                            style={{
                                display: "grid",
                                gridTemplateColumns: "repeat(3, 42px)",
                                justifyContent: "center",
                                gap: "8px",
                                marginBottom: "22px",
                            }}
                        >
                            <div />

                            <button
                                type="button"
                                onClick={() => moveCrop("up")}
                                disabled={photoProcessing}
                                className="crop-control-btn"
                                aria-label="Move image up"
                            >
                                ↑
                            </button>

                            <div />

                            <button
                                type="button"
                                onClick={() => moveCrop("left")}
                                disabled={photoProcessing}
                                className="crop-control-btn"
                                aria-label="Move image left"
                            >
                                ←
                            </button>

                            <button
                                type="button"
                                onClick={resetCrop}
                                disabled={photoProcessing}
                                className="crop-control-btn"
                                title={t("resumeBuilder.resetCrop")}
                                aria-label={t("resumeBuilder.resetCrop")}
                            >
                                ↺
                            </button>

                            <button
                                type="button"
                                onClick={() => moveCrop("right")}
                                disabled={photoProcessing}
                                className="crop-control-btn"
                                aria-label="Move image right"
                            >
                                →
                            </button>

                            <div />

                            <button
                                type="button"
                                onClick={() => moveCrop("down")}
                                disabled={photoProcessing}
                                className="crop-control-btn"
                                aria-label="Move image down"
                            >
                                ↓
                            </button>

                            <div />
                        </div>

                        <div
                            style={{
                                display: "flex",
                                justifyContent: "flex-end",
                                gap: "10px",
                                flexWrap: "wrap",
                            }}
                        >
                            <button
                                type="button"
                                onClick={closeCropModal}
                                disabled={photoProcessing}
                                style={{
                                    padding: "11px 18px",
                                    border: "1px solid #cbd5e1",
                                    background: "#ffffff",
                                    color: "#334155",
                                    borderRadius: "8px",
                                    fontWeight: "600",
                                    cursor: "pointer",
                                }}
                            >
                                {t("resumeBuilder.cancel")}
                            </button>

                            <button
                                type="button"
                                onClick={resetCrop}
                                disabled={photoProcessing}
                                style={{
                                    padding: "11px 18px",
                                    border: "1px solid #cbd5e1",
                                    background: "#f8fafc",
                                    color: "#334155",
                                    borderRadius: "8px",
                                    fontWeight: "600",
                                    cursor: "pointer",
                                }}
                            >
                                {t("resumeBuilder.reset")}
                            </button>

                            <button
                                type="button"
                                onClick={applyCrop}
                                disabled={photoProcessing || !cropImage}
                                style={{
                                    padding: "11px 20px",
                                    border: "none",
                                    background: "#2563eb",
                                    color: "#ffffff",
                                    borderRadius: "8px",
                                    fontWeight: "600",
                                    cursor: "pointer",
                                    opacity: photoProcessing ? 0.7 : 1,
                                }}
                            >
                                {photoProcessing
                                    ? t("resumeBuilder.processing")
                                    : t("resumeBuilder.applyCrop")}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

/* ==========================================
   RESUME SECTION COMPONENT
========================================== */

function ResumeSection({ title, content }) {
    return (
        <div className="resume-section">
            <h3>{title}</h3>
            <p>{content}</p>
        </div>
    );
}

export default ResumeBuilder;
