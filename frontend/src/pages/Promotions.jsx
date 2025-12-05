import { useEffect, useState } from "react";
import { Button, Col, Container, Row, Image, Modal, Table, Card } from "react-bootstrap";
import { useLocation } from "react-router-dom";
import { getAllPromos, getPromoId } from "../utils/api/fetchPromos"
import PaginationControls from "../components/PaginationControls";
import PromoTable from "../components/promotions/PromoTable.jsx";
import PromoFilter from "../components/promotions/PromoFilter.jsx";
import { capitalize, optional } from "../utils/format/string.js";
import { floatToCurrency, formatRate } from "../utils/format/number.js";
import { formatTime } from "../utils/format/date.js";
import "./Promotions.css";
import { promoTypeLabel } from "../utils/format/promotion";


function Promotions() {
    // ---------- Page states ----------
        // Promo fetching states
    const [promos, setPromos] = useState(null);
    const [pageNum, setPageNum] = useState(1);  // start on page 1 of promotions
    const [totalPages, setTotalPages] = useState(1);  // assumes at least one page
    const [limit, setLimit] = useState(10);
        // Sorting states
    const [sorting, setSorting] = useState(null);
    const [order, setOrder] = useState(null);
        // Additional states
    const [filters, setFilters] = useState({});
    const [currPromo, setCurrPromo] = useState(null);

    // ---------- Component States ----------
    const [clicked, setClicked] = useState(null);
    const [showFilter, setShowFilter] = useState(false);
    const location = useLocation();

    // ---------- Fetch a page of promotions (10 at a time, as per the default) ----------
    async function getPromos(page) {
        if (page < 1 || page > totalPages) {
            return;
        }

        const data = await getAllPromos(page, limit, filters);

        // Handle request failure
        if (!data) {
            setPromos(null);
            return;
        }

        // Handle successful request
        setPromos(data.results);
        setPageNum(page);
        setTotalPages(Math.max(1, Math.ceil(data.count / limit)));
    }

    // ---------- Sorting function ----------
    // Algorithm is to call for one promotion to get a count, set
    // limit based on that count, call again, then sort using js
    // sorting functions, and set list as the first {limit} entries.
    // - NOTE: if order is null, just fetch entries at page 1 normally. 
    async function sortPromotions(page) {
        // Handle !order
        if (!order) {
            getPromos(page);
        }

        // Get the count
        const count = await getAllPromos(1, 1, {});
        if (!count) {
            setPromos(null);
            return;
        }

        // Get all entries
        const data = await getAllPromos(1, count.count, filters);
        if (!data) {
            setPromos(null);
            return;
        }

        // Sort entries according to datatype
        let sorted = data.results.sort((a, b) => {
            // Should be strings
            const fieldA = a[sorting].toUpperCase();
            const fieldB = b[sorting].toUpperCase();

            if (fieldA < fieldB) {
                return -1;
            }
            if (fieldA > fieldB) {
                return 1;
            }
            return 0;
        });

        // Reverse if descending
        if (order === "desc") {
            sorted.reverse();
        }

        // Get the first {limit} entries and set pageNum/promos
        const slicedSorted = sorted.slice((page - 1) * limit, page * limit);
        setPageNum(page);
        setPromos(slicedSorted);
    }

    // ---------- Close the currently clicked-on promotion ----------
    function closeCurrPromo() {
        setCurrPromo(null);
        setClicked(null);
    }

    // ---------- On sorting/order change, sort the table ----------
    useEffect(() => {
        sortPromotions(1);
    }, [sorting, order]);

    // ---------- On navigation/filtering/setting limit, fetch promotions ----------
    useEffect(() => {
        setSorting(null);
        setOrder(null);
        sortPromotions(1);
    }, [location, filters, limit]);

    // ---------- On clicked set, fetch the clicked promotion data ----------
    useEffect(() => {
        if (!currPromo && clicked) {
            async function loadPromoId() {
                const data = await getPromoId(clicked);
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
                <Row className="justify-content-center align-items-center mb-0">
                    <Col xs="auto">
                        <div className="d-flex align-items-center gap-3">
                            <h1 className="m-0">Promotions</h1>

                            <Image
                                draggable={false}
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

                {/* Table */}
                <Row className="justify-content-center">
                    <Col>

                        <PromoTable
                            promos={promos}
                            setClicked={setClicked}
                            setLimit={setLimit}
                            filters={filters}
                            setFilters={setFilters}
                            sorting={sorting}
                            setSorting={setSorting}
                            order={order}
                            setOrder={setOrder}
                        />

                    </Col>
                </Row>

                {/* Pagination and page display*/}
                <Row className="justify-content-center align-items-center mb-2">
                    <Col xs="auto">
                        <PaginationControls page={pageNum} totalPages={totalPages} onPageChange={(p) => sortPromotions(p)} disabled={false} />
                    </Col>
                </Row>
            </Card.Body>
        </Card>

        {/* On-click effect */}
        {currPromo && 
        <Row>
            <Col>
            
                <Modal show={clicked} onHide={closeCurrPromo}>
                    <Modal.Header closeButton className="bg-primary text-light">
                        <Modal.Title>Promotion Details</Modal.Title>
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
                                    <td>{promoTypeLabel(currPromo.type)}</td>
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
