import { useState, useEffect, useRef } from "react";
import { useAuth } from "../contexts/AuthContext";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:3000";

export default function Transfers() {
  const { user } = useAuth();
  const [toId, setToId] = useState("");
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(null);

  const amountRef = useRef();

  useEffect(() => {
    setError("");
  }, [toId, amount]);

  const handleClear = () => {
    setToId("");
    setAmount("");
    setError("");
    setSuccess(null);
  };

  // Try to resolve recipient id from input. If input is numeric, use it directly.
  // Otherwise try to query `/users?name=` (may require elevated permissions).
  async function resolveRecipientId(input, token) {
    const trimmed = input.trim();
    if (!trimmed) return null;

    // If it's a number, use as id
    if (/^\d+$/.test(trimmed)) return Number(trimmed);

    // Otherwise attempt to search by utorid/name
    try {
      const res = await fetch(`${BACKEND_URL}/users?name=${encodeURIComponent(trimmed)}&limit=1`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });

      if (!res.ok) return null;
      const data = await res.json();
      if (Array.isArray(data.results) && data.results.length > 0) {
        return data.results[0].id;
      }
      return null;
    } catch (e) {
      return null;
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess(null);

    const token = localStorage.getItem("token");

    // Validate amount
    if (!/^[0-9]+$/.test(amount) || Number(amount) <= 0) {
      setError("Please enter a positive integer amount.");
      amountRef.current?.setCustomValidity("Please enter a positive integer amount.");
      return;
    }

    const amountInt = Number(amount);

    // Check sender points if available
    try {
      const senderPoints = user?.points ?? (JSON.parse(localStorage.getItem("user") || "{}")).points ?? null;
      if (senderPoints !== null && senderPoints < amountInt) {
        setError("Insufficient points to complete transfer.");
        return;
      }
    } catch (e) {
      // continue without strict check
    }

    setLoading(true);

    // Resolve recipient id
    const recipientId = await resolveRecipientId(toId, token);
    if (!recipientId) {
      setLoading(false);
      setError("Could not find recipient. Try entering their numeric user id or ensure backend lookup is available.");
      return;
    }

    // Perform transfer
    try {
      const res = await fetch(`${BACKEND_URL}/users/${recipientId}/transactions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ type: "transfer", amount: amountInt })
      });

      const data = await res.json();
      if (!res.ok) {
        // Fallback: demo behavior if backend not available or token missing
        if (!token) {
          setSuccess({ demo: true, to: toId, amount: amountInt });
          setLoading(false);
          return;
        }

        setError(data.error || data.message || "Transfer failed");
        setLoading(false);
        return;
      }

      // Success: update local user points cache if present
      try {
        const stored = JSON.parse(localStorage.getItem("user") || "null");
        if (stored && typeof stored.points === "number") {
          stored.points = stored.points - amountInt;
          localStorage.setItem("user", JSON.stringify(stored));
        }
      } catch (_) {}

      setSuccess({ id: data.id, recipient: data.recipient ?? data.recipient, amount: amountInt });
    } catch (err) {
      setError("Network error while sending transfer.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mt-4">
      <h2>Transfer Points</h2>

      <form onSubmit={handleSubmit} style={{ maxWidth: 520 }}>
        <div className="mb-3">
          <label className="form-label">Transfer to (user id or utorid)</label>
          <input
            className="form-control"
            value={toId}
            onChange={(e) => setToId(e.target.value)}
            placeholder="Numeric id (e.g. 12) or utorid (e.g. jdoe)"
            required
            aria-label="recipient"
          />
        </div>

        <div className="mb-3">
          <label className="form-label">Amount (points)</label>
          <input
            className="form-control"
            type="number"
            min="1"
            value={amount}
            ref={amountRef}
            onChange={(e) => { setAmount(e.target.value); amountRef.current?.setCustomValidity(""); }}
            required
          />
        </div>

        {error && <div className="alert alert-danger" role="alert">{error}</div>}

        {success && (
          <div className="alert alert-success" role="alert">
            {success.demo ? (
              <>Demo: Transfer to <strong>{success.to}</strong> for <strong>{success.amount}</strong> points.</>
            ) : (
              <>Transfer successful (id: {success.id}) — sent <strong>{success.amount}</strong> points.</>
            )}
          </div>
        )}

        <div className="d-flex gap-2">
          <button type="submit" className="btn btn-primary" disabled={loading}>{loading ? "Sending…" : "Send"}</button>
          <button type="button" onClick={handleClear} className="btn btn-secondary">Clear</button>
        </div>
      </form>
    </div>
  );
}
