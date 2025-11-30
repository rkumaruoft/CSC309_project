import { useState } from "react";
import { Link, Navigate, useNavigate, useLocation } from "react-router-dom";
import { Form, Button, Card } from "react-bootstrap";
import { useAuth } from "../contexts/AuthContext";

export default function Login() {
    const { login, user } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    const params = new URLSearchParams(location.search);
    const justRegistered = params.get("registered") === "1";
    const justVerified = params.get("verified") === "1";
    const [utorid, setUtorid] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    
    if (user) {
        return <Navigate to="/dashboard" replace />;
    }

    const handleLogin = async (e) => {
        e.preventDefault();
        setError("");

        const result = await login(utorid, password);

        // --- UNVERIFIED DETECTED ---
        if (result?.unverified) {
            navigate(`/verify?utorid=${result.utorid}`);
            return;
        }

        // --- NORMAL LOGIN ERROR ---
        if (typeof result === "string") {
            setError(result);
        }
    };

    return (
        <div
            className="d-flex justify-content-center align-items-center vertical-center"
            style={{ minHeight: "80vh" }}
        >
            <Card style={{ width: "380px" }} className="p-4 shadow-lg">
                <h2 className="text-center mb-4">Login</h2>

                {/* SUCCESS ALERTS */}
                {justRegistered && (
                    <div className="alert alert-success">
                        Account created! Please check your email for the verification code.
                    </div>
                )}

                {justVerified && (
                    <div className="alert alert-success">
                        Your account has been verified! You can now log in.
                    </div>
                )}

                {/* ERROR ALERT */}
                {error && <div className="alert alert-danger">{error}</div>}

                <Form onSubmit={handleLogin}>
                    <Form.Group className="mb-3">
                        <Form.Label>UTORid</Form.Label>
                        <Form.Control
                            type="text"
                            placeholder="Enter your UTORid"
                            required
                            value={utorid}
                            onChange={(e) => setUtorid(e.target.value)}
                        />
                    </Form.Group>

                    <Form.Group className="mb-3">
                        <Form.Label>Password</Form.Label>
                        <Form.Control
                            type="password"
                            placeholder="Enter your password"
                            required
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                        />
                    </Form.Group>

                    <Button type="submit" className="w-100 mt-2">
                        Login
                    </Button>
                </Form>

                <div className="text-center mt-3">
                    <small>Don't have an account?</small>
                    <br />
                    <Link to="/register">Create New User</Link>
                </div>
            </Card>
        </div>
    );
}
