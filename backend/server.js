const path = require("path");
const dotenv = require("dotenv");

// Force load .env from backend folder
dotenv.config({
    path: path.join(__dirname, ".env"),
});

console.log(
    "Environment loaded. SMTP and Razorpay credentials are configured:",
    Boolean(
        process.env.SMTP_USER &&
        process.env.SMTP_PASS &&
        process.env.RAZORPAY_KEY_ID &&
        process.env.RAZORPAY_KEY_SECRET
    )
);

const express = require("express");
const cors = require("cors");

const authRoutes = require("./routes/authRoutes");
const languageRoutes = require("./routes/languageRoutes");
const resumeRoutes = require("./routes/resumeRoutes");
const resumeDownloadRoutes = require("./routes/resumeDownloadRoutes");
const resumePaymentRoutes = require("./routes/resumePaymentRoutes");
const forgotPasswordRoutes = require("./routes/forgotPassword");

const postRoutes = require("./routes/postRoutes");
const communityRoutes = require("./routes/communityRoutes");
const subscriptionRoutes = require("./routes/subscriptionRoutes");
const internshipRoutes = require("./routes/internshipRoutes");
const app = express();

const allowedOrigins = (process.env.CORS_ORIGINS || "http://localhost:5173,http://127.0.0.1:5173")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);


// =========================================================
// TASK 5 : LOGIN SECURITY
// =========================================================
// Trust proxy so req.ip works correctly when the backend
// is running behind a reverse proxy / deployment platform.
//
// For local development this does not break anything.
// =========================================================

app.set("trust proxy", Number(process.env.TRUST_PROXY_HOPS || 0));


// =========================================================
// MIDDLEWARE
// =========================================================

app.use(cors({
    origin(origin, callback) {
        // Allow server-to-server and same-origin requests without an Origin header.
        return callback(null, !origin || allowedOrigins.includes(origin));
    },
    credentials: true,
}));

// Community media is public content in the feed; serve only that upload folder
// with safe response headers. Other upload folders are never exposed statically.
app.use("/uploads/community", express.static(
    path.join(__dirname, "uploads", "community"),
    {
        dotfiles: "deny",
        index: false,
        setHeaders(res) {
            res.setHeader("X-Content-Type-Options", "nosniff");
            res.setHeader("Content-Security-Policy", "default-src 'none'; sandbox");
        },
    }
));

app.use(express.json());

app.disable("x-powered-by");


// =========================================================
// ROUTES
// =========================================================

app.use("/api/resumes", resumeRoutes);

app.use(
    "/api/resume-download",
    resumeDownloadRoutes
);

app.use(
    "/api/resume-payment",
    resumePaymentRoutes
);

app.use("/api/auth", authRoutes);

app.use("/api/language", languageRoutes);

app.use(
    "/api/forgot-password",
    forgotPasswordRoutes
);

app.use("/api/posts", postRoutes);

app.use(
    "/api/community",
    communityRoutes
);

app.use("/api/subscriptions", subscriptionRoutes);

app.use("/api/internships", internshipRoutes);
// =========================================================
// ROOT
// =========================================================

app.get("/", (req, res) => {
    res.json({
        message: "Internship Portal Backend Running",
    });
});


// =========================================================
// SERVER
// =========================================================

const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, () => {
    console.log(
        `Server running on port ${PORT}`
    );
});

module.exports = app;
