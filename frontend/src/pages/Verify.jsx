import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

export default function Verify() {
    const { state } = useLocation();
    const navigate = useNavigate();
    const { login } = useAuth();

    const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

    const utorid = state?.utorid;
    const [code, setCode] = useState("");
    const [error, setError] = useState("");

    const handleVerify = async (e) => {
        e.preventDefault();
        setError("");

        // Step 1: verify code
        const res = await fetch(`${BACKEND_URL}/auth/verify/confirm`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ utorid, code }),
        });

        const data = await res.json();
        if (!res.ok) {
            setError(data.error || "Invalid code");
            return;
        }

        // Step 2: auto-login user after verification
        const loginErr = await login(utorid, state?.password);
        if (loginErr) {
            setError("Account verified, but login failed. Please log in manually.");
            return;
        }

        // Step 3: go to dashboard
        navigate("/dashboard");
    };

    return (
        <div className="container mt-5" style={{ maxWidth: "450px" }}>
            <h2 className="text-center mb-3">Verify Your Account</h2>

            {error && <div className="alert alert-danger">{error}</div>}

            <form onSubmit={handleVerify}>
                <label className="form-label">Enter verification code</label>
                <input
                    type="text"
                    className="form-control mb-3"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    required
                />

                <button className="btn btn-primary w-100">Verify</button>
            </form>
        </div>
    );
}
