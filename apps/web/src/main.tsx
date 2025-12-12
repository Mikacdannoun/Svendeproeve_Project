import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route, Navigate} from "react-router-dom";
import AthletesPage from "./pages/AthletesPage";
import AthleteDashboardPage from "./pages/AthleteDashboardPage";
import "./index.css";
import { AuthProvider } from "./auth/AuthContext";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import MyDashboardPage from "./pages/MyDashboardPage";
import SessionDetailPage from "./pages/SessionDetailPage";
import MyStatsPage from "./pages/MyStatsPage";
import { useAuth } from "./auth/AuthContext";

function HomeRedirect() {
  const { user, loading } = useAuth();

  if (loading) return null; // or a loader
  return user ? <Navigate to="/dashboard" replace /> : <Navigate to="/login" replace />;
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          
          <Route path="/" element={<HomeRedirect />} />
          <Route path="/athletes" element={<AthletesPage />} />
          <Route path="/athletes/:id" element={<AthleteDashboardPage />} />

          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/dashboard" element={<MyDashboardPage />} />
          <Route path="/sessions/:sessionId" element={<SessionDetailPage />} />
          <Route path="/my/stats" element={<MyStatsPage  />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
)