import { useEffect, useState } from "react";
import { Button } from "react-bootstrap";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import findAvatar from "../utils/findAvatar";

export default function CashierDashboard() {
    const { user, showQrModal } = useAuth();
    const navigate = useNavigate();

    const [promos, setPromos] = useState([]);
    const [recentTxs, setRecentTxs] = useState([]);

    const VITE_BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:3000";

    useEffect(() => {
        const token = localStorage.getItem("token");
        const headers = token ? { Authorization: `Bearer ${token}` } : {};

        async function fetchPromos() {
            try {
                const res = await fetch(
                    `${VITE_BACKEND_URL}/promotions?page=1&limit=3`,
                    { headers }
                );
                if (!res.ok) return setPromos([]);

                const data = await res.json();
                const sorted = [...(data.results || [])].sort(
                    (a, b) => new Date(a.endTime) - new Date(b.endTime)
                );
                setPromos(sorted.slice(0, 3));
            } catch {
                setPromos([]);
            }
        }

        async function fetchRecentTxs() {
            try {
                // Cashier dashboard shows latest transactions system-wide
                const res = await fetch(
                    `${VITE_BACKEND_URL}/transactions?page=1&limit=5`,
                    { headers }
                );
                if (!res.ok) return setRecentTxs([]);

                const data = await res.json();
                setRecentTxs(data.results || []);
            } catch {
                setRecentTxs([]);
            }
        }

        fetchPromos();
        fetchRecentTxs();
    }, []);

    useEffect(() => {
        const token = localStorage.getItem("token");
        const devUser = import.meta.env.DEV && localStorage.getItem("user");

        if (!token && !devUser) navigate("/login");
    }, [navigate, user]);

    const displayUser = user || {};

    return (
        <div className="container py-4">
            <div className="p-4 mb-4 bg-light text-dark rounded shadow-sm">
                <h1 className="fw-bold mb-1">Cashier Dashboard</h1>
                <p className="text-dark mb-0">Quick actions and recent activity for cashiers.</p>
            </div>

            <div className="row g-4">

                <div className="col-lg-4 col-md-5">
                    <div className="card shadow-sm mb-4">
                        <div className="card-body">

                            <div className="d-flex align-items-center">
                                <div
                                    className="rounded-circle overflow-hidden bg-light"
                                    style={{ width: 80, height: 80 }}
                                >
                                    <img
                                        src={findAvatar(displayUser, VITE_BACKEND_URL)}
                                        alt="avatar"
                                        className="w-100 h-100"
                                        style={{ objectFit: "cover" }}
                                    />
                                </div>

                                <div className="ms-3">
                                    <h4 className="mb-0">{displayUser.name || displayUser.utorid}</h4>
                                    <small className="text-muted">{displayUser.email ?? ""}</small>
                                </div>

                                <div className="ms-auto text-end">
                                    <h2 className="fw-bold mb-0">{displayUser.points ?? 0}</h2>
                                    <small className="text-muted">Points</small>
                                </div>
                            </div>

                            <div className="mt-4 d-flex flex-column gap-2">
                                <Button variant="primary" onClick={() => navigate("/cashier/transactions")}>Create Transaction</Button>
                                <Button variant="outline-primary" onClick={() => navigate("/cashier/redemption")}>Process Redemption</Button>
                                <Button variant="outline-dark" onClick={showQrModal}>Scan / My QR</Button>
                            </div>

                        </div>
                    </div>
                </div>

                <div className="col-lg-8 col-md-7">

                    <div className="card shadow-sm mb-4">
                        <div className="card-body">
                            <div className="d-flex justify-content-between">
                                <h5 className="fw-bold mb-0">Active Promotions</h5>
                                <Link to="/promotions" className="small">View all</Link>
                            </div>
                            <hr />

                            {promos.length === 0 ? (
                                <p className="text-muted mb-0">No promotions available.</p>
                            ) : (
                                promos.map((p) => (
                                    <div key={p.id} className="mb-3">
                                        <div className="fw-semibold">{p.name}</div>
                                        <small className="text-muted">Ends: {new Date(p.endTime).toDateString()}</small>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    <div className="card shadow-sm">
                        <div className="card-body">
                            <div className="d-flex justify-content-between">
                                <h5 className="fw-bold mb-0">Recent Transactions</h5>
                                <Link to="/cashier/transactions" className="small">View all</Link>
                            </div>
                            <hr />

                            {recentTxs.length === 0 ? (
                                <p className="text-muted mb-0">No recent transactions.</p>
                            ) : (
                                recentTxs.map((t) => (
                                    <div key={t.id} className="mb-3">
                                        <div className="d-flex justify-content-between">
                                            <span className="fw-semibold">{t.type}</span>
                                            <span className="fw-semibold">{t.amount} pts</span>
                                        </div>
                                        <small className="text-muted">User: {t.user?.utorid ?? t.relatedUtorid ?? "-"}</small>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
}
