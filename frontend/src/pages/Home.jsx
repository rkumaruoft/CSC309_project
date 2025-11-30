// TODO: Create different landing pages for each role based on the rubric.

import { useEffect, useState } from "react";
import { Button } from "react-bootstrap";
import { useNavigate, Link } from "react-router-dom";
import { findAvatar } from "./Profile";
import { useAuth } from "../contexts/AuthContext";

export default function Home() {
    const { user, showQrModal } = useAuth();
    const navigate = useNavigate();

    const [promos, setPromos] = useState([]);
    const [recentTxs, setRecentTxs] = useState([]);
    
    useEffect(() => {
        const token = localStorage.getItem("token");
        const VITE_BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:3000";
        const authHeaders = token ? { Authorization: `Bearer ${token}` } : {};

        async function fetchPromos() {
            try {
                const res = await fetch(`${VITE_BACKEND_URL}/promotions?page=1&limit=3`, {
                    headers: authHeaders
                });
                if (res.ok) {
                    const data = await res.json();
                    const sorted = [...(data.results || [])]
                        .sort((a, b) => new Date(a.endTime) - new Date(b.endTime));
                    setPromos(sorted.slice(0, 3));
                } else {
                    setPromos([]);
                }
            } catch {
                setPromos([]);
            }
        }

        async function fetchRecentTxs() {
            try {
                const res = await fetch(`${VITE_BACKEND_URL}/users/me/transactions?page=1&limit=5`, {
                    headers: authHeaders
                });
                if (res.ok) {
                    const data = await res.json();
                    setRecentTxs(data.results || []);
                } else {
                    setRecentTxs([]);
                }
            } catch {
                setRecentTxs([]);
            }
        }

        fetchPromos();
        fetchRecentTxs();
    }, []);

    // Redirect if not logged in
    useEffect(() => {
        const token = localStorage.getItem("token");
        const devUser = import.meta.env.DEV && localStorage.getItem("user");
        if (!token && !devUser) navigate("/login");
    }, [navigate, user]);

    const displayUser = user || {};

    return (
        <div className="container mt-4">

            {/* HERO SECTION */}
            <div className="p-4 mb-4 bg-light rounded shadow-sm">
                <h1 className="fw-bold mb-1">
                    Welcome back, {displayUser.name?.split(" ")[0] || displayUser.utorid}!
                </h1>
                <p className="text-muted mb-0">
                    Here's what's happening with your BananaCreds today.
                </p>
            </div>

            {/* USER SUMMARY CARD */}
            <div className="card mb-4 shadow-sm">
                <div className="card-body">

                    <div className="d-flex align-items-center">

                        {/* Avatar (restricted size) */}
                        <div
                            className="rounded-circle overflow-hidden border"
                            style={{
                                width: "80px",
                                height: "80px",
                                minWidth: "80px",
                                minHeight: "80px",
                                background: "#f0f0f0"
                            }}
                        >
                            <img
                                src={findAvatar(displayUser)}
                                alt="avatar"
                                className="w-100 h-100"
                                style={{ objectFit: "cover" }}
                            />
                        </div>

                        {/* User Info */}
                        <div className="ms-3">
                            <h4 className="mb-0">{displayUser.name || displayUser.utorid}</h4>
                            <small className="text-muted">{displayUser.email ?? ""}</small>
                        </div>

                        {/* Points */}
                        <div className="ms-auto text-end">
                            <h2 className="fw-bold mb-0">{displayUser.points ?? 0}</h2>
                            <small className="text-muted">Points</small>
                        </div>

                    </div>

                    {/* Action Buttons */}
                    <div className="mt-4 d-flex gap-3 flex-wrap">
                        <Button variant="dark" onClick={showQrModal}>
                            My QR Code
                        </Button>

                        <Button
                            variant="outline-dark"
                            onClick={() => navigate("/redemption")}
                        >
                            Redeem
                        </Button>

                        <Button
                            variant="outline-secondary"
                            onClick={() => navigate("/transfers")}
                        >
                            Transfers
                        </Button>
                    </div>
                </div>
            </div>

            {/* PROMOTIONS & TRANSACTIONS */}
            <div className="row g-4">

                {/* PROMOTIONS */}
                <div className="col-md-6">
                    <div className="card shadow-sm h-100">
                        <div className="card-body">
                            <div className="d-flex justify-content-between align-items-center">
                                <h5 className="mb-0 fw-bold">Promotions</h5>
                                <Link to="/promotions" className="small">
                                    View all
                                </Link>
                            </div>
                            <hr />

                            {promos.length === 0 ? (
                                <p className="text-muted mb-0">No promotions available.</p>
                            ) : (
                                promos.map((p) => (
                                    <div key={p.id} className="mb-3">
                                        <div className="fw-semibold">{p.name}</div>
                                        <small className="text-muted">
                                            Ends: {p.endTime ? new Date(p.endTime).toDateString() : "—"}
                                        </small>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>

                {/* RECENT TRANSACTIONS */}
                <div className="col-md-6">
                    <div className="card shadow-sm h-100">
                        <div className="card-body">
                            <div className="d-flex justify-content-between align-items-center">
                                <h5 className="mb-0 fw-bold">Recent Transactions</h5>
                                <Link to="/transactions" className="small">
                                    View all
                                </Link>
                            </div>
                            <hr />

                            {recentTxs.length === 0 ? (
                                <p className="text-muted mb-0">No recent transactions.</p>
                            ) : (
                                recentTxs.map((t) => (
                                    <div key={t.id} className="mb-3">
                                        <div className="d-flex justify-content-between">
                                            <span className="fw-semibold">{t.type}</span>
                                            <span className="fw-semibold">
                                                {t.amount} pts
                                            </span>
                                        </div>
                                        <small className="text-muted">
                                            Related: {t.relatedId ?? t.relatedUtorid ?? "-"}
                                        </small>
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
