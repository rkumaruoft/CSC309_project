import { useEffect, useState } from "react";
import { useAuth } from "../contexts/AuthContext.jsx";

const VITE_BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:3000";

export default function CashierTransactions() {
  const [utorid, setUtorid] = useState("");
  const [amount, setAmount] = useState("");
  const [promos, setPromos] = useState([]);
  const [selectedPromo, setSelectedPromo] = useState("");
  const [loadingPromos, setLoadingPromos] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);

  const { initialized } = useAuth();

  useEffect(() => {
    // load promotions (one-time). We request a large limit so cashiers
    // can see available one-time promos; backend will already filter active/used.
    async function loadPromos() {
      setLoadingPromos(true);
      setError(null);
      try {
        const token = localStorage.getItem("token");
        const res = await fetch(`${VITE_BACKEND_URL}/promotions?type=onetime&page=1&limit=50`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {}
        });
        if (!res.ok) {
          setPromos([]);
          return;
        }
        const data = await res.json();
        setPromos(data.results || []);
      } catch (err) {
        setPromos([]);
        setError(err.message || String(err));
      } finally {
        setLoadingPromos(false);
      }
    }

    // wait until auth is initialized so token (if any) is ready
    if (initialized !== false) {
      loadPromos();
    }
  }, [initialized]);

  async function handleSubmit(e) {
    e.preventDefault();
    setMessage(null);
    setError(null);

    const token = localStorage.getItem("token");
    if (!token) {
      setError("You must be logged in as a cashier to create a transaction.");
      return;
    }

    const uid = (utorid || "").trim();
    if (!uid) {
      setError("Please enter a customer UTORid.");
      return;
    }

    const spent = Number(amount);
    if (isNaN(spent) || spent <= 0) {
      setError("Please enter a valid amount greater than 0.");
      return;
    }

    const payload = {
      utorid: uid,
      type: "purchase",
      spent: spent,
      promotionIds: selectedPromo ? [Number(selectedPromo)] : []
    };

    setSubmitting(true);
    try {
      const res = await fetch(`${VITE_BACKEND_URL}/transactions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      const ct = res.headers.get("content-type") || "";
      const data = ct.includes("application/json") ? await res.json() : null;

      if (!res.ok) {
        const msg = (data && (data.error || data.message)) || `Server returned ${res.status}`;
        setError(msg);
        return;
      }

      // success
      const earned = data?.earned ?? data?.amount ?? 0;
      setMessage(`Transaction created. Points earned: ${earned}.`);
      setUtorid("");
      setAmount("");
      setSelectedPromo("");
    } catch (err) {
      setError(err.message || String(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="container mt-4">
      <h1>Cashier — Create Purchase</h1>
      <p className="text-muted small">Base rate: 1 points per $0.25.</p>

      {error && <div className="alert alert-danger mt-3">Error: {error}</div>}
      {message && <div className="alert alert-success mt-3">{message}</div>}

      <form className="mt-3" onSubmit={handleSubmit}>
        <div className="mb-3">
          <label className="form-label">Customer UTORid</label>
          <input
            className="form-control"
            value={utorid}
            onChange={(e) => setUtorid(e.target.value)}
            placeholder="e.g. abcd123"
            type="text"
            required
          />
        </div>

        <div className="mb-3">
          <label className="form-label">Amount Spent (USD)</label>
          <input
            className="form-control"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="e.g. 20.00"
            type="number"
            step="0.01"
            min="0"
            required
          />
        </div>

        <div className="mb-3">
          <label className="form-label">Apply one-time promotion (optional)</label>
          {loadingPromos ? (
            <div>Loading promotions...</div>
          ) : (
            <select className="form-select" value={selectedPromo} onChange={(e) => setSelectedPromo(e.target.value)}>
              <option value="">(no promotion)</option>
              {promos.map(p => (
                <option key={p.id} value={p.id}>{p.name} {p.minSpending ? `(min $${p.minSpending})` : ""}</option>
              ))}
            </select>
          )}
        </div>

        <div className="d-flex justify-content-end gap-2">
          <button type="button" className="btn btn-secondary" onClick={() => { setUtorid(""); setAmount(""); setSelectedPromo(""); }} disabled={submitting}>Clear</button>
          <button className="btn btn-primary" type="submit" disabled={submitting}>{submitting ? "Processing..." : "Create Transaction"}</button>
        </div>
      </form>
    </div>
  );
}
