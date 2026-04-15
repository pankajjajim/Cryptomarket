import React from "react";
import { NavLink } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext.jsx";

function linkClass({ isActive }) {
  return isActive
    ? "text-white font-semibold"
    : "text-gray-300 hover:text-blue-400";
}

export default function Navbar() {
  const { isAuthenticated, logout, user } = useAuth();

  return (
    <nav className="bg-black shadow-md">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex justify-between items-center h-16">
          <NavLink to="/" className="flex items-center space-x-2">
            <img
              src="https://dappgambl.com/wp-content/uploads/2023/04/crypto-market.jpg"
              alt="Logo"
              className="h-8 w-8 object-cover rounded-full"
            />
            <span className="text-xl font-bold text-blue-600">
              Crypto Market
            </span>
          </NavLink>

          <div className="hidden md:flex space-x-6 font-medium">
            <NavLink to="/" className={linkClass}>
              Top
            </NavLink>
            <NavLink to="/trending" className={linkClass}>
              Trending
            </NavLink>
            <NavLink to="/most-visited" className={linkClass}>
              Most Visited
            </NavLink>
            <NavLink to="/new" className={linkClass}>
              New
            </NavLink>
            <NavLink to="/gainers" className={linkClass}>
              Gainers
            </NavLink>
          </div>

          <div className="hidden md:flex items-center gap-3">
            {isAuthenticated ? (
              <>
                <span className="text-sm text-gray-300">
                  Welcome, {user?.email?.split("@")[0] || "User"}
                </span>
                <button
                  onClick={logout}
                  className="px-3 py-1.5 text-sm font-medium rounded-md text-gray-200 border border-gray-700 hover:bg-gray-800"
                >
                  Logout
                </button>
              </>
            ) : (
              <>
                <NavLink
                  to="/login"
                  className="px-3 py-1.5 text-sm font-medium rounded-md text-gray-200 border border-gray-700 hover:bg-gray-800"
                >
                  Login
                </NavLink>
                <NavLink
                  to="/register"
                  className="px-3 py-1.5 text-sm font-semibold rounded-md bg-blue-600 text-white hover:bg-blue-700"
                >
                  Register
                </NavLink>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
