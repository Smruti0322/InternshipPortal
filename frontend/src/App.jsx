
import { lazy, Suspense } from "react";
import { Link, Routes, Route } from "react-router-dom";
import { useTranslation } from "react-i18next";
import "./App.css";

const Home = lazy(() => import("./pages/Home"));
const Register = lazy(() => import("./pages/Register"));
const Login = lazy(() => import("./pages/Login"));
const ResumeBuilder = lazy(() => import("./pages/ResumeBuilder"));
const MyResumes = lazy(() => import("./pages/MyResumes"));
const ViewResume = lazy(() => import("./pages/ViewResume"));
const ChangePassword = lazy(() => import("./pages/ChangePassword"));
const ForgotPassword = lazy(() => import("./pages/ForgotPassword"));
const Community = lazy(() => import("./pages/Community"));
const Profile = lazy(() => import("./pages/Profile"));
const InternshipList = lazy(() => import("./pages/InternshipList"));
const Subscriptions = lazy(() => import("./pages/Subscriptions"));

function RouteLoading() {
  const { t } = useTranslation();
  return (
    <div className="route-loading" role="status" aria-live="polite">
      <span className="route-loading-indicator" aria-hidden="true" />
      <span>{t("common.pleaseWait")}</span>
    </div>
  );
}

function NotFound() {
  const { t } = useTranslation();
  return (
    <main className="route-not-found">
      <p>404</p>
      <h1>{t("common.pageNotFound")}</h1>
      <Link className="primary-btn" to="/">{t("common.backToHome")}</Link>
    </main>
  );
}

function App() {
  return (
    <Suspense fallback={<RouteLoading />}>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/register" element={<Register />} />
        <Route path="/login" element={<Login />} />

        <Route path="/change-password" element={<ChangePassword />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/resume-builder" element={<ResumeBuilder />} />
        <Route path="/my-resumes" element={<MyResumes />} />
        <Route path="/view-resume/:id" element={<ViewResume />} />
        <Route path="/community" element={<Community />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/internships" element={<InternshipList />} />
        <Route path="/subscriptions" element={<Subscriptions />} />
        <Route path="*" element={<NotFound />} />

      </Routes>
    </Suspense>
  );
}

export default App;
