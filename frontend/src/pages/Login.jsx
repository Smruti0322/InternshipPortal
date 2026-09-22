import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

import i18n from "../i18n";
import LanguageSelector from "../components/LanguageSelector";
import "./Auth.css";

const API_URL = "http://localhost:5000";

function Login() {
    const { t } = useTranslation();

    const navigate = useNavigate();

    // =========================
    // FORM DATA
    // =========================

    const [formData, setFormData] = useState({
        email: "",
        password: "",
    });

    // =========================
    // STATES
    // =========================

    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    // =========================
    // HANDLE INPUT CHANGE
    // =========================

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value,
        });

        setError("");
    };

    // =========================
    // HANDLE LOGIN
    // =========================

    const handleSubmit = async (e) => {
        e.preventDefault();

        const { email, password } = formData;

        // =========================
        // VALIDATION
        // =========================

        if (!email || !password) {
            setError(t("loginRequired"));
            return;
        }

        try {
            setLoading(true);
            setError("");

            // =========================
            // LOGIN API
            // =========================

            const response = await fetch(
                `${API_URL}/api/auth/login`,
                {
                    method: "POST",

                    headers: {
                        "Content-Type": "application/json",
                    },

                    body: JSON.stringify({
                        email,
                        password,
                    }),
                }
            );

            const data = await response.json();

            // =========================
            // LOGIN ERROR
            // =========================

            if (!response.ok) {
                throw new Error(
                    data.message || t("loginFailed")
                );
            }

            // =========================
            // SAVE TOKEN
            // =========================

            localStorage.setItem(
                "token",
                data.token
            );

            // =========================
            // SAVE USER
            // =========================

            localStorage.setItem(
                "user",
                JSON.stringify(data.user)
            );

            // =========================
            // APPLY USER LANGUAGE
            // =========================

            if (data.user?.preferred_language) {
                const userLanguage =
                    data.user.preferred_language;

                // Save language in browser
                localStorage.setItem(
                    "language",
                    userLanguage
                );

                // Apply language immediately
                await i18n.changeLanguage(
                    userLanguage
                );
            }

            // =========================
            // LOGIN SUCCESS
            // =========================

            console.log("LOGIN SUCCESS");

            // =========================
            // REDIRECT TO HOME
            // =========================

            navigate("/");

        } catch (error) {
            console.error(
                "Login error:",
                error
            );

            setError(
                error.message ||
                t("loginFailed")
            );

        } finally {
            setLoading(false);
        }
    };

    // =========================
    // UI
    // =========================

    return (
        <div className="auth-page">

            <div className="auth-container">

                {/* =========================
                    LEFT INFORMATION SECTION
                ========================= */}

                <div className="auth-info">

                    {/* Logo */}

                    <div className="auth-logo">

                        <span>
                            IP
                        </span>

                        <h2>
                            Internship
                            <span>
                                Portal
                            </span>
                        </h2>

                    </div>

                    {/* Information */}

                    <div className="auth-info-content">

                        <p className="auth-small-title">
                            {t("welcomeBack")}
                        </p>

                        <h1>
                            {t("yourNext")}

                            <br />

                            <span>
                                {t(
                                    "opportunityAwaits"
                                )}
                            </span>
                        </h1>

                        <p>
                            {t(
                                "loginDescription"
                            )}
                        </p>

                        {/* Benefits */}

                        <div className="auth-benefits">

                            <div>
                                <span>✓</span>

                                {t(
                                    "exploreInternships"
                                )}
                            </div>

                            <div>
                                <span>✓</span>

                                {t(
                                    "applyForJobs"
                                )}
                            </div>

                            <div>
                                <span>✓</span>

                                {t(
                                    "trackApplications"
                                )}
                            </div>

                            <div>
                                <span>✓</span>

                                {t(
                                    "manageYourProfile"
                                )}
                            </div>

                        </div>

                    </div>

                </div>

                {/* =========================
                    RIGHT LOGIN SECTION
                ========================= */}

                <div className="auth-form-section">

                    <div className="auth-form-wrapper">

                        {/* =========================
                            TOP BAR
                        ========================= */}

                        <div className="register-top-bar">

                            {/* Mobile Logo */}

                            <div className="mobile-auth-logo">

                                <span>
                                    IP
                                </span>

                                <h2>
                                    Internship
                                    <span>
                                        Portal
                                    </span>
                                </h2>

                            </div>

                            {/* Language */}

                            <div className="auth-language">

                                <LanguageSelector />

                            </div>

                        </div>

                        {/* =========================
                            WELCOME
                        ========================= */}

                        <p className="form-welcome">
                            {t("welcomeBack")}
                        </p>

                        {/* =========================
                            HEADING
                        ========================= */}

                        <h2>
                            {t("loginToAccount")}
                        </h2>

                        {/* =========================
                            DESCRIPTION
                        ========================= */}

                        <p className="form-description">
                            {t(
                                "loginFormDescription"
                            )}
                        </p>

                        {/* =========================
                            ERROR MESSAGE
                        ========================= */}

                        {error && (
                            <div className="auth-message error">
                                {error}
                            </div>
                        )}

                        {/* =========================
                            LOGIN FORM
                        ========================= */}

                        <form
                            onSubmit={handleSubmit}
                        >

                            {/* Email */}

                            <div className="input-group">

                                <label>
                                    {t(
                                        "emailAddress"
                                    )}
                                </label>

                                <input
                                    type="email"
                                    name="email"
                                    placeholder={t(
                                        "emailPlaceholder"
                                    )}
                                    value={
                                        formData.email
                                    }
                                    onChange={
                                        handleChange
                                    }
                                    disabled={
                                        loading
                                    }
                                />

                            </div>

                            {/* Password */}

                            <div className="input-group">

                                <label>
                                    {t(
                                        "password"
                                    )}
                                </label>

                                <input
                                    type="password"
                                    name="password"
                                    placeholder={t(
                                        "loginPasswordPlaceholder"
                                    )}
                                    value={
                                        formData.password
                                    }
                                    onChange={
                                        handleChange
                                    }
                                    disabled={
                                        loading
                                    }
                                />

                            </div>

                            {/* Login Button */}

                            <button
                                type="submit"
                                className="auth-submit-btn"
                                disabled={loading}
                            >
                                {loading
                                    ? t("loggingIn")
                                    : t("login")}
                            </button>

                        </form>

                        {/* =========================
                            REGISTER LINK
                        ========================= */}

                        <p className="auth-switch">

                            {t(
                                "dontHaveAccount"
                            )}

                            <Link to="/register">
                                {" "}
                                {t(
                                    "createAccount"
                                )}
                            </Link>

                        </p>

                    </div>

                </div>

            </div>

        </div>
    );
}

export default Login;

