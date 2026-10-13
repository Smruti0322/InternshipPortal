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


// =========================================================
// TASK 5 : LOGIN SECURITY
// =========================================================
// Trust proxy so req.ip works correctly when the backend
// is running behind a reverse proxy / deployment platform.
//
// For local development this does not break anything.
// =========================================================

app.set("trust proxy", true);


// =========================================================
// MIDDLEWARE
// =========================================================

app.use(cors());

app.use(
    "/uploads",
    express.static(
        path.join(__dirname, "uploads")
    )
);

app.use(express.json());


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

app.listen(PORT, () => {
    console.log(
        `Server running on port ${PORT}`
    );
});