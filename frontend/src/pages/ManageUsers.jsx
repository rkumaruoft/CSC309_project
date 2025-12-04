import { useEffect, useState } from "react";
import { useAuth } from "../contexts/AuthContext.jsx";
import PaginationControls from "../components/PaginationControls";

const VITE_BACKEND_URL =
    import.meta.env.VITE_BACKEND_URL || "http://localhost:3000";

/* ==========================================================
   ANIMATED MODAL
   ========================================================== */
function AnimatedModal({ show, onClose, children, size = "modal-lg" }) {
    const [visible, setVisible] = useState(false); // controls fade in/out
    const [mounted, setMounted] = useState(show);  // controls mount/unmount

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
            }, 150); // Bootstrap fade duration (150ms)
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
                    <div className="modal-content">{children}</div>
                </div>
            </div>
        </>
    );
}

/* ==========================================================
   MANAGE USERS PAGE
   ========================================================== */
export default function ManageUsers() {
    const { currentRole } = useAuth();

    const [users, setUsers] = useState([]);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const [search, setSearch] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");

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
        role: "regular",
    });

    const token = localStorage.getItem("token");

    /* ==========================================================
       DEBOUNCED SEARCH
       ========================================================== */
    useEffect(() => {
        const handle = setTimeout(() => {
            setDebouncedSearch(search);
            // page stays the same; if you want, you can do setPage(1) here
        }, 300);

        return () => clearTimeout(handle);
    }, [search]);

    /* ==========================================================
       LOAD USERS WHEN PAGE OR SEARCH CHANGE
       ========================================================== */
    useEffect(() => {
        async function fetchUsers() {
            setLoading(true);
            setError(null);

            try {
                const res = await fetch(
                    `${VITE_BACKEND_URL}/users?page=${page}&limit=10&search=${debouncedSearch}`,
                    {
                        headers: {
                            Authorization: `Bearer ${token}`,
                        },
                    }
                );

                if (!res.ok) throw new Error("Failed to load users");

                const data = await res.json();
                const count = data.count || 0;

                setUsers(data.results || []);
                setTotalPages(Math.max(1, Math.ceil(count / 10)));
            } catch (e) {
                setError(e.message || "Failed to load users");
            } finally {
                setLoading(false);
            }
        }

        fetchUsers();
    }, [page, debouncedSearch, token]);

    /* ==========================================================
       BACKEND ACTIONS
       ========================================================== */

    // Helper to patch a user on the server
    async function patchUser(id, payload) {
        const res = await fetch(`${VITE_BACKEND_URL}/users/${id}`, {
            method: "PATCH",
            headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify(payload),
        });

        const data = await res.json();
        if (!res.ok) {
            throw new Error(data.error || "Failed to update user");
        }
        return data;
    }

    async function changeRole(id, newRole) {
        try {
            await patchUser(id, { role: newRole });

            // Update local state for both list + selected user
            setUsers((prev) =>
                prev.map((u) =>
                    u.id === id ? { ...u, role: newRole } : u
                )
            );

            if (selectedUser?.id === id) {
                setSelectedUser((prev) => ({ ...prev, role: newRole }));
            }
        } catch (e) {
            alert(e.message);
        }
    }

    async function toggleSuspicious(id, flag) {
        try {
            await patchUser(id, { suspicious: flag });

            setUsers((prev) =>
                prev.map((u) =>
                    u.id === id ? { ...u, suspicious: flag } : u
                )
            );

            if (selectedUser?.id === id) {
                setSelectedUser((prev) => ({ ...prev, suspicious: flag }));
            }
        } catch (e) {
            alert(e.message);
        }
    }

    async function verifyUser(id) {
        try {
            await patchUser(id, { verified: true });

            setUsers((prev) =>
                prev.map((u) =>
                    u.id === id ? { ...u, verified: true } : u
                )
            );

            if (selectedUser?.id === id) {
                setSelectedUser((prev) => ({ ...prev, verified: true }));
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
                body: JSON.stringify(newUser),
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Failed to create user");

            // Reset form + close modal
            setShowCreateModal(false);
            setNewUser({
                utorid: "",
                name: "",
                email: "",
                password: "",
                role: "regular",
            });

            // Reload from page 1 so the new user shows up
            setPage(1);
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

    return (
        <div className="container mt-4">
            <div className="card shadow-sm">
                <div className="card-body">
                    {/* HEADER */}
                    <div className="d-flex flex-wrap justify-content-between align-items-center mb-3 gap-2">
                        <div>
                            <h1 className="h3 mb-1">Manage Users</h1>
                            <div className="text-muted small">
                                View, search, and manage user roles and verification.
                            </div>
                        </div>

                        <button
                            className="btn btn-success"
                            onClick={() => setShowCreateModal(true)}
                        >
                            + Create User
                        </button>
                    </div>

                    {/* SEARCH + META */}
                    <div className="d-flex flex-wrap justify-content-between align-items-center mb-3 gap-2">
                        <div className="input-group" style={{ maxWidth: "320px" }}>
                            <span className="input-group-text">
                                <i className="bi bi-search" />
                            </span>
                            <input
                                className="form-control"
                                placeholder="Search by UTORid, name, or email"
                                value={search}
                                onChange={(e) => {
                                    setSearch(e.target.value);
                                    setPage(1);
                                }}
                            />
                        </div>
                    </div>

                    {/* ERROR */}
                    {error && (
                        <div className="alert alert-danger py-2 small">
                            {error}
                        </div>
                    )}

                    {/* TABLE */}
                    <div className="table-responsive">
                        <table className="table table-hover table-striped align-middle mb-0">
                            <thead className="table-primary">
                                <tr>
                                    <th className="text-center">UTORid</th>
                                    <th className="text-center">Name</th>
                                    <th className="text-center">Email</th>
                                    <th className="text-center">Role</th>
                                    <th className="text-center">Verified</th>
                                </tr>
                            </thead>

                            <tbody>
                                {loading ? (
                                    <tr>
                                        <td colSpan="5" className="text-center py-4">
                                            <div className="d-flex justify-content-center align-items-center gap-2">
                                                <div
                                                    className="spinner-border spinner-border-sm"
                                                    role="status"
                                                ></div>
                                                <span className="text-muted">
                                                    Loading users…
                                                </span>
                                            </div>
                                        </td>
                                    </tr>
                                ) : users.length === 0 ? (
                                    <tr>
                                        <td
                                            colSpan="5"
                                            className="text-center text-muted py-4"
                                        >
                                            No users found.
                                        </td>
                                    </tr>
                                ) : (
                                    users.map((u) => (
                                        <tr
                                            key={u.id}
                                            style={{ cursor: "pointer" }}
                                            onClick={() => openUserModal(u)}
                                        >
                                            <td className="text-center">{u.utorid}</td>
                                            <td className="text-center">
                                                {u.name || <span className="text-muted">No name</span>}
                                            </td>
                                            <td className="text-center">{u.email}</td>

                                            <td className="text-center">
                                                <span className={roleBadgeClass(u.role)}>
                                                    {u.role}
                                                </span>
                                                {u.suspicious && (
                                                    <span className="badge bg-danger ms-1">
                                                        Suspicious
                                                    </span>
                                                )}
                                            </td>

                                            <td className="text-center">
                                                {u.verified ? (
                                                    <span className="badge bg-success">
                                                        Verified
                                                    </span>
                                                ) : (
                                                    <span className="badge bg-secondary">
                                                        Unverified
                                                    </span>
                                                )}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    <div className="d-flex justify-content-center align-items-center gap-3 mt-3">
                        <PaginationControls page={page} totalPages={totalPages} onPageChange={(p) => setPage(p)} disabled={loading} />
                    </div>
                </div>
            </div>

            {/* ==========================================================
                CREATE USER MODAL (Animated)
               ========================================================== */}
            <AnimatedModal
                show={showCreateModal}
                onClose={() => setShowCreateModal(false)}
                size="modal-md"
            >
                <div className="modal-header">
                    <h5 className="modal-title">Create New User</h5>
                    <button
                        className="btn-close"
                        onClick={() => setShowCreateModal(false)}
                    ></button>
                </div>

                <div className="modal-body">
                    <div className="mb-2">
                        <label className="form-label">UTORid</label>
                        <input
                            className="form-control"
                            value={newUser.utorid}
                            onChange={(e) =>
                                setNewUser({ ...newUser, utorid: e.target.value })
                            }
                        />
                    </div>

                    <div className="mb-2">
                        <label className="form-label">Name</label>
                        <input
                            className="form-control"
                            value={newUser.name}
                            onChange={(e) =>
                                setNewUser({ ...newUser, name: e.target.value })
                            }
                        />
                    </div>

                    <div className="mb-2">
                        <label className="form-label">Email</label>
                        <input
                            className="form-control"
                            value={newUser.email}
                            onChange={(e) =>
                                setNewUser({ ...newUser, email: e.target.value })
                            }
                        />
                    </div>

                    <div className="mb-2">
                        <label className="form-label">Password</label>
                        <input
                            type="password"
                            className="form-control"
                            value={newUser.password}
                            onChange={(e) =>
                                setNewUser({ ...newUser, password: e.target.value })
                            }
                        />
                    </div>

                    <div className="mb-2">
                        <label className="form-label">Role</label>
                        <select
                            className="form-select"
                            value={newUser.role}
                            onChange={(e) =>
                                setNewUser({ ...newUser, role: e.target.value })
                            }
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
                    <button
                        className="btn btn-secondary"
                        onClick={() => setShowCreateModal(false)}
                    >
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
                            <button
                                className="btn-close"
                                onClick={closeUserModal}
                            ></button>
                        </div>

                        <div className="modal-body">
                            {/* Header info */}
                            <div className="d-flex gap-3 mb-3 align-items-center">
                                <div
                                    className="rounded-circle bg-secondary text-white d-flex align-items-center justify-content-center flex-shrink-0"
                                    style={{ width: "80px", height: "80px" }}
                                >
                                    {(selectedUser.name || selectedUser.utorid)
                                        .charAt(0)
                                        .toUpperCase()}
                                </div>

                                <div>
                                    <h4 className="mb-1">
                                        {selectedUser.name || "No name"}
                                    </h4>
                                    <div className="text-muted small">
                                        Email: {selectedUser.email}
                                    </div>
                                    <div className="text-muted small">
                                        UTORid: {selectedUser.utorid}
                                    </div>

                                    <div className="mt-2 d-flex flex-wrap gap-2 align-items-center">
                                        <span className={roleBadgeClass(selectedUser.role)}>
                                            {selectedUser.role}
                                        </span>

                                        {selectedUser.verified ? (
                                            <span className="badge bg-success">
                                                Verified
                                            </span>
                                        ) : (
                                            <span className="badge bg-secondary">
                                                Unverified
                                            </span>
                                        )}

                                        {selectedUser.suspicious && (
                                            <span className="badge bg-danger">
                                                Suspicious
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <hr />

                            <div className="row g-2">
                                <div className="col-sm-6">
                                    <p className="mb-1 small text-muted">Points</p>
                                    <p className="mb-2">
                                        {selectedUser.points ?? 0}
                                    </p>
                                </div>
                                <div className="col-sm-6">
                                    <p className="mb-1 small text-muted">Birthday</p>
                                    <p className="mb-2">
                                        {selectedUser.birthday
                                            ? new Date(
                                                selectedUser.birthday
                                            ).toLocaleDateString()
                                            : "—"}
                                    </p>
                                </div>
                                <div className="col-sm-6">
                                    <p className="mb-1 small text-muted">Created</p>
                                    <p className="mb-2">
                                        {new Date(
                                            selectedUser.createdAt
                                        ).toLocaleString()}
                                    </p>
                                </div>
                                <div className="col-sm-6">
                                    <p className="mb-1 small text-muted">Last Login</p>
                                    <p className="mb-2">
                                        {selectedUser.lastLogin
                                            ? new Date(
                                                selectedUser.lastLogin
                                            ).toLocaleString()
                                            : "Never"}
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="modal-footer d-flex flex-wrap gap-2 justify-content-between">
                            <div className="d-flex flex-wrap gap-2">
                                {/* VERIFY */}
                                {!selectedUser.verified &&
                                    (currentRole === "manager" ||
                                        currentRole === "superuser") && (
                                        <button
                                            className="btn btn-info"
                                            onClick={() =>
                                                verifyUser(selectedUser.id)
                                            }
                                        >
                                            Verify
                                        </button>
                                    )}

                                {/* SUSPICIOUS */}
                                {(currentRole === "manager" ||
                                    currentRole === "superuser") &&
                                    selectedUser.role !== "superuser" &&
                                    (selectedUser.suspicious ? (
                                        <button
                                            className="btn btn-success"
                                            onClick={() =>
                                                toggleSuspicious(
                                                    selectedUser.id,
                                                    false
                                                )
                                            }
                                        >
                                            Clear Suspicious
                                        </button>
                                    ) : (
                                        <button
                                            className="btn btn-danger"
                                            onClick={() =>
                                                toggleSuspicious(
                                                    selectedUser.id,
                                                    true
                                                )
                                            }
                                        >
                                            Mark Suspicious
                                        </button>
                                    ))}

                                {/* ROLE CHANGES */}

                                {/* SUPERUSER: full control over non-superusers */}
                                {currentRole === "superuser" &&
                                    selectedUser.role !== "superuser" && (
                                        <>
                                            {selectedUser.role !== "regular" && (
                                                <button
                                                    className="btn btn-outline-secondary"
                                                    onClick={() =>
                                                        changeRole(
                                                            selectedUser.id,
                                                            "regular"
                                                        )
                                                    }
                                                >
                                                    Set Regular
                                                </button>
                                            )}

                                            {selectedUser.role !== "cashier" && (
                                                <button
                                                    className="btn btn-warning"
                                                    onClick={() =>
                                                        changeRole(
                                                            selectedUser.id,
                                                            "cashier"
                                                        )
                                                    }
                                                >
                                                    Set Cashier
                                                </button>
                                            )}

                                            {selectedUser.role !== "manager" && (
                                                <button
                                                    className="btn btn-primary"
                                                    onClick={() =>
                                                        changeRole(
                                                            selectedUser.id,
                                                            "manager"
                                                        )
                                                    }
                                                >
                                                    Promote to Manager
                                                </button>
                                            )}
                                        </>
                                    )}

                                {/* MANAGER: can only regular ↔ cashier */}
                                {currentRole === "manager" && (
                                    <>
                                        {selectedUser.role === "regular" && (
                                            <button
                                                className="btn btn-warning"
                                                onClick={() =>
                                                    changeRole(
                                                        selectedUser.id,
                                                        "cashier"
                                                    )
                                                }
                                            >
                                                Promote to Cashier
                                            </button>
                                        )}

                                        {selectedUser.role === "cashier" && (
                                            <button
                                                className="btn btn-outline-secondary"
                                                onClick={() =>
                                                    changeRole(
                                                        selectedUser.id,
                                                        "regular"
                                                    )
                                                }
                                            >
                                                Demote to Regular
                                            </button>
                                        )}
                                    </>
                                )}
                            </div>

                            <button
                                className="btn btn-outline-secondary"
                                onClick={closeUserModal}
                            >
                                Close
                            </button>
                        </div>
                    </>
                )}
            </AnimatedModal>
        </div>
    );
}
