import { Button, Modal } from "react-bootstrap";

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

function toDateTimeLocalString(dateStr) {
    const d = new Date(dateStr);
    return d.toISOString().slice(0, 16);  // drop seconds + Z
}

export default function EventOrganizerModal({
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
    recipientId, 
    // LINES BELOW IS THE SETTERS FOR THE LINES ABOVE
    setRecipientId,
    rewardAmount,
    setRewardAmount,
    // THE LINES BELOW IS FOR THE TRANSACTION INFO MODEL
    setRewardModel,
    // HANDLES ERRORS
    error,
    setError,
    // FUNCTION TO HANDLE EVENT PUBLISHING
    publish_event,
    // FUNCTION AND VARIABLE FOR ORGANIZERS
    organizer,
    setOrganizer,
    addOrganizer,
    // CURRENT USER'S ROLE
    role,
    // GUEST ADDING/REMOVING VARIABLES AND METHODS
    guestId,
    setGuestId,
    addGuest,
    remGuest,
    setShowDeleteConfirm
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
                            {error && <div className="alert alert-danger">{error}</div>}
                            <div className="d-flex flex-row gap-2">
                                <div className="d-flex flex-column w-50 mb-2 gap-2">
                                    <h5 className="mb-1" style={{fontWeight: "bold"}}>Add organizer</h5>
                                    <input
                                        name="organizerName"
                                        placeholder="organizer UTORid"
                                        value={organizer}
                                        onChange={(e) => {setOrganizer(e.target.value); setError(null);}}
                                    />
                                    <Button variant="success" onClick={addOrganizer} className="w-50">Add</Button>
                                </div>
                                {(role === "manager" || role === "superuser") && 
                                <div className="d-flex flex-column w-50 mb-2 gap-2">
                                    <h5 className="mb-1" style={{fontWeight: "bold"}}>Add/remove guest</h5>
                                    <input
                                        name="guestId"
                                        placeholder="guest UTORid"
                                        value={guestId}
                                        onChange={(e) => {setGuestId(e.target.value); setError(null);}}
                                    />
                                    <div className="d-flex flex-row gap-2 mb-2">
                                        <Button variant="success" onClick={addGuest} className="w-50">Add</Button>
                                        <Button variant="danger" onClick={remGuest} className="w-50">Remove</Button>
                                    </div>
                                </div>
                                }
                            </div>
                            </>
                            )
                        }
                        {awardMode === 'single' && (
                            <>
                                {error && <div className="alert alert-danger">{error}</div>}
                                <div className="d-flex flex-row mb-3">
                                    <div className="w-100">
                                        <label><strong style={{fontWeight: "bolder"}}>Recipient</strong></label>
                                        <input placeholder="Recipient's UTORid" value={recipientId} onChange={(e) => {setRecipientId(e.target.value); setRewardModel(prev => ({...prev, utorid: e.target.value})); setError(null);}} />
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
                                    <Button className="w-50" variant="danger" onClick={() => {setAwardMode(null); setError(null); setRewardAmount(null); setRecipientId(null);}}>Cancel</Button>
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
                                        <Button variant="success" className="w-50" onClick={rewardGuest}>Send</Button>
                                        <Button variant="danger" className="w-50" onClick={() => {setAwardMode(null); setError(null); setRewardAmount(null);}}>Cancel</Button>
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
                        <Button variant="warning" onClick={() => {setIsEditing(false); setError(null); setEditedEvent(selectedEvent); setRewardAmount(null);}}>Cancel</Button>
                        <Button variant="danger" onClick={() => {setShowDeleteConfirm(true); setShowModal(false);}}>
                        Delete Event
                        </Button>
                        </div>
                    </div>
                ) : (
                    <>
                        { !selectedEvent.published && (<Button variant="success" onClick={() =>
                                {setSelectedEvent(prev => ({ ...prev, published: true })); publish_event;}
                            }>publish</Button>)}
                        <Button variant="info" onClick={() => {setIsEditing(true); setError(null);}}>Edit Info</Button>
                        <Button variant="danger" onClick={() => {setShowModal(false); setError(null); setGuestId(null); setOrganizer(null); setRewardAmount(null);}}>Close</Button>
                    </>
                )) }
            </Modal.Footer>
        </>
    );
}