import { useEffect, useState } from "react";

const VITE_BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:3000";

export default function Transactions() {
  const [txs, setTxs] = useState(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const token = localStorage.getItem("token");

  async function fetchPage(p) {
    if (p < 1 || (totalPages && p > totalPages)) return;
    try {
      const res = await fetch(`${VITE_BACKEND_URL}/users/me/transactions?page=${p}&limit=10`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) {
        // demo data
        const demo = [];
        for (let i = 0; i < 10; i++) {
          demo.push({ id: i + (p-1)*10, type: 'transfer', amount: 10*(i+1), relatedId: 'demo' + i, time: new Date().toISOString() });
        }
        setTxs(demo);
        setPage(p);
        setTotalPages(2);
        return;
      }

      const data = await res.json();
      setTxs(data.results || []);
      setPage(p);
      setTotalPages(Math.max(1, Math.ceil((data.count || (data.results||[]).length) / 10)));
    } catch (e) {
      setTxs([]);
    }
  }

  useEffect(() => {
    fetchPage(1);
  }, []);

  return (
    <div className="container mt-4">
      <h1>Transactions</h1>

      {txs === null ? (
        <div>Loading...</div>
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
