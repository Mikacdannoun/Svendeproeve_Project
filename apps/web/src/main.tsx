import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route} from "react-router-dom";
import AthletesPage from "./pages/AthletesPage";
import AthleteDashboardPage from "./pages/AthleteDashboardPage";
import "./index.css";
import { AuthProvider } from "./auth/AuthContext";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import MyDashboardPage from "./pages/MyDashboardPage";
import SessionDetailPage from "./pages/SessionDetailPage";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<AthletesPage />} />
          <Route path="/athletes/:id" element={<AthleteDashboardPage />} />

          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/dashboard" element={<MyDashboardPage />} />
          <Route path="/sessions/:sessionId" element={<SessionDetailPage />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
)