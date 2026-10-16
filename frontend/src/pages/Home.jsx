import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import LanguageSelector from "../components/LanguageSelector";
import { API_BASE_URL } from "../config/api.js";

function Home() {
    const { t } = useTranslation();
    const navigate = useNavigate();

    const [menuOpen, setMenuOpen] = useState(false);
    const [profileOpen, setProfileOpen] = useState(false);
    const [user, setUser] = useState(() => {
        const savedUser = localStorage.getItem("user");
        if (!savedUser) return null;
        try {
            return JSON.parse(savedUser);
        } catch {
            localStorage.removeItem("user");
            return null;
        }
    });

    const closeMenu = () => {
        setMenuOpen(false);
    };

    const handleLogout = async () => {
        const token = localStorage.getItem("token");
        try {
            if (token) {
                const response = await fetch(`${API_BASE_URL}/api/auth/sessions/logout`, {
                    method: "POST",
                    headers: { Authorization: `Bearer ${token}` },
                });
                if (!response.ok) console.error("Server session logout failed.");
            }
        } catch (error) {
            console.error("Server session logout failed:", error.message);
        } finally {
            localStorage.removeItem("token");
            localStorage.removeItem("user");
            setUser(null);
            setProfileOpen(false);
            setMenuOpen(false);
            navigate("/login");
        }
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
                                {t("common.subscriptionPlans")}
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


                                <Link
                                    to="/internships"
                                    className="secondary-btn"
                                    onClick={closeMenu}
                                >
                                    {t("home.viewAllOpportunities")}
                                </Link>


                                <Link
                                    to="/resume-builder"
                                    className="resume-cta-button"
                                    onClick={closeMenu}
                                >
                                    📄 {t("home.buildResume")} →
                                </Link>

                            </div>


                        </div>


                        {/* ================= OPPORTUNITY CARD ================= */}

                        <div className="hero-card">

                            <div className="hero-card-header">

                                <div className="live-indicator">
                                    {t("home.latestOpportunities")}
                                </div>

                            </div>


                            <p className="opportunity-access-note">
                                {t("home.opportunityAccessNote")}
                            </p>

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
                                {t("home.openInternships")}
                            </h3>

                            <p>
                                {t("home.openInternshipsDescription")}
                            </p>

                            <Link to="/internships">
                                {t("home.exploreOpportunities")} →
                            </Link>

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

                            <Link to="/internships">
                                {t("home.findYourOpportunity")} →
                            </Link>

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
