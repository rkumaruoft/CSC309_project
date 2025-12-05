import {
    LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer,
    PieChart, Pie, Cell
} from "recharts";
import { useEffect, useState } from "react";

const VITE_BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:3000";

export default function ManagerDashboard() {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function load() {
            const token = localStorage.getItem("token");

            const res = await fetch(`${VITE_BACKEND_URL}/analytics/manager`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (!res.ok) {
                console.error("Analytics failed:", await res.text());
                setLoading(false);
                return;
            }

            const data = await res.json();
            setStats(data);
            setLoading(false);
        }

        load();
    }, []);

    if (loading || !stats) {
        return <div className="container mt-4">Loading analytics...</div>;
    }

    /* ---------------------------------------------------------
       DESTRUCTURED ANALYTICS
       --------------------------------------------------------- */

    const {
        totalUsers,
        totalTransactions,
        pointsIssued,
        pointsRedeemed,
        activePromotions,
        monthlyTx,
        roleDist,
        latestTransactions,
        promosEndingSoon
    } = stats;

    const COLORS = ["#0088FE", "#FF8042", "#00C49F", "#FFBB28"];

    /* ---------------------------------------------------------
       RENDER
       --------------------------------------------------------- */

    return (
        <div className="container mt-4">

            <h2 className="mb-4">Bananalytics</h2>

            {/* SUMMARY CARDS */}
            <div className="row g-3">
                {[
                    ["Total Users", totalUsers],
                    ["Total Transactions", totalTransactions],
                    ["Points Issued", pointsIssued],
                    ["Active Promotions", activePromotions]
                ].map(([title, value]) => (
                    <div key={title} className="col-md-3">
                        <div className="card text-center shadow-sm">
                            <div className="card-body">
                                <h6 className="text-muted">{title}</h6>
                                <h3>{value}</h3>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* CHARTS */}
            <div className="row mt-4 g-4">

                {/* Monthly Transactions */}
                <div className="col-lg-8">
                    <div className="card shadow-sm">
                        <div className="card-header bg-primary text-white">
                            Monthly Transactions
                        </div>
                        <div className="card-body">
                            <ResponsiveContainer width="100%" height={250}>
                                <LineChart data={monthlyTx}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="month" />
                                    <YAxis />
                                    <Tooltip />
                                    <Line type="monotone" dataKey="count" stroke="#007bff" strokeWidth={3} />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>

                {/* User Roles Pie */}
                <div className="col-lg-4">
                    <div className="card shadow-sm">
                        <div className="card-header bg-secondary text-white">
                            User Roles
                        </div>
                        <div className="card-body">
                            <ResponsiveContainer width="100%" height={250}>
                                <PieChart>
                                    <Pie
                                        data={Object.entries(roleDist).map(([role, count]) => ({
                                            role,
                                            value: count
                                        }))}
                                        dataKey="value"
                                        nameKey="role"
                                        outerRadius={80}
                                        paddingAngle={5}
                                    >
                                        {Object.keys(roleDist).map((_, i) => (
                                            <Cell key={i} fill={COLORS[i % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>
            </div>

            <div className="row mt-4 g-4">

                {/* Recent Transactions */}
                <div className="col-lg-6">
                    <div className="card shadow-sm h-100">
                        <div className="card-header bg-dark text-white">
                            Recent Transactions
                        </div>
                        <table className="table mb-0">
                            <thead className="table-light">
                                <tr>
                                    <th>User</th>
                                    <th>Type</th>
                                    <th>Points</th>
                                    <th>Date</th>
                                </tr>
                            </thead>
                            <tbody>
                                {latestTransactions.map(tx => (
                                    <tr key={tx.id}>
                                        <td>{tx.user.name || tx.user.utorid}</td>
                                        <td>{tx.type}</td>
                                        <td>{tx.amount}</td>
                                        <td>{new Date(tx.createdAt).toLocaleString()}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Promotions Ending Soon */}
                <div className="col-lg-6">
                    <div className="card shadow-sm h-100">
                        <div className="card-header bg-warning text-dark">
                            Promotions Ending Soon
                        </div>
                        <table className="table mb-0">
                            <thead className="table-light">
                                <tr>
                                    <th>Name</th>
                                    <th>Type</th>
                                    <th>Ends</th>
                                </tr>
                            </thead>
                            <tbody>
                                {promosEndingSoon.map(promo => (
                                    <tr key={promo.id}>
                                        <td>{promo.name}</td>
                                        <td>{promo.type}</td>
                                        <td>{new Date(promo.endTime).toLocaleString()}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

            </div>



        </div>
    );
}
