import React from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext.jsx";
import Navbar from "./components/Navbar.jsx";
import CryptoListPage from "./pages/CryptoListPage.jsx";
import LoginPage from "./pages/LoginPage.jsx";
import RegisterPage from "./pages/RegisterPage.jsx";

export default function App() {
  return (
    <AuthProvider>
      <div className="min-h-screen bg-black text-gray-100">
        <Navbar />
        <Routes>
          <Route path="/" element={<CryptoListPage variant="top" />} />
          <Route
            path="/trending"
            element={<CryptoListPage variant="trending" />}
          />
          <Route
            path="/most-visited"
            element={<CryptoListPage variant="mostVisited" />}
          />
          <Route path="/new" element={<CryptoListPage variant="new" />} />
          <Route
            path="/gainers"
            element={<CryptoListPage variant="gainers" />}
          />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </AuthProvider>
  );
}
