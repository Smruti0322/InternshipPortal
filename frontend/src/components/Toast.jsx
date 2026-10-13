import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import "./Toast.css";

const toastIcons = {
    success: "✓",
    error: "×",
    warning: "!",
    info: "i",
};

function ToastItem({ toast, dismissToast }) {
    const { t } = useTranslation();
    const [leaving, setLeaving] = useState(false);

    useEffect(() => {
        const timer = window.setTimeout(() => setLeaving(true), toast.duration);
        return () => window.clearTimeout(timer);
    }, [toast.duration]);

    useEffect(() => {
        if (!leaving) return undefined;

        const timer = window.setTimeout(() => dismissToast(toast.id), 220);
        return () => window.clearTimeout(timer);
    }, [dismissToast, leaving, toast.id]);

    return (
        <div
            className={`app-toast app-toast--${toast.type}${leaving ? " app-toast--leaving" : ""}`}
            role={toast.type === "error" ? "alert" : "status"}
            aria-live={toast.type === "error" ? "assertive" : "polite"}
        >
            <span className="app-toast__icon" aria-hidden="true">
                {toastIcons[toast.type]}
            </span>

            <p className="app-toast__message">
                {toast.message}
            </p>

            <button
                className="app-toast__close"
                type="button"
                aria-label={t("dismissNotification")}
                onClick={() => setLeaving(true)}
            >
                <span aria-hidden="true">×</span>
            </button>
        </div>
    );
}

export default function ToastRegion({ toasts, dismissToast }) {
    const { t } = useTranslation();

    return (
        <div
            className="app-toast-region"
            aria-label={t("notifications")}
        >
            {toasts.map((toast) => (
                <ToastItem
                    key={toast.id}
                    toast={toast}
                    dismissToast={dismissToast}
                />
            ))}
        </div>
    );
}