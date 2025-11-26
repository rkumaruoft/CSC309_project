import { Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useState } from "react";

export default function Main_Header() {
    const { user, logout } = useAuth();
    const [expanded, setExpanded] = useState(false);

    return (
        <nav className="navbar navbar-expand-lg navbar-dark bg-primary mb-3">
            <div className="container">

                {/* BRAND */}
                <Link className="navbar-brand" to="/dashboard">
                    CSSU Rewards
                </Link>

                {/* MOBILE TOGGLER */}
                <button
                    className="navbar-toggler"
                    type="button"
                    onClick={() => setExpanded(!expanded)}
                >
                    <span className="navbar-toggler-icon"></span>
                </button>

                {/* NAV CONTENT */}
                <div className={`collapse navbar-collapse ${expanded ? "show" : ""}`}>

                    {/* LEFT MENU LINKS */}
                    <ul className="navbar-nav me-auto mb-2 mb-lg-0">
                        <li className="nav-item"><Link className="nav-link" to="/dashboard">Home</Link></li>
                        <li className="nav-item"><Link className="nav-link" to="/promotions">Promotions</Link></li>
                        <li className="nav-item"><Link className="nav-link" to="/events">Events</Link></li>
                        <li className="nav-item"><Link className="nav-link" to="/transactions">Transactions</Link></li>
                        <li className="nav-item"><Link className="nav-link" to="/redemption">Redeem</Link></li>
                        <li className="nav-item"><Link className="nav-link" to="/transfers">Transfers</Link></li>
                    </ul>

                    {/* RIGHT SIDE — USER DROPDOWN */}
                    {user && (
                        <div className="dropdown">

                            {/* The profile icon button */}
                            <button
                                className="btn btn-primary dropdown-toggle border-0 d-flex align-items-center"
                                type="button"
                                data-bs-toggle="dropdown"
                                aria-expanded="false"
                                style={{ background: "transparent" }}
                            >
                                <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    width="30"
                                    height="30"
                                    fill="white"
                                    className="bi bi-person-circle"
                                    viewBox="0 0 16 16"
                                >
                                    <path d="M11 5a3 3 0 1 1-6 0 3 3 0 0 1 6 0z" />
                                    <path
                                        fillRule="evenodd"
                                        d="M0 8a8 8 0 1 1 16 0A8 8 0 0 1 0 8zm8-7a7 7 0 0 0-5.468 
                    11.37C3.242 11.226 4.805 10 8 10s4.757 1.225 5.468 
                    2.37A7 7 0 0 0 8 1z"
                                    />
                                </svg>
                            </button>

                            {/* Dropdown menu */}
                            <ul className="dropdown-menu dropdown-menu-end mt-2">

                                <li>
                                    <Link className="dropdown-item" to="/profile">
                                        Profile
                                    </Link>
                                </li>
                                <li><hr className="dropdown-divider" /></li>
                                <li>
                                    <button className="dropdown-item text-danger" onClick={logout}>
                                        Logout
                                    </button>
                                </li>

                            </ul>
                        </div>
                    )}

                </div>
            </div>
        </nav>
    );
}
