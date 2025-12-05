import { useEffect, useState } from "react";
import { useAuth } from "../contexts/AuthContext.jsx";
import PaginationControls from "../components/PaginationControls";

const VITE_BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:3000";

export default function Transactions() {
  const [txs, setTxs] = useState(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  async function fetchPage(p) {
    setLoading(true);
    setError(null);

    if (p < 1 || (totalPages && p > totalPages)) {
      setLoading(false);
      return;
    }

    const token = localStorage.getItem("token");

    try {
      if (token) {
        // try to fetch authenticated transaction
        const res = await fetch(`/users/me/transactions?page=${p}&limit=10`, {
          headers: { Authorization: `Bearer ${token}` },
          credentials: "include"
        });

        const ct = res.headers.get("content-type") || "";
        if (res.ok && ct.includes("application/json")) {
          const data = await res.json();
          setTxs(data.results || []);
          setPage(p);
          setTotalPages(Math.max(1, Math.ceil(data.count / 10)));
          return;
        } else {
          const text = await res.text();
          console.warn("/users/me/transactions returned non-JSON or non-OK:", res.status, ct, text.slice ? text.slice(0, 400) : text);
          // fall through to empty results below
        }
      }

      // If not authenticated (no token) or fetch failed, show no transactions.
      setTxs([]);
      setPage(p);
      setTotalPages(1);

    } catch (err) {
      setError(err.message || String(err));
    } finally {
      setLoading(false);
    }
  }

  const { initialized } = useAuth();

  useEffect(() => {
    if (!initialized) return;
    fetchPage(1);
  }, [initialized]);
  return (
    <div className="container mt-4">
      <h1>Transactions</h1>

      {loading ? (
        <div className="mt-3">Loading...</div>
      ) : error ? (
        <div className="alert alert-danger mt-3">Error: {error}</div>
      ) : txs.length === 0 ? (
        <div className="text-muted">No transactions found.</div>
      ) : (
        <div>
          <ul className="list-group">
            {txs.map(t => (
              <li key={t.id} className="list-group-item d-flex justify-content-between align-items-start">
                <div>
                  <div className="fw-bold">{t.type}</div>
                  <div className="small text-muted">{t.relatedId ?? t.relatedUtorid ?? ''} — {t.createdAt ? new Date(t.createdAt).toLocaleString() : ''}</div>
                </div>
                <div className="text-end">
                  <div className="fw-semibold">{t.amount} pts</div>
                </div>
              </li>
            ))}
          </ul>

          <div className="d-flex justify-content-center gap-2 mt-3">
            <PaginationControls page={page} totalPages={totalPages} onPageChange={(p) => fetchPage(p)} disabled={loading} />
          </div>
        </div>
      )}
    </div>
  );
}
