import { Button, Modal } from "react-bootstrap";
import { useState } from "react";

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
    // SELECTED EVENT
    selectedEvent,
    setSelectedEvent,
    // EDITING OR NOT
    isEditing,
    setIsEditing,
    // EDITED VERSION OF THE EVENT
    editedEvent,
    setEditedEvent,
    // ERROR STATE AND SETTING
    error,
    setError,
    // TO SHOW OR NOT SHOW THE MODAL
    setShowModal,
    // TO SHOW THE DELETING WINDOW
    setShowDeleteConfirm,
    // OTHER FUNCTIONS/VARIABLES
    saveEdits,     // FUNCTION TO SAVE THE EVENT
    rewardGuest,   // FUNCTION BEING USED TO REWARD THE GUEST(S)
    publish_event, // FUNCTION TO PUBLISH THE EVENT
    addOrganizer,  // ADD EVENT ORGANIZER FUNCTION
    addGuest,      // FUNCTION TO ADD GUEST
    remGuest       // FUNCTION TO REMOVE GUEST
    }) {
    const role = localStorage.getItem("currentRole");
    const [guestId, setGuestId] = useState(""); // 
    const [organizer, setOrganizer] = useState(""); //
    const [recipientId, setRecipientId] = useState(""); // 
    const [rewardAmount, setRewardAmount] = useState("");
    const [awardMode, setAwardMode] = useState(null);
    const [submitted, setSubmitted] = useState(false);
    const [editAttempted, setEditAttempted] = useState(false);
    const [rewardModel, setRewardModel] = useState({
        utorid: null,
        type: "event",
        amount: 0
    });
    const [addMemb, setAddingMemb] = useState(false);
    const [addMode, setAddMode] = useState(null);
    const [showAllButtons, setSAB] = useState(true);
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
                        {error && editAttempted && <div className="alert alert-danger">{error}</div>}
                        {(error == null && editAttempted) && <div className="alert alert-success">Successfully updated event</div>}
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
                        </div>
                    </>
                ) : (
                    <>
                        {error && <div className="alert alert-danger">{error}</div>}
                        <p><strong>Name:</strong> {selectedEvent.name}</p>
                        <p><strong>Description:</strong> {selectedEvent.description}</p>
                        <p><strong>Location:</strong> {selectedEvent.location}</p>
                        <p><strong>Starts:</strong> {formatDateTime(selectedEvent.startTime)}</p>
                        <p><strong>Ends:</strong> {formatDateTime(selectedEvent.endTime)}</p>
                        <p><strong>Seats:</strong> {selectedEvent.availableSeats}</p>
                        <p><strong>Published: </strong> {published}</p>
                        {awardMode === null && showAllButtons && (
                        <div className="d-flex flex-column w-55 mb-3">
                        <h5 style={{fontWeight: "bold"}}>Award points</h5>
                            <div className="d-flex flex-row gap-1">
                                <Button variant="outline-dark p-1" onClick={() => {setAwardMode('single'); setError(null); setSubmitted(false); setOrganizer(""); setRecipientId(""); setGuestId(""); setSAB(false);}}>Award a guest</Button>
                                <Button variant="outline-dark p-1" onClick={() => {setAwardMode('all'); setError(null); setSubmitted(false); setOrganizer(""); setRecipientId(""); setGuestId(""); setSAB(false);}}>Award all guests</Button>
                            </div>
                        </div>
                        )}
                                
                        {awardMode === null && showAllButtons && !addMemb && role === "manager" && ( // DISPLAYS TWO BUTTONS FOR PROMPTING
                        <>
                            <h5 style={{fontWeight: "bold"}}>Add guests/organizers</h5>
                            <div className="d-flex flex-row gap-2">
                                <Button variant="outline-dark p-1" onClick={() => {setAddMode("g"); setAddingMemb(true); setOrganizer(""); setGuestId(""); setSAB(false);}}>Add guest</Button>
                                <Button variant="outline-dark p-1" onClick={() => {setAddMode("o"); setAddingMemb(true); setOrganizer(""); setGuestId(""); setSAB(false);}}>Add Organizer</Button>
                            </div>
                            </>
                            )
                        }

                        {awardMode === null && !showAllButtons && !addMemb && role != "manager" && (
                            <>
                                <h5 style={{fontWeight: "bold"}}>Add guests</h5>
                                <div className="d-flex flex-row gap-2">
                                    <Button variant="outline-dark p-1" onClick={() => {setAddMode("g"); setOrganizer(""); setGuestId("");}}>Add guest</Button>
                                    <Button variant="warning" onClick={() => {setAddMode(null); setAddingMemb(false); setSAB(true);}} className="w-50">Cancel</Button>
                                </div>
                            </>
                        )}

                        {awardMode === null && !showAllButtons && addMemb && addMode === "o" && role === "manager" && (
                            <div className="d-flex flex-column w-50 mb-2 gap-2">
                                    <h5 className="mb-1" style={{fontWeight: "bold"}}>Add organizer</h5>
                                    <input
                                        name="organizerName"
                                        placeholder="organizer UTORid"
                                        value={organizer}
                                        onChange={(e) => {setOrganizer(e.target.value); setError(null);}}
                                    />
                                    <div className="d-flex flex-row gap-2 mb-2">
                                    <Button variant="success" onClick={() => {addOrganizer(organizer, setOrganizer)}} className="w-50">Add</Button>
                                    <Button variant="warning" onClick={() => {setAddMode(null); setAddingMemb(false); setSAB(true);}} className="w-50">Cancel</Button>
                                    </div>
                            </div>  
                        )}

                        {awardMode === null && !showAllButtons && addMemb && addMode === "g" && (
                            <div className="d-flex flex-column w-50 mb-2 gap-2">
                                    <h5 className="mb-1" style={{fontWeight: "bold"}}>Add/remove guest</h5>
                                    <input
                                        name="guestId"
                                        placeholder="guest UTORid"
                                        value={guestId}
                                        onChange={(e) => {setGuestId(e.target.value); setError(null);}}
                                    />
                                    <div className="d-flex flex-row gap-2 mb-2">
                                        <Button variant="success" onClick={() => {addGuest(guestId, setGuestId);}} className="w-50">Add</Button>
                                        <Button variant="danger" onClick={() => {remGuest(guestId, setGuestId)}} className="w-50">Remove</Button>
                                        <Button variant="warning" onClick={() => {setAddMode(null); setAddingMemb(false); setSAB(true);}} className="w-50">Cancel</Button>
                                    </div>
                                </div>  
                        )}

                        {awardMode === 'single' && !showAllButtons && (
                            <>
                                {error && <div className="alert alert-danger">{error}</div>}
                                {(error == null && submitted) && <div className="alert alert-success">Successfully rewarded {recipientId} {rewardAmount} points</div>}
                                <h5 style={{fontWeight: "bold"}}>Award points</h5>
                                <div className="d-flex flex-row mb-2">
                                    <div className="w-100">
                                        <label><strong style={{fontWeight: "bolder"}}>Recipient</strong></label>
                                        <input placeholder="Recipient's UTORid" value={recipientId} onChange={(e) => {setRecipientId(e.target.value); setRewardModel(prev => ({...prev, utorid: e.target.value})); setError(null);}} />
                                    </div>
                                    <div className="w-100">
                                        <label><strong style={{fontWeight: "bolder"}}>Amount</strong></label>
                                        <input type="number" placeholder="Amount" value={rewardAmount} onChange={(e) => 
                                            {
                                                setRewardAmount(e.target.value); 
                                                setRewardModel(prev => ({...prev, amount: parseInt(e.target.value) || 0}));
                                                setSubmitted(false);
                                                setError(null);
                                            }} />
                                    </div>
                                </div>
                                <div className="d-flex flex-row gap-2 w-50">
                                    <Button className="w-50" variant="success" onClick={() => {rewardGuest(rewardModel, setRewardModel, setRecipientId, setSubmitted);}}>Send</Button>
                                    <Button className="w-50" variant="danger" onClick={() => {setAwardMode(null); setError(null); setRewardAmount(""); setRecipientId(""); setSAB(true);}}>Cancel</Button>
                                </div>
                            </>
                        )}

                        {awardMode === 'all' && !showAllButtons && (
                            <>
                                {error && <div className="alert alert-danger">{error}</div>}
                                {(error == null && submitted) && <div className="alert alert-success">Successfully rewarded everyone {rewardAmount} points</div>}
                                <div className="d-flex flex-column gap-2 w-50">
                                    <h5 style={{fontWeight: "bold"}}>Award points</h5>
                                    <input placeholder="Amount per guest" type="number" value={rewardAmount} onChange={(e) => 
                                    {
                                        setRewardAmount(e.target.value); 
                                        setRewardModel(prev => ({
                                        ...prev,
                                        amount: parseInt(e.target.value) || 0}));
                                        setSubmitted(false);
                                        setError(null);
                                    }} />
                                    <div className="d-flex flex-row gap-2">
                                        <Button variant="success" className="w-50" onClick={() => {rewardGuest(rewardModel, setRewardModel, setRecipientId, setSubmitted);}}>Send</Button>
                                        <Button variant="danger" className="w-50" onClick={() => {setAwardMode(null); setError(null); setRewardAmount(""); setSubmitted(false); setSAB(true);}}>Cancel</Button>
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
                        <Button variant="success" onClick={() => {saveEdits(editedEvent); setEditAttempted(true);}}>Save</Button>
                        <Button variant="warning" onClick={() => {setIsEditing(false); setError(null); setEditedEvent(selectedEvent); setRewardAmount(""); setEditAttempted(false);}}>Cancel</Button>
                        <Button variant="danger" onClick={() => {setShowDeleteConfirm(true); setShowModal(false); setEditAttempted(false);}}>
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
                        <Button variant="danger" onClick={() => {setShowModal(false); setError(null); setGuestId(""); setOrganizer(""); setRewardAmount("");}}>Close</Button>
                    </>
                )) }
            </Modal.Footer>
        </>
    );
}