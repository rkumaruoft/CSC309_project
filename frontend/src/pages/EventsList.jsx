import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { Button, Form, Col, Container, Row, Table, Modal} from "react-bootstrap";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:3000";

function ShowNormalModal({ selectedEvent, rsvp, rsvp_user, error, setError, setShowModal }) {
    return (
        <>
            <Modal.Body>
                <p><strong>Location:</strong> {selectedEvent?.location}</p>
                <p><strong>Description:</strong> {selectedEvent?.description}</p>
                <p><strong>Starts:</strong> {formatDateTime(selectedEvent?.startTime)}</p>
                <p><strong>Ends:</strong> {formatDateTime(selectedEvent?.endTime)}</p>
                <p><strong>Available seats:</strong> {selectedEvent?.availableSeats}</p>
                {error && <div className="alert alert-danger">{error}</div>}
            </Modal.Body>

            <Modal.Footer>
                {!rsvp &&
                    (<Button variant="success" onClick={() => rsvp_user(selectedEvent)}>
                        RSVP
                    </Button>)
                }
                <Button variant="danger" onClick={() => {setShowModal(false); setError(null);}}>
                    Close
                </Button>
            </Modal.Footer>
        </>
    );
}

function ShowOrganizerModal({
    
    selectedEvent, // THE EVENT BEIND EDITED,
    setSelectedEvent, // TO UPDATE THE SELECTED EVENT
    isEditing,     // BOOLEAN TO FLAG WHETHER EVENT INFO IS BEING EDITED
    setIsEditing,  // SETTER FOR THE BOOLEAN ABOVE
    editedEvent,   // THE EDITED VERSION OF THE EVENT
    setEditedEvent,// SETTING THE EDITED EVENT TO THIS VERSION
    saveEdits,     // FUNCTION BEING PASSED TO SAVE THE EDITS OF THIS EVENT
    rewardGuest,   // FUNCTION BEING USED TO REWARD THE GUEST(S)
    setShowModal,  // BOOLEAN TO SHOW THE MODAL
    // LINES BELOW IS FOR REWARDING
    awardMode,
    setAwardMode,
    guestId, 
    // LINES BELOW IS THE SETTERS FOR THE LINES ABOVE
    setGuestId,
    rewardAmount,
    setRewardAmount,
    // THE LINES BELOW IS FOR THE TRANSACTION INFO MODEL
    rewardModel,
    setRewardModel,
    // HANDLES ERRORS
    error,
    setError,
    // FUNCTION TO HANDLE EVENT PUBLISHING
    publish_event,
    // FUNCTION AND VARIABLE FOR ORGANIZERS
    organizer,
    setOrganizer,
    addOrganizer
}) {
    const handleChange = (e) => {
        const { name, value } = e.target;
        setError(null);
        setEditedEvent(prev => ({ ...prev, [name]: value }));
    };
    const published = (selectedEvent.published ? "yes" : "no");
    return (
        <>
            <Modal.Body>
                {isEditing ? (
                    <>
                        {error && <div className="alert alert-danger">{error}</div>}
                        <div className="mb-2">
                            <label>Name</label>
                            <input
                                className="form-control"
                                name="name"
                                value={editedEvent.name}
                                onChange={handleChange}
                            />
                        </div>

                        <div className="mb-2">
                            <label>Description</label>
                            <textarea
                                className="form-control"
                                name="description"
                                value={editedEvent.description}
                                onChange={handleChange}
                            />
                        </div>

                        <div className="mb-2">
                            <label>Location</label>
                            <input
                                className="form-control"
                                name="location"
                                value={editedEvent.location}
                                onChange={handleChange}
                            />
                        </div>
                
                        <div className="mb-2">
                            <label>Start Time</label>
                            <input
                                type="datetime-local"
                                className="form-control"
                                name="startTime"
                                value={toDateTimeLocalString(editedEvent.startTime)}
                                onChange={handleChange}
                            />
                        </div>

                        <div className="mb-2">
                            <label>End Time</label>
                            <input
                                type="datetime-local"
                                className="form-control"
                                name="endTime"
                                value={toDateTimeLocalString(editedEvent.endTime)}
                                onChange={handleChange}
                            />
                        </div>
                        <div className="d-flex flex-row gap-2">
                        <div className="mb-2">
                            <label>Capacity</label>
                            <input
                                type="number"
                                className="form-control"
                                name="capacity"
                                value={editedEvent.capacity}
                                onChange={handleChange}
                            />
                        </div>

                        <div className="mb-2">
                            <label>Total points</label>
                            <input
                                type="number"
                                className="form-control"
                                name="points"
                                value={editedEvent.points}
                                onChange={handleChange}
                            />
                        </div>
                        </div>
                    </>
                ) : (
                    <>
                        <p><strong>Name:</strong> {selectedEvent.name}</p>
                        <p><strong>Description:</strong> {selectedEvent.description}</p>
                        <p><strong>Location:</strong> {selectedEvent.location}</p>
                        <p><strong>Starts:</strong> {formatDateTime(selectedEvent.startTime)}</p>
                        <p><strong>Ends:</strong> {formatDateTime(selectedEvent.endTime)}</p>
                        <p><strong>Seats:</strong> {selectedEvent.availableSeats}</p>
                        <p><strong>Published: </strong> {published}</p>
                        <h5 style={{fontWeight: "bold"}}>Award points</h5>
                        {awardMode === null && (
                        <div className="d-flex flex-column w-55 mb-3">
                            <div className="d-flex flex-row gap-1">
                                <Button variant="outline-dark p-1" onClick={() => setAwardMode('single')}>Award a guest</Button>
                                <Button variant="outline-dark p-1" onClick={() => setAwardMode('all')}>Award all guests</Button>
                                </div>
                        </div>
                        )}
                        {awardMode === null && (
                            <>
                            <h5 className="mb-1" style={{fontWeight: "bold"}}>Add organizer</h5>
                            {error && <div className="alert alert-danger">{error}</div>}
                            <div className="d-flex flex-column w-50 mb-2">
                                <input
                                    name="organizerName"
                                    placeholder="organizer UTORid"
                                    value={organizer}
                                    onChange={(e) => {setOrganizer(e.target.value); setError(null);}}
                                />
                            </div>
                            <Button variant="success" onClick={addOrganizer}>Add organizer</Button>
                            </>
                            )
                        }
                        {awardMode === 'single' && (
                            <>
                                {error && <div className="alert alert-danger">{error}</div>}
                                <div className="d-flex flex-row mb-3">
                                    <div className="w-100">
                                        <label><strong style={{fontWeight: "bolder"}}>Recipient</strong></label>
                                        <input placeholder="Guest UTORid" value={guestId} onChange={(e) => {setGuestId(e.target.value); setRewardModel(prev => ({...prev, utorid: e.target.value})); setError(null);}} />
                                    </div>
                                    <div className="w-100">
                                        <label><strong style={{fontWeight: "bolder"}}>Amount</strong></label>
                                        <input placeholder="Amount" value={rewardAmount} onChange={(e) => 
                                            {
                                                setRewardAmount(e.target.value); 
                                                setRewardModel(prev => ({...prev, amount: parseInt(e.target.value) || 0}));
                                                setError(null);
                                            }} />
                                    </div>
                                </div>
                                <div className="d-flex flex-row gap-2 w-50">
                                    <Button className="w-50" variant="success" onClick={rewardGuest}>Send</Button>
                                    <Button className="w-50" variant="danger" onClick={() => {setAwardMode(null); setError(null);}}>Cancel</Button>
                                </div>
                            </>
                        )}

                        {awardMode === 'all' && (
                            <>
                                {error && <div className="alert alert-danger">{error}</div>}
                                <div className="d-flex flex-column gap-2 w-50">
                                    <input placeholder="Amount per guest" value={rewardAmount} onChange={(e) => 
                                    {
                                        setRewardAmount(e.target.value); 
                                        setRewardModel(prev => ({
                                        ...prev,
                                        amount: parseInt(e.target.value) || 0}));
                                         setError(null);
                                    }} />
                                    <div className="d-flex flex-row gap-2">
                                        <Button variant="success" className="w-50" onClick={rewardGuest}>Submit</Button>
                                        <Button variant="danger" className="w-50" onClick={() => {setAwardMode(null); setError(null);}}>Cancel</Button>
                                    </div>
                                </div>
                            </>
                        )}
                    </>
                )}
            </Modal.Body>

            <Modal.Footer>
                {awardMode === null && 
                (isEditing ? (
                    <div className="d-flex flex-column">
                        <div className="d-flex flex-row gap-2">
                        <Button variant="success" onClick={saveEdits}>Save</Button>
                        <Button variant="danger" onClick={() => {setIsEditing(false); setError(null); setEditedEvent(selectedEvent)}}>Cancel</Button>
                        </div>
                    </div>
                ) : (
                    <>
                        { !selectedEvent.published && (<Button variant="success" onClick={() =>
                                {setSelectedEvent(prev => ({ ...prev, published: true })); publish_event;}
                            }>publish</Button>)}
                        <Button variant="info" onClick={() => {setIsEditing(true); setError(null);}}>Edit Info</Button>
                        <Button variant="danger" onClick={() => {setShowModal(false); setError(null);}}>Close</Button>
                    </>
                )) }
            </Modal.Footer>
        </>
    );
}

function toDateTimeLocalString(dateStr) {
    const d = new Date(dateStr);
    return d.toISOString().slice(0, 16);  // drop seconds + Z
}


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
    const [isEditing, setIsEditing] = useState(false);
    const [editEvent, setEditEvent] = useState({
        name: "",
        description: "",
        location: "",
        startTime: "",
        endTime: "",
        capacity: 0,
    });
    const [events, setEvents] = useState([]);
    const [pageNum, setPageNum] = useState(1);
    const [selectedEvent, setSelectedEvent] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const [totalPages, setTotalPages] = useState(1);
    const [rsvp, setRSVP] = useState(false)
    const [awardMode, setAwardMode] = useState(null); // null, 'single', or 'all'
    const [guestId, setGuestId] = useState("");
    const [rewardAmount, setRewardAmount] = useState("");
    const [error, setError] = useState("");
    const [organizer, setOrganizer] = useState("")

    // THIS IS THE MAIN CONSTANT FOR EVENTS
    const [rewardModel, setRewardModel] = useState({
        utorid: null,
        type: "event",
        amount: 0
    });

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

        const data = await res.json();
        if (!res.ok){
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
        setGuestId("");
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
                update_body[key] = editEvent[key];
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

        const res = await fetch(url, {
            method: "POST",
            headers: {Authorization: `Bearer ${token}`}
        });

        if (!res.ok){
            const data = await res.json();
            setError(data.error);
            return;
        }
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
                    <thead className="table-primary">
                        <tr>
                            <th>Name</th>
                            <th>Location</th>
                            <th>Ends at</th>
                            <th>Available seats</th>
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
                <ShowOrganizerModal
                    selectedEvent={selectedEvent}
                    setSelectedEvent={setSelectedEvent}
                    isEditing={isEditing}
                    setIsEditing={setIsEditing}
                    editedEvent={editEvent}
                    setEditedEvent={setEditEvent}
                    saveEdits={saveEdits}
                    setShowModal={setShowModal}
                    awardMode={awardMode}
                    guestId={guestId}
                    rewardAmount={rewardAmount}
                    setAwardMode={setAwardMode}
                    setGuestId={setGuestId}
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
                />
            ) : (
                <ShowNormalModal selectedEvent={selectedEvent} rsvp={rsvp} rsvp_user={rsvp_user} error={error} setError={setError} setShowModal={setShowModal}/>
            )}
        </Modal>
        </Container>
    );
}
