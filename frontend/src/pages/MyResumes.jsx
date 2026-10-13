import { useEffect, useState } from "react";

import { useNavigate } from "react-router-dom";

import { useToast } from "../context/ToastContext";

import { useTranslation } from "react-i18next";

import "./MyResumes.css";

const isPersistentImageData = (value) =>
    typeof value === "string" &&
    /^data:image\/(?:jpeg|png|webp);base64,[a-z0-9+/]+={0,2}$/i.test(
        value
    );

function MyResumes() {
    const navigate = useNavigate();

    const { showToast } = useToast();

    const { t, i18n } = useTranslation();

    const [resumes, setResumes] = useState([]);

    const [loading, setLoading] = useState(true);

    const [error, setError] = useState("");

    const authHeaders = {
        Authorization: `Bearer ${ localStorage.getItem("token") || "" } `,
    };

    const fetchResumes = async () => {
        try {
            setLoading(true);
            setError("");

            const token = localStorage.getItem("token");

            if (!token) {
                throw new Error(
                    t("common.pleaseLoginAgain")
                );
            }

            const response = await fetch(
                "http://localhost:5000/api/resumes",
                {
                    method: "GET",
                    headers: {
                        Authorization: `Bearer ${ token } `,
                    },
                }
            );

            const data = await response.json();

            console.log(
                "My Resumes API Response:",
                data
            );

            if (!response.ok) {
                throw new Error(
                    data.message ||
                        t("myResumes.failedLoadResumes")
                );
            }

            setResumes(
                Array.isArray(data) ? data : []
            );
        } catch (error) {
            console.error(
                "Fetch Resumes Error:",
                error
            );

            setError(error.message);

            setResumes([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchResumes();
    }, []);

    const handleDelete = async (id) => {
        const confirmed = window.confirm(
            t("myResumes.confirmDeleteResume")
        );

        if (!confirmed) {
            return;
        }

        try {
            const response = await fetch(
                `http://localhost:5000/api/resumes/${id}`,
{
    method: "DELETE",
        headers: authHeaders,
                }
            );

const data = await response.json();

if (!response.ok) {
    throw new Error(
        data.message ||
        t("myResumes.failedDeleteResume")
    );
}

setResumes((previous) =>
    previous.filter(
        (resume) => resume.id !== id
    )
);

showToast(
    t("myResumes.resumeDeletedSuccessfully"),
    "success"
);
        } catch (error) {
    console.error(
        "Delete Resume Error:",
        error
    );

    showToast(
        t("myResumes.unableDeleteResume"),
        "error"
    );
}
    };

const handleSetDefault = async (id) => {
    try {
        const response = await fetch(
            `http://localhost:5000/api/resumes/${id}/default`,
            {
                method: "PUT",
                headers: authHeaders,
            }
        );

        const data = await response.json();

        if (!response.ok) {
            throw new Error(
                data.message ||
                t("myResumes.failedSetDefaultResume")
            );
        }

        await fetchResumes();

        showToast(
            t("myResumes.defaultResumeUpdated"),
            "success"
        );
    } catch (error) {
        console.error(
            "Set Default Error:",
            error
        );

        showToast(
            t("myResumes.unableUpdateDefaultResume"),
            "error"
        );
    }
};

const formatDate = (date) => {
    if (!date) {
        return t("common.recently");
    }

    const language =
        i18n.resolvedLanguage || "en";

    const localeMap = {
        en: "en-IN",
        hi: "hi-IN",
        es: "es-ES",
        fr: "fr-FR",
        pt: "pt-BR",
        zh: "zh-CN",
    };

    return new Date(date).toLocaleDateString(
        localeMap[language] || "en-IN",
        {
            day: "2-digit",
            month: "short",
            year: "numeric",
        }
    );
};

if (loading) {
    return (
        <div className="my-resumes-page">
            <div className="resume-loading">
                <div className="resume-loader"></div>

                <h2>
                    {t(
                        "myResumes.loadingYourResumes"
                    )}
                </h2>

                <p>
                    {t(
                        "myResumes.pleaseWaitMoment"
                    )}
                </p>
            </div>
        </div>
    );
}

return (
    <div className="my-resumes-page">

        {/* HEADER */}

        <div className="my-resumes-header">
            <div>
                <button
                    type="button"
                    className="back-home-btn"
                    onClick={() => navigate("/")}
                >
                    ←{" "}
                    {t("myResumes.backToHome")}
                </button>

                <div className="page-badge">
                    {t("resumeBuilder.title")}
                </div>

                <h1>
                    {t("myResumes.myResumes")}
                </h1>

                <p>
                    {t(
                        "myResumes.manageResumesDescription"
                    )}
                </p>
            </div>

            <button
                className="create-resume-btn"
                onClick={() =>
                    navigate("/resume-builder")
                }
            >
                <span>+</span>

                {t(
                    "myResumes.createNewResume"
                )}
            </button>
        </div>

        {/* STATS */}

        <div className="resume-stats">

            <div className="stat-card">
                <div className="stat-icon blue">
                    📄
                </div>

                <div>
                    <span>
                        {t(
                            "myResumes.totalResumes"
                        )}
                    </span>

                    <strong>
                        {resumes.length}
                    </strong>
                </div>
            </div>

            <div className="stat-card">
                <div className="stat-icon green">
                    ✓
                </div>

                <div>
                    <span>
                        {t(
                            "myResumes.defaultResume"
                        )}
                    </span>

                    <strong>
                        {
                            resumes.filter(
                                (resume) =>
                                    resume.is_default
                            ).length
                        }
                    </strong>
                </div>
            </div>

            <div className="stat-card">
                <div className="stat-icon purple">
                    ✨
                </div>

                <div>
                    <span>
                        {t(
                            "myResumes.templates"
                        )}
                    </span>

                    <strong>3</strong>
                </div>
            </div>

        </div>

        {/* ERROR */}

        {error && (
            <div className="resume-error">
                <strong>
                    {t(
                        "common.somethingWentWrong"
                    )}
                </strong>

                <span>{error}</span>

                <button onClick={fetchResumes}>
                    {t("myResumes.tryAgain")}
                </button>
            </div>
        )}

        {/* EMPTY STATE */}

        {!error && resumes.length === 0 && (
            <div className="empty-resumes">

                <div className="empty-icon">
                    📄
                </div>

                <h2>
                    {t(
                        "myResumes.noResumesYet"
                    )}
                </h2>

                <p>
                    {t(
                        "myResumes.createFirstResumeDescription"
                    )}
                </p>

                <button
                    onClick={() =>
                        navigate("/resume-builder")
                    }
                    className="create-empty-btn"
                >
                    {t(
                        "myResumes.createFirstResume"
                    )}
                </button>

            </div>
        )}

        {/* RESUME GRID */}

        {!error && resumes.length > 0 && (
            <div className="resumes-grid">

                {resumes.map((resume) => (

                    <div
                        className="resume-card"
                        key={resume.id}
                    >

                        {/* CARD TOP */}

                        <div className="resume-card-top">

                            <div
                                className="resume-mini-preview"
                                style={{
                                    "--resume-accent":
                                        resume.accent_color ||
                                        "#2563eb",
                                }}
                            >

                                <div className="mini-header">

                                    {isPersistentImageData(
                                        resume.profile_photo
                                    ) ? (
                                        <>
                                            <img
                                                src={
                                                    resume.profile_photo
                                                }
                                                alt=""
                                                onError={(
                                                    event
                                                ) => {
                                                    event.currentTarget.style.display =
                                                        "none";

                                                    event.currentTarget.nextElementSibling.style.display =
                                                        "flex";
                                                }}
                                            />

                                            <div
                                                className="mini-avatar"
                                                style={{
                                                    display:
                                                        "none",
                                                }}
                                            >
                                                {resume.full_name
                                                    ?.charAt(0)
                                                    ?.toUpperCase() ||
                                                    "R"}
                                            </div>
                                        </>
                                    ) : (
                                        <div className="mini-avatar">
                                            {resume.full_name
                                                ?.charAt(0)
                                                ?.toUpperCase() ||
                                                "R"}
                                        </div>
                                    )}

                                    <div>

                                        <div className="mini-name">
                                            {resume.full_name ||
                                                t(
                                                    "resumeBuilder.yourName"
                                                )}
                                        </div>

                                        <div className="mini-contact">
                                            {resume.email ||
                                                t(
                                                    "common.email"
                                                )}
                                        </div>

                                    </div>

                                </div>

                                <div className="mini-line"></div>

                                <div className="mini-section">
                                    <span></span>
                                    <span></span>
                                    <span></span>
                                </div>

                                <div className="mini-section">
                                    <span></span>
                                    <span></span>
                                    <span></span>
                                </div>

                                <div className="mini-section">
                                    <span></span>
                                    <span></span>
                                </div>

                            </div>

                            {resume.is_default ? (
                                <div className="default-badge">
                                    ✓{" "}
                                    {t(
                                        "myResumes.default"
                                    )}
                                </div>
                            ) : null}

                        </div>

                        {/* CARD CONTENT */}

                        <div className="resume-card-content">

                            <div className="resume-title-row">

                                <div>

                                    <h3>
                                        {
                                            resume.resume_name ||
                                            t(
                                                "myResumes.untitledResume"
                                            )
                                        }
                                    </h3>

                                    <p>
                                        {t(
                                            "myResumes.updated"
                                        )}{" "}

                                        {formatDate(
                                            resume.updated_at ||
                                            resume.created_at
                                        )}
                                    </p>

                                </div>

                                <span className="template-tag">
                                    {resume.template ||
                                        t(
                                            "resumeBuilder.classic"
                                        )}
                                </span>

                            </div>

                            {/* ACTIONS */}

                            <div className="resume-actions">

                                <button
                                    className="view-btn"
                                    onClick={() =>
                                        navigate(
                                            `/view-resume/${resume.id}`
                                        )
                                    }
                                >
                                    {t(
                                        "myResumes.view"
                                    )}
                                </button>

                                <button
                                    className="edit-btn"
                                    onClick={() =>
                                        navigate(
                                            `/resume-builder?id=${resume.id}`
                                        )
                                    }
                                >
                                    {t(
                                        "myResumes.edit"
                                    )}
                                </button>

                                {!resume.is_default && (
                                    <button
                                        className="default-btn"
                                        onClick={() =>
                                            handleSetDefault(
                                                resume.id
                                            )
                                        }
                                    >
                                        {t(
                                            "myResumes.setDefault"
                                        )}
                                    </button>
                                )}

                                <button
                                    className="delete-btn"
                                    onClick={() =>
                                        handleDelete(
                                            resume.id
                                        )
                                    }
                                >
                                    {t(
                                        "myResumes.delete"
                                    )}
                                </button>

                            </div>

                        </div>

                    </div>

                ))}

            </div>
        )}

    </div>
);
}

export default MyResumes;