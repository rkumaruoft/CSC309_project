// frontend/src/pages/ManagerTransactions.jsx

import { useEffect, useState } from "react";
import { Modal, Button } from "react-bootstrap";
import PaginationControls from "../components/PaginationControls";

const VITE_BACKEND_URL =
    import.meta.env.VITE_BACKEND_URL || "http://localhost:3000";

export default function ManagerTransactions() {
    const token = localStorage.getItem("token");

    const [txs, setTxs] = useState([]);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    // Filters
    const [search, setSearch] = useState("");
    const [processedFilter, setProcessedFilter] = useState("");

    // Sorting (backend-driven)
    const [sortField, setSortField] = useState("createdAt");
    const [sortOrder, setSortOrder] = useState("desc"); // "asc" | "desc"

    // Modals
    const [selectedTx, setSelectedTx] = useState(null);
    const [showModal, setShowModal] = useState(false);

    // Adjustment modal
    const [showAdjustModal, setShowAdjustModal] = useState(false);
    const [adjustAmount, setAdjustAmount] = useState("");
    const [adjustRemark, setAdjustRemark] = useState("");

    // ------------------------------------------------------
    // LOAD TRANSACTIONS (page, filters, sorting)
    // ------------------------------------------------------
    async function loadPage(p) {
        if (!token) return;

        setLoading(true);
        setError(null);

        try {
            const params = new URLSearchParams();
            params.set("page", p);
            params.set("limit", 10);

            if (search.trim()) {
                params.set("name", search.trim());
            }

            if (processedFilter) {
                // "true" or "false"
                params.set("processed", processedFilter);
            }

            // backend sorting
            params.set("sortField", sortField);
            params.set("sortOrder", sortOrder);

            const res = await fetch(
                `${VITE_BACKEND_URL}/transactions?${params.toString()}`,
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                    credentials: "include"
                }
            );

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || "Failed to load transactions");
            }

            const count = data.count ?? 0;
            setTxs(data.results || []);
            setTotalPages(Math.max(1, Math.ceil(count / 10)));
            setPage(p);
        } catch (err) {
            setError(err.message || "Failed to load transactions");
            setTxs([]);
            setTotalPages(1);
        } finally {
            setLoading(false);
        }
    }

    // Initial + whenever filters / sorting change → go to page 1
    useEffect(() => {
        if (!token) return;
        loadPage(1);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [token, search, processedFilter, sortField, sortOrder]);

    // ------------------------------------------------------
    // SORTING HELPERS
    // ------------------------------------------------------
    function toggleSort(field) {
        setSortField((prevField) => {
            if (prevField === field) {
                // flip order
                setSortOrder((prevOrder) =>
                    prevOrder === "asc" ? "desc" : "asc"
                );
                // useEffect above will reload page 1
                return prevField;
            } else {
                // new field → default to ascending
                setSortOrder("asc");
                return field;
            }
        });
    }

    function sortArrow(field) {
        if (sortField !== field) return "";
        return sortOrder === "asc" ? " ▲" : " ▼";
    }

    // ------------------------------------------------------
    // MODALS
    // ------------------------------------------------------
    function openTxModal(tx) {
        setSelectedTx(tx);
        setShowModal(true);
    }

    function closeTxModal() {
        setShowModal(false);
        setSelectedTx(null);
    }

    // ------------------------------------------------------
    // TOGGLE SUSPICIOUS
    // ------------------------------------------------------
    async function toggleSuspicious(id, flag) {
        try {
            const res = await fetch(
                `${VITE_BACKEND_URL}/transactions/${id}/suspicious`,
                {
                    method: "PATCH",
                    headers: {
                        Authorization: `Bearer ${token}`,
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({ suspicious: flag }),
                }
            );

            const data = await res.json();
            if (!res.ok) {
                throw new Error(data.error || "Failed to update suspicious");
            }

            // Update list
            setTxs((prev) =>
                prev.map((tx) =>
                    tx.id === id ? { ...tx, suspicious: flag } : tx
                )
            );

            // Update currently open modal
            if (selectedTx?.id === id) {
                setSelectedTx((prev) => ({ ...prev, suspicious: flag }));
            }
        } catch (err) {
            alert(err.message);
        }
    }

    // ------------------------------------------------------
    // PROCESS REDEMPTION TRANSACTION
    // ------------------------------------------------------
    async function processTransaction() {
        if (!selectedTx) return;

        try {
            const res = await fetch(
                `${VITE_BACKEND_URL}/transactions/${selectedTx.id}/processed`,
                {
                    method: "PATCH",
                    headers: {
                        Authorization: `Bearer ${token}`,
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({ processed: true }),
                }
            );

            const data = await res.json();
            if (!res.ok) {
                throw new Error(data.error || "Failed to process transaction");
            }

            // Update list
            setTxs((prev) =>
                prev.map((tx) =>
                    tx.id === selectedTx.id ? { ...tx, processed: true } : tx
                )
            );

            // Update modal
            setSelectedTx((prev) => ({ ...prev, processed: true }));

            alert("Transaction processed successfully.");
        } catch (err) {
            alert(err.message);
        }
    }

    // ------------------------------------------------------
    // CREATE ADJUSTMENT TRANSACTION
    // ------------------------------------------------------
    async function submitAdjustment() {
        if (!selectedTx) return;

        const amt = Number(adjustAmount);
        if (!Number.isFinite(amt) || amt === 0) {
            alert("Please enter a non-zero numeric amount for the adjustment.");
            return;
        }

        try {
            const res = await fetch(`${VITE_BACKEND_URL}/transactions`, {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    utorid: selectedTx.utorid,
                    type: "adjustment",
                    amount: amt,
                    relatedId: selectedTx.id,
                    remark: adjustRemark,
                    promotionIds: [],
                }),
            });

            const data = await res.json();
            if (!res.ok) {
                throw new Error(data.error || "Failed to create adjustment");
            }

            alert("Adjustment transaction created.");

            setShowAdjustModal(false);
            setAdjustAmount("");
            setAdjustRemark("");

            // Reload current page to pick up new adjustment in list (if visible there)
            loadPage(page);
        } catch (err) {
            alert(err.message);
        }
    }

    // ------------------------------------------------------
    // RENDER
    // ------------------------------------------------------
    return (
        <div className="container mt-4">
            <div className="card shadow-sm">
                <div className="card-body">
                    <h1 className="h3 mb-3">All Transactions</h1>

                    {/* Filters */}
                    <div className="d-flex mb-3 gap-3 flex-wrap">
                        <input
                            className="form-control"
                            style={{ maxWidth: "220px" }}
                            placeholder="Search UTORid / name"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>

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
                                    <th
                                        className="text-center"
                                        style={{ cursor: "pointer" }}
                                        onClick={() => toggleSort("id")}
                                    >
                                        ID {sortArrow("id")}
                                    </th>

                                    <th className="text-center">User</th>

                                    <th
                                        className="text-center"
                                        style={{ cursor: "pointer" }}
                                        onClick={() => toggleSort("type")}
                                    >
                                        Type {sortArrow("type")}
                                    </th>

                                    <th
                                        className="text-center"
                                        style={{ cursor: "pointer" }}
                                        onClick={() => toggleSort("amount")}
                                    >
                                        Amount {sortArrow("amount")}
                                    </th>

                                    <th className="text-center">Processed</th>
                                    <th className="text-center">Suspicious</th>

                                    <th
                                        className="text-center"
                                        style={{ cursor: "pointer" }}
                                        onClick={() =>
                                            toggleSort("createdAt")
                                        }
                                    >
                                        Date {sortArrow("createdAt")}
                                    </th>
                                </tr>
                            </thead>

                            <tbody>
                                {loading ? (
                                    <tr>
                                        <td
                                            colSpan="7"
                                            className="text-center py-4"
                                        >
                                            <div className="spinner-border spinner-border-sm" />
                                        </td>
                                    </tr>
                                ) : txs.length === 0 ? (
                                    <tr>
                                        <td
                                            colSpan="7"
                                            className="text-center text-muted py-4"
                                        >
                                            No transactions found.
                                        </td>
                                    </tr>
                                ) : (
                                    txs.map((tx) => (
                                        <tr
                                            key={tx.id}
                                            style={{ cursor: "pointer" }}
                                            onClick={() => openTxModal(tx)}
                                        >
                                            <td className="text-center">
                                                {tx.id}
                                            </td>
                                            <td className="text-center">
                                                {tx.utorid}
                                            </td>
                                            <td className="text-center">
                                                {tx.type}
                                            </td>
                                            <td className="text-center">
                                                {tx.amount} pts
                                            </td>
                                            {/* <td className="text-center">
                                                {String(tx.processed)} {/* temporary debug */}
                                            {/* </td> */}

                                            <td className="text-center">
                                                {tx.processed ? (
                                                    <span className="badge bg-success">
                                                        Yes
                                                    </span>
                                                ) : (
                                                    <span className="badge bg-warning text-dark">
                                                        No
                                                    </span>
                                                )}
                                            </td>
                                            <td className="text-center">
                                                {tx.suspicious ? (
                                                    <span className="badge bg-danger">
                                                        Suspicious
                                                    </span>
                                                ) : (
                                                    <span className="badge bg-success">
                                                        Clean
                                                    </span>
                                                )}
                                            </td>
                                            <td className="text-center">
                                                {tx.createdAt
                                                    ? new Date(
                                                        tx.createdAt
                                                    ).toLocaleDateString()
                                                    : "—"}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    <div className="d-flex justify-content-center mt-3">
                        <PaginationControls
                            page={page}
                            totalPages={totalPages}
                            onPageChange={(p) => loadPage(p)}
                            disabled={loading}
                        />
                    </div>
                </div>
            </div>

            {/* ======================================================
                TRANSACTION DETAILS MODAL
            ====================================================== */}
            <Modal
                show={showModal}
                onHide={closeTxModal}
                centered
                backdrop="static"
            >
                {selectedTx && (
                    <>
                        <Modal.Header closeButton>
                            <Modal.Title>
                                Transaction #{selectedTx.id}
                            </Modal.Title>
                        </Modal.Header>

                        <Modal.Body>
                            <p>
                                <strong>User:</strong> {selectedTx.utorid}
                            </p>
                            <p>
                                <strong>Type:</strong> {selectedTx.type}
                            </p>
                            <p>
                                <strong>Amount:</strong> {selectedTx.amount} pts
                            </p>
                            <p>
                                <strong>Date:</strong>{" "}
                                {selectedTx.createdAt
                                    ? new Date(
                                        selectedTx.createdAt
                                    ).toLocaleDateString()
                                    : "—"}
                            </p>

                            <p>
                                <strong>Processed:</strong>{" "}
                                {selectedTx.processed ? "Yes" : "No"}
                            </p>

                            <p>
                                <strong>Status:</strong>{" "}
                                {selectedTx.suspicious ? (
                                    <span className="badge bg-danger">
                                        Suspicious
                                    </span>
                                ) : (
                                    <span className="badge bg-success">
                                        Clean
                                    </span>
                                )}
                            </p>

                            {selectedTx.remark && (
                                <p>
                                    <strong>Remark:</strong>{" "}
                                    {selectedTx.remark}
                                </p>
                            )}
                        </Modal.Body>

                        <Modal.Footer className="d-flex flex-wrap gap-2">
                            {/* Process redemption only */}
                            {!selectedTx.processed &&
                                selectedTx.type === "redemption" && (
                                    <Button
                                        variant="primary"
                                        onClick={processTransaction}
                                    >
                                        Process
                                    </Button>
                                )}

                            {/* Adjustment */}
                            <Button
                                variant="secondary"
                                onClick={() => setShowAdjustModal(true)}
                            >
                                Create Adjustment
                            </Button>

                            {/* Suspicious toggle */}
                            {selectedTx.suspicious ? (
                                <Button
                                    variant="success"
                                    onClick={() =>
                                        toggleSuspicious(
                                            selectedTx.id,
                                            false
                                        )
                                    }
                                >
                                    Mark Clean
                                </Button>
                            ) : (
                                <Button
                                    variant="danger"
                                    onClick={() =>
                                        toggleSuspicious(
                                            selectedTx.id,
                                            true
                                        )
                                    }
                                >
                                    Mark Suspicious
                                </Button>
                            )}

                            <Button
                                variant="outline-secondary"
                                onClick={closeTxModal}
                            >
                                Close
                            </Button>
                        </Modal.Footer>
                    </>
                )}
            </Modal>

            {/* ======================================================
                ADJUSTMENT MODAL
            ====================================================== */}
            <Modal
                show={showAdjustModal}
                onHide={() => setShowAdjustModal(false)}
                centered
                backdrop="static"
            >
                <Modal.Header closeButton>
                    <Modal.Title>Create Adjustment</Modal.Title>
                </Modal.Header>

                <Modal.Body>
                    <input
                        className="form-control mb-2"
                        placeholder="Amount (+ or -)"
                        value={adjustAmount}
                        onChange={(e) => setAdjustAmount(e.target.value)}
                    />

                    <textarea
                        className="form-control"
                        rows="3"
                        placeholder="Remark"
                        value={adjustRemark}
                        onChange={(e) => setAdjustRemark(e.target.value)}
                    />
                </Modal.Body>

                <Modal.Footer>
                    <Button variant="primary" onClick={submitAdjustment}>
                        Submit Adjustment
                    </Button>
                    <Button
                        variant="secondary"
                        onClick={() => setShowAdjustModal(false)}
                    >
                        Cancel
                    </Button>
                </Modal.Footer>
            </Modal>
        </div>
    );
}
