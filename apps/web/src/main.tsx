import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route} from "react-router-dom";
import AthletesPage from "./pages/AthletesPage";
import AthleteDashboardPage from "./pages/AthleteDashboardPage";
import "./index.css";


ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
    <Routes>
      <Route path="/" element={<AthletesPage />} />
      <Route path="/athletes/:id" element={<AthleteDashboardPage />} />
    </Routes>
    </BrowserRouter>
  </React.StrictMode>
)