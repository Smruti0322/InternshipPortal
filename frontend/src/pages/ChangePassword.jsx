import { useState } from "react";
import { useNavigate } from "react-router-dom";
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

function ChangePassword() {
    const { t } = useTranslation();
    const navigate = useNavigate();

    const [formData, setFormData] = useState({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
    });

    // =================================================
    // PASSWORD VISIBILITY
    // =================================================

    const [showCurrentPassword, setShowCurrentPassword] =
        useState(false);

    const [showNewPassword, setShowNewPassword] =
        useState(false);

    const [showConfirmPassword, setShowConfirmPassword] =
        useState(false);

    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    const [loading, setLoading] = useState(false);

    // =================================================
    // HANDLE CHANGE
    // =================================================

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value,
        });

        setError("");
        setSuccess("");
    };

    // =================================================
    // HANDLE SUBMIT
    // =================================================

    const handleSubmit = async (e) => {
        e.preventDefault();

        const {
            currentPassword,
            newPassword,
            confirmPassword,
        } = formData;

        // =========================
        // VALIDATION
        // =========================

        if (
            !currentPassword ||
            !newPassword ||
            !confirmPassword
        ) {
            setError(
                t("changePassword.fillAllPasswordFields")
            );
            return;
        }

        if (newPassword.length < 8) {
            setError(
                t("changePassword.newPasswordMinLength")
            );
            return;
        }

        if (newPassword !== confirmPassword) {
            setError(
                t("changePassword.passwordsDoNotMatch")
            );
            return;
        }

        if (currentPassword === newPassword) {
            setError(
                t("changePassword.passwordMustBeDifferent")
            );
            return;
        }

        try {
            setLoading(true);
            setError("");
            setSuccess("");

            const token =
                localStorage.getItem("token");

            if (!token) {
                setError(
                    t("common.pleaseLoginAgain")
                );

                navigate("/login", {
                    replace: true,
                });

                return;
            }

            // =========================
            // CHANGE PASSWORD API
            // =========================

            const response = await fetch(
                `${API_URL}/api/auth/change-password`,
                {
                    method: "POST",

                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${token}`,
                    },

                    body: JSON.stringify({
                        currentPassword,
                        newPassword,
                        confirmPassword,
                    }),
                }
            );

            const data =
                await response.json();

            if (!response.ok) {
                throw new Error(
                    data.message ||
                    t("changePassword.unableToChangePassword")
                );
            }

            // =========================
            // SUCCESS
            // =========================

            setSuccess(
                data.message ||
                t("changePassword.passwordChangedSuccessfully")
            );

            setFormData({
                currentPassword: "",
                newPassword: "",
                confirmPassword: "",
            });

            // Reset visibility

            setShowCurrentPassword(false);
            setShowNewPassword(false);
            setShowConfirmPassword(false);

            // =========================
            // REDIRECT
            // =========================

            setTimeout(() => {
                navigate("/", {
                    replace: true,
                });
            }, 1500);

        } catch (error) {
            console.error(
                "Change Password Error:",
                error
            );

            setError(
                error.message ||
                t("changePassword.unableToChangePassword")
            );

        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-page">

            <div className="auth-container">

                {/* =================================================
                    LEFT SECTION
                ================================================= */}

                <div className="auth-info">

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

                    <div className="auth-info-content">

                        <p className="auth-small-title">
                            {t("changePassword.security")}
                        </p>

                        <h1>
                            {t("changePassword.secureYour")}
                            <br />
                            <span>
                                {t("changePassword.accountSecurity")}
                            </span>
                        </h1>

                        <p>
                            {t("changePassword.description")}
                        </p>

                        <div className="auth-benefits">

                            <div>
                                <span>✓</span>
                                {t(
                                    "changePassword.useStrongPassword"
                                )}
                            </div>

                            <div>
                                <span>✓</span>
                                {t(
                                    "changePassword.keepPasswordPrivate"
                                )}
                            </div>

                            <div>
                                <span>✓</span>
                                {t(
                                    "changePassword.useAtLeastEightCharacters"
                                )}
                            </div>

                            <div>
                                <span>✓</span>
                                {t(
                                    "changePassword.protectYourAccount"
                                )}
                            </div>

                        </div>

                    </div>

                </div>

                {/* =================================================
                    RIGHT SECTION
                ================================================= */}

                <div className="auth-form-section">

                    <div className="auth-form-wrapper">

                        {/* =================================================
                            TOP BAR
                        ================================================= */}

                        <div className="register-top-bar">

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

                            <div className="auth-language">
                                <LanguageSelector />
                            </div>

                        </div>

                        {/* =================================================
                            HEADING
                        ================================================= */}

                        <p className="form-welcome">
                            {t("changePassword.accountSecurity")}
                        </p>

                        <h2>
                            {t("changePassword.changePassword")}
                        </h2>

                        <p className="form-description">
                            {t(
                                "changePassword.createNewPasswordDescription"
                            )}
                        </p>

                        {/* =================================================
                            ERROR
                        ================================================= */}

                        {error && (
                            <div className="auth-message error">
                                {error}
                            </div>
                        )}

                        {/* =================================================
                            SUCCESS
                        ================================================= */}

                        {success && (
                            <div className="auth-message success">
                                {success}
                            </div>
                        )}

                        <form onSubmit={handleSubmit}>

                            {/* =================================================
                                CURRENT PASSWORD
                            ================================================= */}

                            <div className="input-group">

                                <label>
                                    {t(
                                        "changePassword.currentPassword"
                                    )}
                                </label>

                                <div className="password-input-wrapper">

                                    <input
                                        type={
                                            showCurrentPassword
                                                ? "text"
                                                : "password"
                                        }
                                        name="currentPassword"
                                        placeholder={t(
                                            "changePassword.enterCurrentPassword"
                                        )}
                                        value={
                                            formData.currentPassword
                                        }
                                        onChange={
                                            handleChange
                                        }
                                        disabled={loading}
                                    />

                                    <button
                                        type="button"
                                        className="password-toggle-btn"
                                        onClick={() =>
                                            setShowCurrentPassword(
                                                !showCurrentPassword
                                            )
                                        }
                                        disabled={loading}
                                        aria-label={
                                            showCurrentPassword
                                                ? t(
                                                    "changePassword.hideCurrentPassword"
                                                )
                                                : t(
                                                    "changePassword.showCurrentPassword"
                                                )
                                        }
                                        title={
                                            showCurrentPassword
                                                ? t(
                                                    "changePassword.hideCurrentPassword"
                                                )
                                                : t(
                                                    "changePassword.showCurrentPassword"
                                                )
                                        }
                                    >
                                        <EyeIcon
                                            hidden={
                                                showCurrentPassword
                                            }
                                        />
                                    </button>

                                </div>

                            </div>

                            {/* =================================================
                                NEW PASSWORD
                            ================================================= */}

                            <div className="input-group">

                                <label>
                                    {t(
                                        "changePassword.newPassword"
                                    )}
                                </label>

                                <div className="password-input-wrapper">

                                    <input
                                        type={
                                            showNewPassword
                                                ? "text"
                                                : "password"
                                        }
                                        name="newPassword"
                                        placeholder={t(
                                            "changePassword.enterNewPassword"
                                        )}
                                        value={
                                            formData.newPassword
                                        }
                                        onChange={
                                            handleChange
                                        }
                                        disabled={loading}
                                    />

                                    <button
                                        type="button"
                                        className="password-toggle-btn"
                                        onClick={() =>
                                            setShowNewPassword(
                                                !showNewPassword
                                            )
                                        }
                                        disabled={loading}
                                        aria-label={
                                            showNewPassword
                                                ? t(
                                                    "changePassword.hideNewPassword"
                                                )
                                                : t(
                                                    "changePassword.showNewPassword"
                                                )
                                        }
                                        title={
                                            showNewPassword
                                                ? t(
                                                    "changePassword.hideNewPassword"
                                                )
                                                : t(
                                                    "changePassword.showNewPassword"
                                                )
                                        }
                                    >
                                        <EyeIcon
                                            hidden={
                                                showNewPassword
                                            }
                                        />
                                    </button>

                                </div>

                            </div>

                            {/* =================================================
                                CONFIRM PASSWORD
                            ================================================= */}

                            <div className="input-group">

                                <label>
                                    {t(
                                        "changePassword.confirmNewPassword"
                                    )}
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
                                            "changePassword.confirmNewPasswordPlaceholder"
                                        )}
                                        value={
                                            formData.confirmPassword
                                        }
                                        onChange={
                                            handleChange
                                        }
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
                                                ? t(
                                                    "changePassword.hideConfirmPassword"
                                                )
                                                : t(
                                                    "changePassword.showConfirmPassword"
                                                )
                                        }
                                        title={
                                            showConfirmPassword
                                                ? t(
                                                    "changePassword.hideConfirmPassword"
                                                )
                                                : t(
                                                    "changePassword.showConfirmPassword"
                                                )
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

                            {/* =================================================
                                SUBMIT BUTTON
                            ================================================= */}

                            <button
                                type="submit"
                                className="auth-submit-btn"
                                disabled={loading}
                            >
                                {loading
                                    ? t(
                                        "changePassword.changingPassword"
                                    )
                                    : t(
                                        "changePassword.changePassword"
                                    )}
                            </button>

                        </form>

                    </div>

                </div>

            </div>

        </div>
    );
}

export default ChangePassword;
