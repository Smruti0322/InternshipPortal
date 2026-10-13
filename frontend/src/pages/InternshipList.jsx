
import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import "./InternshipList.css";

const API_BASE_URL = "http://localhost:5000";

function InternshipList() {
    const { t } = useTranslation();

    const [internships, setInternships] = useState([]);
    const [applications, setApplications] = useState([]);
    const [subscription, setSubscription] = useState(null);
    const [loading, setLoading] = useState(true);
    const [applyingId, setApplyingId] = useState(null);
    const [message, setMessage] = useState("");
    const [error, setError] = useState("");
    const [activeTab, setActiveTab] = useState("internships");

    const token = localStorage.getItem("token");

    const request = useCallback(async (path, options = {}) => {
        const response = await fetch(`${API_BASE_URL}${path}`, {
            ...options,
            headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
                ...options.headers,
            },
        });

        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
            throw new Error(data.message || "Request failed. Please try again.");
        }

        return data;
    }, [token]);

    const loadData = useCallback(async () => {
        if (!token) {
            setError("Please log in to view internships and apply.");
            setLoading(false);
            return;
        }

        setLoading(true);
        setError("");

        try {
            const results = await Promise.all([
                request("/api/internships"),
                request("/api/subscriptions/current"),
                request("/api/internships/my-applications"),
            ]);

            setInternships(Array.isArray(results[0]) ? results[0] : []);
            setSubscription(results[1]);
            setApplications(Array.isArray(results[2]) ? results[2] : []);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, [request, token]);

    useEffect(() => {
        loadData();
    }, [loadData]);


    const handleApply = async (internshipId) => {
        setApplyingId(internshipId);
        setMessage("");
        setError("");

        try {
            const data = await request(
                `/api/internships/${internshipId}/apply`,
                { method: "POST" }
            );

            setMessage(
                data.message || "Application submitted successfully."
            );

            await loadData();
            setActiveTab("applications");
        } catch (err) {
            // Save the error before refreshing the data
            const errorMessage =
                err.message || "Unable to apply. Please try again.";

            await loadData();

            // Restore the error after loadData clears it
            setError(errorMessage);
        } finally {
            setApplyingId(null);
        }
    };


    const hasApplied = (internshipId) =>
        applications.some(
            (application) =>
                Number(application.internship_id) === Number(internshipId)
        );

    const applicationLimit = subscription?.application_limit;
    const applicationsUsed = Number(subscription?.applications_used || 0);
    const isUnlimited = applicationLimit === null;
    const remaining = isUnlimited
        ? null
        : Math.max(0, Number(applicationLimit ?? 1) - applicationsUsed);

    return (
        <div className="internship-page">


            <Link to="/" className="back-home-btn">
                ← Back to Home
            </Link>

            <header className="internship-header">
                <div>
                    <p className="internship-eyebrow">CAREER OPPORTUNITIES</p>
                    <h1>{t("internships.title", { defaultValue: "Find Your Internship" })}</h1>
                    <p className="internship-subtitle">
                        Explore opportunities and take the next step in your career.
                    </p>
                </div>

                <Link to="/profile" className="internship-profile-link">
                    My Profile
                </Link>
            </header>

            {subscription && (
                <section className="subscription-summary">
                    <div>
                        <span className="summary-label">CURRENT PLAN</span>
                        <h2>{subscription.plan_name || "Free"} Plan</h2>
                        <p>
                            {isUnlimited
                                ? "Unlimited applications"
                                : `${remaining ?? 1} application(s) remaining this month`}
                        </p>
                    </div>

                    <div className="quota-info">
                        <span>Applications used</span>
                        <strong>
                            {applicationsUsed} / {isUnlimited ? "∞" : (applicationLimit ?? 1)}
                        </strong>
                    </div>

                    <Link to="/subscriptions" className="upgrade-link">
                        Compare Plans
                    </Link>
                </section>
            )}

            {message && <div className="internship-message success">{message}</div>}
            {error && <div className="internship-message error">{error}</div>}

            <nav className="internship-tabs">
                <button
                    type="button"
                    className={activeTab === "internships" ? "active" : ""}
                    onClick={() => setActiveTab("internships")}
                >
                    Available Internships ({internships.length})
                </button>

                <button
                    type="button"
                    className={activeTab === "applications" ? "active" : ""}
                    onClick={() => setActiveTab("applications")}
                >
                    My Applications ({applications.length})
                </button>
            </nav>

            {loading ? (
                <div className="internship-empty">Loading opportunities...</div>
            ) : activeTab === "internships" ? (
                internships.length === 0 ? (
                    <div className="internship-empty">
                        No internships are available right now.
                    </div>
                ) : (
                    <div className="internship-grid">
                        {internships.map((internship) => {
                            const applied = hasApplied(internship.id);

                            return (
                                <article className="internship-card" key={internship.id}>
                                    <div className="internship-card-top">
                                        <div className="company-avatar">
                                            {(internship.company_name || "C")
                                                .charAt(0)
                                                .toUpperCase()}
                                        </div>
                                        <span className="internship-status">Open</span>
                                    </div>

                                    <h2>{internship.title}</h2>
                                    <p className="company-name">
                                        {internship.company_name}
                                    </p>

                                    <p className="internship-description">
                                        {internship.description}
                                    </p>

                                    <div className="internship-details">
                                        <span>📍 {internship.location || "Remote"}</span>
                                        <span>💰 {internship.stipend || "Unpaid"}</span>
                                        <span>🗓️ {internship.duration || "Not specified"}</span>
                                    </div>

                                    {internship.application_deadline && (
                                        <p className="deadline">
                                            Deadline:{" "}
                                            {String(internship.application_deadline).slice(0, 10)}
                                        </p>
                                    )}

                                    <button
                                        type="button"
                                        className="apply-button"
                                        disabled={applied || applyingId === internship.id}
                                        onClick={() => handleApply(internship.id)}
                                    >
                                        {applied
                                            ? "Already Applied"
                                            : applyingId === internship.id
                                                ? "Applying..."
                                                : "Apply Now"}
                                    </button>
                                </article>
                            );
                        })}
                    </div>
                )
            ) : applications.length === 0 ? (
                <div className="internship-empty">
                    You haven't applied for any internships yet.
                </div>
            ) : (
                <div className="my-applications-list">
                    {applications.map((application) => (
                        <article
                            className="my-application-card"
                            key={application.application_id}
                        >
                            <div>
                                <h3>{application.title}</h3>
                                <p>{application.company_name}</p>
                                <span>
                                    Applied:{" "}
                                    {application.applied_at
                                        ? new Date(application.applied_at).toLocaleDateString()
                                        : "Date unavailable"}
                                </span>
                            </div>

                            <span className={`application-status ${application.status}`}>
                                {application.status}
                            </span>
                        </article>
                    ))}
                </div>
            )}
        </div>
    );
}

export default InternshipList;