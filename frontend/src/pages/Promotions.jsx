import { useEffect, useState } from "react";
import { Button, Col, Container, Row, Table, Form } from "react-bootstrap";
import { useLocation } from "react-router-dom";

// Setting up backend URL (TODO: how are we doing this?)
const VITE_BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:3000";

function Promotions() {
    const [promos, setPromos] = useState(null);
    const [pageNum, setPageNum] = useState(1);  // start on page 1 of promotions
    const [totalPages, setTotalPages] = useState(1);  // assumes at least one page
    const location = useLocation()

    const token = localStorage.getItem("token");

    // ---------- Helpers for fetchPromos ----------
    function capitalize(str) {
        if (str.length === 0) {
            return "";
        }

        return str.charAt(0).toUpperCase() + str.slice(1);
    }

    function floatToCurrency(flt) {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD'
        }).format(flt);
    }

    function formatRate(rate) {
        return `${Math.round(rate * 100)} point(s) per dollar.`;
    }

    function formatPromos(promos) {
        let new_promos = [];
        for (const promo of promos) {
            const new_promo = {};
            new_promo.id = promo.id;
            new_promo.name = promo.name;
            new_promo.type = capitalize(promo.type);
            new_promo.endTime = new Date(promo.endTime).toDateString();
            new_promo.minSpending = promo.minSpending === null ? "N/A" : floatToCurrency(promo.minSpending);
            new_promo.rate = promo.rate === null ? "N/A" : formatRate(promo.rate);
            new_promos.push(new_promo);
        }

        return new_promos;
    }

    // ---------- Fetch a page of promotions (10 at a time, as per the default) ----------
    async function fetchPromos(page) {
        // TODO: look into adding filters???
        // Invalid page; don't do anything
        if (page < 1 || page > totalPages) {
            return;
        }

        // Format query params
        const params = {
            page: page
        };
        const url = `${VITE_BACKEND_URL}/promotions?${new URLSearchParams(params).toString()}`;

        // Sending backend request
        const res = await fetch(url, {
            method: "GET",
            headers: {
                Authorization: `Bearer ${token}`
            }
        });
        const data = await res.json();

        // Handle request failure
        if (!res.ok) {
            setPromos(null);
            return;
        }

        // Handle successful request
        setPromos(formatPromos(data.results));
        setPageNum(page);
        setTotalPages(Math.max(1, Math.ceil(data.count / 10)))
    }

    // ---------- On navigation to promotions page, fetch promotions ----------
    useEffect(() => {
        fetchPromos(pageNum);
    }, [location]);

    // ---------- Return the page ----------
    // TODO: change table spacing once we have login implemented
    return <Container>
        {/* Label */}
        <Row className="justify-content-center align-items-center mt-5">
            <Col>
                <Form.Label id="promotions-label" className="d-block text-center mb-2">
                    <h1>Promotions</h1>
                </Form.Label>
            </Col>
        </Row>

        {/* Table */}
        <Row className="justify-content-center">
            <Col xs={12} md={10} lg={8}>

                <Table aria-labelledby="promotions-label" bordered responsive>
                    <thead className="table-primary">
                        <tr>
                            <th>Name</th>
                            <th>Type</th>
                            <th>Ends At</th>
                            <th>Minimum Spending</th>
                            <th>Rate</th>
                        </tr>
                    </thead>

                    <tbody>
                        {(promos === null || promos.length === 0) ? (
                            <tr>
                                <td colSpan={5} className="text-center">
                                        No promotions could be found
                                </td>
                            </tr>
                        ) : (
                            promos.map(item => (
                                <tr key={item.id}>
                                    <td>{item.name}</td>
                                    <td>{item.type}</td>
                                    <td>{item.endTime}</td>
                                    <td>{item.minSpending}</td>
                                    <td>{item.rate}</td>
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
                    onClick={() => fetchPromos(pageNum - 1)}
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
                    onClick={() => fetchPromos(pageNum + 1)}
                    disabled={pageNum === totalPages}>
                        Next
                </Button>
            </Col>
    
        </Row>
    </Container>;
}

export default Promotions;
