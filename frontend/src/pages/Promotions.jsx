import { useEffect, useState } from "react";
import { Button, Col, Container, Row, Image, Modal, Table, Card } from "react-bootstrap";
import { useLocation } from "react-router-dom";
import { getAllPromos, getPromoId } from "../utils/api/fetchPromos"
import PromoTable from "../components/promotions/PromoTable.jsx";
import PromoFilter from "../components/promotions/PromoFilter.jsx";
import AppliedFilters from "../components/promotions/PromoAppliedFilters.jsx";
import { capitalize, optional } from "../utils/format/string.js";
import { floatToCurrency, formatRate } from "../utils/format/number.js";
import { formatTime } from "../utils/format/date.js";
import "./Promotions.css";


function Promotions() {
    // ---------- Page states ----------
    const [promos, setPromos] = useState(null);
    const [pageNum, setPageNum] = useState(1);  // start on page 1 of promotions
    const [totalPages, setTotalPages] = useState(1);  // assumes at least one page
    const [filters, setFilters] = useState({});
    const [currPromo, setCurrPromo] = useState(null);

    // ---------- Component States ----------
    const [clicked, setClicked] = useState(null);
    const [showFilter, setShowFilter] = useState(false);
    const location = useLocation();

    // ---------- Fetch a page of promotions (10 at a time, as per the default) ----------
    async function getPromos(page) {
        // TODO: look into adding filters???
        // Invalid page; don't do anything
        if (page < 1 || page > totalPages) {
            return;
        }

        const data = await getAllPromos(page, filters);

        // Handle request failure
        if (!data) {
            setPromos(null);
            return;
        }

        // Handle successful request
        setPromos(data.results);
        setPageNum(page);
        setTotalPages(Math.max(1, Math.ceil(data.count / 10)));
    }

    function closeCurrPromo() {
        setCurrPromo(null);
        setClicked(null);
    }

    // ---------- On navigation to promotions page, fetch promotions ----------
    useEffect(() => {
        getPromos(pageNum);
    }, [location]);

    // ---------- On filters set, re-fetch promotions ----------
    useEffect(() => {
        getPromos(pageNum);
    }, [filters]);

    // ---------- On clicked set, fetch the clicked promotion data ----------
    useEffect(() => {
        if (!currPromo && clicked) {
            async function loadPromoId() {
                const data = await getPromoId(clicked);
                console.log(data);
                setCurrPromo(data);
            }

            loadPromoId();
        }
    }, [clicked]);

    // ---------- Return the page ----------
    // TODO: change table spacing once we have login implemented
    return <Container>
        <Card className="shadow-sm mt-4">
            <Card.Body>
                {/* Label */}
                <Row className="justify-content-center align-items-center mb-3">
                    <Col xs="auto">
                        <div className="d-flex align-items-center gap-3">
                            <h1 className="m-0">Promotions</h1>

                            <Image
                                src="../../filter.svg"
                                alt="Filter"
                                className="filter opacity-75"
                                onClick={() => setShowFilter(!showFilter)}
                            />
                        </div>
                    </Col>
                </Row>

                {/* Show the filter menu */}
                {showFilter &&
                <Row className="justify-content-center align-items-center">
                    <Col xs="auto" className="m-2">
                        <PromoFilter setFilters={setFilters} setShowFilter={setShowFilter} />
                    </Col>
                </Row>}
                
                {/* Show the current filters */}
                {Object.keys(filters).length > 0 &&
                <Row className="justify-content-center align-items-center mb-1">
                    <Col xs="auto">
                        <AppliedFilters filters={filters} setFilters={setFilters} />
                    </Col>
                </Row>}

                {/* Table */}
                <Row className="justify-content-center">
                    <Col>

                        <PromoTable promos={promos} setClicked={setClicked} />

                    </Col>
                </Row>

                {/* Pagination and page display (TODO: add better page scrolling as an option) */}
                <Row className="justify-content-center align-items-center mb-2">
                    {/* Back button */}
                    <Col xs="auto">
                        <Button
                            onClick={() => getPromos(pageNum - 1)}
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
                            onClick={() => getPromos(pageNum + 1)}
                            disabled={pageNum === totalPages}>
                                Next
                        </Button>
                    </Col>
            
                </Row>
            </Card.Body>
        </Card>

        {/* On-click effect */}
        {currPromo && 
        <Row>
            <Col>
            
                <Modal show={clicked} onHide={closeCurrPromo}>
                    <Modal.Header closeButton className="bg-light">
                        <Modal.Title><strong>Promotion Details</strong></Modal.Title>
                    </Modal.Header>
                    <Modal.Body className="d-flex flex-column justify-content-center align-items-center">
                        
                        <Table>
                            <tbody>
                                <tr>
                                    <th>Name:</th>
                                    <td>{capitalize(currPromo.name)}</td>
                                </tr>

                                <tr>
                                    <th>Description:</th>
                                    <td>{currPromo.description}</td>
                                </tr>

                                <tr>
                                    <th>Type:</th>
                                    <td>{capitalize(currPromo.type)}</td>
                                </tr>

                                <tr>
                                    <th>Starts at:</th>
                                    <td>{formatTime(currPromo.startTime)}</td>
                                </tr>

                                <tr>
                                    <th>Ends at:</th>
                                    <td>{formatTime(currPromo.endTime)}</td>
                                </tr>

                                <tr>
                                    <th>Minimum Spending:</th>
                                    <td>{optional(currPromo.minSpending, floatToCurrency)}</td>
                                </tr>

                                <tr>
                                    <th>Rate:</th>
                                    <td>{optional(currPromo.rate, formatRate)}</td>
                                </tr>

                                <tr>
                                    <th>Bonus Points:</th>
                                    <td>{optional(currPromo.points)}</td>
                                </tr>
                            </tbody>
                        </Table>

                    </Modal.Body>
                    <Modal.Footer className="bg-light">
                        <Button onClick={closeCurrPromo}>Close</Button>
                    </Modal.Footer>
                </Modal>

            </Col>
        </Row>}

    </Container>;
}

export default Promotions;
