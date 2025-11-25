import { useEffect, useState } from "react";
import { Modal, Button } from "react-bootstrap";
import { useNavigate } from "react-router-dom";

export default function Home() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [user, setUser] = useState(null);
  const [showQr, setShowQr] = useState(false);
  const demoUser = { utorid: 'demo', name: 'Demo User', points: 1250 };
  const navigate = useNavigate();

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);

      const token = localStorage.getItem("token");

      try {
        if (token) {
          // try to fetch authenticated user info (proxied via Vite)
          const res = await fetch(`/users/me`, {
            headers: { Authorization: `Bearer ${token}` }
          });

          const ct = res.headers.get("content-type") || "";
            if (res.ok && ct.includes("application/json")) {
              const data = await res.json();
              setUser(data);
              return;
            } else {
              // non-JSON or non-OK response — read text for debugging
              const text = await res.text();
              console.warn("/users/me returned non-JSON or non-OK:", res.status, ct, text.slice ? text.slice(0, 400) : text);
            }
          }

          // If not authenticated (no token) or /users/me failed, use a demo user for testing
          setUser(demoUser);
      } catch (err) {
        setError(err.message || String(err));
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

  return (
    <div className="container mt-4 home-page">
      <h1 className="home-hero">Welcome to BananaCreds!</h1>

      {loading ? (
        <div className="mt-3">Loading...</div>
      ) : error ? (
        <div className="alert alert-danger mt-3">Error: {error}</div>
      ) : (
        (() => {
          const displayUser = user || demoUser;
          return (
            <div className="mt-3 home-card">
              <div className="d-flex align-items-center">
                <div style={{ width: 96, height: 96, borderRadius: 8, overflow: 'hidden', background: '#eee' }}>
                  {displayUser.avatarUrl ? (
                    <img src={displayUser.avatarUrl} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <div className="d-flex align-items-center justify-content-center h-100 w-100 text-muted">No<br/>Avatar</div>
                  )}
                </div>
                <div className="ms-3">
                  <h4 className="mb-0">{displayUser.name || displayUser.utorid}</h4>
                  <div className="text-muted small">{displayUser.email ?? ''}</div>
                </div>
                <div className="ms-auto text-end">
                  <div style={{ fontSize: '1.5rem', fontWeight: 600 }}>{displayUser.points ?? 0}</div>
                  <div className="text-muted small">Points</div>
                </div>
              </div>

              <div className="mt-3 d-flex gap-2">
                <Button className="btn-qr" onClick={() => setShowQr(true)}>My QR code</Button>
                <Button variant="outline-primary" onClick={() => navigate('/redemption')}>Redeem</Button>
                <Button variant="outline-secondary" onClick={() => navigate('/transfers')}>Transfers</Button>
              </div>

              <Modal show={showQr} onHide={() => setShowQr(false)}>
                <Modal.Header closeButton>
                  <Modal.Title>My QR Code</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                  <p className="mb-1"><strong>Utorid:</strong> {displayUser.utorid}</p>
                  <p className="mb-1"><strong>Name:</strong> {displayUser.name}</p>
                  <p className="text-muted small">(QR code placeholder)</p>
                  <div style={{ width: 220, height: 220, background: '#f5f5f5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div className="text-muted">QR</div>
                  </div>
                </Modal.Body>
                <Modal.Footer>
                  <Button variant="secondary" onClick={() => setShowQr(false)}>Close</Button>
                </Modal.Footer>
              </Modal>
            </div>
          );
        })()
      )}
    </div>
  );
}
