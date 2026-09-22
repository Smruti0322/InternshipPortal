import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import LanguageSelector from "../components/LanguageSelector";
import "../App.css";

function Home() {
    const { t } = useTranslation();

    const [menuOpen, setMenuOpen] = useState(false);
    const [profileOpen, setProfileOpen] = useState(false);
    const [user, setUser] = useState(null);

    useEffect(() => {
        const savedUser = localStorage.getItem("user");

        if (savedUser) {
            try {
                setUser(JSON.parse(savedUser));
            } catch (error) {
                console.error("Invalid user data");
                localStorage.removeItem("user");
            }
        }
    }, []);

    const closeMenu = () => {
        setMenuOpen(false);
    };

    const handleLogout = () => {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        localStorage.removeItem("language");

        setUser(null);
        setProfileOpen(false);
        setMenuOpen(false);

        window.location.href = "/login";
    };

    const getUserName = () => {
        if (!user) return "";

        return (
            user.name ||
            user.fullName ||
            user.username ||
            user.email?.split("@")[0] ||
            "User"
        );
    };

    const getInitial = () => {
        const name = getUserName();

        return name
            ? name.charAt(0).toUpperCase()
            : "U";
    };

    return (
        <div className="app">

            {/* ================= NAVBAR ================= */}

            <header className="navbar">
                <div className="navbar-container">

                    <Link
                        to="/"
                        className="logo"
                        onClick={closeMenu}
                    >
                        <div className="logo-icon">
                            IP
                        </div>

                        <div className="logo-text">
                            <h2>
                                Internship<span>Portal</span>
                            </h2>

                            <small>
                                {t("buildCareer")}
                            </small>
                        </div>
                    </Link>

                    <button
                        className={`menu-toggle ${menuOpen ? "menu-open" : ""
                            }`}
                        onClick={() => setMenuOpen(!menuOpen)}
                        aria-label="Toggle navigation"
                    >
                        {menuOpen ? "×" : "☰"}
                    </button>

                    <div
                        className={`navbar-content ${menuOpen ? "active" : ""
                            }`}
                    >

                        <nav className="nav-links">

                            <a
                                href="#home"
                                onClick={closeMenu}
                                className="nav-link active-link"
                            >
                                {t("home")}
                            </a>

                            <a
                                href="#internships"
                                onClick={closeMenu}
                                className="nav-link"
                            >
                                {t("internships")}
                            </a>

                            <a
                                href="#jobs"
                                onClick={closeMenu}
                                className="nav-link"
                            >
                                {t("jobs")}
                            </a>

                            <a
                                href="#profile"
                                onClick={closeMenu}
                                className="nav-link"
                            >
                                {t("profile")}
                            </a>

                        </nav>

                        <div className="navbar-actions">

                            <LanguageSelector />

                            {!user ? (

                                <div className="nav-actions">

                                    <Link
                                        to="/login"
                                        className="login-btn"
                                        onClick={closeMenu}
                                    >
                                        {t("login")}
                                    </Link>

                                    <Link
                                        to="/register"
                                        className="register-btn"
                                        onClick={closeMenu}
                                    >
                                        {t("register")}
                                    </Link>

                                </div>

                            ) : (

                                <div className="profile-wrapper">

                                    <button
                                        className="profile-btn"
                                        onClick={() =>
                                            setProfileOpen(!profileOpen)
                                        }
                                    >
                                        <span className="profile-avatar">
                                            {getInitial()}
                                        </span>

                                        <span className="profile-name">
                                            {getUserName()}
                                        </span>

                                        <span className="profile-arrow">
                                            {profileOpen ? "▲" : "▼"}
                                        </span>
                                    </button>

                                    {profileOpen && (

                                        <div className="profile-dropdown">

                                            <div className="profile-dropdown-header">

                                                <div className="dropdown-avatar">
                                                    {getInitial()}
                                                </div>

                                                <div className="profile-details">

                                                    <strong>
                                                        {getUserName()}
                                                    </strong>

                                                    <small>
                                                        {user.email || ""}
                                                    </small>

                                                </div>

                                            </div>

                                            <div className="profile-divider"></div>

                                            <Link
                                                to="/profile"
                                                className="dropdown-item"
                                                onClick={() => {
                                                    setProfileOpen(false);
                                                    setMenuOpen(false);
                                                }}
                                            >
                                                <span>👤</span>
                                                <span>
                                                    {t("profile")}
                                                </span>
                                            </Link>

                                            <button
                                                className="dropdown-item logout-item"
                                                onClick={handleLogout}
                                            >
                                                <span>↪</span>
                                                <span>
                                                    {t("logout")}
                                                </span>
                                            </button>

                                        </div>

                                    )}

                                </div>

                            )}

                        </div>

                    </div>
                </div>
            </header>


            {/* ================= HERO ================= */}

            <main>

                <section
                    className="hero-section"
                    id="home"
                >

                    <div className="hero-container">

                        <div className="hero-content">

                            <div className="hero-badge">

                                <span className="badge-dot"></span>

                                🚀 {t("startCareer")}

                            </div>


                            <h1>

                                {t("findYour")}

                                <span>
                                    {" "}
                                    {t("dreamInternship")}
                                    {" "}
                                </span>

                                {t("andJob")}

                            </h1>


                            <p>
                                {t("heroDescription")}
                            </p>


                            <div className="hero-buttons">

                                <button className="primary-btn">

                                    {t("exploreInternships")}

                                    <span>
                                        →
                                    </span>

                                </button>


                                <button className="secondary-btn">

                                    {t("findJobs")}

                                </button>

                            </div>


                            <div className="hero-trust">

                                <div className="trust-item">

                                    <strong>
                                        10K+
                                    </strong>

                                    <span>
                                        {t("opportunities")}
                                    </span>

                                </div>


                                <div className="trust-divider"></div>


                                <div className="trust-item">

                                    <strong>
                                        5K+
                                    </strong>

                                    <span>
                                        {t("students")}
                                    </span>

                                </div>


                                <div className="trust-divider"></div>


                                <div className="trust-item">

                                    <strong>
                                        500+
                                    </strong>

                                    <span>
                                        {t("companies")}
                                    </span>

                                </div>

                            </div>

                        </div>


                        {/* ================= OPPORTUNITY CARD ================= */}

                        <div className="hero-card">

                            <div className="hero-card-header">

                                <div className="live-indicator">

                                    <span className="status-dot"></span>

                                    <span>
                                        {t("latestOpportunities")}
                                    </span>

                                </div>

                                <span className="live-badge">
                                    {t("live")}
                                </span>

                            </div>


                            <div className="opportunity">

                                <div className="company-logo react-logo">
                                    R
                                </div>

                                <div className="opportunity-info">

                                    <h4>
                                        {t("reactDeveloperIntern")}
                                    </h4>

                                    <p>
                                        {t("remote")} · ₹10,000/month
                                    </p>

                                </div>

                                <span className="opportunity-arrow">
                                    →
                                </span>

                            </div>


                            <div className="opportunity">

                                <div className="company-logo mern-logo">
                                    M
                                </div>

                                <div className="opportunity-info">

                                    <h4>
                                        {t("mernDeveloper")}
                                    </h4>

                                    <p>
                                        {t("hybrid")} · ₹15,000/month
                                    </p>

                                </div>

                                <span className="opportunity-arrow">
                                    →
                                </span>

                            </div>


                            <div className="opportunity">

                                <div className="company-logo frontend-logo">
                                    A
                                </div>

                                <div className="opportunity-info">

                                    <h4>
                                        {t("frontendDeveloper")}
                                    </h4>

                                    <p>
                                        {t("remote")} · ₹12,000/month
                                    </p>

                                </div>

                                <span className="opportunity-arrow">
                                    →
                                </span>

                            </div>


                            <button className="view-all-btn">

                                {t("viewAllOpportunities")}

                                {" →"}

                            </button>

                        </div>

                    </div>

                </section>


                {/* ================= FEATURES ================= */}

                <section className="features-section">

                    <div className="section-heading">

                        <span>
                            {t("whyInternshipPortal")}
                        </span>

                        <h2>

                            {t("everythingYouNeed")}

                            <strong>
                                {" "}
                                {t("growYourCareer")}
                            </strong>

                        </h2>

                        <p>
                            {t("careerDescription")}
                        </p>

                    </div>


                    <div className="features-grid">

                        <div className="feature">

                            <div className="feature-icon">
                                💼
                            </div>

                            <h3>
                                {t("verifiedOpportunities")}
                            </h3>

                            <p>
                                {t("verifiedDescription")}
                            </p>

                            <a href="#internships">
                                {t("exploreOpportunities")} →
                            </a>

                        </div>


                        <div className="feature">

                            <div className="feature-icon">
                                📄
                            </div>

                            <h3>
                                {t("buildResume")}
                            </h3>

                            <p>
                                {t("resumeDescription")}
                            </p>

                            <a href="#profile">
                                {t("buildYourProfile")} →
                            </a>

                        </div>


                        <div className="feature">

                            <div className="feature-icon">
                                🚀
                            </div>

                            <h3>
                                {t("growCareer")}
                            </h3>

                            <p>
                                {t("growDescription")}
                            </p>

                            <a href="#jobs">
                                {t("findYourOpportunity")} →
                            </a>

                        </div>

                    </div>

                </section>

            </main>


            {/* ================= FOOTER ================= */}

            <footer className="home-footer">

                <div className="footer-container">

                    <div className="footer-brand">

                        <div className="footer-logo">
                            IP
                        </div>

                        <div>

                            <strong>
                                Internship<span>Portal</span>
                            </strong>

                            <p>
                                {t("connectingTalent")}
                            </p>

                        </div>

                    </div>


                    <div className="footer-copy">

                        © 2026 InternshipPortal.{" "}
                        {t("allRightsReserved")}

                    </div>

                </div>

            </footer>

        </div>
    );
}

export default Home;