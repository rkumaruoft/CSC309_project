import { useState, useEffect } from "react";
import { Button, Form, Col, Container, Image, Row, Table, Modal} from "react-bootstrap";
import EventGuestModal from "../components/events/roles/EventGuestModal";
import formatEvents, { fetchPublishedEvents, rsvpBackend, fetchSpecificEvent } from "../utils/api/eventActions";
import { formatDateTime } from "../utils/api/dateHandling";

export default function AvailableEvents() {
    const user = JSON.parse(localStorage.getItem("user"));
    const role = localStorage.getItem("currentRole");
    const [events, setEvents] = useState([]);
    const [pageNum, setPageNum] = useState(1);
    const [selectedEvent, setSelectedEvent] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const [totalPages, setTotalPages] = useState(1);
    const [rsvp, setRSVP] = useState(false);
    const [error, setError] = useState("");
    const [filters, setFilters] = useState({});

    useEffect(() => {
        fetchEvents(1);
    }, []);

    useEffect(() => {
        fetchEvents(pageNum);
    }, [pageNum]);

    useEffect(() => {
        fetchEvents(pageNum);
    }, [filters]);

    async function handleRowClick(event){
        const data = await fetchSpecificEvent(event);
        let formatted_event = formatEvents([data]);
        formatted_event = formatted_event[0];
        setSelectedEvent(formatted_event);
        const isRSVP = data.guests.some(guest => guest.utorid === user.utorid);
        setRSVP(isRSVP);
        setShowModal(true);
    }

    // Add this new helper function to refresh event details:
    async function refreshEventDetails() {
        const data = await fetchSpecificEvent(selectedEvent);
        let formatted_event = formatEvents([data]);
        formatted_event = formatted_event[0];
        
        // Update both the modal view and the table
        setSelectedEvent(formatted_event);
        
        // Refresh the events table
        fetchEvents(pageNum);
    }

    async function rsvp_user(event){
        const data = await rsvpBackend(event);
        if (data.error != null){
            setError(data.error);
            return;
        }
        setRSVP(!rsvp);
        refreshEventDetails();
    }

    async function fetchEvents(page){
        const data = await fetchPublishedEvents(page, filters, totalPages);
        if (data === null) {
            return;
        }
        
        const formattedEvents = formatEvents(data.results);
        setEvents(formattedEvents);
        setPageNum(page);
        setTotalPages(Math.max(1, Math.ceil(data.count / 10)));
    }

    return (
    <Container>
        <Row className="justify-content-center align-items-center mt-5">
            <Col xs="auto">
                <Form.Label className="d-flex flex-row">
                    <div className="d-flex align-items-center gap-1">
                    <h1>Available Events</h1>
                    </div>
                </Form.Label>
            </Col>
        </Row>

        {/* Table */}
        <Row className="justify-content-center">
            <Col xs={12} md={10} lg={8}>

                <Table bordered responsive>
                    <thead className="table-primary">
                        <tr>
                            <th>Name</th>
                            <th>Location</th>
                            <th>Starts at</th>
                            <th>Ends at</th>
                            <th>Seats left</th>
                            <th>Attending</th>
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
                                    <td>{formatDateTime(item.startTime)}</td>
                                    <td>{formatDateTime(item.endTime)}</td>
                                    <td>{item.availableSeats}</td>
                                    <td>{item.isRSVPd}</td>
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
                    variant="primary"
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
                    variant="primary"
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
            <EventGuestModal selectedEvent={selectedEvent} rsvp={rsvp} setRSVP={setRSVP} rsvp_user={rsvp_user} error={error} setError={setError} setShowModal={setShowModal}/>
        </Modal>
        </Container>
    );
}
