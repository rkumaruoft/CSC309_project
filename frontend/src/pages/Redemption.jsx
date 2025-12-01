import { useEffect, useRef, useState } from "react";
import { Badge, Button, Card, Col, Container, Form, Modal, Row } from "react-bootstrap";
import { useLocation } from "react-router-dom";


// Setting up backend URL (TODO: how are we doing this?)
const VITE_BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:3000";

function Redemption() {
    const [points, setPoints] = useState(0);
    const [redeem, setRedeem] = useState("");  // points in the redeem field
    const [transaction, setTransaction] = useState(null);  // contains id and amount
    const [error, setError] = useState("");

    const inputRef = useRef();
    const location = useLocation();

    const token = localStorage.getItem("token");

    // ---------- Initialize error to nothing on reload ----------
    useEffect(() => {
        setError("");
        const userStr = localStorage.getItem("user");
        let currPoints = 0;
        if (userStr) {
            try {
                const userObj = JSON.parse(userStr);
                currPoints = userObj.points || 0;
            } catch (e) {
                currPoints = 0;
            }
        }
        setPoints(currPoints);
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
        if (!positiveIntReg.test(redeem) || redeem === "0") {
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
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                type: "redemption",
                amount: redeemInt
            })
        });
        const data = await res.json();

        // Handle request failure
        if (!res.ok) {
            setTransaction(null);
            setError(`Something went wrong: ${data.error}`);
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
                    <Card className="shadow-sm">
                        <Form.Group className="m-3">
                            <Form.Label>
                                <span className="fs-4">Your Balance:</span> {" "}
                                <Badge
                                    bg="light"
                                    text="dark"
                                    className="fs-6">
                                        {points} <span className="fw-normal">points</span>
                                </Badge>
                            </Form.Label>
                            
                            {/* TODO: add remarks! */}
                            <Form.Control
                                className="bg-light"
                                ref={inputRef}
                                type="number"
                                required
                                value={redeem}
                                onChange={handleRedeemChange}
                                placeholder="Enter a positive number of points" />
                        </Form.Group>
                    </Card>

                    <Button className="mt-4"
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
                <Modal show={transaction} onHide={cancelRedemption}>
                    <Modal.Header closeButton className="bg-light">
                        <Modal.Title>Scan to Redeem Your Transaction</Modal.Title>
                    </Modal.Header>
                    <Modal.Body className="d-flex flex-column justify-content-center align-items-center">
                        <p className="mb-1">Redeeming <strong>{transaction.amount}</strong> points</p>
                        {/* Placeholder for QR code */}
                        <div className="d-flex justify-content-center">
                            <img
                                alt="qr-user"
                                src={`https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(`transaction:${transaction.id}`)}`}
                                style={{ width: 260, height: 260 }}
                                className="img-fluid rounded"
                            />
                        </div>
                    </Modal.Body>
                    <Modal.Footer className="bg-light">
                        <Button onClick={cancelRedemption}>Cancel</Button>
                    </Modal.Footer>
                </Modal>
            </Col>
        </Row>}

    </Container>;
    

}

export default Redemption;