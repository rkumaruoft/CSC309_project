import React, { createContext, useContext, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

const AuthContext = createContext(null);
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

export const AuthProvider = ({ children }) => {
    const navigate = useNavigate();
    const [user, setUser] = useState(null);
    const [initialized, setInitialized] = useState(false);

    useEffect(() => {
        const token = localStorage.getItem("token");

        // DEV shortcut: when running locally we support bootstrapping from
        // `localStorage.user` either when there's no token or when the token
        // is a dev token of the form `dev:<utorid>`.
        if (import.meta.env.DEV && (!token || token?.startsWith('dev:'))) {
            const stored = localStorage.getItem("user");
            if (stored) {
                try {
                    setUser(JSON.parse(stored));
                    setInitialized(true);
                    return;
                } catch (e) {

                }
            }
        }

        // Non-DEV + no token => unauthenticated (finish bootstrap)
        if (!token) {
            setUser(null);
            setInitialized(true);
            return;
        }

        fetch(`${BACKEND_URL}/users/me`, {
            method: "GET",
            headers: {
                "Authorization": `Bearer ${token}`,
            },
        })
            .then(async (res) => {
                if (!res.ok) {
                    // Token invalid or expired
                    localStorage.removeItem("token");
                    setUser(null);
                    return;
                }
                const data = await res.json();
                setUser(data);
                localStorage.setItem("user", JSON.stringify(data));
            })
            .catch(() => {
                setUser(null);
                localStorage.removeItem("token");
            })
            .finally(() => {
                setInitialized(true);
            });
    }, []);

    // ---------------- LOGOUT ----------------
    const logout = () => {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        setUser(null);
        navigate("/");
    };

    // ---------------- LOGIN ----------------
    const login = async (utorid, password) => {
        try {
            const res = await fetch(`${BACKEND_URL}/auth/tokens`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ utorid, password }),
            });

            const data = await res.json();
            if (!res.ok) return data.message || data.error;

            localStorage.setItem("token", data.token);

            // Fetch user profile
            const meRes = await fetch(`${BACKEND_URL}/users/me`, {
                method: "GET",
                headers: {
                    "Authorization": `Bearer ${data.token}`,
                },
            });

            if (!meRes.ok) return "Failed to retrieve user profile.";
            const userData = await meRes.json();

            setUser(userData);
            localStorage.setItem("user", JSON.stringify(userData));

            navigate("/dashboard");
            return null;

        } catch (e) {
            return "Network error during login.";
        }
    };

    return (
        <AuthContext.Provider value={{ user, login, logout, initialized }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
