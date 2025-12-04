import { Routes, Route, Navigate } from "react-router-dom";
import Layout from "./layout/Layout.jsx";
import { useAuth } from "./contexts/AuthContext";

import Login from "./pages/Login";
import Register from "./pages/Register";
import RegularUserDashboard from "./pages/RegularUserDashboard.jsx";
import Transfers from "./pages/Transfers";
import Promotions from "./pages/Promotions.jsx";
import Transactions from "./pages/Transactions.jsx";
import Redemption from "./pages/Redemption.jsx";
import AvailableEvents from "./pages/AvailableEvents.jsx";
import OrganizedEvents from "./pages/OrganizedEvents.jsx";
import ManageEvents from "./pages/ManageEvents.jsx";
import RequireRole from "./components/RequireRole.jsx";
import CashierTransactions from "./pages/CashierTransactions.jsx";
import CashierRedemptions from "./pages/CashierRedemptions.jsx";
import Verify from "./pages/Verify.jsx";
import Profile from "./pages/Profile.jsx";
import ManageUsers from "./pages/ManageUsers.jsx";
import ProfileQrModal from "./components/ProfileQrModal.jsx";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import ManagePromotions from "./pages/ManagePromotions.jsx";
import ManagerDashboard from "./pages/ManagerDashboard.jsx";

export default function App() {
    const { initialized } = useAuth();

    if (!initialized) {
        return <div className="container mt-4">Loading...</div>;
    }

    return (
        <>
            <Routes>

                {/* --------------------------------------------------------
                   PUBLIC ROUTES (No Auth Required)
                --------------------------------------------------------- */}
                <Route path="/login" element={<Layout><Login /></Layout>} />
                <Route path="/register" element={<Layout><Register /></Layout>} />
                <Route path="/forgot-password" element={<Layout><ForgotPassword /></Layout>} />
                <Route path="/reset-password" element={<Layout><ResetPassword /></Layout>} />
                <Route path="/verify" element={<Layout><Verify /></Layout>} />

                {/* --------------------------------------------------------
                   AUTHENTICATED ROUTES (ALL LOGGED-IN USERS)
                   Roles: regular, cashier, manager, superuser
                --------------------------------------------------------- */}
                <Route element={<RequireRole allowedRoles={["regular", "cashier", "manager", "superuser"]} />}>
                    <Route path="/dashboard" element={<Layout><RegularUserDashboard /></Layout>} />
                    <Route path="/transfers" element={<Layout><Transfers /></Layout>} />
                    <Route path="/events" element={<Layout><AvailableEvents /></Layout>} />
                    <Route path="/events/myEvents" element={<Layout><OrganizedEvents /></Layout>}/>
                    <Route path="/promotions" element={<Layout><Promotions /></Layout>} />
                    <Route path="/profile" element={<Layout><Profile /></Layout>} />
                </Route>

                {/* --------------------------------------------------------
                   REGULAR USERS ONLY
                --------------------------------------------------------- */}
                <Route element={<RequireRole allowedRoles={["regular"]} />}>
                    <Route path="/transactions" element={<Layout><Transactions /></Layout>} />
                    <Route path="/redemption" element={<Layout><Redemption /></Layout>} />
                </Route>

                {/* --------------------------------------------------------
                   CASHIERS ONLY
                --------------------------------------------------------- */}
                <Route element={<RequireRole allowedRoles={["cashier"]} />}>
                    <Route path="/cashier/transactions" element={<Layout><CashierTransactions /></Layout>} />
                    <Route path="/cashier/redemption" element={<Layout><CashierRedemptions /></Layout>} />
                </Route>

                {/* --------------------------------------------------------
                   MANAGERS + SUPERUSERS ONLY
                --------------------------------------------------------- */}
                <Route element={<RequireRole allowedRoles={["manager", "superuser"]} />}>
                    <Route path="/managerDashboard" element={<Layout><ManagerDashboard /></Layout>} />
                    <Route path="/manageUsers" element={<Layout><ManageUsers /></Layout>} />
                    <Route path="/managePromotions" element={<Layout><ManagePromotions /></Layout>} />
                    <Route path="/events/manage" element={<Layout><ManageEvents /></Layout>}/>
                </Route>

                {/* --------------------------------------------------------
                   DEFAULT ROUTES
                --------------------------------------------------------- */}
                <Route path="/" element={<Navigate to="/login" replace />} />
                <Route path="*" element={<h2 className="container mt-4">Page Not Found</h2>} />

            </Routes>

            {/* Global QR modal (always mounted) */}
            <ProfileQrModal />
        </>
    );
}
