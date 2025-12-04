import { useEffect, useState } from "react";
import { Alert, Button, Card, Col, Container, Form, Row, Table } from "react-bootstrap";
import { optional } from "../utils/format/string";
import { floatToCurrency } from "../utils/format/number";
import { useLocation } from "react-router-dom";
import { getUnprocessed, processRedemption } from "../utils/api/fetchRedemptions";
import LimitSelector from "../components/LimitSelector";


function CashierRedemptions() {
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);
    const [redemptions, setRedemptions] = useState([]);
    const [pageNum, setPageNum] = useState(1);  // start on page 1 of promotions
    const [totalPages, setTotalPages] = useState(1);  // assumes at least one page
    const [limit, setLimit] = useState(10);
        // Input field states
    const [tid, setTid] = useState("");
    const [utorid, setUtorid] = useState("");

    const location = useLocation();

    // ---------- Fetch a page of redemptions (10 at a time, as per the default) ----------
    async function getRedemptionsPage(page, name) {
        // Invalid page; don't do anything
        if (page < 1 || page > totalPages) {
            return;
        }

        const data = await getUnprocessed(page, name, limit);

        // Handle request failure
        if (!data) {
            setRedemptions([]);
            return;
        }

        // Handle successful request
        setRedemptions(data.results);
        setPageNum(page);
        const total = Math.max(1, Math.ceil(data.count / limit));
        setTotalPages(total);

        // Handle overflow (sets back to last page)
        if (page > total) {
            getRedemptionsPage(1);
        }
    }

    // ---------- Handle proccessing ----------
    async function process(e) {
        e.preventDefault();

        const data = await processRedemption(tid);

        if ("error" in data) {
            setSuccess(null);
            setError(`Couldn't process redemption: ${data.error}`);
            return;
        }

        setError(null);
        setSuccess("Successfully redeemed promotion!");
        setTid("");
        getRedemptionsPage(1, utorid);
    }

    // ---------- On navigation, set redemptions ----------
    useEffect(() => {
        setUtorid("");
        setError(null);
        setSuccess(null);
        getRedemptionsPage(pageNum, utorid);
    }, [location, limit]);

    // ---------- On filter, refresh table ----------
    useEffect(() => {
        setError(null);
        setSuccess(null);
        getRedemptionsPage(1, utorid)
    }, [utorid]);

    return <Container>
        <Card className="shadow-sm mt-4">
            <Card.Body>

                <Row className="justify-content-center align-items-center mb-0">
                    <Col>
                        <h2>Process Redemptions</h2>
                    </Col>
                </Row>

                {/* Manual input of transaction */}
                <Row>
                    <Col xs={10} md={8} lg={6}>
                    
                        <Card className="shadow-sm mb-0" bg="light">
                            <Form className="m-3" onSubmit={process}>
                                <Form.Group className="d-flex align-items-center">
                                    <Form.Label className="mb-0 me-2">
                                        <h5>Enter transaction ID:</h5>
                                    </Form.Label>

                                    <Form.Control
                                        required
                                        type="number"
                                        value={tid}
                                        onChange={(e) => setTid(e.target.value)}
                                        placeholder="Enter transaction ID"
                                        className="w-50 shadow-sm me-2"
                                    />

                                    <Button
                                        disabled={!tid}
                                        variant="success"
                                        type="submit">
                                            Process
                                    </Button>
                                </Form.Group>
                            </Form>
                        </Card>

                    </Col>

                    {/* Display success or error */}
                    <Col>
                        {success &&
                        <Alert variant="success" className="float-end">
                            {success}
                        </Alert>}

                        {error &&
                        <Alert variant="danger" className="float-end">
                            {`Error: ${error}`}
                        </Alert>}
                    </Col>
                </Row>

                <Row>
                    <Col>
                        <hr />
                        <h5 className="mb-0">You can also find the unprocessed redemption below:</h5>
                    </Col>
                </Row>

                <Row>
                    <Col>
                        <Form.Control
                            type="text"
                            value={utorid}
                            onChange={(e) => setUtorid(e.target.value)}
                            placeholder="Filter by UTORid"
                            className="w-50 mb-2"
                        />
                    </Col>

                    <Col xs="auto">
                        <div className="d-flex flow-end">
                            <LimitSelector setLimit={setLimit} />
                        </div>
                    </Col>
                </Row>

                <Row>
                    <Col>
                    
                        <Table className="shadow-sm" striped responsive hover>
                            <thead className="table-primary">
                                <tr>
                                    <th>Transaction ID</th>
                                    <th>UTORid</th>
                                    <th>Points</th>
                                    <th>Spent</th>
                                </tr>
                            </thead>

                            <tbody className="promo-table-body">
                                {(redemptions.length === 0) ? (
                                    <tr>
                                        <td colSpan={4} className="text-center">
                                                No redemptions could be found
                                        </td>
                                    </tr>
                                ) : (
                                    redemptions.map(item => (
                                        <tr key={item.id} onClick={() => setTid(item.id)}>
                                            <td>{item.id}</td>
                                            <td>{item.utorid}</td>
                                            <td>{item.amount}</td>
                                            <td>{optional(item.spent, floatToCurrency)}</td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </Table>

                    </Col>
                </Row>

                {/* Pagination and page display (TODO: add better page scrolling as an option) */}
                <Row className="justify-content-center align-items-center mb-2">
                    {/* Back button */}
                    <Col xs="auto">
                        <Button
                            onClick={() => getRedemptionsPage(pageNum - 1)}
                            disabled={pageNum === 1}>
                                Back
                        </Button>
                    </Col>

                    {/* Page Number */}
                    <Col xs="auto">
                        <span>
                            Page: <strong>{pageNum}/{totalPages}</strong>
                        </span>
                    </Col>

                    {/* Forward Button */}
                    <Col xs="auto">
                        <Button
                            onClick={() => getRedemptionsPage(pageNum + 1)}
                            disabled={pageNum === totalPages}>
                                Next
                        </Button>
                    </Col>
            
                </Row>

            </Card.Body>
        </Card>
    </Container>;

}

export default CashierRedemptions;