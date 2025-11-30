// TODO: Design seperate home pages for different user roles (regular, cashier, manager, superuser)

import { useEffect, useState } from "react";
import { Modal, Button } from "react-bootstrap";
import { useNavigate, Link } from "react-router-dom";
import { findAvatar } from "./Profile";
import { useAuth } from "../contexts/AuthContext";


export default function Home() {
  const { user } = useAuth();
  const [showQr, setShowQr] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const navigate = useNavigate();
  const [promos, setPromos] = useState([]);
  const [recentTxs, setRecentTxs] = useState([]);

  // Dev helper: attempt real backend login for seeded users
  async function bootstrapDevUser(u) {
    const VITE_BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:3000";
    try {
      const res = await fetch(`${VITE_BACKEND_URL}/auth/tokens`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ utorid: u.utorid, password: 'Password123!' }),
      });

      if (res.ok) {
        const data = await res.json();
        localStorage.setItem('token', data.token);

        // Try to fetch the profile and persist it; fall back to the provided user
        try {
          const meRes = await fetch(`${VITE_BACKEND_URL}/users/me`, { headers: { Authorization: `Bearer ${data.token}` } });
          if (meRes.ok) {
            const profile = await meRes.json();
            localStorage.setItem('user', JSON.stringify(profile));
          } else {
            localStorage.setItem('user', JSON.stringify(u));
          }
        } catch (e) {
          localStorage.setItem('user', JSON.stringify(u));
        }

        // Reload so AuthContext bootstraps from the new token/user
        location.reload();
        return;
      }
    } catch (e) {
      // fall through to fallback below
    }

    // Fallback: persist local user for offline/dev mode
    localStorage.setItem('user', JSON.stringify(u));
    location.reload();
  }

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

  // If there is no authentication token, redirect back to the login page.
  useEffect(() => {
    const token = localStorage.getItem('token');
    const devUser = import.meta.env.DEV && localStorage.getItem('user');
    if (!token && !devUser) {
      navigate('/login');
    }
  }, [navigate, user]);

  const displayUser = user || {};

  return (
    <div className="container mt-4 home-page">
      <h1 className="home-hero">Welcome to BananaCreds!</h1>

      {/* Dev testing toolbar: set a fake user role for quick header testing (DEV only) */}
      {import.meta.env.DEV && (
        <div className="mb-3">
          <small className="text-muted">Dev role test:</small>
          <div className="btn-group ms-2" role="group" aria-label="role buttons">
            <button className="btn btn-sm btn-outline-primary" onClick={() => bootstrapDevUser({ utorid: 'regular1', name: 'Regular User', email: 'regular@mail.utoronto.ca', role: 'regular' })}>Regular</button>
            <button className="btn btn-sm btn-outline-primary" onClick={() => bootstrapDevUser({ utorid: 'cash001', name: 'Cashier User', email: 'cashier@mail.utoronto.ca', role: 'cashier' })}>Cashier</button>
            <button className="btn btn-sm btn-outline-primary" onClick={() => bootstrapDevUser({ utorid: 'manag01', name: 'Manager User', email: 'manager@mail.utoronto.ca', role: 'manager' })}>Manager</button>
            <button className="btn btn-sm btn-outline-primary" onClick={() => bootstrapDevUser({ utorid: 'super01', name: 'Super Admin', email: 'superuser@mail.utoronto.ca', role: 'superuser' })}>Admin</button>
          </div>
        </div>
      )}

      <div className="mt-3 home-card">
        <div className="d-flex align-items-center">
          <div style={{ width: 96, height: 96, borderRadius: 8, overflow: 'hidden', background: '#eee' }}>
            <img src={findAvatar(displayUser)} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </div>
          <div className="ms-3">
            <h4 className="mb-0">{displayUser.name || displayUser.utorid}</h4>
            <div className="text-muted small">{displayUser.email ?? ''}</div>
            {/* DEV: start debug user info (development only) */}
            {import.meta.env.DEV && (
              <>
                <div className="text-muted small mt-1">
                  <strong>ID:</strong> {displayUser.id ?? "(unknown)"} {' '}
                  • <strong>Role:</strong> {displayUser.role ?? '(n/a)'} {' '}
                  • <strong>Verified:</strong> {displayUser.verified ? 'yes' : 'no'}
                </div>
                <div className="mt-2">
                  <button className="btn btn-sm btn-outline-secondary" onClick={() => setShowInfo(s => !s)}>
                    {showInfo ? 'Hide my info' : 'Show my info'}
                  </button>
                </div>
                {showInfo && (
                  <pre className="mt-2 bg-light p-2" style={{ maxWidth: 420, overflow: 'auto' }}>
                    {JSON.stringify(displayUser, null, 2)}
                  </pre>
                )}
              </>
            )}
            {/* DEV: end debug user info */}
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


        {/* QR Code Modal */}
        <Modal show={showQr} onHide={() => setShowQr(false)}>
          <Modal.Header closeButton>
            <Modal.Title>My QR Code</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <p className="mb-1"><strong>Name:</strong> {displayUser.name}</p>
            <p className="text-muted small">Scan this QR at the cashier to identify this user.</p>
            <div style={{ width: 220, height: 220, background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #e9e9e9' }}>
              <img
                alt="qr-user"
                src={`https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(`user:${displayUser.id ?? displayUser.utorid}`)}`}
                style={{ width: 220, height: 220 }}
              />
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
