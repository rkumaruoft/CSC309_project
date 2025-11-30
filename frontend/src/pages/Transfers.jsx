import { useState, useEffect, useRef } from "react";
import { useAuth } from "../contexts/AuthContext";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:3000";

export default function Transfers() {
  const { user, refreshUser } = useAuth();
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

  function resolveRecipientId(input) {
    const trimmed = input.trim();
    if (!trimmed) return null;
    if (/^\d+$/.test(trimmed)) return Number(trimmed);
    return null;
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

    // Resolve recipient id (must be numeric user id)
    const recipientId = resolveRecipientId(toId);
    if (!recipientId) {
      setLoading(false);
      setError("Invalid recipient. Transfers require a numeric user id");
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

      // Refresh context user from backend so UI updates immediately
      try {
        await refreshUser();
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
          <label className="form-label">Transfer to (user id)</label>
          <input
            className="form-control"
            value={toId}
            onChange={(e) => setToId(e.target.value)}
            placeholder="Numeric id (e.g. 12)"
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
            <>Transfer successful — sent <strong>{success.amount}</strong> points.</>
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
