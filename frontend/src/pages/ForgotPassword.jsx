import { useState } from "react";
import { Button, Form, Alert, Card } from "react-bootstrap";
import { Link } from "react-router-dom";
import { useNavigate } from "react-router-dom";

export default function ForgotPassword() {
    const [utorid, setUtorid] = useState("");
    const [message, setMessage] = useState("");
    const [resetToken, setResetToken] = useState(null);
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const VITE_BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:3000";

    async function handleSubmit(e) {
        e.preventDefault();
        setMessage("");
        setError("");
        setResetToken(null);
        setLoading(true);

        try {
            const res = await fetch(`${VITE_BACKEND_URL}/auth/resets`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ utorid })
            });

            const data = await res.json();

            if (!res.ok) {
                setError(data.error || data.message || "Something went wrong");
            } else {
                setMessage("Reset token generated.");
                navigate("/reset-password");
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
                    <h3 className="text-center mb-3">Forgot Password</h3>

                    {message && <Alert variant="success">{message}</Alert>}
                    {error && <Alert variant="danger">{error}</Alert>}

                    {/* Show reset token for testing */}
                    {resetToken && (
                        <Alert variant="info">
                            <strong>Reset Token:</strong> {resetToken}
                        </Alert>
                    )}

                    <Form onSubmit={handleSubmit}>
                        <Form.Group className="mb-3">
                            <Form.Label>UTORid</Form.Label>
                            <Form.Control
                                type="text"
                                value={utorid}
                                onChange={(e) => setUtorid(e.target.value)}
                                placeholder="Enter your UTORid"
                                required
                            />
                        </Form.Group>

                        <Button type="submit" className="w-100" disabled={loading}>
                            {loading ? "Sending..." : "Generate Reset Token"}
                        </Button>
                    </Form>

                    <div className="text-center mt-3">
                        <Link to="/reset-password">Already have a reset token?</Link>
                    </div>
                </Card.Body>
            </Card>
        </div>
    );
}
