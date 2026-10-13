import { useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import "./Auth.css";

const API_URL = "http://localhost:5000";

function ForgotPassword() {

    const { t } = useTranslation();

    const [step, setStep] = useState(1);

    const [identifier, setIdentifier] = useState("");
    const [method, setMethod] = useState("email");
    const [otp, setOtp] = useState("");

    const [userId, setUserId] = useState(null);
    const [resetHistoryId, setResetHistoryId] = useState(null);

    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    const [loading, setLoading] = useState(false);

    // =================================================
    // STEP 1: REQUEST OTP
    // =================================================

    const handleRequestOTP = async (e) => {
        e.preventDefault();

        if (!identifier.trim()) {
            setError(
                t("forgotPassword.enterRegisteredEmail")
            );
            return;
        }

        if (method !== "email") {
            setError(
                t("forgotPassword.emailOtpAvailable")
            );
            return;
        }

        try {
            setLoading(true);
            setError("");
            setSuccess("");

            const response = await fetch(
                `${API_URL}/api/forgot-password/request`,
                {
                    method: "POST",

                    headers: {
                        "Content-Type": "application/json",
                    },

                    body: JSON.stringify({
                        identifier: identifier.trim(),
                        method: "email",
                    }),
                }
            );

            const data = await response.json();

            if (!response.ok) {
                throw new Error(
                    data.message ||
                    t("forgotPassword.unableToSendOtp")
                );
            }

            // =========================
            // SAVE RESET DETAILS
            // =========================

            setUserId(data.user_id);

            setResetHistoryId(
                data.reset_history_id
            );

            setSuccess(
                data.message ||
                t("forgotPassword.otpSentSuccessfully")
            );

            setStep(2);

        } catch (err) {

            console.error(
                "OTP Request Error:",
                err
            );

            setError(
                err.message ||
                t("forgotPassword.somethingWentWrong")
            );

        } finally {
            setLoading(false);
        }
    };

    // =================================================
    // STEP 2: VERIFY OTP
    // =================================================

    const handleVerifyOTP = async (e) => {
        e.preventDefault();

        // =========================
        // OTP VALIDATION
        // =========================

        if (!otp.trim()) {
            setError(
                t("forgotPassword.enterOtpError")
            );
            return;
        }

        if (otp.length !== 6) {
            setError(
                t("forgotPassword.validOtp")
            );
            return;
        }

        if (!userId || !resetHistoryId) {
            setError(
                t("forgotPassword.resetSessionMissing")
            );
            return;
        }

        try {

            setLoading(true);
            setError("");
            setSuccess("");

            const response = await fetch(
                `${API_URL}/api/forgot-password/verify-otp`,
                {
                    method: "POST",

                    headers: {
                        "Content-Type": "application/json",
                    },

                    body: JSON.stringify({
                        user_id: userId,
                        reset_history_id:
                            resetHistoryId,
                        otp: otp.trim(),
                        method: "email",
                    }),
                }
            );

            const data =
                await response.json();

            if (!response.ok) {
                throw new Error(
                    data.message ||
                    t("forgotPassword.otpVerificationFailed")
                );
            }

            setSuccess(
                data.message ||
                t("forgotPassword.otpVerifiedCheckEmail")
            );

            setStep(3);

        } catch (err) {

            console.error(
                "OTP Verification Error:",
                err
            );

            setError(
                err.message ||
                t("forgotPassword.invalidOtp")
            );

        } finally {
            setLoading(false);
        }
    };

    // =================================================
    // RESET FORM
    // =================================================

    const handleBackToRequest = () => {

        setStep(1);

        setOtp("");
        setUserId(null);
        setResetHistoryId(null);

        setError("");
        setSuccess("");
    };

    return (

        <div className="auth-page">

            <div className="auth-container">

                {/* =================================================
                    LEFT INFORMATION SECTION
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
                            {t("forgotPassword.accountRecovery")}
                        </p>

                        <h1>

                            {t("forgotPassword.recoverYour")}

                            <br />

                            <span>
                                {t("forgotPassword.account")}
                            </span>

                        </h1>

                        <p>
                            {t(
                                "forgotPassword.description"
                            )}
                        </p>

                        <div className="auth-benefits">

                            <div>
                                <span>✓</span>
                                {t(
                                    "forgotPassword.secureOtpVerification"
                                )}
                            </div>

                            <div>
                                <span>✓</span>
                                {t(
                                    "forgotPassword.temporaryPasswordRecovery"
                                )}
                            </div>

                            <div>
                                <span>✓</span>
                                {t(
                                    "forgotPassword.secureAccountAccess"
                                )}
                            </div>

                            <div>
                                <span>✓</span>
                                {t(
                                    "forgotPassword.changePasswordAfterLogin"
                                )}
                            </div>

                        </div>

                    </div>

                </div>

                {/* =================================================
                    RIGHT FORM SECTION
                ================================================= */}

                <div className="auth-form-section">

                    <div className="auth-form-wrapper">

                        {/* =================================================
                            MOBILE LOGO
                        ================================================= */}

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

                        {/* =================================================
                            STEP INDICATOR
                        ================================================= */}

                        <div
                            style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "8px",
                                marginBottom: "22px",
                            }}
                        >

                            <div
                                style={{
                                    width: "30px",
                                    height: "30px",
                                    borderRadius: "50%",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    background:
                                        step >= 1
                                            ? "#155eef"
                                            : "#e5e7eb",
                                    color:
                                        step >= 1
                                            ? "#ffffff"
                                            : "#64748b",
                                    fontSize: "13px",
                                    fontWeight: "700",
                                }}
                            >
                                1
                            </div>

                            <div
                                style={{
                                    flex: 1,
                                    height: "2px",
                                    background:
                                        step >= 2
                                            ? "#155eef"
                                            : "#e5e7eb",
                                }}
                            />

                            <div
                                style={{
                                    width: "30px",
                                    height: "30px",
                                    borderRadius: "50%",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    background:
                                        step >= 2
                                            ? "#155eef"
                                            : "#e5e7eb",
                                    color:
                                        step >= 2
                                            ? "#ffffff"
                                            : "#64748b",
                                    fontSize: "13px",
                                    fontWeight: "700",
                                }}
                            >
                                2
                            </div>

                            <div
                                style={{
                                    flex: 1,
                                    height: "2px",
                                    background:
                                        step >= 3
                                            ? "#155eef"
                                            : "#e5e7eb",
                                }}
                            />

                            <div
                                style={{
                                    width: "30px",
                                    height: "30px",
                                    borderRadius: "50%",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    background:
                                        step >= 3
                                            ? "#155eef"
                                            : "#e5e7eb",
                                    color:
                                        step >= 3
                                            ? "#ffffff"
                                            : "#64748b",
                                    fontSize: "13px",
                                    fontWeight: "700",
                                }}
                            >
                                3
                            </div>

                        </div>

                        {/* =================================================
                            STEP LABEL
                        ================================================= */}

                        <p className="form-welcome">

                            {step === 1 &&
                                t("forgotPassword.accountRecovery")}

                            {step === 2 &&
                                t("forgotPassword.otpVerification")}

                            {step === 3 &&
                                t("forgotPassword.recoveryComplete")}

                        </p>

                        {/* =================================================
                            HEADING
                        ================================================= */}

                        <h2>

                            {step === 1 &&
                                t("common.reset")}

                            {step === 2 &&
                                t("forgotPassword.verifyOtpButton")}

                            {step === 3 &&
                                t("forgotPassword.recoveryComplete")}

                        </h2>

                        {/* =================================================
                            DESCRIPTION
                        ================================================= */}

                        <p className="form-description">

                            {step === 1 &&
                                t(
                                    "forgotPassword.enterRegisteredEmailOtp"
                                )}

                            {step === 2 &&
                                t(
                                    "forgotPassword.enterSixDigitOtp"
                                )}

                            {step === 3 &&
                                t(
                                    "forgotPassword.otpVerifiedCheckEmail"
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
                            STEP 1
                        ================================================= */}

                        {step === 1 && (

                            <form
                                onSubmit={
                                    handleRequestOTP
                                }
                            >

                                {/* =========================
                                    VERIFICATION METHOD
                                ========================= */}

                                <div className="input-group">

                                    <label>
                                        {t(
                                            "forgotPassword.verificationMethod"
                                        )}
                                    </label>

                                    <select
                                        value={method}
                                        onChange={(e) => {
                                            setMethod(
                                                e.target.value
                                            );
                                            setError("");
                                            setSuccess("");
                                        }}
                                        disabled={loading}
                                        style={{
                                            width: "100%",
                                            height: "48px",
                                            padding: "0 14px",
                                            border: "1px solid #d0d5dd",
                                            borderRadius: "9px",
                                            background: "#fff",
                                            fontSize: "14px",
                                            color: "#344054",
                                            outline: "none",
                                        }}
                                    >

                                        <option value="email">
                                            {t("common.email")}
                                        </option>

                                    </select>

                                    <small
                                        style={{
                                            display: "block",
                                            marginTop: "7px",
                                            color: "#667085",
                                            fontSize: "12px",
                                        }}
                                    >
                                        {t(
                                            "forgotPassword.emailOtpAvailable"
                                        )}
                                    </small>

                                </div>

                                {/* =========================
                                    EMAIL
                                ========================= */}

                                <div className="input-group">

                                    <label>
                                        {t(
                                            "forgotPassword.registeredEmail"
                                        )}
                                    </label>

                                    <input
                                        type="email"
                                        placeholder={t(
                                            "forgotPassword.enterRegisteredEmail"
                                        )}
                                        value={
                                            identifier
                                        }
                                        onChange={(e) => {
                                            setIdentifier(
                                                e.target.value
                                            );
                                            setError("");
                                            setSuccess("");
                                        }}
                                        disabled={loading}
                                        autoComplete="email"
                                    />

                                </div>

                                {/* =========================
                                    SEND OTP
                                ========================= */}

                                <button
                                    type="submit"
                                    className="auth-submit-btn"
                                    disabled={loading}
                                >

                                    {loading
                                        ? t(
                                            "common.sendingOtp"
                                        )
                                        : t(
                                            "forgotPassword.sendOtp"
                                        )}

                                </button>

                            </form>

                        )}

                        {/* =================================================
                            STEP 2
                        ================================================= */}

                        {step === 2 && (

                            <form
                                onSubmit={
                                    handleVerifyOTP
                                }
                            >

                                {/* =========================
                                    OTP
                                ========================= */}

                                <div className="input-group">

                                    <label>
                                        {t(
                                            "forgotPassword.enterOtpError"
                                        )}
                                    </label>

                                    <input
                                        type="text"
                                        inputMode="numeric"
                                        maxLength={6}
                                        pattern="[0-9]{6}"
                                        placeholder={t(
                                            "forgotPassword.enterSixDigitOtpPlaceholder"
                                        )}
                                        value={otp}
                                        onChange={(e) => {

                                            const value =
                                                e.target.value.replace(
                                                    /\D/g,
                                                    ""
                                                );

                                            setOtp(value);
                                            setError("");
                                            setSuccess("");

                                        }}
                                        disabled={loading}
                                        autoComplete="one-time-code"
                                        style={{
                                            letterSpacing: "5px",
                                            fontWeight: "600",
                                            textAlign: "center",
                                            fontSize: "18px",
                                        }}
                                    />

                                    <small
                                        style={{
                                            display: "block",
                                            marginTop: "7px",
                                            color: "#667085",
                                            fontSize: "12px",
                                        }}
                                    >
                                        {t(
                                            "forgotPassword.sixDigitCodeSent"
                                        )}
                                    </small>

                                </div>

                                {/* =========================
                                    VERIFY BUTTON
                                ========================= */}

                                <button
                                    type="submit"
                                    className="auth-submit-btn"
                                    disabled={loading}
                                >

                                    {loading
                                        ? t(
                                            "common.verifying"
                                        )
                                        : t(
                                            "forgotPassword.verifyOtpButton"
                                        )}

                                </button>

                                {/* =========================
                                    BACK BUTTON
                                ========================= */}

                                <div
                                    style={{
                                        textAlign: "center",
                                        marginTop: "18px",
                                    }}
                                >

                                    <button
                                        type="button"
                                        onClick={
                                            handleBackToRequest
                                        }
                                        disabled={loading}
                                        style={{
                                            border: "none",
                                            background: "transparent",
                                            color: "#155eef",
                                            fontWeight: "600",
                                            fontSize: "14px",
                                            cursor: "pointer",
                                        }}
                                    >
                                        ← {t("common.back")}
                                    </button>

                                </div>

                            </form>

                        )}

                        {/* =================================================
                            STEP 3
                        ================================================= */}

                        {step === 3 && (

                            <div>

                                <div
                                    style={{
                                        textAlign: "center",
                                        padding: "10px 0 24px",
                                    }}
                                >

                                    {/* SUCCESS ICON */}

                                    <div
                                        style={{
                                            width: "64px",
                                            height: "64px",
                                            borderRadius: "50%",
                                            background: "#ecfdf3",
                                            color: "#12b76a",
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "center",
                                            margin: "0 auto 16px",
                                            fontSize: "30px",
                                            fontWeight: "700",
                                        }}
                                    >
                                        ✓
                                    </div>

                                    <h3
                                        style={{
                                            margin: "0 0 8px",
                                            color: "#101828",
                                            fontSize: "20px",
                                        }}
                                    >
                                        {t(
                                            "forgotPassword.otpVerified"
                                        )}
                                    </h3>

                                    <p
                                        style={{
                                            margin: 0,
                                            color: "#667085",
                                            fontSize: "14px",
                                            lineHeight: "1.6",
                                        }}
                                    >
                                        {t(
                                            "forgotPassword.temporaryPasswordSent"
                                        )}
                                    </p>

                                </div>

                                {/* LOGIN BUTTON */}

                                <Link
                                    to="/login"
                                    className="auth-submit-btn"
                                    style={{
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        textDecoration: "none",
                                        boxSizing: "border-box",
                                    }}
                                >
                                    {t(
                                        "forgotPassword.goToLogin"
                                    )}
                                </Link>

                            </div>

                        )}

                        {/* =================================================
                            LOGIN LINK
                        ================================================= */}

                        <p className="auth-switch">

                            {t(
                                "forgotPassword.rememberPassword"
                            )}{" "}

                            <Link to="/login">
                                {t("common.login")}
                            </Link>

                        </p>

                    </div>

                </div>

            </div>

        </div>
    );
}

export default ForgotPassword;
