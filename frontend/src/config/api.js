const configuredApiUrl = import.meta.env.VITE_API_URL?.trim();

// An unset production URL uses the frontend's origin (usually via a reverse proxy).
// Local development keeps the existing backend default.
export const API_BASE_URL = (configuredApiUrl ?? (import.meta.env.DEV ? "http://localhost:5000" : "")).replace(/\/$/, "");
