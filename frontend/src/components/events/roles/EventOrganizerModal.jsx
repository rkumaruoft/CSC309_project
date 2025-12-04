import { Button, Modal } from "react-bootstrap";
import { useState, useEffect } from "react";
import EditEventForm from "../actions/EditEventForm";
import OrganizerActions from "../actions/OrganizerActions";
import { addGuestBackend, saveEditBackend, rewardGuestBackend } from "../../../utils/api/eventActions";
import { formatDateTime } from "../../../utils/api/dateHandling";

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

    setShowModal, // TO SHOW OR HIDE MODAL

    setShowDeleteConfirm, // ONLY MANAGER HAS THE RIGHT TO
    // OTHER FUNCTIONS/VARIABLES
    publish_event, // FUNCTION TO PUBLISH THE EVENT (MANAGER PRIVILEGES)
    addOrganizer,  // ADD EVENT ORGANIZER FUNCTION
    remGuest,       // FUNCTION TO REMOVE GUEST (MANAGER PRIVILEGES)
    refreshEventDetails, 
    fetchEvents
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
    const [publish, setPublish] = useState(false);
    const timeNow = new Date();
    const startTime = new Date(selectedEvent.startTime);
    const endTime = new Date(selectedEvent.endTime);
    const isHappening = startTime <= timeNow && timeNow <= endTime;
    const hasNotEnded = timeNow <= endTime;
    useEffect(() => {
        // Reset states when a new event is selected
        setPublish(false);
        setSubmitted(false);
        setEditAttempted(false);
        setError(null);
        setSAB(true);
        setAddMode(null);
        setAddingMemb(false);
        setGuestId("");
        setOrganizer("");
        setRecipientId("");
        setRewardAmount("");
        setAwardMode(null);
    }, [selectedEvent?.id]); // Reset when event changes

    async function addGuest(){
        const data = await addGuestBackend(selectedEvent, guestId);
        if (data.error != null){
            setError(data.error);
            return;
        }

        // Success - refresh the event details
        await refreshEventDetails();
        setGuestId(""); // Clear the input
    }

    async function rewardGuest(){
        const data = await rewardGuestBackend(selectedEvent, rewardModel);
        if (data.error != null){
            setError(data.error);
            return;
        }
        setRewardModel({
            utorid: null,
            type: "event",
            amount: 0
        });
        await refreshEventDetails();
        setSubmitted(true);
        setRecipientId("");
        setError(null);
    }

    async function saveEdits() {
        const data = await saveEditBackend(selectedEvent, editedEvent);
        if (data.error != null) {
            setError(data.error);
            return;
        }

        // update UI
        setSelectedEvent(prev => ({ ...prev, ...editedEvent }));
        fetchEvents(pageNum);
    }

    const published = (selectedEvent.published ? "yes" : "no");
    
    return (
        <>
            <Modal.Body>
                {isEditing ? (
                    <EditEventForm error={error} editAttempted={editAttempted} editedEvent={editedEvent} handleChange={handleChange}/>
                ) : (
                    <>
                        {error && (<div className="alert alert-danger">{error}</div>)}
                        {(error == null && publish) && (<div className="alert alert-success">Published event {selectedEvent.name}</div>)}
                        <p><strong>Name:</strong> {selectedEvent.name}</p>
                        <p><strong>Description:</strong> {selectedEvent.description}</p>
                        <p><strong>Organizers: </strong> {Array.isArray(selectedEvent.organizers) ? selectedEvent.organizers.join(', ') : selectedEvent.organizers} </p>
                        <p><strong>Guests: </strong> {Array.isArray(selectedEvent.guests) ? selectedEvent.guests.join(', ') : selectedEvent.guests}</p>
                        <p><strong>Location:</strong> {selectedEvent.location}</p>
                        <p><strong>Starts:</strong> {formatDateTime(selectedEvent.startTime)}, <strong>Ends:</strong> {formatDateTime(selectedEvent.endTime)}</p>
                        <p><strong>Points available:</strong> {selectedEvent.pointsRemain}</p>
                        <p><strong>Seats left:</strong> {selectedEvent.availableSeats}</p>
                        <p><strong>Published: </strong> {published}</p>
                        <OrganizerActions error={error} setError={setError} awardMode={awardMode} setAwardMode={setAwardMode}
                                          showAllButtons={showAllButtons} setSAB={setSAB} organizer={organizer} setOrganizer={setOrganizer}
                                          addMode={addMode} setAddMode={setAddMode} addMemb={addMemb} setAddingMemb={setAddingMemb}
                                          guestId={guestId} setGuestId={setGuestId} submitted={submitted} setSubmitted={setSubmitted}
                                          recipientId={recipientId} setRecipientId={setRecipientId} rewardAmount={rewardAmount} setRewardAmount={setRewardAmount}
                                          rewardModel={rewardModel} setRewardModel={setRewardModel} addGuest={addGuest} remGuest={remGuest}
                                          rewardGuest={rewardGuest} role={role} addOrganizer={addOrganizer} isHappening={isHappening} hasNotEnded={hasNotEnded}          
                         />
                        </>
                )}
            </Modal.Body>

            <Modal.Footer>
                {awardMode === null && 
                (isEditing ? (
                    <div className="d-flex flex-column">
                        <div className="d-flex flex-row gap-2">
                        <Button variant="success" onClick={() => {saveEdits(editedEvent); setIsEditing(true); setEditAttempted(true);}}>Save</Button>
                        {(role === "manager" || role === "superuser") ? (
                            <>
                            <Button variant="warning" onClick={() => {setIsEditing(false); setError(null); setEditedEvent(selectedEvent); setRewardAmount(""); setEditAttempted(false);}}>Cancel</Button>
                            <Button variant="danger" onClick={() => {setShowDeleteConfirm(true); setShowModal(false); setEditAttempted(false);}}>
                            Delete Event
                            </Button>
                            </>
                        ) : (<Button variant="danger" onClick={() => {setIsEditing(false); setError(null); setEditedEvent(selectedEvent); setRewardAmount(""); setEditAttempted(false);}}>Cancel</Button>) }
                        
                        </div>
                    </div>
                ) : (
                    <>
                        { !selectedEvent.published && (<Button variant="success" onClick={() => {publish_event(setPublish)}}>publish</Button>)}
                        <Button variant="info" onClick={() => {setIsEditing(true); setError(null);}}>Edit Info</Button>
                        <Button variant="danger" onClick={() => {setShowModal(false); setError(null); setGuestId(""); setOrganizer(""); setRewardAmount("");}}>Close</Button>
                    </>
                )) }
            </Modal.Footer>
        </>
    );
}