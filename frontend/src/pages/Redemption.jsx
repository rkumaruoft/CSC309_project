import { useEffect, useRef, useState } from "react";
import { Badge, Button, Card, Col, Container, Form, Modal, Row } from "react-bootstrap";
import { useLocation } from "react-router-dom";


// Setting up backend URL (TODO: how are we doing this?)
const VITE_BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:3000";

// TODO: make points a user state/context that comes from "outside"
function Redemption({ points }) {
    const [redeem, setRedeem] = useState("");  // points in the redeem field
    const [transaction, setTransaction] = useState(null);  // contains id and amount
    const [error, setError] = useState("");

    const inputRef = useRef();
    const location = useLocation();

    const token = localStorage.getItem("token");

    // ---------- Initialize error to nothing on reload ----------
    useEffect(() => {
        setError("");
    }, [location]);

    // ---------- Handle redeem and error value changes ----------
    function handleRedeemChange(e) {
        setRedeem(e.target.value);
        setError("");
        e.target.setCustomValidity("");
    }

    // ---------- Handle submit of redemption ----------
    async function submitRedemption(e) {
        e.preventDefault();

        // Input validation
        const positiveIntReg = /^[0-9]*$/;
        if (!positiveIntReg.test(redeem)) {
            setTransaction(null);
            inputRef.current.setCustomValidity("Please input a positive integer.");
            return;
        }

        const redeemInt = Number(redeem);
        if (points < redeemInt) {
            setTransaction(null);
            inputRef.current.setCustomValidity("You're redeeming too many points.");
            return;
        }

        // Handle valid number of points
        const res = await fetch(`${VITE_BACKEND_URL}/users/me/transactions`, {
            method: "POST",
            headers: {
                Authorization: `Bearer ${token}`
            },
            body: JSON.stringify({
                type: "redemption",
                amount: redeemInt
            })
        });
        const data = await res.json();

        // Handle request failure
        if (!res.ok) {
            // setTransaction(null);
            // setError(`Something went wrong: ${data.error}`);
            // return;

            // TODO: test on valid data
            // If invalid token, use demo for testing
            const demoTransaction = {
                id: 1,
                amount: redeemInt
            };
            setTransaction(demoTransaction);
            setError("");
            return;
        }

        // Handle successful request
        setTransaction({
            id: data.id,
            amount: data.amount
        });
        setError("");
    }

    // ---------- Cancels the currently unprocessed transaction ----------
    function cancelRedemption() {
        setTransaction(null);
        setError("");
    }

    // ---------- Return the page ----------
    return <Container>
        {/* Label for page */}
        <Row className="justify-content-center align-items-center mt-5">
            <Col>
                <Form.Label id="redemption-label" className="d-block mb-3">
                    <h1>Redeem Your Points</h1>
                </Form.Label>
            </Col>
        </Row>

        {/* Redeem-points form */}
        <Row>
            <Col>

                <Form onSubmit={submitRedemption} aria-labelledby="redemption-label">
                    <Card style={{ backgroundColor: "#FFF9C4" }}>
                        <Form.Group className="m-3">
                            <Form.Label>
                                <span className="fs-4">Your Balance:</span> {" "}
                                <Badge
                                    bg="warning"
                                    text="dark"
                                    className="fs-6 border">
                                        {points} <span className="fw-normal">points</span>
                                </Badge>
                            </Form.Label>
                            
                            {/* TODO: add remarks! */}
                            <Form.Control
                                ref={inputRef}
                                type="number"
                                required
                                value={redeem}
                                onChange={handleRedeemChange}
                                placeholder="Enter a positive number of points" />
                        </Form.Group>
                    </Card>

                    <Button variant="warning" className="mt-4"
                        type="submit">Generate QR Code</Button>
                </Form>

            </Col>
        </Row>

        {/* Show error if needed */}
        {error && 
        <Row>
            <Col>
                <Form.Label className="d-block text-center text-danger">
                    {error}
                </Form.Label>
            </Col>
        </Row>}

        {/* Show after QR code generates */}
        {transaction &&
        <Row>
            <Col>
                <Modal show={transaction} onHide={() => setTransaction(null)}>
                    <Modal.Header closeButton style={{ backgroundColor: "#FFF9C4" }}>
                        <Modal.Title>Scan to Redeem Your Transaction</Modal.Title>
                    </Modal.Header>
                    <Modal.Body className="d-flex flex-column justify-content-center align-items-center">
                        <p className="mb-1">Redeeming <strong>{transaction.amount}</strong> points</p>
                        <div style={{ width: 220, height: 220, background: '#f5f5f5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <div className="text-muted">QR</div>
                        </div>
                    </Modal.Body>
                    <Modal.Footer style={{ backgroundColor: "#FFF9C4" }}>
                        <Button variant="warning" onClick={() => setTransaction(null)}>Cancel</Button>
                    </Modal.Footer>
                </Modal>
            </Col>
        </Row>}

    </Container>;
    

}

export default Redemption;