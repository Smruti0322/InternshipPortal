
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import "../App.css";
import "./Profile.css";
import { API_BASE_URL } from "../config/api.js";



function Profile() {
    const { t, i18n } = useTranslation();
    const navigate = useNavigate();

    const [user] = useState(() => {
        const storedUser = localStorage.getItem("user");
        if (!storedUser) return null;
        try {
            return JSON.parse(storedUser);
        } catch (error) {
            console.error("Invalid user data:", error);
            localStorage.removeItem("user");
            localStorage.removeItem("token");
            return null;
        }
    });
    const [loginHistory, setLoginHistory] = useState([]);
    const loading = !user;
    const [historyLoading, setHistoryLoading] = useState(true);
    const [error, setError] = useState("");

    const [sessions, setSessions] = useState([]);
    const [sessionsLoading, setSessionsLoading] = useState(true);
    const [sessionsError, setSessionsError] = useState("");
    const [signingOutOthers, setSigningOutOthers] = useState(false);
    const [revokingSessionId, setRevokingSessionId] = useState(null);
    const [sessionMessage, setSessionMessage] = useState("");

    // Subscription state
    const [subscription, setSubscription] = useState(null);
    const [subscriptionLoading, setSubscriptionLoading] = useState(true);
    const [subscriptionError, setSubscriptionError] = useState("");

    useEffect(() => {
        if (!user) navigate("/login", { replace: true });
    }, [navigate, user]);

    useEffect(() => {
        const fetchLoginHistory = async () => {
            const token = localStorage.getItem("token");

            if (!token) {
                setHistoryLoading(false);
                return;
            }

            try {
                const response = await fetch(
                    `${API_BASE_URL}/api/auth/login-history`,
                    {
                        headers: {
                            Authorization: `Bearer ${token}`,
                        },
                    }
                );

                if (response.status === 401) {
                    localStorage.removeItem("token");
                    localStorage.removeItem("user");
                    navigate("/login");
                    return;
                }

                const data = await response.json();

                if (data.success) {
                    setLoginHistory(data.login_history || []);
                } else {
                    setError(
                        data.message ||
                        t("profile.failedLoadLoginHistory")
                    );
                }
            } catch (err) {
                console.error("Login history error:", err);
                setError(t("profile.unableLoadLoginHistory"));
            } finally {
                setHistoryLoading(false);
            }
        };

        fetchLoginHistory();
    }, [navigate, t]);

    useEffect(() => {
        const fetchSessions = async () => {
            const token = localStorage.getItem("token");

            if (!token) {
                setSessionsLoading(false);
                return;
            }

            try {
                const response = await fetch(
                    `${API_BASE_URL}/api/auth/sessions`,
                    {
                        headers: {
                            Authorization: `Bearer ${token}`,
                        },
                    }
                );

                if (response.status === 401) {
                    localStorage.removeItem("token");
                    localStorage.removeItem("user");
                    navigate("/login");
                    return;
                }

                const data = await response.json();

                if (data.success) {
                    setSessions(data.sessions || []);
                } else {
                    setSessionsError(
                        data.message ||
                        t("profile.failedLoadActiveSessions")
                    );
                }
            } catch (err) {
                console.error("Active sessions error:", err);
                setSessionsError(t("profile.unableLoadActiveSessions"));
            } finally {
                setSessionsLoading(false);
            }
        };

        fetchSessions();
    }, [navigate, t]);

    // Fetch current subscription
    useEffect(() => {
        const fetchSubscription = async () => {
            const token = localStorage.getItem("token");

            if (!token) {
                setSubscriptionLoading(false);
                return;
            }

            try {
                const response = await fetch(
                    `${API_BASE_URL}/api/subscriptions/current`,
                    {
                        headers: {
                            Authorization: `Bearer ${token}`,
                        },
                    }
                );

                if (response.status === 401) {
                    localStorage.removeItem("token");
                    localStorage.removeItem("user");
                    navigate("/login");
                    return;
                }

                const data = await response.json();

                if (!response.ok) {
                    throw new Error(
                        t("profile.subscriptionLoadError", {
                            defaultValue: "Unable to load subscription.",
                        })
                    );
                }

                setSubscription(data);
                setSubscriptionError("");
            } catch (err) {
                console.error("Subscription fetch error:", err);
                setSubscriptionError(
                    t("profile.subscriptionLoadDetailsError", {
                        defaultValue: "Unable to load subscription details.",
                    })
                );
            } finally {
                setSubscriptionLoading(false);
            }
        };

        fetchSubscription();
    }, [navigate]);

    const getUserName = () => {
        if (!user) return t("profile.user");

        return (
            user.name ||
            user.full_name ||
            user.username ||
            `${user.first_name || ""} ${user.last_name || ""}`.trim() ||
            t("profile.user")
        );
    };

    const getInitial = () => getUserName().charAt(0).toUpperCase();

    const handleLogout = async () => {
        const token = localStorage.getItem("token");
        try {
            if (token) {
                await fetch(`${API_BASE_URL}/api/auth/sessions/logout`, {
                    method: "POST",
                    headers: { Authorization: `Bearer ${token}` },
                });
            }
        } catch (logoutError) {
            console.error("Server session logout failed:", logoutError.message);
        } finally {
            localStorage.removeItem("token");
            localStorage.removeItem("user");
            navigate("/login");
        }
    };

    const handleRevokeSession = async (sessionId) => {
        const token = localStorage.getItem("token");
        if (!token) {
            navigate("/login");
            return;
        }

        setRevokingSessionId(sessionId);
        setSessionsError("");
        setSessionMessage("");
        try {
            const response = await fetch(
                `${API_BASE_URL}/api/auth/sessions/${sessionId}/revoke`,
                { method: "POST", headers: { Authorization: `Bearer ${token}` } }
            );
            const data = await response.json().catch(() => ({}));
            if (!response.ok || !data.success) {
                throw new Error(data.message || t("profile.unableRevokeSession"));
            }
            setSessions((current) => current.filter((session) => Number(session.id) !== Number(sessionId)));
            setSessionMessage(t("profile.sessionRevoked"));
        } catch (revokeError) {
            console.error("Revoke session error:", revokeError);
            setSessionsError(revokeError.message || t("profile.unableRevokeSession"));
        } finally {
            setRevokingSessionId(null);
        }
    };

    const handleSignOutOtherDevices = async () => {
        const token = localStorage.getItem("token");

        if (!token) {
            navigate("/login");
            return;
        }

        setSigningOutOthers(true);
        setSessionMessage("");
        setSessionsError("");

        try {
            const response = await fetch(
                `${API_BASE_URL}/api/auth/sessions/sign-out-others`,
                {
                    method: "POST",
                    headers: {
                        Authorization: `Bearer ${token}`,
                        "Content-Type": "application/json",
                    },
                }
            );

            if (response.status === 401) {
                localStorage.removeItem("token");
                localStorage.removeItem("user");
                navigate("/login");
                return;
            }

            const data = await response.json();

            if (data.success) {
                setSessionMessage(
                    data.message || t("profile.otherDevicesSignedOut")
                );

                const refreshResponse = await fetch(
                    `${API_BASE_URL}/api/auth/sessions`,
                    {
                        headers: {
                            Authorization: `Bearer ${token}`,
                        },
                    }
                );

                const refreshData = await refreshResponse.json();

                if (refreshData.success) {
                    setSessions(refreshData.sessions || []);
                }
            } else {
                setSessionsError(
                    data.message ||
                    t("profile.unableSignOutOtherDevices")
                );
            }
        } catch (err) {
            console.error("Sign out other devices error:", err);
            setSessionsError(
                t("profile.unableSignOutOtherDevicesRetry")
            );
        } finally {
            setSigningOutOthers(false);
        }
    };

    const formatDateTime = (dateValue) => {
        if (!dateValue) return "-";

        const date = new Date(dateValue);

        if (Number.isNaN(date.getTime())) return dateValue;

        return date.toLocaleString(i18n.language, {
            timeZone: "Asia/Kolkata",
        });
    };

    const formatSubscriptionDate = (dateValue) => {
        if (!dateValue) return "-";

        const date = new Date(dateValue);

        if (Number.isNaN(date.getTime())) return "-";

        return date.toLocaleDateString(i18n.language, {
            day: "2-digit",
            month: "short",
            year: "numeric",
            timeZone: "Asia/Kolkata",
        });
    };

    const getStatusClass = (status) => {
        const normalized = String(status || "").toLowerCase();

        if (
            normalized.includes("success") ||
            normalized.includes("active") ||
            normalized.includes("login")
        ) {
            return "success";
        }

        if (
            normalized.includes("failed") ||
            normalized.includes("error") ||
            normalized.includes("logout")
        ) {
            return "failed";
        }

        return "default";
    };

    const getTranslatedStatus = (status) => {
        const normalized = String(status || "")
            .trim()
            .toLowerCase()
            .replace(/[\s-]+/g, "_");

        const statusKeys = {
            active: "profile.statusActive",
            success: "profile.statusSuccess",
            failed: "profile.statusFailed",
            logged_out: "profile.statusLoggedOut",
            logout: "profile.statusLoggedOut",
            cancelled: "profile.statusCancelled",
            canceled: "profile.statusCancelled",
            expired: "profile.statusExpired",
            pending: "profile.statusPending",
            inactive: "profile.statusInactive",
            otp_required: "profile.statusOtpRequired",
            unknown: "profile.statusUnknown",
        };

        const key = statusKeys[normalized];

        return key
            ? t(key, { defaultValue: status || t("profile.statusUnknown") })
            : status || t("profile.statusUnknown");
    };

    const getTranslatedDevice = (deviceType) => {
        const normalized = String(deviceType || "").toLowerCase();

        if (normalized === "mobile") {
            return t("profile.deviceTypeMobile");
        }

        if (normalized === "desktop") {
            return t("profile.deviceTypeDesktop");
        }

        return deviceType || "-";
    };

    const getDeviceLabel = (session) => {
        if (!session) return t("profile.unknownDevice");

        const deviceType = getTranslatedDevice(session.device_type);

        if (session.device_model) {
            return `${deviceType} • ${session.device_model}`;
        }

        return deviceType;
    };

    if (loading) {
        return (
            <div className="profile-page">
                <div className="profile-loading">
                    {t("profile.loadingProfile")}
                </div>
            </div>
        );
    }

    return (
        <div className="profile-page">
            <div className="profile-top-bar">
                <button
                    type="button"
                    className="profile-back-button"
                    onClick={() => navigate(-1)}
                >
                    ← {t("common.backToHome")}
                </button>
            </div>

            <main className="profile-content">
                <section className="profile-header-card">
                    <div className="profile-large-avatar">
                        {getInitial()}
                    </div>

                    <div className="profile-user-info">
                        <h1>{getUserName()}</h1>
                        <p>{user?.email || "-"}</p>
                    </div>

                    <div className="profile-header-actions">
                        <button
                            type="button"
                            className="profile-page-logout-button"
                            onClick={handleLogout}
                        >
                            {t("common.logout")}
                        </button>
                    </div>
                </section>

                {/* SUBSCRIPTION */}
                <section className="subscription-section">
                    <div className="subscription-heading">
                        <div>
                            <h2>
                                {t(
                                    "profile.mySubscription",
                                    "My Subscription"
                                )}
                            </h2>
                            <p>
                                {t(
                                    "profile.subscriptionDescription",
                                    "View your current plan and application usage."
                                )}
                            </p>
                        </div>
                    </div>

                    {subscriptionLoading ? (
                        <div className="subscription-message">
                            {t(
                                "profile.loadingSubscription",
                                "Loading subscription..."
                            )}
                        </div>
                    ) : subscriptionError ? (
                        <div className="subscription-error">
                            {subscriptionError}
                        </div>
                    ) : subscription ? (
                        <>
                            <div className="subscription-plan-header">
                                <div>
                                    <span className="subscription-label">
                                        {t(
                                            "profile.currentPlan",
                                            "Current Plan"
                                        )}
                                    </span>

                                            <h3>
                                                {subscription.plan_name?.toLowerCase() === "free"
                                                    ? t("profile.freePlan")
                                                    : subscription.plan_name || t("profile.freePlan")}
                                            </h3>

                                </div>

                                <span
                                    className={`subscription-status ${String(
                                        subscription.status || "active"
                                    ).toLowerCase()}`}
                                >
                                            {getTranslatedStatus(subscription.status || "active")}
                                </span>
                            </div>

                            <div className="subscription-details">
                                <div className="subscription-detail-item">
                                    <span>
                                        {t(
                                            "profile.monthlyPrice",
                                            "Monthly Price"
                                        )}
                                    </span>
                                    <strong>
                                        ₹
                                        {Number(
                                            subscription.monthly_price || 0
                                        ).toLocaleString("en-IN")}
                                    </strong>
                                </div>

                                <div className="subscription-detail-item">
                                    <span>
                                        {t(
                                            "profile.applicationsUsed",
                                            "Applications Used"
                                        )}
                                    </span>
                                    <strong>
                                        {subscription.applications_used ?? 0}
                                    </strong>
                                </div>

                                <div className="subscription-detail-item">
                                    <span>
                                        {t(
                                            "profile.applicationLimit",
                                            "Application Limit"
                                        )}
                                    </span>
                                    <strong>
                                        {subscription.application_limit == null
                                            ? t("common.unlimited", "Unlimited")
                                            : subscription.application_limit}
                                    </strong>
                                </div>

                                <div className="subscription-detail-item">
                                    <span>
                                        {t(
                                            "profile.remainingApplications",
                                            "Remaining Applications"
                                        )}
                                    </span>
                                    <strong>
                                        {subscription.remaining_applications == null
                                            ? t("common.unlimited", "Unlimited")
                                            : subscription.remaining_applications}
                                    </strong>
                                </div>

                                <div className="subscription-detail-item">
                                    <span>
                                        {t(
                                            "profile.startDate",
                                            "Start Date"
                                        )}
                                    </span>
                                    <strong>
                                        {formatSubscriptionDate(
                                            subscription.started_at
                                        )}
                                    </strong>
                                </div>

                                <div className="subscription-detail-item">
                                    <span>
                                        {t(
                                            "profile.validUntil",
                                            "Valid Until"
                                        )}
                                    </span>
                                    <strong>
                                        {formatSubscriptionDate(
                                            subscription.expires_at
                                        )}
                                    </strong>
                                </div>
                            </div>

                            <p className="subscription-note">
                                {t(
                                    "profile.subscriptionValidityNote",
                                    "Your plan validity is based on the date provided by the server. Renewal is not guaranteed."
                                )}
                            </p>
                        </>
                    ) : (
                        <div className="subscription-message">
                            {t(
                                "profile.subscriptionUnavailable",
                                "Subscription details are unavailable."
                            )}
                        </div>
                    )}
                </section>

                {/* LOGIN HISTORY */}
                <section className="login-history-section">
                    <div className="login-history-heading">
                        <div>
                            <h2>{t("profile.loginHistory")}</h2>
                            <p>
                                {t("profile.loginHistoryDescription")}
                            </p>
                        </div>
                    </div>

                    {historyLoading ? (
                        <div className="login-history-loading">
                            {t("profile.loadingLoginHistory")}
                        </div>
                    ) : error ? (
                        <div className="login-history-error">{error}</div>
                    ) : loginHistory.length === 0 ? (
                        <div className="login-history-empty">
                            {t("profile.noLoginHistory")}
                        </div>
                    ) : (
                        <>
                            <div className="login-history-table-wrapper">
                                <table className="login-history-table">
                                    <thead>
                                        <tr>
                                            <th>{t("profile.dateTime")}</th>
                                            <th>{t("profile.browser")}</th>
                                            <th>{t("profile.device")}</th>
                                            <th>{t("profile.ipAddress")}</th>
                                            <th>{t("profile.status")}</th>
                                        </tr>
                                    </thead>

                                    <tbody>
                                        {loginHistory.map((item, index) => (
                                            <tr key={item.id || index}>
                                                <td>
                                                    {formatDateTime(
                                                        item.login_date_time
                                                    )}
                                                </td>
                                                <td>
                                                    {item.browser_name || "-"}
                                                    {item.browser_version
                                                        ? ` ${item.browser_version}`
                                                        : ""}
                                                </td>
                                                <td>
                                                    {getTranslatedDevice(item.device_type)}
                                                </td>
                                                <td>
                                                    {item.ip_address || "-"}
                                                </td>
                                                <td>
                                                    <span
                                                        className={`login-status ${getStatusClass(
                                                            item.login_status
                                                        )}`}
                                                    >
                                                        {getTranslatedStatus(item.login_status || "unknown")}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            <div className="login-history-mobile-list">
                                {loginHistory.map((item, index) => (
                                    <div
                                        className="login-history-mobile-card"
                                        key={item.id || index}
                                    >
                                        <div className="mobile-history-row">
                                            <span>
                                                {t("profile.dateTime")}
                                            </span>
                                            <strong>
                                                {formatDateTime(
                                                    item.login_date_time
                                                )}
                                            </strong>
                                        </div>

                                        <div className="mobile-history-row">
                                            <span>
                                                {t("profile.browser")}
                                            </span>
                                            <strong>
                                                {item.browser_name || "-"}
                                                {item.browser_version
                                                    ? ` ${item.browser_version}`
                                                    : ""}
                                            </strong>
                                        </div>

                                        <div className="mobile-history-row">
                                            <span>
                                                {t("profile.device")}
                                            </span>
                                            <strong>
                                                {getTranslatedDevice(item.device_type)}
                                            </strong>
                                        </div>

                                        <div className="mobile-history-row">
                                            <span>
                                                {t("profile.ipAddress")}
                                            </span>
                                            <strong>
                                                {item.ip_address || "-"}
                                            </strong>
                                        </div>

                                        <div className="mobile-history-row">
                                            <span>
                                                {t("profile.status")}
                                            </span>
                                            <span
                                                className={`login-status ${getStatusClass(
                                                    item.login_status
                                                )}`}
                                            >
                                                {getTranslatedStatus(item.login_status || "unknown")}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </>
                    )}
                </section>

                {/* ACTIVE SESSIONS */}
                <section className="active-sessions-section">
                    <div className="active-sessions-heading">
                        <div>
                            <h2>{t("profile.activeSessions")}</h2>
                            <p>
                                {t("profile.activeSessionsDescription")}
                            </p>
                        </div>

                        {sessions.length > 1 && (
                            <button
                                type="button"
                                className="sign-out-other-devices-button"
                                onClick={handleSignOutOtherDevices}
                                disabled={signingOutOthers}
                            >
                                {signingOutOthers
                                    ? t("profile.signingOut")
                                    : t("profile.signOutOtherDevices")}
                            </button>
                        )}
                    </div>

                    {sessionsLoading ? (
                        <div className="active-sessions-loading">
                            {t("profile.loadingActiveSessions")}
                        </div>
                    ) : sessionsError ? (
                        <div className="active-sessions-error">
                            {sessionsError}
                        </div>
                    ) : sessions.length === 0 ? (
                        <div className="active-sessions-empty">
                            {t("profile.noActiveSessions")}
                        </div>
                    ) : (
                        <>
                            {sessionMessage && (
                                <div className="active-sessions-success">
                                    {sessionMessage}
                                </div>
                            )}

                            <div className="active-sessions-list">
                                {sessions.map((session) => (
                                    <div
                                        className={`active-session-card ${session.is_current
                                                ? "current-session"
                                                : ""
                                            }`}
                                        key={session.id}
                                    >
                                        <div className="active-session-icon">
                                            {session.device_type === "mobile"
                                                ? "📱"
                                                : "💻"}
                                        </div>

                                        <div className="active-session-info">
                                            <div className="active-session-title-row">
                                                <h3>
                                                    {session.browser_name ||
                                                        t(
                                                            "profile.unknownBrowser"
                                                        )}
                                                </h3>

                                                {session.is_current && (
                                                    <span className="current-session-badge">
                                                        {t(
                                                            "profile.currentDevice"
                                                        )}
                                                    </span>
                                                )}
                                            </div>

                                            <p className="active-session-device">
                                                {getDeviceLabel(session)}
                                            </p>

                                            <div className="active-session-details">
                                                <span>
                                                    <strong>
                                                        {t("profile.os")}:
                                                    </strong>{" "}
                                                    {session.operating_system ||
                                                        "-"}{" "}
                                                    {session.os_version || ""}
                                                </span>

                                                <span>
                                                    <strong>
                                                        {t(
                                                            "profile.ipAddressShort"
                                                        )}
                                                        :
                                                    </strong>{" "}
                                                    {session.ip_address || "-"}
                                                </span>

                                                <span>
                                                    <strong>
                                                        {t("profile.login")}:
                                                    </strong>{" "}
                                                    {formatDateTime(
                                                        session.login_at
                                                    )}
                                                </span>

                                                <span>
                                                    <strong>
                                                        {t(
                                                            "profile.lastActive"
                                                        )}
                                                        :
                                                    </strong>{" "}
                                                    {formatDateTime(
                                                        session.last_activity_at
                                                    )}
                                                </span>
                                            </div>
                                            {!session.is_current && (
                                                <button
                                                    type="button"
                                                    className="revoke-session-button"
                                                    onClick={() => handleRevokeSession(session.id)}
                                                    disabled={revokingSessionId === session.id}
                                                >
                                                    {revokingSessionId === session.id
                                                        ? t("profile.revokingSession")
                                                        : t("profile.revokeSession")}
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </>
                    )}
                </section>
            </main>

            <footer className="profile-footer">
                <p>
                    © {new Date().getFullYear()} Internship Portal.{" "}
                    {t("common.allRightsReserved")}
                </p>
            </footer>
        </div>
    );
}

export default Profile;
