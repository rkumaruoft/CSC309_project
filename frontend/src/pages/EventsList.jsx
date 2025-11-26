import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { Button } from "react-bootstrap";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:3000";

export default function EventsList() {
    const location = useLocation();
    const token = localStorage.getItem("token");
    const [events, setEvents] = useState([]);
    const [pageNum, setPageNum] = useState(1);
    const [selectedEvent, setSelectedEvent] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const [totalPages, setTotalPages] = useState(1);

    const handleRowClick = (event) => {
        setSelectedEvent(event);
        setShowModal(true);
    };


    function formatEvents(events) {
        let new_events = [];
        for (const event of events) {
            const num_guests = event.guests.length;
            const remaining_seats = event.capacity - num_guests;
            const new_event = {};
            new_event.id = event.id;
            new_event.name = event.name;
            new_event.location = event.location;
            new_event.endTime = new Date(event.endTime).toDateString();
            new_event.pointsRemain = event.pointsRemain;
            new_event.avilableSeats = remaining_seats;
            new_events.push(new_promo);
        }
        return new_events;
    }

    // async function showPopUp(id){
    //     const params = { id: id };
    //     const event = await fetch(`${BACKEND_URL}/events?${new URLSearchParams(params).toString()}`, {
    //         method: "GET",
    //         headers: {
    //             Authorization: `Bearer ${token}`
    //         }
    //     }
    // );
    // }

    async function fetchEvents(page){
        if (page < 1 || page > totalPages) {
            return;
        }

        const params = { page: page };
        const url = `${BACKEND_URL}/events?${new URLSearchParams(params).toString()}`;

        const res = await fetch(url, {
            method: "GET",
            headers: {
                Authorization: `Bearer ${token}`
            }
        });
        const data = await res.json();

        if (!res.ok) {
            const numDemos = 10;
            const numPages = 2;
            const demoEvents = [];
            for (let i = 0; i < numDemos; i++) {
                demoEvents.push({
                    id: i,
                    name: `Event ${i + 1}`,
                    location: `Location ${i + 1}`,
                    pointsRemain: 100 + i,
                    startTime: new Date(Date.now() - (1000 * 60 * 60 * 24 * (i+1))),
                    endTime: new Date(Date.now() + (1000 * 60 * 60 * 24 * (i+1))),
                    capacity: i + 20,
                    guests: ["a", "b", "c"]
                });
            }
            setEvents(demoEvents);
            setPageNum(page);
            setTotalPages(numPages);
            return;
        }
        setEvents(formatEvents(data.results));
        setPageNum(page);
        setTotalPages(Math.max(1, Math.ceil(data.count / 10)));
    }

    useEffect(() => {
        fetchEvents(pageNum);
    }, [location]);

    return (
    <Container>
        <Row className="justify-content-center align-items-center mt-5">
            <Col>
                <Form.Label className="d-block text-center mb-2">
                    <h1>Events</h1>
                </Form.Label>
            </Col>
        </Row>

        {/* Table */}
        <Row className="justify-content-center" onClick>
            <Col xs={12} md={10} lg={8}>

                <Table bordered responsive>
                    <thead>
                        <tr>
                            <th style={{ backgroundColor: "#FFF9C4" }}>Name</th>
                            <th style={{ backgroundColor: "#FFF9C4" }}>Location</th>
                            <th style={{ backgroundColor: "#FFF9C4" }}>Ends At</th>
                            <th style={{ backgroundColor: "#FFF9C4" }}>Points available</th>
                            <th style={{ backgroundColor: "#FFF9C4" }}>Available slots</th>
                        </tr>
                    </thead>

                    <tbody>
                        {promos === null ? (
                            <tr>
                                <td colSpan={5} className="text-center">
                                        Page {pageNum} could not be found
                                </td>
                            </tr>
                        ) : (
                            promos.map(item => (
                                <tr key={item.id} onClick={() => handleRowClick(item.id)} style={{cursor: "pointer"}}>
                                    <td>{item.name}</td>
                                    <td>{item.location}</td>
                                    <td>{item.endTime}</td>
                                    <td>{item.pointsRemain}</td>
                                    <td>{item.avilableSeats}</td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </Table>

            </Col>
        </Row>

        {/* Pagination and page display */}
        <Row className="justify-content-center align-items-center">
            {/* Back button */}
            <Col xs="auto">
                <Button
                    variant="warning"
                    onClick={() => fetchEvents(pageNum - 1)}
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
                    variant="warning"
                    onClick={() => fetchEvents(pageNum + 1)}
                    disabled={pageNum === totalPages}>
                        Next
                </Button>
            </Col>
        </Row>
        <Modal show={showModal} onHide={() => setShowModal(false)}>
            <Modal.Header closeButton>
                <Modal.Title>{selectedEvent?.name}</Modal.Title>
            </Modal.Header>

            <Modal.Body>
                <p><strong>Location:</strong> {selectedEvent?.location}</p>
                <p><strong>Ends:</strong> {selectedEvent?.endTime}</p>
                <p><strong>Points Available:</strong> {selectedEvent?.pointsRemain}</p>
                <p><strong>Seats:</strong> {selectedEvent?.avilableSeats}</p>
            </Modal.Body>

            <Modal.Footer>
                <Button variant="secondary" onClick={() => setShowModal(false)}>
                    Close
                </Button>
            </Modal.Footer>
        </Modal>
        </Container>
    );
}
