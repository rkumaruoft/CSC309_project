import { useEffect, useState } from "react";
import { Modal, Button } from "react-bootstrap";
import { useNavigate, Link } from "react-router-dom";
import { findAvatar } from "./Profile";

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

  // small previews: promotions and recent transactions
  const [promos, setPromos] = useState([]);
  const [recentTxs, setRecentTxs] = useState([]);

  useEffect(() => {
    const token = localStorage.getItem("token");
    const VITE_BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:3000";

    async function fetchPromos() {
      try {
        const res = await fetch(`${VITE_BACKEND_URL}/promotions?page=1&limit=3`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setPromos((data.results || []).slice(0, 3));
        } else {
          setPromos([]);
        }
      } catch (e) {
        setPromos([]);
      }
    }

    async function fetchRecentTxs() {
      try {
        const res = await fetch(`${VITE_BACKEND_URL}/users/me/transactions?page=1&limit=5`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setRecentTxs(data.results || []);
        } else {
          setRecentTxs([]);
        }
      } catch (e) {
        setRecentTxs([]);
      }
    }

    fetchPromos();
    fetchRecentTxs();
  }, []);

  return (
    <div className="container mt-4 home-page">
      <h1 className="home-hero">Welcome to BananaCreds!</h1>

      {/* Dev testing toolbar: set a fake user role for quick header testing (DEV only) */}
      {import.meta.env.DEV && (
        <div className="mb-3">
          <small className="text-muted">Dev role test:</small>
          <div className="btn-group ms-2" role="group" aria-label="role buttons">
            <button className="btn btn-sm btn-outline-primary" onClick={() => { localStorage.setItem('user', JSON.stringify({ utorid: 'demo', name: 'Demo User', role: 'regular' })); location.reload(); }}>Regular</button>
            <button className="btn btn-sm btn-outline-primary" onClick={() => { localStorage.setItem('user', JSON.stringify({ utorid: 'cashier1', name: 'Cashier', role: 'cashier' })); location.reload(); }}>Cashier</button>
            <button className="btn btn-sm btn-outline-primary" onClick={() => { localStorage.setItem('user', JSON.stringify({ utorid: 'mgr1', name: 'Manager', role: 'manager' })); location.reload(); }}>Manager</button>
            <button className="btn btn-sm btn-outline-primary" onClick={() => { localStorage.setItem('user', JSON.stringify({ utorid: 'admin', name: 'Admin', role: 'superuser' })); location.reload(); }}>Admin</button>
          </div>
        </div>
      )}

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
                    <img src={findAvatar(displayUser)} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
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
                <Button variant="outline-primary" onClick={() => navigate('/promotions')}>Redeem</Button>
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

              {/* Previews: Promotions and Recent Transactions */}
              <div className="mt-4">
                <div className="row">
                  <div className="col-md-6 mb-3">
                    <div className="card p-3">
                      <div className="d-flex justify-content-between align-items-center">
                        <h5 className="mb-0">Promotions</h5>
                        <Link to="/promotions">View all</Link>
                      </div>
                      <hr />
                      {promos.length === 0 ? (
                        <div className="text-muted">No promotions available.</div>
                      ) : (
                        promos.map(p => (
                          <div key={p.id} className="mb-2">
                            <div className="fw-bold">{p.name}</div>
                            <div className="small text-muted">Ends: {p.endTime ? new Date(p.endTime).toDateString() : ''}</div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  <div className="col-md-6 mb-3">
                    <div className="card p-3">
                      <div className="d-flex justify-content-between align-items-center">
                        <h5 className="mb-0">Recent Transactions</h5>
                        <Link to="/transactions">View all</Link>
                      </div>
                      <hr />
                      {recentTxs.length === 0 ? (
                        <div className="text-muted">No recent transactions.</div>
                      ) : (
                        recentTxs.map(t => (
                          <div key={t.id} className="mb-2">
                            <div>
                              <span className="fw-semibold">{t.type}</span>
                              {" — "}
                              <span>{t.amount} pts</span>
                            </div>
                            <div className="small text-muted">Related: {t.relatedId ?? t.relatedUtorid ?? '-'}</div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })()
      )}
    </div>
  );
}
