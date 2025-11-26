import { useEffect, useState } from "react";

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
        // try to fetch authenticated transactions
        const res = await fetch(`/users/me/transactions?page=${p}&limit=10`, {
          headers: { Authorization: `Bearer ${token}` }
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
        }
      }

      // If not authenticated (no token) or fetch failed, use demo transactions
      const totalDemo = 12;
      const perPage = 10;
      const demo = [];
      const start = (p - 1) * perPage;
      const end = Math.min(totalDemo, start + perPage);
      for (let i = start; i < end; i++) {
        demo.push({ id: `demo-${i+1}`, type: i % 2 === 0 ? 'transfer' : 'redemption', amount: 10*(i+1), relatedId: 'demo_user', time: new Date(Date.now() - i*60000).toISOString() });
      }
      setTxs(demo);
      setPage(p);
      setTotalPages(Math.max(1, Math.ceil(totalDemo / perPage)));

    } catch (err) {
      setError(err.message || String(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchPage(1);
  }, []);
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
                  <div className="small text-muted">{t.relatedId ?? t.relatedUtorid ?? ''} — {t.time ? new Date(t.time).toLocaleString() : ''}</div>
                </div>
                <div className="text-end">
                  <div className="fw-semibold">{t.amount} pts</div>
                </div>
              </li>
            ))}
          </ul>

          <div className="d-flex justify-content-center gap-2 mt-3">
            <button className="btn btn-sm btn-secondary" onClick={() => fetchPage(page - 1)} disabled={page === 1}>Back</button>
            <div className="align-self-center">Page {page}/{totalPages}</div>
            <button className="btn btn-sm btn-secondary" onClick={() => fetchPage(page + 1)} disabled={page === totalPages}>Next</button>
          </div>
        </div>
      )}
    </div>
  );
}
