import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { Button, Form, Col, Container, Row, Table, Modal} from "react-bootstrap";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:3000";

export default function EventsList() {
    const location = useLocation();
    const token = localStorage.getItem("token");
    const user_info = localStorage.getItem("")
    const [isEditing, setIsEditing] = useState(false);
    const [editData, setEditData] = useState({});
    const [events, setEvents] = useState([]);
    const [pageNum, setPageNum] = useState(1);
    const [selectedEvent, setSelectedEvent] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const [totalPages, setTotalPages] = useState(1);
    const [rsvp, setRSVP] = useState(false)

    const handleRowClick = async (event) => {
        const url = `${BACKEND_URL}/events/${event.id}`;
        const ev = await fetch(url, {method: "GET", headers: {Authorization: `Bearer ${token}`}});
        const data = await ev.json();
        let formatted_event = formatEvents([data]);
        formatted_event = formatted_event[0]; 
        setSelectedEvent(formatted_event);
        setEditData(formatted_event);
        setIsEditing(false);
        setShowModal(true);
    };

    function renderEditForm() {
        return (
            <Form>
                <Form.Group className="mb-3">
                    <Form.Label>Name</Form.Label>
                    <Form.Control
                        type="text"
                        value={editData.name}
                        onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                    />
                </Form.Group>

                <Form.Group className="mb-3">
                    <Form.Label>Description</Form.Label>
                    <Form.Control
                        as="textarea"
                        rows={3}
                        value={editData.description}
                        onChange={(e) =>
                            setEditData({ ...editData, description: e.target.value })
                        }
                    />
                </Form.Group>

                <Form.Group className="mb-3">
                    <Form.Label>Location</Form.Label>
                    <Form.Control
                        type="text"
                        value={editData.location}
                        onChange={(e) =>
                            setEditData({ ...editData, location: e.target.value })
                        }
                    />
                </Form.Group>

                <Form.Group className="mb-3">
                    <Form.Label>End Time</Form.Label>
                    <Form.Control
                        type="datetime-local"
                        value={editData.endTime}
                        onChange={(e) =>
                            setEditData({ ...editData, endTime: e.target.value })
                        }
                    />
                </Form.Group>
            </Form>
        );
    }

    async function saveEdits() {
        const url = `${BACKEND_URL}/events/${selectedEvent.id}`;

        const res = await fetch(url, {
            method: "PATCH",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`
            },
            body: JSON.stringify(editData)
        });

        if (!res.ok) {
            console.error("Failed to update event");
            return;
        }

        // update UI
        setSelectedEvent(editData);
        setIsEditing(false);
        fetchEvents(pageNum);
    }



    function showNormalModal({ selectedEvent }){
        return (
            <>
                <Modal.Body>
                    <p><strong>Location:</strong> {selectedEvent?.location}</p>
                    <p><strong>Description</strong> {selectedEvent?.description}</p>
                    <p><strong>Starts:</strong> {selectedEvent.startTime}  <strong>Ends:</strong> {selectedEvent?.endTime}</p>
                    <p><strong>Seats:</strong> {selectedEvent?.availableSeats}</p>
                </Modal.Body>

                <Modal.Footer>
                    <Button variant="primary" onClick={() => rsvp_user(selectedEvent)}>RSVP</Button>
                    <Button variant="secondary" onClick={() => setShowModal(false)}>
                        Close
                    </Button>
                </Modal.Footer>
            </>
        );
    }

    function showOrganizerModal({ selectedEvent }){
        return(
            <>
                <Modal.Body>
                    {isEditing ? (
                        renderEditForm()
                    ) : (
                        showOrganizerModal({ selectedEvent })
                    )}
                </Modal.Body>
                <Modal.Footer>
                    {isEditing ? (
                        <>
                            <Button variant="success" onClick={saveEdits}>Save</Button>
                            <Button variant="secondary" onClick={() => setIsEditing(false)}>Cancel</Button>
                        </>
                    ) : (
                        <>
                            <Button variant="primary" onClick={() => setIsEditing(true)}>Edit Info</Button>
                            <Button variant="secondary" onClick={() => setShowModal(false)}>Close</Button>
                        </>
                    )}
                </Modal.Footer>
            </>
        )
    }

    function formatEvents(events) {
        let new_events = [];
        for (const event of events) {
            const num_guests = event.guests.length;
            const remaining_seats = event.capacity - num_guests;
            const new_event = {};
            new_event.id = event.id;
            new_event.name = event.name;
            new_event.location = event.location;
            new_event.description = event.description;
            new_event.startTime = new Date(event.startTime).toDateString() || null;
            new_event.endTime = new Date(event.endTime).toDateString();  
            new_event.availableSeats = remaining_seats;
            new_event.pointsRemain = event.pointsRemain || null;
            new_event.pointsAwarded = event.pointsAwarded || null;
            new_events.push(new_event);
        }
        return new_events;
    }

    async function rsvp_user(event){
        const url = `${BACKEND_URL}/events/${event.id}/guests/me`;

        const res = await fetch(url, {
            method: "POST",
            headers: {Authorization: `Bearer ${token}`}
        });

        if (!res.ok){
            const data = await res.json();
            console.log(data.error);
            return;
        }
        console.log("RSVP'd\n");
        setRSVP(true);
    }

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
        <Row className="justify-content-center">
            <Col xs={12} md={10} lg={8}>

                <Table bordered responsive>
                    <thead>
                        <tr>
                            <th style={{ backgroundColor: "#FFF9C4" }}>Name</th>
                            <th style={{ backgroundColor: "#FFF9C4" }}>Location</th>
                            <th style={{ backgroundColor: "#FFF9C4" }}>Ends At</th>
                            <th style={{ backgroundColor: "#FFF9C4" }}>Available slots</th>
                        </tr>
                    </thead>

                    <tbody>
                        {events === null ? (
                            <tr>
                                <td colSpan={5} className="text-center">
                                        Page {pageNum} could not be found
                                </td>
                            </tr>
                        ) : (
                            events.map(item => (
                                <tr key={item.id} onClick={() => handleRowClick(item)} style={{cursor: "pointer"}}>
                                    <td>{item.name}</td>
                                    <td>{item.location}</td>
                                    <td>{item.endTime}</td>
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

            
        </Modal>
        </Container>
    );
}
