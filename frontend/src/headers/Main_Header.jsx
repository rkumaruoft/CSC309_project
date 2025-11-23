import { Link } from "react-router-dom";

export default function Main_Header() {
  return (
    <header className="bg-primary text-light py-2">
      <nav className="container d-flex align-items-center justify-content-between">
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <h4 style={{ margin: 0 }}>BananaCreds</h4>
          <Link to="/dashboard" className="text-light">Home</Link>
          <Link to="/profile" className="text-light">Profile</Link>
          <Link to="/promotions" className="text-light">Promotions</Link>
          <Link to="/events" className="text-light">Events</Link>
          <Link to="/transactions" className="text-light">Transactions</Link>
          <Link to="/redeem" className="text-light">Redeem</Link>
          <Link to="/transfers" className="text-light">Transfers</Link>
        </div>

        <div>
          <button className="btn btn-light btn-sm">Show QR</button>
        </div>
      </nav>
    </header>
  );
}
