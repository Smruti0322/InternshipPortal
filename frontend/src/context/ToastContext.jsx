import { createContext, useCallback, useContext, useRef, useState } from "react";
import ToastRegion from "../components/Toast";

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
    const [toasts, setToasts] = useState([]);
    const nextId = useRef(0);

    const dismissToast = useCallback((id) => {
        setToasts((current) => current.filter((toast) => toast.id !== id));
    }, []);

    const showToast = useCallback((message, type = "info", duration = 3600) => {
        if (!message) return;
        const id = ++nextId.current;
        const toast = {
            id,
            message: String(message),
            type: ["success", "error", "warning", "info"].includes(type) ? type : "info",
            duration: Math.max(1500, Number(duration) || 3600),
        };
        setToasts((current) => [...current.slice(-3), toast]);
        return id;
    }, []);

    return (
        <ToastContext.Provider value={{ showToast }}>
            {children}
            <ToastRegion toasts={toasts} dismissToast={dismissToast} />
        </ToastContext.Provider>
    );
}

export function useToast() {
    const context = useContext(ToastContext);
    if (!context) throw new Error("useToast must be used within ToastProvider.");
    return context;
}
