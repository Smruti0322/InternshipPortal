
import { Routes, Route } from "react-router-dom";

import Home from "./pages/Home";
import Register from "./pages/Register";
import Login from "./pages/Login";

import ResumeBuilder from "./pages/ResumeBuilder";
import MyResumes from "./pages/MyResumes";
import ViewResume from "./pages/ViewResume";

import ChangePassword from "./pages/ChangePassword";
import ForgotPassword from "./pages/ForgotPassword";

import Community from "./pages/Community";
import Profile from "./pages/Profile";
import InternshipList from "./pages/InternshipList";
import Subscriptions from "./pages/Subscriptions";

function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/register" element={<Register />} />
      <Route path="/login" element={<Login />} />

      <Route
        path="/change-password"
        element={<ChangePassword />}
      />

      <Route
        path="/forgot-password"
        element={<ForgotPassword />}
      />

      <Route
        path="/resume-builder"
        element={<ResumeBuilder />}
      />

      <Route
        path="/my-resumes"
        element={<MyResumes />}
      />

      <Route
        path="/view-resume/:id"
        element={<ViewResume />}
      />

      <Route
        path="/community"
        element={<Community />}
      />

      <Route
        path="/profile"
        element={<Profile />}
      />

      <Route
        path="/internships"
        element={<InternshipList />}
      />

      <Route
        path="/subscriptions"
        element={<Subscriptions />}
      />

    </Routes>
  );
}

export default App;