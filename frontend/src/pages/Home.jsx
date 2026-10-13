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
                                {t("home.buildCareer")}
                            </small>
                        </div>
                    </Link>

                    <button
                        className={`menu-toggle ${menuOpen ? "menu-open" : ""
                            }`}
                        onClick={() => setMenuOpen(!menuOpen)}
                        aria-label={t("common.toggleNavigation")}
                    >
                        {menuOpen ? "×" : "☰"}
                    </button>

                    <div
                        className={`navbar-content ${menuOpen ? "active" : ""
                            }`}
                    >


                        <nav className="nav-links">
                            <Link
                                to="/"
                                onClick={closeMenu}
                                className="nav-link"
                            >
                                {t("common.home")}
                            </Link>

                            <Link
                                to="/internships"
                                onClick={closeMenu}
                                className="nav-link"
                            >
                                {t("common.internships")}
                            </Link>

                            <Link
                                to="/subscriptions"
                                onClick={closeMenu}
                                className="nav-link"
                            >
                                Subscriptions
                            </Link>

                            <Link
                                to="/community"
                                onClick={closeMenu}
                                className="nav-link"
                            >
                                {t("common.community")}
                            </Link>

                            <Link
                                to="/profile"
                                onClick={closeMenu}
                                className="nav-link"
                            >
                                {t("common.profile")}
                            </Link>
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
                                        {t("common.login")}
                                    </Link>

                                    <Link
                                        to="/register"
                                        className="register-btn"
                                        onClick={closeMenu}
                                    >
                                        {t("common.register")}
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
                                                    {t("common.profile")}
                                                </span>
                                            </Link>

                                            <button
                                                className="dropdown-item logout-item"
                                                onClick={handleLogout}
                                            >
                                                <span>↪</span>

                                                <span>
                                                    {t("common.logout")}
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

                                🚀 {t("home.startCareer")}

                            </div>


                            <h1>

                                {t("home.findYour")}

                                <span>
                                    {" "}
                                    {t("home.dreamInternship")}
                                    {" "}
                                </span>

                                {t("home.andJob")}

                            </h1>


                            <p>
                                {t("home.heroDescription")}
                            </p>


                            <div className="hero-buttons">


                                <Link
                                    to="/internships"
                                    className="primary-btn"
                                    onClick={closeMenu}
                                >
                                    {t("home.exploreInternships")}
                                    <span>→</span>
                                </Link>


                                <button className="secondary-btn">

                                    {t("home.findJobs")}

                                </button>


                                <Link
                                    to="/resume-builder"
                                    className="resume-cta-button"
                                    onClick={closeMenu}
                                >
                                    📄 {t("home.buildResume")} →
                                </Link>

                            </div>


                            <div className="hero-trust">

                                <div className="trust-item">

                                    <strong>
                                        10K+
                                    </strong>

                                    <span>
                                        {t("home.opportunities")}
                                    </span>

                                </div>


                                <div className="trust-divider"></div>


                                <div className="trust-item">

                                    <strong>
                                        5K+
                                    </strong>

                                    <span>
                                        {t("home.students")}
                                    </span>

                                </div>


                                <div className="trust-divider"></div>


                                <div className="trust-item">

                                    <strong>
                                        500+
                                    </strong>

                                    <span>
                                        {t("home.companies")}
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
                                        {t("home.latestOpportunities")}
                                    </span>

                                </div>

                                <span className="live-badge">
                                    {t("home.live")}
                                </span>

                            </div>


                            <div className="opportunity">

                                <div className="company-logo react-logo">
                                    R
                                </div>

                                <div className="opportunity-info">

                                    <h4>
                                        {t("home.reactDeveloperIntern")}
                                    </h4>

                                    <p>
                                        {t("home.remote")} · ₹10,000/month
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
                                        {t("home.mernDeveloper")}
                                    </h4>

                                    <p>
                                        {t("home.hybrid")} · ₹15,000/month
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
                                        {t("home.frontendDeveloper")}
                                    </h4>

                                    <p>
                                        {t("home.remote")} · ₹12,000/month
                                    </p>

                                </div>

                                <span className="opportunity-arrow">
                                    →
                                </span>

                            </div>



                            <Link
                                to="/internships"
                                className="view-all-btn"
                                onClick={closeMenu}
                            >
                                {t("home.viewAllOpportunities")} →
                            </Link>

                        </div>

                    </div>

                </section>


                {/* ================= FEATURES ================= */}

                <section className="features-section">

                    <div className="section-heading">

                        <span>
                            {t("home.whyInternshipPortal")}
                        </span>

                        <h2>

                            {t("home.everythingYouNeed")}

                            <strong>
                                {" "}
                                {t("home.growYourCareer")}
                            </strong>

                        </h2>

                        <p>
                            {t("home.careerDescription")}
                        </p>

                    </div>


                    <div className="features-grid">

                        <div className="feature">

                            <div className="feature-icon">
                                💼
                            </div>

                            <h3>
                                {t("home.verifiedOpportunities")}
                            </h3>

                            <p>
                                {t("home.verifiedDescription")}
                            </p>

                            <a href="#internships">
                                {t("home.exploreOpportunities")} →
                            </a>

                        </div>


                        <div className="feature">

                            <div className="feature-icon">
                                📄
                            </div>

                            <h3>
                                {t("home.buildResume")}
                            </h3>

                            <p>
                                {t("home.resumeDescription")}
                            </p>

                            <Link
                                to="/resume-builder"
                                className="resume-builder-link"
                                onClick={closeMenu}
                            >
                                {t("home.buildYourProfile")} →
                            </Link>

                        </div>


                        <div className="feature">

                            <div className="feature-icon">
                                🚀
                            </div>

                            <h3>
                                {t("home.growCareer")}
                            </h3>

                            <p>
                                {t("home.growDescription")}
                            </p>

                            <a href="#jobs">
                                {t("home.findYourOpportunity")} →
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
                                {t("home.connectingTalent")}
                            </p>

                        </div>

                    </div>


                    <div className="footer-copy">

                        © 2026 InternshipPortal.{" "}
                        {t("common.allRightsReserved")}

                    </div>

                </div>

            </footer>

        </div>
    );
}

export default Home;