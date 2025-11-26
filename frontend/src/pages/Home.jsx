import { useEffect, useState } from "react";
import { Modal, Button } from "react-bootstrap";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

export default function Home() {
  const { user } = useAuth();
  const [showQr, setShowQr] = useState(false);
  const navigate = useNavigate();
  const [promos, setPromos] = useState([]);
  const [recentTxs, setRecentTxs] = useState([]);

  useEffect(() => {
    const token = localStorage.getItem("token");
    const VITE_BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:3000";
    const authHeaders = token ? { Authorization: `Bearer ${token}` } : {};

    async function fetchPromos() {
      try {
        const res = await fetch(`${VITE_BACKEND_URL}/promotions?page=1&limit=3`, {
          headers: authHeaders
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
          headers: authHeaders
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

  const displayUser = user || {};

  // If there is no authentication token, redirect back to the login page.
  useEffect(() => {
    const token = localStorage.getItem('token');
    const devUser = import.meta.env.DEV && localStorage.getItem('user');
    if (!token && !devUser) {
      navigate('/login');
    }
  }, [navigate, user]);

  return (
    <div className="container mt-4 home-page">
      <h1 className="home-hero">Welcome to BananaCreds!</h1>

      {/* Dev testing toolbar: set a fake user role for quick header testing (DEV only) */}
      {import.meta.env.DEV && (
        <div className="mb-3">
          <small className="text-muted">Dev role test:</small>
          <div className="btn-group ms-2" role="group" aria-label="role buttons">
            <button className="btn btn-sm btn-outline-primary" onClick={() => { 
              const u = { utorid: 'regular1', name: 'Regular User', email: 'regular@mail.utoronto.ca', role: 'regular', points: 100 };
              localStorage.setItem('user', JSON.stringify(u));
              localStorage.setItem('token', 'dev:regular1');
              location.reload();
            }}>Regular</button>
            <button className="btn btn-sm btn-outline-primary" onClick={() => { 
              const u = { utorid: 'cash001', name: 'Cashier User', email: 'cashier@mail.utoronto.ca', role: 'cashier', points: 0 };
              localStorage.setItem('user', JSON.stringify(u));
              localStorage.setItem('token', 'dev:cash001');
              location.reload();
            }}>Cashier</button>
            <button className="btn btn-sm btn-outline-primary" onClick={() => { 
              const u = { utorid: 'manag01', name: 'Manager User', email: 'manager@mail.utoronto.ca', role: 'manager', points: 0 };
              localStorage.setItem('user', JSON.stringify(u));
              localStorage.setItem('token', 'dev:manag01');
              location.reload();
            }}>Manager</button>
            <button className="btn btn-sm btn-outline-primary" onClick={() => { 
              const u = { utorid: 'super01', name: 'Super Admin', email: 'superuser@mail.utoronto.ca', role: 'superuser', points: 0 };
              localStorage.setItem('user', JSON.stringify(u));
              localStorage.setItem('token', 'dev:super01');
              location.reload();
            }}>Admin</button>
          </div>
        </div>
      )}

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
    </div>
  );
}
