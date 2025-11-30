import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useState } from "react";

export default function HeaderBase({ brand, links = [] }) {
    const { user, logout, currentRole, availableRoles = [], switchRole, showQrModal } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const [expanded, setExpanded] = useState(false);

    return (
        <nav className="navbar navbar-expand-lg navbar-dark bg-primary mb-3">
            <div className="container">

                {/* BRAND */}
                <Link className="navbar-brand" to="/dashboard">
                    {brand || 'CSSU Rewards'}
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
                        {links.map(l => (
                            <li className="nav-item" key={l.to}>
                                <Link className="nav-link" to={l.to}>{l.label}</Link>
                            </li>
                        ))}
                    </ul>

                    {/* RIGHT SIDE — USER DROPDOWN */}
                    {user && (
                        <div className="dropdown">
                            <button
                                className="btn btn-primary dropdown-toggle border-0 d-flex align-items-center"
                                type="button"
                                data-bs-toggle="dropdown"
                                aria-expanded="false"
                                style={{ background: "transparent" }}
                            >
                                <img
                                    src={
                                        user?.avatarUrl
                                            ? `${import.meta.env.VITE_BACKEND_URL}/avatars/${user.avatarUrl}`
                                            : "/defaultAvatar.svg"
                                    }
                                    onError={(e) => (e.currentTarget.src = "/defaultAvatar.svg")}
                                    alt="User Avatar"
                                    width="30"
                                    height="30"
                                    style={{
                                        borderRadius: "50%",
                                        objectFit: "cover",
                                    }}
                                />
                            </button>

                            {/* Dropdown menu */}
                            <ul className="dropdown-menu bg-primary text-light dropdown-menu-end mt-2">

                                <li>
                                    <Link className="dropdown-item" to="/profile">
                                        Profile
                                    </Link>
                                </li>

                                <li>
                                    <button className="dropdown-item" onClick={() => showQrModal()}>
                                        Show QR
                                    </button>
                                </li>

                                {/* Role switcher embedded in profile dropdown */}
                                {availableRoles && availableRoles.length > 1 && (
                                    <>
                                        <li><hr className="dropdown-divider" /></li>
                                        <li><h6 className="dropdown-header text-light bold unselectable">Interface</h6></li>
                                        {availableRoles.map(r => (
                                            <li key={r}>
                                                <button
                                                    className={`dropdown-item d-flex justify-content-between align-items-center ${r === (currentRole || user.role) ? 'active' : ''}`}
                                                    onClick={() => switchRole(r)}
                                                >
                                                    <span>{r.charAt(0).toUpperCase() + r.slice(1)}</span>
                                                    {r === (currentRole || user.role) && (
                                                        <small className="text-success">✓</small>
                                                    )}
                                                </button>
                                            </li>
                                        ))}
                                    </>
                                )}

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
