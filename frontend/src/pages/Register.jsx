import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

import LanguageSelector from "../components/LanguageSelector";
import "./Auth.css";
import { API_BASE_URL } from "../config/api.js";

const API_URL = API_BASE_URL;

// =================================================
// PROFESSIONAL EYE ICON
// =================================================

function EyeIcon({ hidden = false }) {
    if (hidden) {
        return (
            <svg
                width="19"
                height="19"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                aria-hidden="true"
            >
                <path
                    d="M3 3L21 21"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                />

                <path
                    d="M10.58 10.58C10.21 10.95 10 11.46 10 12C10 13.1 10.9 14 12 14C12.54 14 13.05 13.79 13.42 13.42"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                />

                <path
                    d="M9.88 4.24C10.56 4.08 11.27 4 12 4C17 4 20.73 7.11 22 12C21.62 13.46 21 14.76 20.17 15.85"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                />

                <path
                    d="M6.61 6.61C4.98 7.67 3.72 9.47 3 12C4.27 16.89 8 20 12 20C13.73 20 15.36 19.5 16.79 18.61"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                />
            </svg>
        );
    }

    return (
        <svg
            width="19"
            height="19"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
        >
            <path
                d="M2.06 12.35C1.98 12.12 1.98 11.88 2.06 11.65C3.27 7.73 7.08 5 12 5C16.92 5 20.73 7.73 21.94 11.65C22.02 11.88 22.02 12.12 21.94 12.35C20.73 16.27 16.92 19 12 19C7.08 19 3.27 16.27 2.06 12.35Z"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
            />

            <circle
                cx="12"
                cy="12"
                r="3"
                stroke="currentColor"
                strokeWidth="1.8"
            />
        </svg>
    );
}

function Register() {
    const { t } = useTranslation();
    const navigate = useNavigate();

    // =========================
    // FORM DATA
    // =========================

    const [formData, setFormData] = useState({
        name: "",
        email: "",
        password: "",
        confirmPassword: "",
    });

    // =========================
    // PASSWORD VISIBILITY
    // =========================

    const [showPassword, setShowPassword] = useState(false);

    const [showConfirmPassword, setShowConfirmPassword] =
        useState(false);

    // =========================
    // STATES
    // =========================

    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
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
        setSuccess("");
    };

    // =========================
    // HANDLE REGISTER
    // =========================

    const handleSubmit = async (e) => {
        e.preventDefault();

        const {
            name,
            email,
            password,
            confirmPassword,
        } = formData;

        // =========================
        // EMPTY FIELD VALIDATION
        // =========================

        if (
            !name ||
            !email ||
            !password ||
            !confirmPassword
        ) {
            setError(t("register.fillAllFields"));
            return;
        }

        // =========================
        // PASSWORD MATCH
        // =========================

        if (password !== confirmPassword) {
            setError(t("register.passwordMismatch"));
            return;
        }

        // =========================
        // PASSWORD LENGTH
        // =========================

        if (password.length < 6) {
            setError(t("register.passwordLength"));
            return;
        }

        try {
            setLoading(true);
            setError("");
            setSuccess("");

            // =========================
            // REGISTER API
            // =========================

            const response = await fetch(
                `${API_URL}/api/auth/register`,
                {
                    method: "POST",

                    headers: {
                        "Content-Type": "application/json",
                    },

                    body: JSON.stringify({
                        name,
                        email,
                        password,
                    }),
                }
            );

            const data = await response.json();

            // =========================
            // API ERROR
            // =========================

            if (!response.ok) {
                throw new Error(
                    data.message ||
                    t("register.registrationFailed")
                );
            }

            // =========================
            // SUCCESS
            // =========================

            setSuccess(
                t("register.registrationSuccess")
            );

            // =========================
            // CLEAR FORM
            // =========================

            setFormData({
                name: "",
                email: "",
                password: "",
                confirmPassword: "",
            });

            // Reset password visibility

            setShowPassword(false);
            setShowConfirmPassword(false);

            // =========================
            // GO TO LOGIN
            // =========================

            setTimeout(() => {
                navigate("/login");
            }, 1500);

        } catch (error) {
            console.error(
                "Registration error:",
                error
            );

            setError(
                error.message ||
                t("register.registrationFailed")
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

                {/* =================================================
                    LEFT INFORMATION SECTION
                ================================================= */}

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
                            {t("register.startJourney")}
                        </p>

                        <h1>
                            {t("register.buildYour")}

                            <br />

                            <span>
                                {t("register.careerWithUs")}
                            </span>
                        </h1>

                        <p>
                            {t("register.registerDescription")}
                        </p>

                        {/* Benefits */}

                        <div className="auth-benefits">

                            <div>
                                <span>✓</span>
                                {t("register.findInternship")}
                            </div>

                            <div>
                                <span>✓</span>
                                {t("register.applyJobs")}
                            </div>

                            <div>
                                <span>✓</span>
                                {t("register.manageProfile")}
                            </div>

                            <div>
                                <span>✓</span>
                                {t("register.personalizedOpportunities")}
                            </div>

                        </div>

                    </div>

                </div>

                {/* =================================================
                    RIGHT REGISTER SECTION
                ================================================= */}

                <div className="auth-form-section">

                    <div className="auth-form-wrapper">

                        {/* =================================================
                            LOGO + LANGUAGE
                        ================================================= */}

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

                        {/* =================================================
                            WELCOME
                        ================================================= */}

                        <p className="form-welcome">
                            {t("register.welcomeToPortal")}
                        </p>

                        {/* Heading */}

                        <h2>
                            {t("register.createAccount")}
                        </h2>

                        {/* Description */}

                        <p className="form-description">
                            {t("register.dreamCareerDescription")}
                        </p>

                        {/* =================================================
                            ERROR MESSAGE
                        ================================================= */}

                        {error && (
                            <div className="auth-message error">
                                {error}
                            </div>
                        )}

                        {/* =================================================
                            SUCCESS MESSAGE
                        ================================================= */}

                        {success && (
                            <div className="auth-message success">
                                {success}
                            </div>
                        )}

                        {/* =================================================
                            REGISTER FORM
                        ================================================= */}

                        <form onSubmit={handleSubmit}>

                            {/* =========================
                                FULL NAME
                            ========================= */}

                            <div className="input-group">

                                <label>
                                    {t("register.fullName")}
                                </label>

                                <input
                                    type="text"
                                    name="name"
                                    placeholder={t(
                                        "register.fullNamePlaceholder"
                                    )}
                                    value={formData.name}
                                    onChange={handleChange}
                                    disabled={loading}
                                />

                            </div>

                            {/* =========================
                                EMAIL
                            ========================= */}

                            <div className="input-group">

                                <label>
                                    {t("register.emailAddress")}
                                </label>

                                <input
                                    type="email"
                                    name="email"
                                    placeholder={t(
                                        "register.emailPlaceholder"
                                    )}
                                    value={formData.email}
                                    onChange={handleChange}
                                    disabled={loading}
                                />

                            </div>

                            {/* =========================
                                PASSWORD
                            ========================= */}

                            <div className="input-group">

                                <label>
                                    {t("common.password")}
                                </label>

                                <div className="password-input-wrapper">

                                    <input
                                        type={
                                            showPassword
                                                ? "text"
                                                : "password"
                                        }
                                        name="password"
                                        placeholder={t(
                                            "register.passwordPlaceholder"
                                        )}
                                        value={formData.password}
                                        onChange={handleChange}
                                        disabled={loading}
                                    />

                                    <button
                                        type="button"
                                        className="password-toggle-btn"
                                        onClick={() =>
                                            setShowPassword(
                                                !showPassword
                                            )
                                        }
                                        disabled={loading}
                                        aria-label={
                                            showPassword
                                                ? t("login.hidePassword")
                                                : t("login.showPassword")
                                        }
                                        title={
                                            showPassword
                                                ? t("login.hidePassword")
                                                : t("login.showPassword")
                                        }
                                    >
                                        <EyeIcon
                                            hidden={showPassword}
                                        />
                                    </button>

                                </div>

                            </div>

                            {/* =========================
                                CONFIRM PASSWORD
                            ========================= */}

                            <div className="input-group">

                                <label>
                                    {t("register.confirmPassword")}
                                </label>

                                <div className="password-input-wrapper">

                                    <input
                                        type={
                                            showConfirmPassword
                                                ? "text"
                                                : "password"
                                        }
                                        name="confirmPassword"
                                        placeholder={t(
                                            "register.confirmPasswordPlaceholder"
                                        )}
                                        value={
                                            formData.confirmPassword
                                        }
                                        onChange={handleChange}
                                        disabled={loading}
                                    />

                                    <button
                                        type="button"
                                        className="password-toggle-btn"
                                        onClick={() =>
                                            setShowConfirmPassword(
                                                !showConfirmPassword
                                            )
                                        }
                                        disabled={loading}
                                        aria-label={
                                            showConfirmPassword
                                                ? t("login.hidePassword")
                                                : t("login.showPassword")
                                        }
                                        title={
                                            showConfirmPassword
                                                ? t("login.hidePassword")
                                                : t("login.showPassword")
                                        }
                                    >
                                        <EyeIcon
                                            hidden={
                                                showConfirmPassword
                                            }
                                        />
                                    </button>

                                </div>

                            </div>

                            {/* =========================
                                SUBMIT BUTTON
                            ========================= */}

                            <button
                                type="submit"
                                className="auth-submit-btn"
                                disabled={loading}
                            >
                                {loading
                                    ? t("register.creatingAccount")
                                    : t("register.createAccount")
                                }
                            </button>

                        </form>

                        {/* =================================================
                            LOGIN LINK
                        ================================================= */}

                        <p className="auth-switch">

                            {t("register.alreadyHaveAccount")}

                            <Link to="/login">
                                {" "}
                                {t("common.login")}
                            </Link>

                        </p>

                    </div>

                </div>

            </div>

        </div>
    );
}

export default Register;
