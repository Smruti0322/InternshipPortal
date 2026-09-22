import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./MyResumes.css";

function MyResumes() {
    const navigate = useNavigate();

    const [resumes, setResumes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        fetchResumes();
    }, []);

    const fetchResumes = async () => {
        try {
            setLoading(true);

            const response = await fetch(
                "http://localhost:5000/api/resumes/user/1"
            );

            const data = await response.json();

            if (!response.ok) {
                throw new Error(
                    data.message || "Failed to load resumes"
                );
            }

            setResumes(data);
            setError("");

        } catch (error) {
            console.error("Fetch Resumes Error:", error);
            setError(error.message);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id) => {
        const confirmed = window.confirm(
            "Are you sure you want to delete this resume?"
        );

        if (!confirmed) {
            return;
        }

        try {
            const response = await fetch(
                `http://localhost:5000/api/resumes/${id}`,
                {
                    method: "DELETE",
                }
            );

            const data = await response.json();

            if (!response.ok) {
                throw new Error(
                    data.message || "Failed to delete resume"
                );
            }

            setResumes((previous) =>
                previous.filter(
                    (resume) => resume.id !== id
                )
            );

        } catch (error) {
            console.error("Delete Resume Error:", error);

            alert(
                "Failed to delete resume: " +
                error.message
            );
        }
    };

    const handleSetDefault = async (id) => {
        try {
            const response = await fetch(
                `http://localhost:5000/api/resumes/${id}/default`,
                {
                    method: "PUT",
                }
            );

            const data = await response.json();

            if (!response.ok) {
                throw new Error(
                    data.message ||
                    "Failed to set default resume"
                );
            }

            await fetchResumes();

        } catch (error) {
            console.error(
                "Set Default Error:",
                error
            );

            alert(
                "Failed to set default resume: " +
                error.message
            );
        }
    };

    const formatDate = (date) => {
        if (!date) return "Recently";

        return new Date(date).toLocaleDateString(
            "en-IN",
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
                    <h2>Loading your resumes...</h2>
                    <p>Please wait a moment.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="my-resumes-page">

            {/* HEADER */}

            <div className="my-resumes-header">

                <div>
                    <div className="page-badge">
                        Resume Builder
                    </div>

                    <h1>My Resumes</h1>

                    <p>
                        Create, manage and customize
                        your professional resumes.
                    </p>
                </div>

                <button
                    className="create-resume-btn"
                    onClick={() =>
                        navigate("/resume-builder")
                    }
                >
                    <span>+</span>
                    Create New Resume
                </button>

            </div>


            {/* STATS */}

            <div className="resume-stats">

                <div className="stat-card">

                    <div className="stat-icon blue">
                        📄
                    </div>

                    <div>
                        <span>Total Resumes</span>
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
                        <span>Default Resume</span>

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
                        <span>Templates</span>

                        <strong>3</strong>
                    </div>

                </div>

            </div>


            {/* ERROR */}

            {error && (
                <div className="resume-error">
                    <strong>Something went wrong</strong>
                    <span>{error}</span>

                    <button
                        onClick={fetchResumes}
                    >
                        Try Again
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
                        No resumes yet
                    </h2>

                    <p>
                        Create your first professional
                        resume and start applying for
                        opportunities.
                    </p>

                    <button
                        onClick={() =>
                            navigate("/resume-builder")
                        }
                        className="create-empty-btn"
                    >
                        Create Your First Resume
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

                                        {resume.profile_photo ? (
                                            <img
                                                src={
                                                    resume.profile_photo
                                                }
                                                alt=""
                                            />
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
                                                    "Your Name"}
                                            </div>

                                            <div className="mini-contact">
                                                {resume.email ||
                                                    "Email"}
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
                                        ✓ Default
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
                                                "Untitled Resume"
                                            }
                                        </h3>

                                        <p>
                                            Updated{" "}
                                            {formatDate(
                                                resume.updated_at ||
                                                resume.created_at
                                            )}
                                        </p>
                                    </div>

                                    <span className="template-tag">
                                        {
                                            resume.template ||
                                            "classic"
                                        }
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
                                        View
                                    </button>

                                    <button
                                        className="edit-btn"
                                        onClick={() =>
                                            navigate(
                                                `/resume-builder?id=${resume.id}`
                                            )
                                        }
                                    >
                                        Edit
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
                                            Set Default
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
                                        Delete
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