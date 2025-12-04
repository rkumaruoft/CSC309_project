import { useState } from "react";

export default function PaginationControls({ page = 1, totalPages = 1, onPageChange = () => {}, disabled = false, maxButtons = 7 }) {
  const [jump, setJump] = useState("");

  if (!totalPages || totalPages < 1) return null;

  const buildPages = () => {
    const pages = [];
    const half = Math.floor(maxButtons / 2);

    if (totalPages <= maxButtons) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
      return pages;
    }

    let start = Math.max(1, page - half);
    let end = Math.min(totalPages, page + half);

    if (start === 1) end = Math.min(totalPages, start + maxButtons - 1);
    if (end === totalPages) start = Math.max(1, end - maxButtons + 1);

    for (let i = start; i <= end; i++) pages.push(i);
    return pages;
  };

  const pages = buildPages();

  return (
    <div className="d-flex gap-2 align-items-center">
      <button className="btn btn-sm btn-outline-secondary" onClick={() => onPageChange(1)} disabled={disabled || page === 1}>
        First
      </button>

      <button className="btn btn-sm btn-outline-secondary" onClick={() => onPageChange(Math.max(1, page - 1))} disabled={disabled || page === 1}>
        Prev
      </button>

      <div className="btn-group" role="group">
        {pages[0] > 1 && (
          <button className="btn btn-sm btn-outline-secondary" onClick={() => onPageChange(1)} disabled={disabled}>
            1
          </button>
        )}

        {pages[0] > 2 && <button className="btn btn-sm btn-outline-secondary" disabled>…</button>}

        {pages.map((p) => (
          <button
            key={p}
            className={`btn btn-sm ${p === page ? "btn-primary" : "btn-outline-secondary"}`}
            onClick={() => onPageChange(p)}
            disabled={disabled}
          >
            {p}
          </button>
        ))}

        {pages[pages.length - 1] < totalPages - 1 && <button className="btn btn-sm btn-outline-secondary" disabled>…</button>}

        {pages[pages.length - 1] < totalPages && (
          <button className="btn btn-sm btn-outline-secondary" onClick={() => onPageChange(totalPages)} disabled={disabled}>
            {totalPages}
          </button>
        )}
      </div>

      <button className="btn btn-sm btn-outline-secondary" onClick={() => onPageChange(Math.min(totalPages, page + 1))} disabled={disabled || page === totalPages}>
        Next
      </button>

      <button className="btn btn-sm btn-outline-secondary" onClick={() => onPageChange(totalPages)} disabled={disabled || page === totalPages}>
        Last
      </button>

      <div className="d-flex align-items-center ms-2">
        <input
          type="number"
          min={1}
          max={totalPages}
          value={jump}
          onChange={(e) => setJump(e.target.value)}
          className="form-control form-control-sm"
          style={{ width: 90 }}
          placeholder={`1–${totalPages}`}
          disabled={disabled}
        />
        <button
          className="btn btn-sm btn-secondary ms-1"
          onClick={() => {
            const v = Number(jump);
            if (!Number.isFinite(v)) return;
            onPageChange(Math.max(1, Math.min(totalPages, v)));
            setJump("");
          }}
          disabled={disabled || !jump}
        >
          Go
        </button>
      </div>
    </div>
  );
}
