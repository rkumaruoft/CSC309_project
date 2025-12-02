import { useState } from "react";
import { Button, Form, Alert, Card } from "react-bootstrap";
import { useNavigate } from "react-router-dom";


export default function ResetPassword() {
    const [resetToken, setResetToken] = useState("");
    const [utorid, setUtorid] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");

    const [message, setMessage] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const VITE_BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:3000";

    async function handleSubmit(e) {
        e.preventDefault();
        setMessage("");
        setError("");

        if (password !== confirmPassword) {
            setError("Passwords do not match.");
            return;
        }

        setLoading(true);

        try {
            const res = await fetch(`${VITE_BACKEND_URL}/auth/resets/${resetToken}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ utorid, password })
            });

            if (res.status === 410) {
                setError("Reset token expired.");
                return;
            }

            const data = await res.json();

            if (res.ok) {
                navigate("/login?reset=success");
                return;
            } else {
                setError(data.error || "Reset failed.");
            }
        } catch (err) {
            setError("Network error");
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="d-flex justify-content-center mt-5">
            <Card style={{ width: "400px" }}>
                <Card.Body>
                    <h3 className="text-center mb-3">Reset Password</h3>

                    {message && <Alert variant="success">{message}</Alert>}
                    {error && <Alert variant="danger">{error}</Alert>}

                    <Form onSubmit={handleSubmit}>
                        <Form.Group className="mb-3">
                            <Form.Label>Reset Token</Form.Label>
                            <Form.Control
                                type="text"
                                value={resetToken}
                                onChange={(e) => setResetToken(e.target.value)}
                                required
                            />
                        </Form.Group>

                        <Form.Group className="mb-3">
                            <Form.Label>UTORid</Form.Label>
                            <Form.Control
                                type="text"
                                value={utorid}
                                onChange={(e) => setUtorid(e.target.value)}
                                required
                            />
                        </Form.Group>

                        <Form.Group className="mb-3">
                            <Form.Label>New Password</Form.Label>
                            <Form.Control
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                            />
                        </Form.Group>

                        <Form.Group className="mb-3">
                            <Form.Label>Confirm Password</Form.Label>
                            <Form.Control
                                type="password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                required
                            />
                        </Form.Group>

                        <Button type="submit" className="w-100" disabled={loading}>
                            {loading ? "Resetting..." : "Reset Password"}
                        </Button>
                    </Form>
                </Card.Body>
            </Card>
        </div>
    );
}
