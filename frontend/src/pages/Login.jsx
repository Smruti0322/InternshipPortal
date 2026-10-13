import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

import i18n from "../i18n";
import LanguageSelector from "../components/LanguageSelector";
import "./Auth.css";

const API_URL = "http://localhost:5000";

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


// =================================================
// LOGIN
// =================================================

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
    // PASSWORD VISIBILITY
    // =========================

    const [showPassword, setShowPassword] = useState(false);

    // =========================
    // LOGIN STATES
    // =========================

    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    // =========================
    // OTP STATES
    // =========================

    const [showOtpModal, setShowOtpModal] = useState(false);

    const [otp, setOtp] = useState("");

    const [otpLoading, setOtpLoading] = useState(false);

    const [otpError, setOtpError] = useState("");

    const [otpSuccess, setOtpSuccess] = useState("");

    const [loginVerificationData, setLoginVerificationData] =
        useState({
            user_id: null,
            login_history_id: null,
            verification_id: null,
            user: null,
        });

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

    // =================================================
    // COMPLETE LOGIN AFTER TOKEN RECEIVED
    // =================================================

    const completeLogin = async (data) => {
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
        // SAVE USER LANGUAGE
        // =========================

        if (data.user?.preferred_language) {
            const userLanguage =
                data.user.preferred_language;

            localStorage.setItem(
                "language",
                userLanguage
            );

            await i18n.changeLanguage(
                userLanguage
            );
        }

        console.log("LOGIN SUCCESS");

        // =========================
        // TEMPORARY PASSWORD FLOW
        // =========================

        if (
            data.must_change_password === true
        ) {
            navigate(
                "/change-password",
                {
                    replace: true,
                }
            );
        } else {
            navigate(
                "/",
                {
                    replace: true,
                }
            );
        }
    };

    // =================================================
    // REQUEST LOGIN OTP
    // =================================================

    const requestLoginOTP = async (
        verificationData
    ) => {
        try {
            setOtpLoading(true);
            setOtpError("");
            setOtpSuccess("");

            const response = await fetch(
                `${API_URL}/api/auth/login/request-otp`,
                {
                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json",
                    },

                    body: JSON.stringify({
                        user_id:
                            verificationData.user_id,

                        login_history_id:
                            verificationData.login_history_id,
                    }),
                }
            );

            const data =
                await response.json();

            if (!response.ok) {
                throw new Error(
                    data.message ||
                    "Unable to send OTP."
                );
            }

            setLoginVerificationData(
                (previous) => ({
                    ...previous,

                    verification_id:
                        data.verification_id,
                })
            );

            setOtpSuccess(
                "OTP sent successfully to your registered email."
            );

        } catch (error) {
            console.error(
                "Request login OTP error:",
                error
            );

            setOtpError(
                error.message ||
                "Unable to send OTP."
            );

        } finally {
            setOtpLoading(false);
        }
    };

    // =================================================
    // VERIFY LOGIN OTP
    // =================================================

    const handleVerifyOTP = async () => {
        if (!otp.trim()) {
            setOtpError(
                "Please enter the OTP."
            );
            return;
        }

        if (!/^\d{6}$/.test(otp.trim())) {
            setOtpError(
                "Please enter a valid 6-digit OTP."
            );
            return;
        }

        try {
            setOtpLoading(true);
            setOtpError("");
            setOtpSuccess("");

            const response = await fetch(
                `${API_URL}/api/auth/login/verify-otp`,
                {
                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json",
                    },

                    body: JSON.stringify({
                        user_id:
                            loginVerificationData.user_id,

                        login_history_id:
                            loginVerificationData.login_history_id,

                        verification_id:
                            loginVerificationData.verification_id,

                        otp:
                            otp.trim(),
                    }),
                }
            );

            const data =
                await response.json();

            if (!response.ok) {
                throw new Error(
                    data.message ||
                    "Unable to verify OTP."
                );
            }

            // =========================
            // OTP VERIFIED
            // =========================

            setOtpSuccess(
                "OTP verified successfully."
            );

            setShowOtpModal(false);

            setOtp("");

            await completeLogin(data);

        } catch (error) {
            console.error(
                "Verify login OTP error:",
                error
            );

            setOtpError(
                error.message ||
                "Unable to verify OTP."
            );

        } finally {
            setOtpLoading(false);
        }
    };

    // =================================================
    // HANDLE LOGIN
    // =================================================

    const handleSubmit = async (e) => {
        e.preventDefault();

        const {
            email,
            password
        } = formData;

        // =========================
        // VALIDATION
        // =========================

        if (!email || !password) {
            setError(
                t("login.loginRequired")
            );
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
                        "Content-Type":
                            "application/json",
                    },

                    body: JSON.stringify({
                        email,
                        password,
                    }),
                }
            );

            const data =
                await response.json();

            // =========================
            // API ERROR
            // =========================

            if (!response.ok) {
                let errorMessage;

                if (
                    data.code ===
                    "MOBILE_LOGIN_TIME_RESTRICTED"
                ) {
                    errorMessage =
                        data.message;
                } else {
                    errorMessage =
                        data.message ===
                            "Invalid email or password"
                            ? t(
                                "login.invalidCredentials"
                            )
                            : data.message ||
                            t(
                                "login.loginFailed"
                            );
                }

                throw new Error(
                    errorMessage
                );
            }

            // =================================================
            // OTP REQUIRED
            // =================================================

            if (
                data.requires_verification ===
                true
            ) {
                const verificationData = {
                    user_id:
                        data.user_id,

                    login_history_id:
                        data.login_history_id,

                    verification_id:
                        null,

                    user:
                        data.user,
                };

                setLoginVerificationData(
                    verificationData
                );

                setOtp("");

                setOtpError("");

                setOtpSuccess("");

                setShowOtpModal(true);

                // Send OTP automatically
                await requestLoginOTP(
                    verificationData
                );

                return;
            }

            // =================================================
            // NORMAL LOGIN
            // =================================================

            await completeLogin(data);

        } catch (error) {
            console.error(
                "Login error:",
                error
            );

            setError(
                error.message ||
                t("login.loginFailed")
            );

        } finally {
            setLoading(false);
        }
    };

    // =================================================
    // CLOSE OTP MODAL
    // =================================================

    const closeOtpModal = () => {
        if (otpLoading) {
            return;
        }

        setShowOtpModal(false);

        setOtp("");

        setOtpError("");

        setOtpSuccess("");
    };

    // =================================================
    // UI
    // =================================================

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
                            {t(
                                "login.loginWelcomeBack"
                            )}
                        </p>

                        <h1>

                            {t(
                                "login.continueCareer"
                            )}

                            <br />

                            <span>
                                {t(
                                    "login.careerJourney"
                                )}
                            </span>

                        </h1>

                        <p>
                            {t(
                                "login.loginInfoDescription"
                            )}
                        </p>

                        {/* Benefits */}

                        <div className="auth-benefits">

                            <div>
                                <span>✓</span>

                                {t(
                                    "login.findInternshipsBenefit"
                                )}
                            </div>

                            <div>
                                <span>✓</span>

                                {t(
                                    "login.applyJobsBenefit"
                                )}
                            </div>

                            <div>
                                <span>✓</span>

                                {t(
                                    "login.manageProfileBenefit"
                                )}
                            </div>

                            <div>
                                <span>✓</span>

                                {t(
                                    "login.buildCareerBenefit"
                                )}
                            </div>

                        </div>

                    </div>

                </div>


                {/* =================================================
                    RIGHT LOGIN SECTION
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
                            {t(
                                "login.loginFormWelcome"
                            )}
                        </p>

                        {/* Heading */}

                        <h2>
                            {t(
                                "common.login"
                            )}
                        </h2>

                        {/* Description */}

                        <p className="form-description">
                            {t(
                                "login.loginContinueDescription"
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
                            LOGIN FORM
                        ================================================= */}

                        <form
                            onSubmit={
                                handleSubmit
                            }
                        >

                            {/* =========================
                                EMAIL
                            ========================= */}

                            <div className="input-group">

                                <label>
                                    {t(
                                        "common.email"
                                    )}
                                </label>

                                <input
                                    type="email"
                                    name="email"
                                    placeholder={t(
                                        "register.emailPlaceholder"
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


                            {/* =========================
                                PASSWORD
                            ========================= */}

                            <div className="input-group">

                                <label>
                                    {t(
                                        "common.password"
                                    )}
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
                                            "login.loginPasswordPlaceholder"
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

                                    <button
                                        type="button"
                                        className="password-toggle-btn"
                                        onClick={() =>
                                            setShowPassword(
                                                !showPassword
                                            )
                                        }
                                        disabled={
                                            loading
                                        }
                                        aria-label={
                                            showPassword
                                                ? t(
                                                    "login.hidePassword"
                                                )
                                                : t(
                                                    "login.showPassword"
                                                )
                                        }
                                        title={
                                            showPassword
                                                ? t(
                                                    "login.hidePassword"
                                                )
                                                : t(
                                                    "login.showPassword"
                                                )
                                        }
                                    >

                                        <EyeIcon
                                            hidden={
                                                showPassword
                                            }
                                        />

                                    </button>

                                </div>

                            </div>


                            {/* =========================
                                FORGOT PASSWORD
                            ========================= */}

                            <div
                                style={{
                                    textAlign:
                                        "right",

                                    marginTop:
                                        "-5px",

                                    marginBottom:
                                        "20px",
                                }}
                            >

                                <Link
                                    to="/forgot-password"
                                    style={{
                                        color:
                                            "#2563eb",

                                        textDecoration:
                                            "none",

                                        fontSize:
                                            "14px",

                                        fontWeight:
                                            "500",
                                    }}
                                >
                                    {t(
                                        "login.forgotPassword"
                                    )}
                                </Link>

                            </div>


                            {/* =========================
                                SUBMIT BUTTON
                            ========================= */}

                            <button
                                type="submit"
                                className="auth-submit-btn"
                                disabled={
                                    loading
                                }
                            >

                                {loading
                                    ? t(
                                        "login.loginLoading"
                                    )
                                    : t(
                                        "common.login"
                                    )
                                }

                            </button>

                        </form>


                        {/* =================================================
                            REGISTER LINK
                        ================================================= */}

                        <p className="auth-switch">

                            {t(
                                "login.dontHaveAccount"
                            )}

                            <Link to="/register">
                                {" "}
                                {t(
                                    "register.createAccount"
                                )}
                            </Link>

                        </p>

                    </div>

                </div>

            </div>


            {/* =========================================================
                LOGIN OTP MODAL
            ========================================================= */}

            {showOtpModal && (
                <div
                    style={{
                        position: "fixed",
                        inset: 0,
                        background:
                            "rgba(0, 0, 0, 0.55)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        padding: "20px",
                        zIndex: 9999,
                    }}
                >

                    <div
                        style={{
                            width: "100%",
                            maxWidth: "430px",
                            background: "#ffffff",
                            borderRadius: "16px",
                            padding: "30px",
                            boxShadow:
                                "0 20px 60px rgba(0,0,0,0.25)",
                        }}
                    >

                        {/* Header */}

                        <div
                            style={{
                                textAlign:
                                    "center",
                                marginBottom:
                                    "22px",
                            }}
                        >

                            <div
                                style={{
                                    width: "56px",
                                    height: "56px",
                                    borderRadius:
                                        "50%",
                                    background:
                                        "#eff6ff",
                                    color:
                                        "#2563eb",
                                    display:
                                        "flex",
                                    alignItems:
                                        "center",
                                    justifyContent:
                                        "center",
                                    margin:
                                        "0 auto 14px",
                                    fontSize:
                                        "25px",
                                    fontWeight:
                                        "700",
                                }}
                            >
                                🔐
                            </div>

                            <h3
                                style={{
                                    margin:
                                        "0 0 8px",
                                    fontSize:
                                        "23px",
                                    color:
                                        "#111827",
                                }}
                            >
                                Login Verification
                            </h3>

                            <p
                                style={{
                                    margin: 0,
                                    color:
                                        "#6b7280",
                                    fontSize:
                                        "14px",
                                    lineHeight:
                                        "1.6",
                                }}
                            >
                                A verification OTP has been
                                sent to your registered email.
                            </p>

                        </div>


                        {/* Email */}

                        <div
                            style={{
                                background:
                                    "#f8fafc",
                                border:
                                    "1px solid #e5e7eb",
                                borderRadius:
                                    "10px",
                                padding:
                                    "11px 14px",
                                marginBottom:
                                    "20px",
                                textAlign:
                                    "center",
                                fontSize:
                                    "14px",
                                color:
                                    "#374151",
                                wordBreak:
                                    "break-word",
                            }}
                        >
                            {formData.email}
                        </div>


                        {/* OTP */}

                        <div
                            style={{
                                marginBottom:
                                    "15px",
                            }}
                        >

                            <label
                                style={{
                                    display:
                                        "block",
                                    marginBottom:
                                        "7px",
                                    fontSize:
                                        "14px",
                                    fontWeight:
                                        "600",
                                    color:
                                        "#374151",
                                }}
                            >
                                Enter 6-digit OTP
                            </label>

                            <input
                                type="text"
                                inputMode="numeric"
                                autoComplete="one-time-code"
                                maxLength={6}
                                value={otp}
                                onChange={(e) => {
                                    const value =
                                        e.target.value
                                            .replace(
                                                /\D/g,
                                                ""
                                            )
                                            .slice(
                                                0,
                                                6
                                            );

                                    setOtp(value);
                                    setOtpError("");
                                }}
                                placeholder="Enter OTP"
                                disabled={
                                    otpLoading
                                }
                                style={{
                                    width:
                                        "100%",
                                    boxSizing:
                                        "border-box",
                                    padding:
                                        "13px",
                                    border:
                                        "1px solid #d1d5db",
                                    borderRadius:
                                        "9px",
                                    outline:
                                        "none",
                                    textAlign:
                                        "center",
                                    fontSize:
                                        "22px",
                                    letterSpacing:
                                        "7px",
                                    fontWeight:
                                        "600",
                                }}
                            />

                        </div>


                        {/* Error */}

                        {otpError && (
                            <div
                                style={{
                                    background:
                                        "#fef2f2",
                                    border:
                                        "1px solid #fecaca",
                                    color:
                                        "#b91c1c",
                                    borderRadius:
                                        "8px",
                                    padding:
                                        "10px 12px",
                                    marginBottom:
                                        "12px",
                                    fontSize:
                                        "13px",
                                }}
                            >
                                {otpError}
                            </div>
                        )}


                        {/* Success */}

                        {otpSuccess && (
                            <div
                                style={{
                                    background:
                                        "#f0fdf4",
                                    border:
                                        "1px solid #bbf7d0",
                                    color:
                                        "#15803d",
                                    borderRadius:
                                        "8px",
                                    padding:
                                        "10px 12px",
                                    marginBottom:
                                        "12px",
                                    fontSize:
                                        "13px",
                                }}
                            >
                                {otpSuccess}
                            </div>
                        )}


                        {/* Verify */}

                        <button
                            type="button"
                            onClick={
                                handleVerifyOTP
                            }
                            disabled={
                                otpLoading ||
                                otp.length !== 6
                            }
                            style={{
                                width:
                                    "100%",
                                border: "none",
                                borderRadius:
                                    "9px",
                                padding:
                                    "13px",
                                background:
                                    otpLoading ||
                                        otp.length !== 6
                                        ? "#9ca3af"
                                        : "#2563eb",
                                color:
                                    "#ffffff",
                                fontSize:
                                    "15px",
                                fontWeight:
                                    "600",
                                cursor:
                                    otpLoading ||
                                        otp.length !== 6
                                        ? "not-allowed"
                                        : "pointer",
                            }}
                        >
                            {otpLoading
                                ? "Verifying..."
                                : "Verify OTP"}
                        </button>


                        {/* Resend */}

                        <button
                            type="button"
                            onClick={() => {
                                requestLoginOTP({
                                    user_id:
                                        loginVerificationData.user_id,

                                    login_history_id:
                                        loginVerificationData.login_history_id,
                                });
                            }}
                            disabled={
                                otpLoading
                            }
                            style={{
                                width:
                                    "100%",
                                border: "none",
                                background:
                                    "transparent",
                                color:
                                    "#2563eb",
                                padding:
                                    "12px",
                                marginTop:
                                    "6px",
                                fontSize:
                                    "14px",
                                fontWeight:
                                    "500",
                                cursor:
                                    otpLoading
                                        ? "not-allowed"
                                        : "pointer",
                            }}
                        >
                            {otpLoading
                                ? "Sending..."
                                : "Resend OTP"}
                        </button>


                        {/* Cancel */}

                        <button
                            type="button"
                            onClick={
                                closeOtpModal
                            }
                            disabled={
                                otpLoading
                            }
                            style={{
                                width:
                                    "100%",
                                border:
                                    "1px solid #d1d5db",
                                borderRadius:
                                    "9px",
                                padding:
                                    "11px",
                                background:
                                    "#ffffff",
                                color:
                                    "#374151",
                                fontSize:
                                    "14px",
                                cursor:
                                    otpLoading
                                        ? "not-allowed"
                                        : "pointer",
                            }}
                        >
                            Cancel
                        </button>

                    </div>

                </div>
            )}

        </div>
    );
}

export default Login;