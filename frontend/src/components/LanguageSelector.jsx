import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";

function LanguageSelector() {
    const { i18n } = useTranslation();

    const [loading, setLoading] = useState(false);
    const [showOtpModal, setShowOtpModal] = useState(false);
    const [otp, setOtp] = useState("");
    const [otpLoading, setOtpLoading] = useState(false);
    const [resendLoading, setResendLoading] = useState(false);
    const [resendTimer, setResendTimer] = useState(60);
    const [message, setMessage] = useState("");
    const [error, setError] = useState("");

    /*
    =========================================================
    RESEND TIMER
    =========================================================
    */

    useEffect(() => {
        if (!showOtpModal || resendTimer <= 0) {
            return;
        }

        const timer = setInterval(() => {
            setResendTimer((previous) => {
                if (previous <= 1) {
                    clearInterval(timer);
                    return 0;
                }

                return previous - 1;
            });
        }, 1000);

        return () => clearInterval(timer);
    }, [showOtpModal, resendTimer]);

    /*
    =========================================================
    LANGUAGE CHANGE
    =========================================================
    */

    const handleLanguageChange = async (event) => {
        const language = event.target.value;
        const token = localStorage.getItem("token");

        setError("");
        setMessage("");

        /*
        =====================================================
        SECURITY CHECK
        =====================================================
        */

        if (!token) {
            setError(
                "Please login to change your language preference."
            );

            return;
        }

        /*
        =====================================================
        FRENCH REQUIRES OTP
        =====================================================
        */

        if (language === "fr") {
            try {
                setLoading(true);

                const response = await fetch(
                    "http://localhost:5000/api/language/request-french-otp",
                    {
                        method: "POST",
                        headers: {
                            "Content-Type":
                                "application/json",
                            Authorization:
                                `Bearer ${ token } `,
                        },
                    }
                );

                const data =
                    await response.json();

                if (!response.ok) {
                    throw new Error(
                        data.message ||
                        "Failed to send OTP."
                    );
                }

                setShowOtpModal(true);
                setOtp("");
                setResendTimer(60);

                setMessage(
                    "OTP has been sent to your registered email."
                );

            } catch (error) {
                console.error(
                    "French OTP error:",
                    error
                );

                setError(
                    error.message ||
                    "Unable to send OTP."
                );

            } finally {
                setLoading(false);
            }

            return;
        }

        /*
        =====================================================
        OTHER LANGUAGES
        =====================================================
        */

        try {
            setLoading(true);

            const response = await fetch(
                "http://localhost:5000/api/language",
                {
                    method: "PUT",
                    headers: {
                        "Content-Type":
                            "application/json",
                        Authorization:
                            `Bearer ${ token } `,
                    },
                    body: JSON.stringify({
                        language,
                    }),
                }
            );

            const data =
                await response.json();

            if (!response.ok) {
                throw new Error(
                    data.message ||
                    "Failed to change language."
                );
            }

            await i18n.changeLanguage(
                language
            );

            localStorage.setItem(
                "language",
                language
            );

            const storedUser =
                localStorage.getItem("user");

            if (storedUser) {
                const user =
                    JSON.parse(storedUser);

                user.preferred_language =
                    language;

                localStorage.setItem(
                    "user",
                    JSON.stringify(user)
                );
            }

        } catch (error) {
            console.error(
                "Language change error:",
                error
            );

            setError(
                error.message ||
                "Unable to change language."
            );

        } finally {
            setLoading(false);
        }
    };

    /*
    =========================================================
    VERIFY OTP
    =========================================================
    */

    const handleVerifyOtp = async (event) => {
        event.preventDefault();

        if (!otp || otp.length !== 6) {
            setError(
                "Please enter a valid 6-digit OTP."
            );

            return;
        }

        try {
            setOtpLoading(true);
            setError("");

            const token =
                localStorage.getItem("token");

            /*
            Security check again
            */

            if (!token) {
                setError(
                    "Your session has expired. Please login again."
                );

                setShowOtpModal(false);

                return;
            }

            const response = await fetch(
                "http://localhost:5000/api/language/verify-french-otp",
                {
                    method: "POST",
                    headers: {
                        "Content-Type":
                            "application/json",
                        Authorization:
                            `Bearer ${ token } `,
                    },
                    body: JSON.stringify({
                        otp,
                    }),
                }
            );

            const data =
                await response.json();

            if (!response.ok) {
                throw new Error(
                    data.message ||
                    "OTP verification failed."
                );
            }

            await i18n.changeLanguage("fr");

            localStorage.setItem(
                "language",
                "fr"
            );

            const storedUser =
                localStorage.getItem("user");

            if (storedUser) {
                const user =
                    JSON.parse(storedUser);

                user.preferred_language =
                    "fr";

                localStorage.setItem(
                    "user",
                    JSON.stringify(user)
                );
            }

            setShowOtpModal(false);
            setOtp("");
            setMessage("");
            setError("");

        } catch (error) {
            console.error(
                "OTP verification error:",
                error
            );

            setError(
                error.message ||
                "OTP verification failed."
            );

        } finally {
            setOtpLoading(false);
        }
    };

    /*
    =========================================================
    RESEND OTP
    =========================================================
    */

    const handleResendOtp = async () => {
        if (resendTimer > 0 || resendLoading) {
            return;
        }

        try {
            setResendLoading(true);
            setError("");
            setMessage("");

            const token =
                localStorage.getItem("token");

            if (!token) {
                setError(
                    "Your session has expired. Please login again."
                );

                setShowOtpModal(false);

                return;
            }

            const response = await fetch(
                "http://localhost:5000/api/language/request-french-otp",
                {
                    method: "POST",
                   headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${ token }`,
},
                }
            );

            const data =
                await response.json();

            if (!response.ok) {
                if (
                    data.remainingSeconds
                ) {
                    setResendTimer(
                        data.remainingSeconds
                    );
                }

                throw new Error(
                    data.message ||
                    "Failed to resend OTP."
                );
            }

            setOtp("");
            setResendTimer(60);

            setMessage(
                "A new OTP has been sent to your registered email."
            );

        } catch (error) {
            console.error(
                "Resend OTP error:",
                error
            );

            setError(
                error.message ||
                "Unable to resend OTP."
            );

        } finally {
            setResendLoading(false);
        }
    };

    /*
    =========================================================
    CLOSE MODAL
    =========================================================
    */

    const closeModal = () => {
        setShowOtpModal(false);
        setOtp("");
        setError("");
        setMessage("");
        setResendTimer(0);
    };

    /*
    =========================================================
    UI
    =========================================================
    */

    return (
        <>
            <div className="language-selector-wrapper">

                <select
                    value={i18n.language}
                    onChange={handleLanguageChange}
                    disabled={loading}
                    className="language-select"
                    aria-label="Select language"
                >
                    <option value="en">
                        English
                    </option>

                    <option value="es">
                        Español
                    </option>

                    <option value="hi">
                        हिन्दी
                    </option>

                    <option value="pt">
                        Português
                    </option>

                    <option value="zh">
                        中文
                    </option>

                    <option value="fr">
                        Français
                    </option>
                </select>

                {!showOtpModal && error && (
                    <div className="language-error">
                        {error}
                    </div>
                )}

            </div>

            {showOtpModal &&
                createPortal(
                    <div className="otp-overlay">

                        <div className="otp-modal">

                            <button
                                type="button"
                                className="otp-close"
                                onClick={closeModal}
                                aria-label="Close OTP modal"
                            >
                                ×
                            </button>

                            <div className="otp-icon">
                                ✉
                            </div>

                            <h2>
                                Verify Your Email
                            </h2>

                            <p>
                                We sent a 6-digit OTP
                                to your registered
                                email address.
                            </p>

                            {message && (
                                <div className="otp-success">
                                    {message}
                                </div>
                            )}

                            {error && (
                                <div className="otp-error">
                                    {error}
                                </div>
                            )}

                            <form
                                onSubmit={
                                    handleVerifyOtp
                                }
                            >

                                <input
                                    type="text"
                                    inputMode="numeric"
                                    maxLength="6"
                                    placeholder="Enter 6-digit OTP"
                                    value={otp}
                                    onChange={(e) => {
                                        const value =
                                            e.target.value.replace(
                                                /\D/g,
                                                ""
                                            );

                                        setOtp(value);
                                        setError("");
                                    }}
                                    disabled={otpLoading}
                                    autoFocus
                                />

                                <button
                                    type="submit"
                                    disabled={
                                        otpLoading ||
                                        otp.length !== 6
                                    }
                                >
                                    {otpLoading
                                        ? "Verifying..."
                                        : "Verify & Continue"}
                                </button>

                            </form>

                            <div className="otp-resend">

                                {resendTimer > 0 ? (
                                    <p>
                                        Resend OTP{" "}
                                        in{" "}
                                        <strong>
                                            {resendTimer}s
                                        </strong>
                                    </p>
                                ) : (
                                    <button
                                        type="button"
                                        className="resend-otp-button"
                                        onClick={
                                            handleResendOtp
                                        }
                                        disabled={
                                            resendLoading
                                        }
                                    >
                                        {resendLoading
                                            ? "Sending..."
                                            : "Resend OTP"}
                                    </button>
                                )}

                            </div>

                            <small>
                                OTP is valid for
                                5 minutes.
                            </small>

                        </div>
                    </div>,
                    document.body
                )}
        </>
    );
}

export default LanguageSelector;

