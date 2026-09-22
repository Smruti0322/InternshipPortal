import { Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import Register from "./pages/Register";
import Login from "./pages/Login";
import ResumeBuilder from "./pages/ResumeBuilder";
import MyResumes from "./pages/MyResumes";
import ViewResume from "./pages/ViewResume";

function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/register" element={<Register />} />
      <Route path="/login" element={<Login />} />
      <Route path="/resume-builder" element={<ResumeBuilder />} />
      <Route
        path="/my-resumes"
        element={<MyResumes />}
      />
      <Route
        path="/view-resume/:id"
        element={<ViewResume />}
      />
    </Routes>
    
  );
}

export default App;