import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

import LanguageSelector from "../components/LanguageSelector";
import "./Auth.css";

const API_URL = "http://localhost:5000";

function Register() {

    // i18n translation function
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


        // Empty field validation
        if (
            !name ||
            !email ||
            !password ||
            !confirmPassword
        ) {
            setError(t("fillAllFields"));
            return;
        }


        // Password match validation
        if (password !== confirmPassword) {
            setError(t("passwordMismatch"));
            return;
        }


        // Password length validation
        if (password.length < 6) {
            setError(t("passwordLength"));
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


            // API error
            if (!response.ok) {

                throw new Error(
                    data.message ||
                    t("registrationFailed")
                );
            }


            // Success message
            setSuccess(
                t("registrationSuccess")
            );


            // Clear form
            setFormData({
                name: "",
                email: "",
                password: "",
                confirmPassword: "",
            });


            // Go to Login
            setTimeout(() => {
                navigate("/login");
            }, 1500);


        } catch (error) {

            console.error(
                "Registration error:",
                error
            );

            setError(error.message);

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

                        <span>IP</span>

                        <h2>
                            Internship
                            <span>Portal</span>
                        </h2>

                    </div>


                    {/* Information */}

                    <div className="auth-info-content">

                        <p className="auth-small-title">
                            {t("startJourney")}
                        </p>


                        <h1>

                            {t("buildYour")}

                            <br />

                            <span>
                                {t("careerWithUs")}
                            </span>

                        </h1>


                        <p>
                            {t("registerDescription")}
                        </p>


                        {/* Benefits */}

                        <div className="auth-benefits">

                            <div>
                                <span>✓</span>

                                {t("findInternship")}
                            </div>


                            <div>
                                <span>✓</span>

                                {t("applyJobs")}
                            </div>


                            <div>
                                <span>✓</span>

                                {t("manageProfile")}
                            </div>


                            <div>
                                <span>✓</span>

                                {t(
                                    "personalizedOpportunities"
                                )}
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
                            LOGO + LANGUAGE DROPDOWN
                        ================================================= */}

                        <div className="register-top-bar">


                            {/* Logo */}

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


                            {/* Language Dropdown */}

                            <div className="auth-language">

                                <LanguageSelector />

                            </div>

                        </div>


                        {/* =================================================
                            FORM WELCOME
                        ================================================= */}

                        <p className="form-welcome">

                            {t(
                                "welcomeToPortal"
                            )}

                        </p>


                        {/* Heading */}

                        <h2>

                            {t(
                                "createAccount"
                            )}

                        </h2>


                        {/* Description */}

                        <p className="form-description">

                            {t(
                                "dreamCareerDescription"
                            )}

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


                            {/* Full Name */}

                            <div className="input-group">

                                <label>
                                    {t("fullName")}
                                </label>

                                <input
                                    type="text"
                                    name="name"
                                    placeholder={t(
                                        "fullNamePlaceholder"
                                    )}
                                    value={
                                        formData.name
                                    }
                                    onChange={
                                        handleChange
                                    }
                                    disabled={
                                        loading
                                    }
                                />

                            </div>


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
                                    {t("password")}
                                </label>

                                <input
                                    type="password"
                                    name="password"
                                    placeholder={t(
                                        "passwordPlaceholder"
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


                            {/* Confirm Password */}

                            <div className="input-group">

                                <label>
                                    {t(
                                        "confirmPassword"
                                    )}
                                </label>

                                <input
                                    type="password"
                                    name="confirmPassword"
                                    placeholder={t(
                                        "confirmPasswordPlaceholder"
                                    )}
                                    value={
                                        formData.confirmPassword
                                    }
                                    onChange={
                                        handleChange
                                    }
                                    disabled={
                                        loading
                                    }
                                />

                            </div>


                            {/* Submit Button */}

                            <button
                                type="submit"
                                className="auth-submit-btn"
                                disabled={loading}
                            >

                                {loading
                                    ? t(
                                        "creatingAccount"
                                    )
                                    : t(
                                        "createAccount"
                                    )
                                }

                            </button>


                        </form>


                        {/* =================================================
                            LOGIN LINK
                        ================================================= */}

                        <p className="auth-switch">

                            {t(
                                "alreadyHaveAccount"
                            )}

                            <Link to="/login">

                                {" "}

                                {t("login")}

                            </Link>

                        </p>


                    </div>

                </div>

            </div>

        </div>
    );
}

export default Register;