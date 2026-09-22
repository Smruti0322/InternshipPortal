const path = require("path");
const dotenv = require("dotenv");

// Force load .env from backend folder
dotenv.config({
    path: path.join(__dirname, ".env"),
});

console.log("ENV CHECK");
console.log("SMTP_USER:", process.env.SMTP_USER);
console.log("SMTP_PASSWORD_EXISTS:", !!process.env.SMTP_PASS);

const express = require("express");
const cors = require("cors");

const authRoutes = require("./routes/authRoutes");
const languageRoutes = require("./routes/languageRoutes");
const resumeRoutes = require("./routes/resumeRoutes");
const resumeOtpRoutes = require("./routes/resumeOtpRoutes");
const resumeDownloadRoutes = require("./routes/resumeDownloadRoutes");
const resumePaymentRoutes = require("./routes/resumePaymentRoutes");

const app = express();

app.use(cors());
app.use(express.json());

app.use("/api/resumes", resumeRoutes);
app.use("/api/resume-otp", resumeOtpRoutes);
app.use("/api/resume-download", resumeDownloadRoutes);
app.use(
    "/api/resume-payment",
    resumePaymentRoutes
);

app.use("/api/auth", authRoutes);
app.use("/api/language", languageRoutes);

app.get("/", (req, res) => {
    res.json({
        message: "Internship Portal Backend Running",
    });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});