import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useState } from "react";
import { useEffect, useRef } from "react";

export default function HeaderBase({ brand, links = [] }) {
    const {
        user,
        logout,
        currentRole,
        availableRoles = [],
        switchRole,
        showQrModal
    } = useAuth();

    const [expanded, setExpanded] = useState(false);

    var homePage = "/dashboard";

    if (currentRole === "manager" || currentRole === "superuser") {
        homePage = "/managerDashboard";
    }

    // Check if both /events and /manageEvents exist in links
    const hasEvents = links.some(l => l.to === '/events');
    const hasManageEvents = links.some(l => l.to === '/events/myEvents');
    const shouldShowEventsDropdown = hasEvents && hasManageEvents;

    // Filter out individual event links if dropdown should be shown
    const filteredLinks = shouldShowEventsDropdown
        ? links.filter(l => l.to !== '/events' && l.to !== '/events/myEvents')
        : links;

    return (
        <nav className="navbar navbar-expand-lg navbar-dark bg-primary mb-3">
            <div className="container">

                {/* BRAND */}
                <Link className="navbar-brand" to={homePage}>
                    {brand || "BananaCreds"}
                </Link>

                {/* MOBILE TOGGLER */}
                <button
                    className="navbar-toggler"
                    type="button"
                    onClick={() => setExpanded(!expanded)}
                >
                    <span className="navbar-toggler-icon" />
                </button>

                {/* MAIN NAV */}
                <div className={`collapse navbar-collapse ${expanded ? "show" : ""}`}>

                    {/* LEFT LINKS */}
                    <ul className="navbar-nav me-auto mb-2 mb-lg-0">
                        {filteredLinks.map((l) => (
                            <li className="nav-item" key={l.to}>
                                <Link className="nav-link" to={l.to}>
                                    {l.label}
                                </Link>
                            </li>
                        ))}

                        {/* EVENTS DROPDOWN */}
                        {shouldShowEventsDropdown && (
                            <li className="nav-item dropdown">
                                <a
                                    className="nav-link dropdown-toggle"
                                    href="#"
                                    role="button"
                                    data-bs-toggle="dropdown"
                                    aria-expanded="false"
                                >
                                    Events
                                </a>
                                <ul className="dropdown-menu">
                                    <li>
                                        <Link className="dropdown-item" to="/events">
                                            Events
                                        </Link>
                                    </li>
                                    <li>
                                        <Link className="dropdown-item" to="/events/myEvents">
                                            Manage Events
                                        </Link>
                                    </li>
                                </ul>
                            </li>
                        )}
                    </ul>

                    {/* RIGHT SIDE: USER DROPDOWN */}
                    {user && (
                        <div className="dropdown">

                            <button
                                className="btn dropdown-toggle d-flex align-items-center border-0 bg-transparent"
                                data-bs-toggle="dropdown"
                                aria-expanded="false"
                            >
                                <img
                                    src={
                                        user.avatarUrl
                                            ? `${import.meta.env.VITE_BACKEND_URL}/avatars/${user.avatarUrl}`
                                            : "/defaultAvatar.svg"
                                    }
                                    onError={(e) => (e.currentTarget.src = "/defaultAvatar.svg")}
                                    alt="Avatar"
                                    width="32"
                                    height="32"
                                    className="rounded-circle"
                                    style={{ objectFit: "cover" }}
                                />
                            </button>

                            {/* DROPDOWN MENU */}
                            <ul className="dropdown-menu dropdown-menu-end">

                                <li>
                                    <Link className="dropdown-item" to="/profile">
                                        Profile
                                    </Link>
                                </li>

                                <li>
                                    <button className="dropdown-item" onClick={showQrModal}>
                                        Show QR
                                    </button>
                                </li>

                                {/* ROLE SWITCHER */}
                                {availableRoles.length > 1 && (
                                    <>
                                        <li>
                                            <hr className="dropdown-divider" />
                                        </li>

                                        <li>
                                            <h6 className="dropdown-header">Interface</h6>
                                        </li>

                                                {(() => {
                                                    // Don't offer the `superuser` role as a switch target
                                                    // when the current user is already a superuser.
                                                    const filtered = availableRoles.filter((role) => {
                                                        if (role === "superuser") {
                                                            return !(currentRole === "superuser" || user.role === "superuser");
                                                        }
                                                        return true;
                                                    });

                                                    return filtered.map((r) => {
                                                        const isActive = r === (currentRole || user.role);

                                                        return (
                                                            <li key={r}>
                                                                <button
                                                                    className={`dropdown-item d-flex justify-content-between align-items-center ${isActive ? "active" : ""}`}
                                                                    onClick={() => switchRole(r)}
                                                                >
                                                                    <span>{r[0].toUpperCase() + r.slice(1)}</span>
                                                                    {isActive && (
                                                                        <small className="text-success">✓</small>
                                                                    )}
                                                                </button>
                                                            </li>
                                                        );
                                                    });
                                                })()}
                                    </>
                                )}

                                <li>
                                    <hr className="dropdown-divider" />
                                </li>

                                <li>
                                    <button
                                        className="dropdown-item text-danger"
                                        onClick={logout}
                                    >
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