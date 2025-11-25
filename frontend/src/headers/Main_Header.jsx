import { Link } from "react-router-dom";

export default function Main_Header() {
  return (
    <header className="main-header py-2">
      <nav className="container d-flex align-items-center justify-content-between">
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <h4 style={{ margin: 0 }}>BananaCreds</h4>
          <Link to="/dashboard">Home</Link>
          <Link to="/profile">Profile</Link>
          <Link to="/promotions">Promotions</Link>
          <Link to="/events">Events</Link>
          <Link to="/transactions">Transactions</Link>
          <Link to="/redemption">Redeem</Link>
          <Link to="/transfers">Transfers</Link>
        </div>

        <div>
          <button className="btn btn-outline-dark btn-sm">Show QR</button>
        </div>
      </nav>
    </header>
  );
}
