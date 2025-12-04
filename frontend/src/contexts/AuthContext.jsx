import React, { createContext, useContext, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

const AuthContext = createContext(null);

// Always fallback to local backend when env is missing
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:3000";

export const AuthProvider = ({ children }) => {
    const navigate = useNavigate();

    const [user, setUser] = useState(null);
    const [currentRole, setCurrentRole] = useState(null);
    const [initialized, setInitialized] = useState(false);
    const [showQr, setShowQr] = useState(false);
    const showQrModal = () => setShowQr(true);
    const hideQrModal = () => setShowQr(false);


    // ----------------------------------------------------
    // FAST, SAFE AUTO-LOGIN ON PAGE LOAD
    // ----------------------------------------------------
    useEffect(() => {
        const token = localStorage.getItem("token");

        // No token = unauthenticated
        if (!token) {
            setUser(null);
            setInitialized(true);
            return;
        }

        // Fetch /users/me to validate token
        (async () => {
            try {
                const res = await fetch(`${BACKEND_URL}/users/me`, {
                    headers: { Authorization: `Bearer ${token}` },
                });

                if (!res.ok) {
                    // Token invalid
                    localStorage.removeItem("token");
                    localStorage.removeItem("user");
                    localStorage.removeItem("currentRole");
                    setUser(null);
                    setInitialized(true);
                    return;
                }

                const data = await res.json();
                setUser(data);

                // role initialization
                const persistent = localStorage.getItem("currentRole");
                const roleToUse = persistent || data.role || "regular";

                setCurrentRole(roleToUse);
                localStorage.setItem("currentRole", roleToUse);
                localStorage.setItem("user", JSON.stringify(data));
            } catch {
                // Network issue → logout for safety
                localStorage.removeItem("token");
            }

            setInitialized(true);
        })();
    }, []);

    // ----------------------------------------------------
    // REFRESH PROFILE (after updates)
    // ----------------------------------------------------
    const refreshUser = async () => {
        const token = localStorage.getItem("token");
        if (!token) return null;

        try {
            const res = await fetch(`${BACKEND_URL}/users/me`, {
                headers: { Authorization: `Bearer ${token}` },
            });

            if (!res.ok) {
                logout();
                return null;
            }

            const data = await res.json();
            setUser(data);
            localStorage.setItem("user", JSON.stringify(data));
            return data;
        } catch {
            return null;
        }
    };

    // ----------------------------------------------------
    // LOGIN
    // ----------------------------------------------------
    const login = async (utorid, password) => {
        try {
            const res = await fetch(`${BACKEND_URL}/auth/tokens`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ utorid, password }),
            });

            const data = await res.json();

            // ACCOUNT NOT VERIFIED
            if (
                res.status === 403 &&
                (data.error === "Account not verified" || data.message === "Account not verified")
            ) {
                return { unverified: true, utorid };
            }

            // OTHER LOGIN ERRORS
            if (!res.ok) {
                return data.message || data.error || "Login failed.";
            }

            // SAVE TOKEN
            localStorage.setItem("token", data.token);

            // FETCH PROFILE
            const meRes = await fetch(`${BACKEND_URL}/users/me`, {
                headers: { Authorization: `Bearer ${data.token}` },
            });

            if (!meRes.ok) return "Failed to retrieve user profile.";

            const userData = await meRes.json();
            setUser(userData);

            // Initialize role
            const role = userData.role || "regular";
            setCurrentRole(role);
            localStorage.setItem("currentRole", role);
            localStorage.setItem("user", JSON.stringify(userData));

            // role-based navigation
            if (role === "manager" || role === "superuser") {
                Promise.resolve().then(() => navigate("/managerDashboard"));
            } else if (role === "cashier") {
                Promise.resolve().then(() => navigate("/cashierDashboard"));
            } else {
                Promise.resolve().then(() => navigate("/dashboard"));
            }

            return null;
        } catch (e) {
            return "Network error: " + e.message;
        }
    };

    // ----------------------------------------------------
    // LOGOUT
    // ----------------------------------------------------
    const logout = () => {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        localStorage.removeItem("currentRole");

        setUser(null);
        setCurrentRole(null);
        setShowQr(false);

        navigate("/");
    };

    // ----------------------------------------------------
    // COMPUTE ALLOWED INTERFACE ROLES
    // ----------------------------------------------------
    const computeAvailableRoles = (u) => {
        if (!u) return ["regular"];

        const organizer = u.organizer || u.isEventOrganizer;

        if (u.role === "superuser")
            return ["regular", "cashier", "manager", "superuser", ...(organizer ? ["organizer"] : [])];

        if (u.role === "manager")
            return ["regular", "cashier", "manager", ...(organizer ? ["organizer"] : [])];

        if (u.role === "cashier") return ["regular", "cashier"];

        if (u.role === "organizer") return ["regular", "organizer"];

        return ["regular"];
    };

    const availableRoles = computeAvailableRoles(user || {});

    // ----------------------------------------------------
    // SWITCH INTERFACE ROLE
    // ----------------------------------------------------
    const switchRole = (role) => {
        if (!availableRoles.includes(role)) return;

        // If the account is a superuser and the user selected the 'manager
        // interface from the dropdown, prefer switching them into the
        // `superuser` interface so they get full superuser controls.
        let targetRole = role;
        if (role === "manager" && user && user.role === "superuser") {
            targetRole = "superuser";
        }

        // Save new interface role
        setCurrentRole(targetRole);
        localStorage.setItem("currentRole", targetRole);

        // Redirect ONLY when user intentionally switches interface
        if (targetRole === "manager" || targetRole === "superuser") {
            Promise.resolve().then(() => navigate("/managerDashboard"));
        } else if (targetRole === "cashier") {
            Promise.resolve().then(() => navigate("/cashierDashboard"));
        } else {
            Promise.resolve().then(() => navigate("/dashboard"));
        }
    };


    return (
        <AuthContext.Provider
            value={{
                user,
                initialized,
                login,
                logout,
                refreshUser,
                currentRole,
                availableRoles,
                switchRole,
                showQr,
                setShowQr,
                showQrModal,
                hideQrModal,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
