import { useEffect, useState } from "react";
import { Alert, Button, Card, Col, Container, Form, Row, Table } from "react-bootstrap";
import PaginationControls from "../components/PaginationControls";
import { optional } from "../utils/format/string";
import { floatToCurrency } from "../utils/format/number";
import { useLocation, useSearchParams } from "react-router-dom";
import { getUnprocessed, processRedemption } from "../utils/api/fetchRedemptions";
import LimitSelector from "../components/LimitSelector";
import SortButton from "../components/SortButton";


function CashierRedemptions() {
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);
        // Redemption fetching states
    const [redemptions, setRedemptions] = useState([]);
    const [pageNum, setPageNum] = useState(1);  // start on page 1 of promotions
    const [totalPages, setTotalPages] = useState(1);  // assumes at least one page
    const [limit, setLimit] = useState(10);
        // Sorting states
    const [sorting, setSorting] = useState(null);
    const [order, setOrder] = useState(null);
        // Input field states
    const [tid, setTid] = useState("");
    const [utorid, setUtorid] = useState("");

    const location = useLocation();
    
    // Autofill data if navigated from link
    const [searchParams] = useSearchParams();
    const urlId = searchParams.get("id");
    if (urlId) {
        setTid(urlId);
    }

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
        setTotalPages(Math.max(1, Math.ceil(data.count / limit)));
    }

    // ---------- Sorting function ----------
    // Algorithm is to call for one promotion to get a count, set
    // limit based on that count, call again, then sort using js
    // sorting functions, and set list as the first {limit} entries.
    // - NOTE: if order is null, just fetch entries at page 1 normally. 
    async function sortRedemptions(page, name) {
        // Handle !order
        if (!order) {
            getRedemptionsPage(page, name);
        }

        // Get the count
        const count = await getUnprocessed(1, "", 1);
        if (!count) {
            setRedemptions([]);
            return;
        }

        // Get all entries
        const data = await getUnprocessed(1, name, count.count);
        if (!data) {
            setRedemptions([]);
            return;
        }

        // Sort entries according to datatype
            let sorted = data.results.sort((a, b) => {
                // Should be strings/numbers
                if (typeof a[sorting] === "string") {
                    const fieldA = a[sorting];
                    const fieldB = b[sorting];

                    if (fieldA < fieldB) {
                        return -1;
                    }
                    if (fieldA > fieldB) {
                        return 1;
                    }
                    return 0;
                } else if (typeof a[sorting] === "number") {
                    return a[sorting] - b[sorting];
                }
            });

        // Reverse if descending
        if (order === "desc") {
            sorted.reverse();
        }

        // Get the first {limit} entries and set pageNum/promos
        const slicedSorted = sorted.slice((page - 1) * limit, page * limit);
        setPageNum(page);
        setRedemptions(slicedSorted);
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
        sortRedemptions(1, utorid);
    }

    // ---------- On sorting/order change, sort the table ----------
    useEffect(() => {
        sortRedemptions(1, utorid);
    }, [sorting, order]);

    // ---------- On navigation/limit set, set redemptions ----------
    useEffect(() => {
        setUtorid("");
        setError(null);
        setSuccess(null);
        setSorting(null);
        setOrder(null);
        sortRedemptions(1, utorid);
    }, [location, limit]);

    // ---------- On filter, refresh table ----------
    useEffect(() => {
        setError(null);
        setSuccess(null);
        setSorting(null);
        setOrder(null);
        sortRedemptions(1, utorid)
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
                                    <th>
                                        Transaction ID
                                        <SortButton
                                            field={"id"}
                                            sorting={sorting}
                                            setSorting={setSorting}
                                            order={order}
                                            setOrder={setOrder}
                                        />
                                    </th>
                                    <th>
                                        UTORid
                                        <SortButton
                                            field={"utorid"}
                                            sorting={sorting}
                                            setSorting={setSorting}
                                            order={order}
                                            setOrder={setOrder}
                                        />
                                    </th>
                                    <th>
                                        Points
                                        <SortButton
                                            field={"amount"}
                                            sorting={sorting}
                                            setSorting={setSorting}
                                            order={order}
                                            setOrder={setOrder}
                                        />
                                    </th>
                                    <th>
                                        Spent
                                        <SortButton
                                            field={"spent"}
                                            sorting={sorting}
                                            setSorting={setSorting}
                                            order={order}
                                            setOrder={setOrder}
                                        />
                                    </th>
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

                {/* Pagination and page display */}
                <Row className="justify-content-center align-items-center mb-2">
                    <Col xs="auto">
                        <PaginationControls page={pageNum} totalPages={totalPages} onPageChange={(p) => sortRedemptions(p, utorid)} disabled={false} />
                    </Col>
                </Row>

            </Card.Body>
        </Card>
    </Container>;

}

export default CashierRedemptions;