import { createContext, useContext, useState, useEffect } from "react";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(() => {
        const saved = sessionStorage.getItem("user");
        return saved ? JSON.parse(saved) : null;
    });

    const login = async (email, password) => {
        const res = await fetch("http://localhost:5001/api/auth/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Login failed");

        setUser(data.user);
        sessionStorage.setItem("user", JSON.stringify(data.user));
        return data.user;
    };

    const signup = async (name, email, password) => {
        const res = await fetch("http://localhost:5001/api/auth/signup", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name, email, password }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Signup failed");
        return data;
    };

    const verifySignup = async (email, code) => {
        const res = await fetch("http://localhost:5001/api/auth/verify-signup", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, code }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Verification failed");

        setUser(data.user);
        sessionStorage.setItem("user", JSON.stringify(data.user));
        return data.user;
    };

    const logout = () => {
        setUser(null);
        sessionStorage.removeItem("user");
        // Clear preference-related local storage to avoid cross-user contamination
        localStorage.removeItem("selectedProducts");
        localStorage.removeItem("selectedYears");
        localStorage.removeItem("selectedVADs");
        localStorage.removeItem("metric");
        localStorage.removeItem("dashboardView");
        localStorage.removeItem("vadView");
        localStorage.removeItem("openSections");
        localStorage.removeItem("page");
        localStorage.removeItem("folderId");
    };

    const savePreferences = async (preferences) => {
        if (!user) return;
        const res = await fetch("http://localhost:5001/api/auth/preferences", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email: user.email, preferences }),
        });
        if (res.ok) {
            const updatedUser = { ...user, preferences };
            setUser(updatedUser);
            sessionStorage.setItem("user", JSON.stringify(updatedUser));
        }
    };

    const requestPasswordReset = async (email) => {
        const res = await fetch("http://localhost:5001/api/auth/forgot-password-request", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Request failed");
        return data;
    };

    const resetPassword = async (email, code, newPassword) => {
        const res = await fetch("http://localhost:5001/api/auth/reset-password", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, code, newPassword }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Reset failed");
        return data;
    };

    return (
        <AuthContext.Provider value={{ user, login, signup, verifySignup, logout, requestPasswordReset, resetPassword, savePreferences }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
