
import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import "./InternshipList.css";
import { API_BASE_URL } from "../config/api.js";



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
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedLocation, setSelectedLocation] = useState("");

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
            throw new Error(
                data.message || t("internships.requestFailed")
            );
        }

        return data;
    }, [token, t]);

    const loadData = useCallback(async () => {
        if (!token) {
            setError(t("internships.loginToView"));
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
    }, [request, token, t]);

    useEffect(() => {
        const initialLoad = window.setTimeout(() => loadData(), 0);
        return () => window.clearTimeout(initialLoad);
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
                data.message || t("internships.applicationSuccess")            );

            await loadData();
            setActiveTab("applications");
        } catch (err) {
            // Save the error before refreshing the data
            const errorMessage =
                err.message || t("internships.applicationFailed");
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

    const translateApplicationStatus = (status) => {
        const normalizedStatus = String(status || "")
            .trim()
            .toLowerCase()
            .replace(/[\s-]+/g, "_");

        return t(`internships.statuses.${normalizedStatus}`, {
            defaultValue: status || t("common.unknown"),
        });
    };

    const applicationLimit = subscription?.application_limit;
    const applicationsUsed = Number(subscription?.applications_used || 0);
    const isUnlimited = applicationLimit === null;
    const remaining = isUnlimited
        ? null
        : Math.max(0, Number(applicationLimit ?? 1) - applicationsUsed);
    const locations = [...new Set(internships.map((item) => item.location).filter(Boolean))].sort();
    const filteredInternships = internships.filter((item) => {
        const query = searchTerm.trim().toLocaleLowerCase();
        const searchable = `${item.title || ""} ${item.company_name || ""} ${item.location || ""}`.toLocaleLowerCase();
        return (!query || searchable.includes(query)) &&
            (!selectedLocation || item.location === selectedLocation);
    });

    return (
        <div className="internship-page">


            <Link to="/" className="back-home-btn">
                ← {t("common.backToHome")}
            </Link>

            <header className="internship-header">
                <div>
                    <p className="internship-eyebrow">{t("internships.eyebrow")}</p>
                    <h1>{t("internships.title")}</h1>
                    <p className="internship-subtitle">
                        {t("internships.subtitle")}
                    </p>
                </div>

                <Link to="/profile" className="internship-profile-link">
                    {t("internships.myProfile")}
                </Link>
            </header>

            {subscription && (
                <section className="subscription-summary">
                    <div>
                        <span className="summary-label">{t("internships.currentPlan")}</span>
                        <h2>{(!subscription.plan_name ||
                            String(subscription.plan_name).toLowerCase() === "free"
                            ? t("internships.freePlan")
                            : subscription.plan_name)}{" "}
                            {t("internships.planSuffix")}</h2>
                        <p>
                            {isUnlimited
                                ? t("internships.unlimitedApplications")
                                : t("internships.remainingApplications", { count: remaining ?? 1 })}
                        </p>
                    </div>

                    <div className="quota-info">
                        <span>{t("internships.applicationsUsed")}</span>
                        <strong>
                            {applicationsUsed} / {isUnlimited ? "∞" : (applicationLimit ?? 1)}
                        </strong>
                    </div>

                    <Link to="/subscriptions" className="upgrade-link">
                        {t("internships.comparePlans")}
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
                    {t("internships.availableInternshipsLabel", { count: internships.length })}
                </button>

                <button
                    type="button"
                    className={activeTab === "applications" ? "active" : ""}
                    onClick={() => setActiveTab("applications")}
                >
                    {t("internships.myApplicationsLabel", { count: applications.length })}
                </button>
            </nav>

            {loading ? (
                <div className="internship-empty" role="status">{t("internships.loading")}</div>
            ) : activeTab === "internships" ? (
                internships.length === 0 ? (
                    <div className="internship-empty">
                        {t("internships.noOpenInternships")}
                    </div>
                ) : (
                    <>
                    <div className="internship-filters">
                        <label>
                            <span>{t("internships.searchLabel")}</span>
                            <input type="search" value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} placeholder={t("internships.searchPlaceholder")} />
                        </label>
                        <label>
                            <span>{t("internships.locationLabel")}</span>
                            <select value={selectedLocation} onChange={(event) => setSelectedLocation(event.target.value)}>
                                <option value="">{t("internships.allLocations")}</option>
                                {locations.map((location) => <option key={location} value={location}>{location}</option>)}
                            </select>
                        </label>
                    </div>
                    {filteredInternships.length === 0 ? (
                        <div className="internship-empty">{t("internships.noMatchingInternships")}</div>
                    ) : <div className="internship-grid">
                        {filteredInternships.map((internship) => {
                            const applied = hasApplied(internship.id);

                            return (
                                <article className="internship-card" key={internship.id}>
                                    <div className="internship-card-top">
                                        <div className="company-avatar">
                                            {(internship.company_name || "C")
                                                .charAt(0)
                                                .toUpperCase()}
                                        </div>
                                        <span className="internship-status">{t("internships.openStatus")}</span>
                                    </div>

                                    <h2>{internship.title}</h2>
                                    <p className="company-name">
                                        {internship.company_name}
                                    </p>

                                    <p className="internship-description">
                                        {internship.description}
                                    </p>

                                    <div className="internship-details">
                                        <span>
                                            📍 {String(internship.location || "").trim().toLowerCase() === "remote"
                                                ? t("internships.remote")
                                                : internship.location || t("internships.remote")}
                                        </span>                                        
                                        <span>₹ {internship.stipend || t("internships.unpaid")}</span>
                                        <span>🗓️ {internship.duration || t("internships.durationUnspecified")}</span>
                                    </div>

                                    {internship.application_deadline && (
                                        <p className="deadline">
                                            {t("internships.deadlineLabel")}{" "}
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
                                            ? t("internships.alreadyApplied")
                                            : applyingId === internship.id
                                                ? t("internships.applying")
                                                : t("internships.applyNow")}
                                    </button>
                                </article>
                            );
                        })}
                    </div>}
                    </>
                )
            ) : applications.length === 0 ? (
                <div className="internship-empty">
                    {t("internships.noApplications")}
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
                                    {t("internships.appliedLabel")}{" "}
                                    {application.applied_at
                                        ? new Date(application.applied_at).toLocaleDateString()
                                        : t("internships.dateUnavailable")}
                                </span>
                            </div>

                            <span className={`application-status ${application.status}`}>
                                {translateApplicationStatus(application.status)}
                            </span>
                        </article>
                    ))}
                </div>
            )}
        </div>
    );
}

export default InternshipList;
