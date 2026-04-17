"use client";

import { createContext, useContext, useState, useCallback, useEffect } from "react";
import { registerUser, loginUser, loadPortfolio, savePortfolio } from "../lib/googleSheetsApi";
import { ThemeProvider } from "@/contexts/ThemeProvider";

// ✅ Auth Context
const AuthContext = createContext(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
};

function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [portfolio, setPortfolio] = useState(null);
  const [loading, setLoading] = useState(true);

  const login = useCallback(async (userId, password) => {
    try {
      const response = await fetch(process.env.NEXT_PUBLIC_APPS_SCRIPT_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "login", userId, password }),
      });
      const data = await response.json();
      if (data.success) {
        setUser(data.user);
        localStorage.setItem("mutualtrack_user", JSON.stringify(data.user));
        return data.user;
      }
      throw new Error(data.error || "Login failed");
    } catch (err) {
      throw err;
    }
  }, []);

  const register = useCallback(async (userId, dob, password) => {
    try {
      const response = await fetch(process.env.NEXT_PUBLIC_APPS_SCRIPT_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "register", userId, dob, password }),
      });
      const data = await response.json();
      if (data.success) return data.user;
      throw new Error(data.error || "Registration failed");
    } catch (err) {
      throw err;
    }
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    setPortfolio(null);
    localStorage.removeItem("mutualtrack_user");
  }, []);

  useEffect(() => {
    const saved = localStorage.getItem("mutualtrack_user");
    if (saved) {
      try {
        const userData = JSON.parse(saved);
        setUser(userData);
        loadPortfolio(userData.userId).then(setPortfolio).catch(() => {});
      } catch (e) {
        localStorage.removeItem("mutualtrack_user");
      }
    }
    setLoading(false);
  }, []);

  const value = { user, portfolio, login, register, logout, loading };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// ✅ Combined Providers: Theme WRAPS Auth
export function Providers({ children }) {
  return (
    <ThemeProvider>
      <AuthProvider>
        {children}
      </AuthProvider>
    </ThemeProvider>
  );
}

export default Providers;