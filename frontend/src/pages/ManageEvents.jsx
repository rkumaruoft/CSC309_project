import { useState, useEffect } from "react";
import { Button, Form, Col, Container, Image, Row, Table, Modal} from "react-bootstrap";
import CreateEventModal from "../components/events/actions/CreateEventModal";
import DeleteConfirmModal from "../components/events/actions/DeleteEventModal";
import EventOrganizerModal from "../components/events/roles/EventOrganizerModal";
import EventsFilter from "../components/events/actions/EventsFilter";
import formatEvents, { fetchAllEvents, createEventBackend, deleteEventBackend, addOrganizerBackend, publishEventBackend, remGuestBackend, fetchSpecificEvent, } from "../utils/api/eventActions";
import { formatDateTime } from "../utils/api/dateHandling";

export default function ManageEvents() {
    const [isEditing, setIsEditing] = useState(false);
    const [editedEvent, setEditedEvent] = useState({
        name: "",
        description: "",
        location: "",
        startTime: "",
        endTime: "",
        capacity: 0,
    });
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [events, setEvents] = useState([]);
    const [pageNum, setPageNum] = useState(1);
    const [selectedEvent, setSelectedEvent] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const [totalPages, setTotalPages] = useState(1);
    const [error, setError] = useState("");
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [filters, setFilters] = useState({});
    const [showFilter, setShowFilter] = useState(false);

    // Fetch events on mount
    useEffect(() => {
        fetchEvents(1);
    }, []);

    // Fetch events when filters change (reset to page 1)
    useEffect(() => {
        fetchEvents(1);
    }, [filters]);

    async function createEvent(eventData, setSubmitted) {
        const res = await createEventBackend(eventData);

        if (res.error != null) {
            setError(res.error);
            return;
        }

        // Success - close modal and refresh events list
        setSubmitted(true);
        setError("");
        fetchEvents(1); // Go to first page to see the new event
    }

    async function deleteEvent() {
        const data = await deleteEventBackend(selectedEvent);

        if (data.error != null) {
            setError(data.error);
            return;
        }

        // Success - close modals and refresh
        setShowDeleteConfirm(false);
        setShowModal(false);
        setError(null);
        fetchEvents(pageNum);
    }

    async function addOrganizer(organizer, setOrganizer){
        const res = await addOrganizerBackend(organizer, selectedEvent);

        if (res.error != null){
            setError(res.error);
        }

        setOrganizer(null);
        return;
    }

    async function handleRowClick(event){
        const data = await fetchSpecificEvent(event);
        let formatted_event = formatEvents([data]);
        formatted_event = formatted_event[0];
        setSelectedEvent(formatted_event);
        setEditedEvent({
            id: data.id,
            name: data.name,
            description: data.description,
            location: data.location,
            startTime: data.startTime, // raw ISO string
            endTime: data.endTime,     // raw ISO string
            capacity: data.capacity || "unlimited",
            points: data.pointsRemain + data.pointsAwarded,
            published: data.published
        });
        setIsEditing(false);
        setShowModal(true);
    }

    async function publish_event(setPublish){
        const res = await publishEventBackend(selectedEvent);

        if (res.error != null){
            setError(res.error);
            return;
        }

        // Success - update local state and refresh
        setPublish(true);
        setSelectedEvent(prev => ({ ...prev, published: true }));
        await refreshEventDetails();
    }

    async function remGuest(guestId, setGuestId){
        const res = await remGuestBackend(selectedEvent, guestId);

        if (res.error != null){
            setError(res.error);
            return;
        }

        // Success - refresh the event details
        await refreshEventDetails();
        setGuestId(""); // Clear the input
    }

    async function refreshEventDetails() {
        const data = await fetchSpecificEvent(selectedEvent);
        let formatted_event = formatEvents([data]);
        formatted_event = formatted_event[0];
        
        // Update both the modal view and the table
        setSelectedEvent(formatted_event);
        setEditedEvent({
            id: data.id,
            name: data.name,
            description: data.description,
            location: data.location,
            startTime: data.startTime,
            endTime: data.endTime,
            capacity: data.capacity,
            points: data.pointsRemain + data.pointsAwarded,
            published: data.published
        });
        
        // Refresh the events table
        fetchEvents(pageNum);
    }

    async function fetchEvents(page){
        const data = await fetchAllEvents(page, filters, totalPages);
        if (data === null) {
            return;
        }
        data.results.filter
        setEvents(formatEvents(data.results));
        setPageNum(page);
        setTotalPages(Math.max(1, Math.ceil(data.count / 10)));
    }

    return (
    <Container>
        <Row className="justify-content-center align-items-center mt-5">
            <Col xs="auto">
                <Form.Label className="d-flex flex-row">
                    <div className="d-flex align-items-center gap-1">
                    <h1>Manage events</h1>
                    <Image
                        src="../../filter.svg"
                        alt="Filter"
                        className="filter opacity-75"
                        onClick={() => setShowFilter(!showFilter)}
                    />
                    </div>
                </Form.Label>

                <Row className="justify-content-center align-items-center mb-2">
                <Col xs="auto">
                    {/* Only show for managers/superusers */}
                    <Button 
                        variant="primary" 
                        onClick={() => {setShowCreateModal(true); }}
                    >
                        Create Event
                    </Button>
                </Col>
            </Row>
            </Col>
        </Row>
        {showFilter &&
            <Row className="justify-content-center align-items-center">
                <Col xs="auto" className="m-2">
                    <EventsFilter setFilters={setFilters} setShowFilter={setShowFilter} />
                </Col>
            </Row>}

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
                        </tr>
                    </thead>

                    <tbody>
                        {events.length === 0 ? (
                            <tr>
                                <td colSpan={5} className="text-center">
                                    No events found
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
                <EventOrganizerModal
                    selectedEvent={selectedEvent}
                    setSelectedEvent={setSelectedEvent}

                    isEditing={isEditing}
                    setIsEditing={setIsEditing}

                    editedEvent={editedEvent}
                    setEditedEvent={setEditedEvent}

                    error={error}
                    setError={setError}
                    
                    setShowModal={setShowModal}
                    
                    setShowDeleteConfirm={setShowDeleteConfirm}
                    
                    publish_event={publish_event}
                    addOrganizer={addOrganizer}

                    remGuest={remGuest}
                    refreshEventDetails={refreshEventDetails}
                    fetchEvents={fetchEvents}
                />
        </Modal>
        <DeleteConfirmModal 
            show={showDeleteConfirm}
            onClose={() => {setShowDeleteConfirm(false); setShowModal(true); setError(false);}}
            onConfirm={deleteEvent}
            eventName={selectedEvent?.name}
            error={error}
        />
        <CreateEventModal
            show={showCreateModal}
            onHide={() => {
                setShowCreateModal(false);
                setError("");
            }}
            onSubmit={createEvent}
            error={error}
            setError={setError}
        />
        </Container>
    );
}