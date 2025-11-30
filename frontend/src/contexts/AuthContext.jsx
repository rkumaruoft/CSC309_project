import React, { createContext, useContext, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

const AuthContext = createContext(null);
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

export const AuthProvider = ({ children }) => {
    const navigate = useNavigate();
    const [user, setUser] = useState(null);
    const [currentRole, setCurrentRole] = useState(null);
    const [showQr, setShowQr] = useState(false);
    const [initialized, setInitialized] = useState(false);

    useEffect(() => {
        const token = localStorage.getItem("token");

        // DEV shortcut: when running locally in dev mode.
        if (import.meta.env.DEV && !token) {
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

        // Non-DEV + no token => unauthenticated
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
                // initialize currentRole from persisted value or from backend role
                const persisted = localStorage.getItem('currentRole');
                if (persisted) setCurrentRole(persisted);
                else setCurrentRole(data.role || 'regular');
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
        localStorage.removeItem("currentRole");
        setUser(null);
        setCurrentRole(null);
        setShowQr(false);
        navigate("/");
    };

    // ---------------- REFRESH USER ----------------
    const refreshUser = async () => {
        const token = localStorage.getItem("token");
        if (!token) {
            setUser(null);
            localStorage.removeItem("user");
            return null;
        }

        try {
            const res = await fetch(`${BACKEND_URL}/users/me`, {
                method: "GET",
                headers: { "Authorization": `Bearer ${token}` }
            });
            if (!res.ok) {
                localStorage.removeItem("token");
                setUser(null);
                localStorage.removeItem("user");
                return null;
            }
            const data = await res.json();
            setUser(data);
            // keep currentRole in sync (don't override if user previously switched)
            const persisted = localStorage.getItem('currentRole');
            if (!persisted) setCurrentRole(data.role || 'regular');
            localStorage.setItem("user", JSON.stringify(data));
            return data;
        } catch (e) {
            return null;
        }
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
            // set default current role on login
            setCurrentRole(userData.role || 'regular');
            localStorage.setItem('currentRole', userData.role || 'regular');
            localStorage.setItem("user", JSON.stringify(userData));

            navigate("/dashboard");
            return null;

        } catch (e) {
            return "Network error during login." + e.message;
        }
    };

    // compute available roles the user may switch to based on their backend role
    const computeAvailableRoles = (u) => {
        if (!u) return ['regular'];
        const hasOrganizer = u.organizer || u.isEventOrganizer || u.role === 'organizer';
        if (u.role === 'superuser') return ['regular', 'cashier', 'manager', 'superuser', ...(hasOrganizer ? ['organizer'] : [])];
        if (u.role === 'manager') return ['regular', 'cashier', 'manager', ...(hasOrganizer ? ['organizer'] : [])];
        if (u.role === 'cashier') return ['regular', 'cashier'];
        if (u.role === 'organizer') return ['regular', 'organizer'];
        return ['regular'];
    };

    const availableRoles = computeAvailableRoles(user || {});

    const switchRole = (role) => {
        if (!role) return;
        if (!availableRoles.includes(role)) return;
        setCurrentRole(role);
        try { localStorage.setItem('currentRole', role); } catch (e) { }
    };

    const showQrModal = () => setShowQr(true);
    const hideQrModal = () => setShowQr(false);

    return (
        <AuthContext.Provider value={{ user, login, logout, initialized, refreshUser, currentRole, availableRoles, switchRole, showQr, showQrModal, hideQrModal }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
