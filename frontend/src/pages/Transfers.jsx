import { useState } from "react";

export default function Transfers() {
  const [toId, setToId] = useState("");
  const [amount, setAmount] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    // TODO: call backend transfer API
    console.log("Transfer to:", toId, "amount:", amount);
    alert(`Transfer requested to ${toId} for ${amount} points (demo)`);
  };

  const handleClear = () => {
    setToId("");
    setAmount("");
  };

  return (
    <div className="container mt-4">
      <h2>Transfer Points</h2>

      <form onSubmit={handleSubmit} style={{ maxWidth: 520 }}>
        <div className="mb-3">
          <label className="form-label">Transfer to (user ID)</label>
          <input
            className="form-control"
            value={toId}
            onChange={(e) => setToId(e.target.value)}
            placeholder="e.g., jdoe"
            required
          />
        </div>

        <div className="mb-3">
          <label className="form-label">Amount (points)</label>
          <input
            className="form-control"
            type="number"
            min="1"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            required
          />
        </div>

        <div className="d-flex gap-2">
          <button type="submit" className="btn btn-primary">Send</button>
          <button type="button" onClick={handleClear} className="btn btn-secondary">Clear</button>
        </div>
      </form>
    </div>
  );
}
