import { Routes, Route, Navigate } from "react-router-dom";
import Layout from "./layout/Layout.jsx";
import { useAuth } from "./contexts/AuthContext";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Home from "./pages/Home";
import Transfers from "./pages/Transfers";
import Promotions from "./pages/Promotions.jsx";
import Transactions from "./pages/Transactions.jsx";
import Redemption from "./pages/Redemption.jsx";
import RequireRole from "./components/RequireRole.jsx";
import CashierTransactions from "./pages/CashierTransactions.jsx";
import Verify from "./pages/Verify.jsx";
import CashierRedemptions from "./pages/CashierRedemptions.jsx";
import Profile from "./pages/Profile.jsx";
import ManageUsers from "./pages/ManageUsers.jsx";
import ProfileQrModal from "./components/ProfileQrModal.jsx";


export default function App() {
    const { initialized } = useAuth();

    if (!initialized) {
        return <div className="container mt-4">Loading...</div>;
    }

    return (
        <>
            {/* All routes */}
            <Routes>

                {/* LOGIN */}
                <Route
                    path="/login"
                    element={
                        <Layout>
                            <Login />
                        </Layout>
                    }
                />

                {/* REGISTER */}
                <Route
                    path="/register"
                    element={
                        <Layout>
                            <Register />
                        </Layout>
                    }
                />

                {/* Verify email */}
                <Route
                    path="/verify"
                    element={
                        <Layout>
                            <Verify />
                        </Layout>
                    }
                />

                {/* Authenticated pages */}
                <Route
                    path="/dashboard"
                    element={
                        <Layout>
                            <Home />
                        </Layout>
                    }
                />

                <Route
                    path="/transfers"
                    element={
                        <Layout>
                            <Transfers />
                        </Layout>
                    }
                />

                {/* Regular user transactions */}
                <Route element={<RequireRole allowedRoles={["regular"]} />}>
                    <Route
                        path="/transactions"
                        element={
                            <Layout>
                                <Transactions />
                            </Layout>
                        }
                    />
                </Route>

                {/* Cashier transactions */}
                <Route element={<RequireRole allowedRoles={["cashier"]} />}>
                    <Route
                        path="/cashier/transactions"
                        element={
                            <Layout>
                                <CashierTransactions />
                            </Layout>
                        }
                    />
                    <Route
                        path="/cashier/redemption"
                        element={
                            <Layout>
                                <CashierRedemptions />
                            </Layout>
                        }
                    />
                </Route>

                <Route
                    path="/promotions"
                    element={
                        <Layout>
                            <Promotions />
                        </Layout>
                    }
                />

                <Route
                    path="/redemption"
                    element={
                        <Layout>
                            <Redemption />
                        </Layout>
                    }
                />

                {/* Manager / Superuser pages */}
                <Route element={<RequireRole allowedRoles={["manager", "superuser"]} />}>
                    <Route
                        path="/manageUsers"
                        element={
                            <Layout>
                                <ManageUsers />
                            </Layout>
                        }
                    />
                </Route>

                <Route
                    path="/profile"
                    element={
                        <Layout>
                            <Profile />
                        </Layout>
                    }
                />

                {/* Default route */}
                <Route path="/" element={<Navigate to="/login" />} />

                {/* 404 */}
                <Route path="*" element={<h2>Page Not Found</h2>} />
            </Routes>

            {/* ⬇⬇ QR Modal mounted globally ⬇⬇ */}
            <ProfileQrModal />
        </>
    );
}
