import React, { createContext, useContext, useState, useEffect } from "react";

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem("token"));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (token) {
      fetch("/api/verify", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
        .then((res) => res.json().catch(() => ({})))
        .then((data) => {
          if (data.user) {
            setUser(data.user);
          } else {
            localStorage.removeItem("token");
            setToken(null);
          }
        })
        .catch(() => {
          localStorage.removeItem("token");
          setToken(null);
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [token]);

  const login = async (email, password) => {
    try {
      const response = await fetch("/api/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json().catch(() => ({}));

      if (response.ok) {
        setToken(data.token);
        localStorage.setItem("token", data.token);
        setUser({ email });
        return { success: true };
      }
      return {
        success: false,
        error: data.error || "Login failed",
      };
    } catch {
      return {
        success: false,
        error:
          "Network error — API server unreachable. Use npm run dev so the backend runs on port 8080.",
      };
    }
  };

  const register = async (username, email, password) => {
    try {
      const response = await fetch("/api/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username, email, password }),
      });

      const data = await response.json().catch(() => ({}));

      if (response.ok) {
        return { success: true };
      }
      return { success: false, error: data.error || "Registration failed" };
    } catch {
      return {
        success: false,
        error:
          "Network error — API server unreachable. Use npm run dev so the backend runs on port 8080.",
      };
    }
  };

  const buyCrypto = async (cryptoType, amount, price) => {
    try {
      const response = await fetch("/api/buy", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ cryptoType, amount, price }),
      });

      const data = await response.json().catch(() => ({}));

      if (response.ok) {
        return { success: true };
      }
      return { success: false, error: data.error || "Purchase failed" };
    } catch {
      return {
        success: false,
        error:
          "Network error — API server unreachable. Use npm run dev so the backend runs on port 8080.",
      };
    }
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem("token");
  };

  const value = {
    user,
    token,
    loading,
    login,
    register,
    buyCrypto,
    logout,
    isAuthenticated: !!user,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
