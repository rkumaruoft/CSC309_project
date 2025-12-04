import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";

export default function Verify() {
    const navigate = useNavigate();
    const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

    // --- URL parameters ---
    const location = useLocation();
    const params = new URLSearchParams(location.search);

    const utorid = params.get("utorid");                
    const registered = params.get("registered") === "1";

    const [code, setCode] = useState("");
    const [error, setError] = useState("");
    const [info, setInfo] = useState("");
    const [sending, setSending] = useState(false);
    const [verifying, setVerifying] = useState(false);

    // ---------------- VERIFY CODE ----------------
    const handleVerify = async (e) => {
        e.preventDefault();
        setError("");
        setInfo("");
        setVerifying(true);

        const res = await fetch(`${BACKEND_URL}/auth/verify`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ utorid, code }),
        });

        const data = await res.json();
        setVerifying(false);

        if (!res.ok) {
            setError(data.error || "Invalid verification code.");
            return;
        }

        // Go to login with success banner
        navigate("/login?verified=1");
    };

    // ---------------- RESEND CODE ----------------
    const handleResend = async () => {
        setError("");
        setInfo("");
        setSending(true);

        const res = await fetch(`${BACKEND_URL}/auth/verify/resend`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ utorid }),
        });

        const data = await res.json();
        setSending(false);

        if (!res.ok) {
            setError(data.error || "Unable to resend verification code.");
            return;
        }

        setInfo("A new verification code has been sent to your UofT email.");
    };

    // ---------------- UI ----------------
    return (
        <div className="container mt-5" style={{ maxWidth: "450px" }}>
            <h2 className="text-center mb-4">Verify Your Account</h2>

            {/* SUCCESS BANNER AFTER REGISTRATION */}
            {registered && (
                <div className="alert alert-success">
                    Registration successful! Please check your UofT email for a verification code.
                </div>
            )}

            {/* ERROR MESSAGE */}
            {error && <div className="alert alert-danger">{error}</div>}

            {/* INFO MESSAGE */}
            {info && <div className="alert alert-info">{info}</div>}

            <p className="text-center mb-4">
                Enter the 6-digit verification code sent to your UofT email.
            </p>

            {/* FORM */}
            <form onSubmit={handleVerify}>
                <label className="form-label">Verification Code</label>
                <input
                    type="text"
                    className="form-control mb-3"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    required
                />

                <button
                    className="btn btn-primary w-100"
                    disabled={verifying}
                >
                    {verifying ? "Verifying..." : "Verify"}
                </button>
            </form>

            <hr className="my-4" />

            <button
                onClick={handleResend}
                className="btn btn-outline-secondary w-100"
                disabled={sending}
            >
                {sending ? "Sending..." : "Resend Verification Code"}
            </button>
        </div>
    );
}
