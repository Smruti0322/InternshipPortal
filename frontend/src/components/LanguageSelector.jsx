import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";

const SUPPORTED_LANGUAGES = [
    "en",
    "es",
    "hi",
    "pt",
    "zh",
    "fr",
];

function LanguageSelector() {
    const { i18n, t } = useTranslation();

    const [loading, setLoading] = useState(false);
    const [showOtpModal, setShowOtpModal] = useState(false);
    const [otp, setOtp] = useState("");
    const [otpLoading, setOtpLoading] = useState(false);
    const [resendLoading, setResendLoading] = useState(false);
    const [resendTimer, setResendTimer] = useState(60);
    const [message, setMessage] = useState("");
    const [error, setError] = useState("");

    const currentLanguage = SUPPORTED_LANGUAGES.includes(
        i18n.language
    )
        ? i18n.language
        : i18n.language?.split("-")[0] || "en";

    /*
        --------------------------------------------------
        French OTP modal translations
        --------------------------------------------------

        OTP modal must remain French before verification.
        Therefore these strings intentionally use the
        French translation keys from the JSON files.
    */
    const frenchOtp = (key) => t(`frenchOtp.${key}`);

    /*
        --------------------------------------------------
        Resend OTP countdown
        --------------------------------------------------
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
        --------------------------------------------------
        Change language
        --------------------------------------------------
    */
    const handleLanguageChange = async (event) => {
        const language = event.target.value;
        const token = localStorage.getItem("token");

        setError("");
        setMessage("");

        /*
            User must be logged in
        */
        if (!token) {
            setError(t("loginRequiredLanguage"));
            return;
        }

        /*
            --------------------------------------------------
            FRENCH LANGUAGE
            --------------------------------------------------

            Do NOT change i18n language until OTP succeeds.
        */
        if (language === "fr") {
            try {
                setLoading(true);

                const response = await fetch(
                    "http://localhost:5000/api/language/request-french-otp",
                    {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                            Authorization: `Bearer ${token}`,
                        },
                    }
                );

                const data = await response.json();

                if (!response.ok) {
                    throw new Error(
                        data.message ||
                        frenchOtp("failedSendOtp")
                    );
                }

                setShowOtpModal(true);
                setOtp("");
                setResendTimer(60);

                setMessage(
                    frenchOtp("otpSent")
                );
            } catch (error) {
                console.error(
                    "French OTP error:",
                    error
                );

                setError(
                    error.message ||
                    frenchOtp("unableSendOtp")
                );
            } finally {
                setLoading(false);
            }

            return;
        }

        /*
            --------------------------------------------------
            NORMAL LANGUAGE CHANGE
            --------------------------------------------------
        */
        try {
            setLoading(true);

            const response = await fetch(
                "http://localhost:5000/api/language",
                {
                    method: "PUT",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${token}`,
                    },
                    body: JSON.stringify({
                        language,
                    }),
                }
            );

            const data = await response.json();

            if (!response.ok) {
                throw new Error(
                    data.message ||
                    t("failedChangeLanguage")
                );
            }

            /*
                Change UI language without refresh
            */
            await i18n.changeLanguage(language);

            /*
                Save browser preference
            */
            localStorage.setItem(
                "language",
                language
            );

            /*
                Keep local user data synchronized
            */
            const storedUser =
                localStorage.getItem("user");

            if (storedUser) {
                try {
                    const user =
                        JSON.parse(storedUser);

                    user.preferred_language =
                        language;

                    localStorage.setItem(
                        "user",
                        JSON.stringify(user)
                    );
                } catch (storageError) {
                    console.error(
                        "User storage update error:",
                        storageError
                    );
                }
            }
        } catch (error) {
            console.error(
                "Language change error:",
                error
            );

            setError(
                error.message ||
                t("unableChangeLanguage")
            );
        } finally {
            setLoading(false);
        }
    };

    /*
        --------------------------------------------------
        Verify French OTP
        --------------------------------------------------
    */
    const handleVerifyOtp = async (event) => {
        event.preventDefault();

        if (!otp || otp.length !== 6) {
            setError(
                frenchOtp("validOtp")
            );
            return;
        }

        try {
            setOtpLoading(true);
            setError("");

            const token =
                localStorage.getItem("token");

            if (!token) {
                setError(
                    frenchOtp("sessionExpired")
                );

                setShowOtpModal(false);

                return;
            }

            const response = await fetch(
                "http://localhost:5000/api/language/verify-french-otp",
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${token}`,
                    },
                    body: JSON.stringify({
                        otp,
                    }),
                }
            );

            const data = await response.json();

            if (!response.ok) {
                throw new Error(
                    data.message ||
                    frenchOtp(
                        "otpVerificationFailed"
                    )
                );
            }

            /*
                --------------------------------------------------
                OTP SUCCESS
                --------------------------------------------------

                ONLY NOW change application language to French.
            */
            await i18n.changeLanguage("fr");

            /*
                Save browser preference
            */
            localStorage.setItem(
                "language",
                "fr"
            );

            /*
                Keep local user data synchronized
            */
            const storedUser =
                localStorage.getItem("user");

            if (storedUser) {
                try {
                    const user =
                        JSON.parse(storedUser);

                    user.preferred_language = "fr";

                    localStorage.setItem(
                        "user",
                        JSON.stringify(user)
                    );
                } catch (storageError) {
                    console.error(
                        "User storage update error:",
                        storageError
                    );
                }
            }

            /*
                Close OTP modal
            */
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
                frenchOtp(
                    "otpVerificationFailed"
                )
            );
        } finally {
            setOtpLoading(false);
        }
    };

    /*
        --------------------------------------------------
        Resend French OTP
        --------------------------------------------------
    */
    const handleResendOtp = async () => {
        if (
            resendTimer > 0 ||
            resendLoading
        ) {
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
                    frenchOtp("sessionExpired")
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
                        Authorization: `Bearer ${token}`,
                    },
                }
            );

            const data = await response.json();

            if (!response.ok) {
                if (data.remainingSeconds) {
                    setResendTimer(
                        data.remainingSeconds
                    );
                }

                throw new Error(
                    data.message ||
                    frenchOtp("failedSendOtp")
                );
            }

            setOtp("");
            setResendTimer(60);

            setMessage(
                frenchOtp("newOtpSent")
            );
        } catch (error) {
            console.error(
                "Resend OTP error:",
                error
            );

            setError(
                error.message ||
                frenchOtp("unableSendOtp")
            );
        } finally {
            setResendLoading(false);
        }
    };

    /*
        --------------------------------------------------
        Close OTP modal
        --------------------------------------------------
    */
    const closeModal = () => {
        setShowOtpModal(false);
        setOtp("");
        setError("");
        setMessage("");
        setResendTimer(0);
    };

    return (
        <>
            <div className="language-selector-wrapper">

                <select
                    value={currentLanguage}
                    onChange={handleLanguageChange}
                    disabled={loading}
                    className="language-select"
                    aria-label={t("language")}
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
                                aria-label={frenchOtp(
                                    "close"
                                )}
                            >
                                ×
                            </button>

                            <div className="otp-icon">
                                ✉
                            </div>

                            <h2>
                                {frenchOtp(
                                    "verifyYourEmail"
                                )}
                            </h2>

                            <p>
                                {frenchOtp(
                                    "otpSentMessage"
                                )}
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
                                    placeholder={frenchOtp(
                                        "enterOtp"
                                    )}
                                    value={otp}
                                    onChange={(event) => {
                                        const value =
                                            event.target.value.replace(
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
                                        ? frenchOtp(
                                            "verifying"
                                        )
                                        : frenchOtp(
                                            "verifyContinue"
                                        )}
                                </button>
                            </form>

                            <div className="otp-resend">

                                {resendTimer > 0 ? (
                                    <p>
                                        {frenchOtp(
                                            "resendIn"
                                        )}{" "}
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
                                            ? frenchOtp(
                                                "sending"
                                            )
                                            : frenchOtp(
                                                "resendOtp"
                                            )}
                                    </button>
                                )}

                            </div>

                            <small>
                                {frenchOtp(
                                    "otpValid"
                                )}
                            </small>

                        </div>

                    </div>,
                    document.body
                )}
        </>
    );
}

export default LanguageSelector;