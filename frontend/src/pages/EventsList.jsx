import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { Button, Form, Col, Container, Image, Row, Table, Modal} from "react-bootstrap";
import EventSettingModal from "../components/CreateEventModal";
import DeleteConfirmModal from "../components/DeleteEventModal";
import EventGuestModal from "../components/EventGuestModal";
import EventOrganizerModal from "../components/EventOrganizerModal";
import EventsFilter from "../components/EventsFilter";
import fetchEventsFull from "../utils/api/fetchEvents";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:3000";

function formatDateTime(dateInput) {
    const date = new Date(dateInput);
    if (isNaN(date.getTime())) return "";

    return date.toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
        hour12: true
    });
}

export default function EventsList() {
    const location = useLocation();
    const token = localStorage.getItem("token");
    const user = JSON.parse(localStorage.getItem("user"));
    const [isEditing, setIsEditing] = useState(false);
    const [editEvent, setEditEvent] = useState({
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
    const [rsvp, setRSVP] = useState(false)
    const [awardMode, setAwardMode] = useState(null); // null, 'single', or 'all'
    const [recipientId, setRecipientId] = useState("");
    const [guestId, setGuestId] = useState("");
    const [rewardAmount, setRewardAmount] = useState("");
    const [error, setError] = useState("");
    const [organizer, setOrganizer] = useState("");
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [filters, setFilters] = useState({});
    const [showFilter, setShowFilter] = useState(false);

    // THIS IS THE MAIN CONSTANT FOR EVENTS
    const [rewardModel, setRewardModel] = useState({
        utorid: null,
        type: "event",
        amount: 0
    });

    useEffect(() => {
        fetchEvents(pageNum);
    }, [filters]);

    async function createEvent(eventData) {
        const url = `${BACKEND_URL}/events`;
    
        const res = await fetch(url, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`
            },
            body: JSON.stringify(eventData)
        });

        const data = await res.json();

        if (!res.ok) {
            setError(data.error);
            return;
        }

        // Success - close modal and refresh events list
        setShowCreateModal(false);
        setError("");
        fetchEvents(1); // Go to first page to see the new event
    }

    async function deleteEvent() {
        const url = `${BACKEND_URL}/events/${selectedEvent.id}`;
        
        const res = await fetch(url, {
            method: "DELETE",
            headers: {
                Authorization: `Bearer ${token}`
            }
        });

        if (!res.ok) {
            const data = await res.json();
            setError(data.error);
            return;
        }

        // Success - close modals and refresh
        setShowDeleteConfirm(false);
        setShowModal(false);
        setError(null);
        fetchEvents(pageNum);
    }

    const handleRowClick = async (event) => {
        const url = `${BACKEND_URL}/events/${event.id}`;
        const ev = await fetch(url, {method: "GET", headers: {Authorization: `Bearer ${token}`}});
        const data = await ev.json();
        let formatted_event = formatEvents([data]);
        formatted_event = formatted_event[0];
        setSelectedEvent(formatted_event);
        setEditEvent({
            id: data.id,
            name: data.name,
            description: data.description,
            location: data.location,
            startTime: data.startTime, // raw ISO string
            endTime: data.endTime,     // raw ISO string
            capacity: data.capacity,
            points: data.pointsRemain + data.pointsAwarded,
            published: data.published
        });
        const isRSVP = data.guests.some(guest => guest.utorid === user.utorid);
        setRSVP(isRSVP);
        setIsEditing(false);
        setShowModal(true);
    };

    async function addOrganizer(){
        const url = `${BACKEND_URL}/events/${selectedEvent.id}/organizers`;
        const payload = { utorid: organizer };

        const res = await fetch(url, 
            {
                method: "POST",
                headers: {
                    "Content-type": "application/json",
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify(payload)
            }
        )

        if (!res.ok){
            const data = await res.json();
            setError(data.error);
            return;
        }
    }

    async function rewardGuest(){
        const url = `${BACKEND_URL}/events/${selectedEvent.id}/transactions`;
        const res = await fetch(url, 
            {method: "POST",
            headers: {
                "Content-type": "application/json",
                Authorization: `Bearer ${token}`
            },
            body: JSON.stringify(rewardModel)
            });
        setRewardModel({
            utorid: null,
            type: "event",
            amount: 0
        });
        const data = await res.json();
        setRecipientId("");
        setRewardAmount("");
        if (!res.ok){
            setError(data.error);
            return;
        }
        setAwardMode(null);
    }

    async function saveEdits() {
        const url = `${BACKEND_URL}/events/${selectedEvent.id}`;
        const update_body = {};
        for (const key of ["name", "description", "location", "startTime", "endTime", "capacity", "points", "published"]) {
            if (editEvent[key] !== selectedEvent[key]) {
                // Convert capacity and points to numbers
                if (key === "capacity" || key === "points") {
                    update_body[key] = Number(editEvent[key]);
                } else {
                    update_body[key] = editEvent[key];
                }
            }
        }

        const res = await fetch(url, {
            method: "PATCH",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`
            },
            body: JSON.stringify(update_body)
        });

        const data = await res.json();
        if (!res.ok) {
            setError(data.error);
            return;
        }

        // update UI
        setSelectedEvent(prev => ({ ...prev, ...editEvent }));
        setIsEditing(false);
        fetchEvents(pageNum);
    }

    function formatEvents(events) {
        let new_events = [];
        for (const event of events) {
            const remaining_seats = event.capacity - event.guests.length;
            const points = event.pointsRemain + event.pointsAwarded;
            const new_event = {};
            new_event.id = event.id;
            new_event.name = event.name;
            new_event.description = event.description;
            new_event.location = event.location;
            new_event.startTime = event.startTime;
            new_event.endTime = event.endTime;  
            new_event.capacity = event.capacity;
            new_event.availableSeats = remaining_seats;
            new_event.pointsRemain = event.pointsRemain || "-1";
            new_event.points = points;
            new_event.published = event.published;
            new_event.organizers = event.organizers;
            new_event.guests = event.guests;
            
            new_events.push(new_event);
        }
        return new_events;
    }

    async function addGuest(){
    const url = `${BACKEND_URL}/events/${selectedEvent.id}/guests`;
    const params = { utorid: guestId};
    const res = await fetch(url, {
        method: "POST",
        headers: {"Content-Type": "application/json", Authorization: `Bearer ${token}`},
        body: JSON.stringify(params)
    });

    const data = await res.json();
    if (!res.ok){
        setError(data.error);
        return;
    }

    // Success - refresh the event details
    await refreshEventDetails();
    setGuestId(""); // Clear the input
}

// Replace your remGuest function with this:
async function remGuest(){
    const url = `${BACKEND_URL}/events/${selectedEvent.id}/guests/${guestId}`;
    const res = await fetch(url, {
        method: "DELETE",
        headers: {Authorization: `Bearer ${token}`}
    });

    if (!res.ok){
        const data = await res.json();
        setError(data.error);
        return;
    }

    // Success - refresh the event details
    await refreshEventDetails();
    setGuestId(""); // Clear the input
}

// Add this new helper function to refresh event details:
async function refreshEventDetails() {
    const url = `${BACKEND_URL}/events/${selectedEvent.id}`;
    const ev = await fetch(url, {
        method: "GET", 
        headers: {Authorization: `Bearer ${token}`}
    });
    
    if (!ev.ok) {
        console.error("Failed to refresh event details");
        return;
    }
    
    const data = await ev.json();
    let formatted_event = formatEvents([data]);
    formatted_event = formatted_event[0];
    
    // Update both the modal view and the table
    setSelectedEvent(formatted_event);
    setEditEvent({
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

    async function publish_event(){
        const url = `${BACKEND_URL}/events/${selectedEvent.id}`;
        const publish_data = { publish: true };
        const res = await fetch(url, {
            method: "PATCH",
            headers: {"Content-Type": "application/json", Authorization: `Bearer ${token}`},
            body: JSON.stringify(publish_data)
        });

        const data = await res.json();
        if (!res.ok){
            setError(data.error);
            return;
        }
    }

    async function rsvp_user(event){
        const url = `${BACKEND_URL}/events/${event.id}/guests/me`;
        const url2 = `${BACKEND_URL}/events/${event.id}/guests/${user.utorid}`
        let res = null;
        if (!rsvp){
            res = await fetch(url, {
                method: "POST",
                headers: {Authorization: `Bearer ${token}`}
            });
        }
        else{
            res = await fetch(url2, {
                method: "DELETE",
                headers: {Authorization: `Bearer ${token}`}
            });
        }

        if (!res.ok){
            const data = await res.json();
            setError(data.error);
            return;
        }
        setRSVP(!rsvp);
        const eventUrl = `${BACKEND_URL}/events/${event.id}`;
        const eventRes = await fetch(eventUrl, {
            method: "GET", 
            headers: {Authorization: `Bearer ${token}`}
        });
        const eventData = await eventRes.json();
        let formatted_event = formatEvents([eventData]);
        setSelectedEvent(formatted_event[0]);
        
        // Refresh the events list to update the table
        fetchEvents(pageNum);
    }

    async function fetchEvents(page){
        // if (page < 1 || page > totalPages) {
        //     return;
        // }

        // const params = { page: page };
        // const url = `${BACKEND_URL}/events?${new URLSearchParams(params).toString()}`;

        // const res = await fetch(url, {
        //     method: "GET",
        //     headers: {
        //         Authorization: `Bearer ${token}`
        //     }
        // });
        // const data = await res.json();
        const data = fetchEventsFull(page, filters, setError);

        if (data === null) {
            // const numDemos = 10;
            // const numPages = 2;
            // const demoEvents = [];
            // for (let i = 0; i < numDemos; i++) {
            //     demoEvents.push({
            //         id: i,
            //         name: `Event ${i + 1}`,
            //         location: `Location ${i + 1}`,
            //         pointsRemain: 100 + i,
            //         startTime: new Date(Date.now() - (1000 * 60 * 60 * 24 * (i+1))),
            //         endTime: new Date(Date.now() + (1000 * 60 * 60 * 24 * (i+1))),
            //         capacity: i + 20,
            //         guests: ["a", "b", "c"]
            //     });
            // }
            // setEvents(demoEvents);
            // setPageNum(page);
            // setTotalPages(numPages);
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
            <Col xs="auto">
                <Form.Label className="d-flex flex-row">
                    <div className="d-flex align-items-center gap-1">
                    <h1>Events</h1>
                    { (user.role === "manager") &&
                        <Image
                            src="../../filter.svg"
                            alt="Filter"
                            className="filter opacity-75"
                            onClick={() => setShowFilter(!showFilter)}
                        />
                    }
                    </div>
                </Form.Label>

                <Row className="justify-content-center align-items-center mb-2">
                <Col xs="auto">
                    {/* Only show for managers/superusers */}
                    {(user.role === "manager" || user.role === "superuser") && (
                        <Button 
                            variant="primary" 
                            onClick={() => setShowCreateModal(true)}
                        >
                            Create Event
                        </Button>
                    )}
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
            { selectedEvent && selectedEvent.pointsRemain != "-1" ? (
                <EventOrganizerModal
                    selectedEvent={selectedEvent}
                    setSelectedEvent={setSelectedEvent}
                    isEditing={isEditing}
                    setIsEditing={setIsEditing}
                    editedEvent={editEvent}
                    setEditedEvent={setEditEvent}
                    saveEdits={saveEdits}
                    setShowModal={setShowModal}
                    awardMode={awardMode}
                    recipientId={recipientId}
                    rewardAmount={rewardAmount}
                    setAwardMode={setAwardMode}
                    setRecipientId={setRecipientId}
                    setRewardAmount={setRewardAmount}
                    rewardModel={rewardModel}
                    setRewardModel={setRewardModel}
                    rewardGuest={rewardGuest}
                    error={error}
                    setError={setError}
                    publish_event={publish_event}
                    organizer={organizer}
                    setOrganizer={setOrganizer}
                    addOrganizer={addOrganizer}
                    role={user.role}
                    guestId={guestId}
                    setGuestId={setGuestId}
                    addGuest={addGuest}
                    remGuest={remGuest}
                    setShowDeleteConfirm={setShowDeleteConfirm}
                    deleteEvent={deleteEvent} 
                />
            ) : (
                <EventGuestModal selectedEvent={selectedEvent} rsvp={rsvp} setRSVP={setRSVP} rsvp_user={rsvp_user} error={error} setError={setError} setShowModal={setShowModal}/>
            )}
        </Modal>
        <DeleteConfirmModal 
            show={showDeleteConfirm}
            onClose={() => {setShowDeleteConfirm(false); setShowModal(true); setError(false);}}
            onConfirm={deleteEvent}
            eventName={selectedEvent?.name}
            error={error}
        />
        <EventSettingModal 
            show={showCreateModal}
            onHide={() => {
                setShowCreateModal(false);
                setError("");
            }}
            onSubmit={createEvent}
            error={error}
        />
        </Container>
    );
}
