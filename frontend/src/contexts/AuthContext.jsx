import React, { createContext, useContext, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

const AuthContext = createContext(null);
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

export const AuthProvider = ({ children }) => {
    const navigate = useNavigate();
    const [user, setUser] = useState(null);

   
    // Helper to fetch the profile for a token and set context + localStorage
    async function fetchProfile(token) {
        const res = await fetch(`${BACKEND_URL}/users/me`, {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) throw new Error('Failed to retrieve user profile');
        const userData = await res.json();
        setUser(userData);
        localStorage.setItem('user', JSON.stringify(userData));
        return userData;
    }

    // ---------------- DEV AUTO LOGIN ----------------
    useEffect(() => {
        (async () => {
            const token = localStorage.getItem("token");

            if (token) {
                try {
                    await fetchProfile(token);
                    return;
                } catch (e) {
                    localStorage.removeItem('token');
                    setUser(null);
                    return;
                }
            }

            // No token path
                if (import.meta.env.DEV) {
                    // Try to perform a quick DEV login using seeded credentials
                    try {
                        const loginRes = await fetch(`${BACKEND_URL}/auth/tokens`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ utorid: 'regular1', password: 'Password123!' })
                        });

                        if (loginRes.ok) {
                            const loginData = await loginRes.json();
                            localStorage.setItem('token', loginData.token);
                            try {
                                await fetchProfile(loginData.token);
                                return;
                            } catch (e) {
                                // failed to fetch profile after login; fall through
                            }
                        }
                    } catch (e) {
                        // ignore and fall back to stored user
                    }

                // If login failed, fall back to any stored local user
                try {
                    const stored = localStorage.getItem("user");
                    if (stored) {
                        setUser(JSON.parse(stored));
                        return;
                    }
                } catch (e) {
                    // ignore
                }
            }

            setUser(null);
        })();
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
        <AuthContext.Provider value={{ user, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
