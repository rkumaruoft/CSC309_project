import { useEffect, useState } from "react";
import { useAuth } from "../contexts/AuthContext.jsx";

const VITE_BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:3000";


function AnimatedModal({ show, onClose, children, size = "modal-lg" }) {
    const [visible, setVisible] = useState(false);       // controls fade in/out
    const [mounted, setMounted] = useState(show);        // controls mount/unmount

    // Mount immediately when show = true
    useEffect(() => {
        if (show) {
            setMounted(true);
            setTimeout(() => setVisible(true), 10); // fade in
        } else {
            // fade out
            setVisible(false);

            // wait for fade-out animation to finish
            setTimeout(() => {
                setMounted(false);
            }, 150);  // Bootstrap fade duration (150ms)
        }
    }, [show]);

    // Close with ESC key
    useEffect(() => {
        function handleKey(e) {
            if (e.key === "Escape" && show) onClose();
        }

        document.addEventListener("keydown", handleKey);
        return () => document.removeEventListener("keydown", handleKey);
    }, [show, onClose]);

    if (!mounted) return null;

    return (
        <>
            {/* BACKDROP */}
            <div
                className={`modal-backdrop fade ${visible ? "show" : ""}`}
                onClick={onClose}
            ></div>

            {/* MODAL */}
            <div
                className={`modal fade ${visible ? "show" : ""}`}
                style={{ display: "block" }}
                onClick={onClose}
            >
                <div
                    className={`modal-dialog ${size}`}
                    onClick={(e) => e.stopPropagation()}
                >
                    <div className="modal-content">
                        {children}
                    </div>
                </div>
            </div>
        </>
    );
}


export default function ManageUsers() {
    const { currentRole } = useAuth();

    const [users, setUsers] = useState([]);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const [search, setSearch] = useState("");
    const [reloadFlag, setReloadFlag] = useState(false);

    // modal user
    const [selectedUser, setSelectedUser] = useState(null);
    const [showUserModal, setShowUserModal] = useState(false);

    // create user modal
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [newUser, setNewUser] = useState({
        utorid: "",
        name: "",
        email: "",
        password: "",
        role: "regular"
    });

    const token = localStorage.getItem("token");

    /* ==========================================================
       LOAD USERS
       ========================================================== */
    async function loadUsers(p, q = "") {
        setLoading(true);
        setError(null);

        try {
            const res = await fetch(
                `${VITE_BACKEND_URL}/users?page=${p}&limit=10&search=${q}`,
                { headers: { Authorization: `Bearer ${token}` } }
            );

            if (!res.ok) throw new Error("Failed to load users");

            const data = await res.json();
            setUsers(data.results || []);
            setTotalPages(Math.max(1, Math.ceil(data.count / 10)));
            setPage(p);
        } catch (e) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        loadUsers(1, search);
    }, [reloadFlag]);

    // whenever search changes, reload after 300ms
    useEffect(() => {
        const delay = setTimeout(() => {
            setReloadFlag(p => !p);
        }, 200);

        return () => clearTimeout(delay);
    }, [search]);

    /* ==========================================================
       BACKEND ACTIONS
       ========================================================== */
    async function changeRole(id, newRole) {
        try {
            const res = await fetch(`${VITE_BACKEND_URL}/users/${id}`, {
                method: "PATCH",
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ role: newRole })
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error);

            setReloadFlag(prev => !prev);
            if (selectedUser?.id === id) {
                setSelectedUser(prev => ({ ...prev, role: newRole }));
            }
        } catch (e) {
            alert(e.message);
        }
    }

    async function toggleSuspicious(id, flag) {
        try {
            const res = await fetch(`${VITE_BACKEND_URL}/users/${id}`, {
                method: "PATCH",
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ suspicious: flag })
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error);

            setReloadFlag(prev => !prev);
            if (selectedUser?.id === id) {
                setSelectedUser(prev => ({ ...prev, suspicious: flag }));
            }
        } catch (e) {
            alert(e.message);
        }
    }

    async function verifyUser(id) {
        try {
            const res = await fetch(`${VITE_BACKEND_URL}/users/${id}`, {
                method: "PATCH",
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ verified: true })
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error);

            setReloadFlag(prev => !prev);
            if (selectedUser?.id === id) {
                setSelectedUser(prev => ({ ...prev, verified: true }));
            }
        } catch (e) {
            alert(e.message);
        }
    }

    async function createUser() {
        try {
            const res = await fetch(`${VITE_BACKEND_URL}/users`, {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(newUser)
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error);

            setShowCreateModal(false);
            setNewUser({
                utorid: "",
                name: "",
                email: "",
                password: "",
                role: "regular"
            });
            setReloadFlag(prev => !prev);

        } catch (e) {
            alert(e.message);
        }
    }

    /* ==========================================================
       MODAL HANDLERS
       ========================================================== */
    function openUserModal(u) {
        setSelectedUser(u);
        setShowUserModal(true);
    }

    function closeUserModal() {
        setShowUserModal(false);
        setSelectedUser(null);
    }

    /* ==========================================================
       ROLE BADGE
       ========================================================== */
    function roleBadgeClass(role) {
        if (role === "superuser") return "badge bg-danger";
        if (role === "manager") return "badge bg-primary";
        if (role === "cashier") return "badge bg-warning text-dark";
        return "badge bg-secondary";
    }

    /* ==========================================================
       RENDER START
       ========================================================== */
    return (
        <div className="container mt-4">

            {/* HEADER */}
            <div className="d-flex justify-content-between mb-3">
                <h1>Manage Users</h1>
                <button className="btn btn-success" onClick={() => setShowCreateModal(true)}>
                    + Create User
                </button>
            </div>

            {/* SEARCH BAR */}
            <div className="input-group mb-3" style={{ maxWidth: "400px" }}>
                <input
                    className="form-control"
                    placeholder="Search users..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                />
            </div>
            {/* TABLE */}
            {loading ? (
                <div>Loading…</div>
            ) : error ? (
                <div className="alert alert-danger">{error}</div>
            ) : (
                <>
                    <div className="table-responsive">
                        <table className="table table-hover table-striped">
                            <thead className="table-primary">
                                <tr>
                                    <th>UTORid</th>
                                    <th>Name</th>
                                    <th>Email</th>
                                    <th>Role</th>
                                    <th>Verified</th>
                                </tr>
                            </thead>

                            <tbody>
                                {users.length === 0 ? (
                                    <tr>
                                        <td colSpan="5" className="text-center text-muted py-4">
                                            No users found.
                                        </td>
                                    </tr>
                                ) : (
                                    users.map(u => (
                                        <tr
                                            key={u.id}
                                            style={{ cursor: "pointer" }}
                                            onClick={() => openUserModal(u)}
                                        >
                                            <td>{u.utorid}</td>
                                            <td>{u.name}</td>
                                            <td>{u.email}</td>

                                            <td>
                                                <span className={roleBadgeClass(u.role)}>{u.role}</span>

                                                {u.suspicious && (
                                                    <span className="badge bg-danger ms-1">Suspicious</span>
                                                )}
                                            </td>

                                            <td>{u.verified && (
                                                <span className="badge bg-success">Verified</span>

                                            )}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    <div className="d-flex justify-content-center gap-2 mt-3">
                        <button
                            className="btn btn-secondary btn-sm"
                            disabled={page === 1}
                            onClick={() => loadUsers(page - 1, search)}
                        >
                            Back
                        </button>

                        <span className="pt-1">Page {page} / {totalPages}</span>

                        <button
                            className="btn btn-secondary btn-sm"
                            disabled={page === totalPages}
                            onClick={() => loadUsers(page + 1, search)}
                        >
                            Next
                        </button>
                    </div>
                </>
            )}

            {/* ==========================================================
                CREATE USER MODAL (Animated)
               ========================================================== */}
            <AnimatedModal show={showCreateModal} onClose={() => setShowCreateModal(false)} size="modal-md">
                <div className="modal-header">
                    <h5 className="modal-title">Create New User</h5>
                    <button className="btn-close" onClick={() => setShowCreateModal(false)}></button>
                </div>

                <div className="modal-body">
                    <div className="mb-2">
                        <label className="form-label">UTORid</label>
                        <input className="form-control"
                            value={newUser.utorid}
                            onChange={e => setNewUser({ ...newUser, utorid: e.target.value })}
                        />
                    </div>

                    <div className="mb-2">
                        <label className="form-label">Name</label>
                        <input className="form-control"
                            value={newUser.name}
                            onChange={e => setNewUser({ ...newUser, name: e.target.value })}
                        />
                    </div>

                    <div className="mb-2">
                        <label className="form-label">Email</label>
                        <input className="form-control"
                            value={newUser.email}
                            onChange={e => setNewUser({ ...newUser, email: e.target.value })}
                        />
                    </div>

                    <div className="mb-2">
                        <label className="form-label">Password</label>
                        <input
                            type="password"
                            className="form-control"
                            value={newUser.password}
                            onChange={e => setNewUser({ ...newUser, password: e.target.value })}
                        />
                    </div>

                    <div className="mb-2">
                        <label className="form-label">Role</label>
                        <select
                            className="form-select"
                            value={newUser.role}
                            onChange={e => setNewUser({ ...newUser, role: e.target.value })}
                        >
                            <option value="regular">Regular</option>
                            <option value="cashier">Cashier</option>

                            {currentRole === "superuser" && (
                                <option value="manager">Manager</option>
                            )}
                        </select>
                    </div>
                </div>

                <div className="modal-footer">
                    <button className="btn btn-secondary" onClick={() => setShowCreateModal(false)}>
                        Cancel
                    </button>
                    <button className="btn btn-primary" onClick={createUser}>
                        Create
                    </button>
                </div>
            </AnimatedModal>

            {/* ==========================================================
                USER DETAILS MODAL (Animated)
               ========================================================== */}
            <AnimatedModal show={showUserModal} onClose={closeUserModal}>
                {selectedUser && (
                    <>
                        <div className="modal-header">
                            <h5 className="modal-title">
                                User — {selectedUser.name || selectedUser.utorid}
                            </h5>
                            <button className="btn-close" onClick={closeUserModal}></button>
                        </div>

                        <div className="modal-body">

                            {/* Header info */}
                            <div className="d-flex gap-3 mb-3">
                                <div
                                    className="rounded-circle overflow-hidden bg-secondary d-flex align-items-center justify-content-center"
                                    style={{ width: "80px", height: "80px" }}
                                >
                                    <img
                                        src={
                                            selectedUser?.avatarUrl
                                                ? `${import.meta.env.VITE_BACKEND_URL}/avatars/${selectedUser.avatarUrl}`
                                                : "/defaultAvatar.svg"
                                        }
                                        onError={(e) => (e.currentTarget.src = "/defaultAvatar.svg")}
                                        alt="User Avatar"
                                        className="w-100 h-100"
                                        style={{ objectFit: "cover" }}
                                    />
                                </div>

                                <div>
                                    <h4>{selectedUser.name || "No name"}</h4>
                                    <div className="text-muted">Email: {selectedUser.email}</div>
                                    <div className="text-muted">UTORid: {selectedUser.utorid}</div>

                                    <div className="mt-2">
                                        <span className={roleBadgeClass(selectedUser.role)}>
                                            {selectedUser.role}
                                        </span>

                                        {selectedUser.verified ? (
                                            <span className="badge bg-success ms-2">Verified</span>
                                        ) : (
                                            <span className="badge bg-secondary ms-2">Unverified</span>
                                        )}

                                        {selectedUser.suspicious && (
                                            <span className="badge bg-danger ms-2">Suspicious</span>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <hr />

                            <p><strong>Points:</strong> {selectedUser.points}</p>
                            <p><strong>Birthday:</strong> {selectedUser.birthday ? new Date(selectedUser.birthday).toLocaleDateString() : "—"}</p>
                            <p><strong>Created:</strong> {new Date(selectedUser.createdAt).toLocaleString()}</p>
                            <p><strong>Last Login:</strong> {selectedUser.lastLogin ? new Date(selectedUser.lastLogin).toLocaleString() : "Never"}</p>

                        </div>

                        <div className="modal-footer">

                            {/* VERIFY */}
                            {!selectedUser.verified &&
                                (currentRole === "manager" || currentRole === "superuser") && (
                                    <button className="btn btn-info" onClick={() => verifyUser(selectedUser.id)}>
                                        Verify
                                    </button>
                                )}

                            {/* SUSPICIOUS */}
                            {(currentRole === "manager" || currentRole === "superuser") &&
                                selectedUser.role !== "superuser" &&
                                (selectedUser.suspicious ? (
                                    <button
                                        className="btn btn-success"
                                        onClick={() => toggleSuspicious(selectedUser.id, false)}
                                    >
                                        Clear Suspicious
                                    </button>
                                ) : (
                                    <button
                                        className="btn btn-danger"
                                        onClick={() => toggleSuspicious(selectedUser.id, true)}
                                    >
                                        Mark Suspicious
                                    </button>
                                ))}

                            {/* ROLE CHANGES */}
                            {currentRole === "superuser" && selectedUser.role !== "superuser" && (
                                <>
                                    {selectedUser.role !== "regular" && (
                                        <button
                                            className="btn btn-secondary"
                                            onClick={() => changeRole(selectedUser.id, "regular")}
                                        >
                                            Set Regular
                                        </button>
                                    )}

                                    {selectedUser.role !== "cashier" && (
                                        <button
                                            className="btn btn-warning"
                                            onClick={() => changeRole(selectedUser.id, "cashier")}
                                        >
                                            Set Cashier
                                        </button>
                                    )}

                                    {selectedUser.role !== "manager" && (
                                        <button
                                            className="btn btn-primary"
                                            onClick={() => changeRole(selectedUser.id, "manager")}
                                        >
                                            Promote to Manager
                                        </button>
                                    )}
                                </>
                            )}

                            <button className="btn btn-outline-secondary" onClick={closeUserModal}>
                                Close
                            </button>
                        </div>
                    </>
                )}
            </AnimatedModal>

        </div>
    );
}