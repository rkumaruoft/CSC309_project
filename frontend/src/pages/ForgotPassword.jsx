import { useState } from "react";
import { Button, Form, Alert, Card } from "react-bootstrap";

export default function ForgotPassword() {
    const [identifier, setIdentifier] = useState(""); // utorid OR email
    const [message, setMessage] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const VITE_BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:3000";

    async function handleSubmit(e) {
        e.preventDefault();
        setMessage("");
        setError("");
        setLoading(true);

        try {
            const res = await fetch(`${VITE_BACKEND_URL}/auth/reset/request`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ identifier })
            });

            const data = await res.json();

            if (!res.ok) {
                setError(data.error || "Something went wrong");
            } else {
                setMessage(data.message || "Reset code sent!");
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

                    <Form onSubmit={handleSubmit}>
                        <Form.Group className="mb-3">
                            <Form.Label>UTORid or Email</Form.Label>
                            <Form.Control
                                type="text"
                                value={identifier}
                                onChange={(e) => setIdentifier(e.target.value)}
                                placeholder="Enter UTORid or email"
                                required
                            />
                        </Form.Group>

                        <Button type="submit" className="w-100" disabled={loading}>
                            {loading ? "Sending..." : "Send Reset Code"}
                        </Button>
                    </Form>
                </Card.Body>
            </Card>
        </div>
    );
}
