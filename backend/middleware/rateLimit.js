const windows = new Map();
let lastPrune = Date.now();

// Per-process limiter for unauthenticated endpoints. Keep limits modest and
// bounded; deploy a shared store if the API is scaled across multiple workers.
const rateLimit = ({ windowMs, max, message }) => (req, res, next) => {
    const now = Date.now();
    if (now - lastPrune > windowMs) {
        for (const [key, window] of windows) {
            if (window.resetAt <= now) windows.delete(key);
        }
        lastPrune = now;
    }

    const key = `${req.ip || req.socket?.remoteAddress || "unknown"}:${req.baseUrl}${req.path}`;
    let window = windows.get(key);
    if (!window || window.resetAt <= now) {
        window = { count: 0, resetAt: now + windowMs };
        windows.set(key, window);
    }

    window.count += 1;
    if (windows.size > 10000) {
        const oldestKey = windows.keys().next().value;
        if (oldestKey !== undefined && oldestKey !== key) windows.delete(oldestKey);
    }
    if (window.count > max) {
        res.set("Retry-After", String(Math.max(1, Math.ceil((window.resetAt - now) / 1000))));
        return res.status(429).json({ message });
    }

    return next();
};

module.exports = rateLimit;
