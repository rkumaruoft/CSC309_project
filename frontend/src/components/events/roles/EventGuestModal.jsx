import { Modal, Button } from "react-bootstrap";
import { formatDateTime } from "../../../utils/api/dateHandling";

export default function EventGuestModal({ selectedEvent, rsvp, rsvp_user, error, setError, setShowModal }) {
    const isGuest = rsvp ? "yes" : "no";
    return (
        <>
            <Modal.Body>
                <p><strong>Location:</strong> {selectedEvent?.location}</p>
                <p><strong>Description:</strong> {selectedEvent?.description}</p>
                <p><strong>Starts:</strong> {formatDateTime(selectedEvent?.startTime)}, <strong>Ends:</strong> {formatDateTime(selectedEvent?.endTime)}</p>
                <p><strong>Available seats:</strong> {selectedEvent?.availableSeats}</p>
                <p><strong>Attending:</strong> {isGuest}</p>
                {error && <div className="alert alert-danger">{error}</div>}
            </Modal.Body>

            <Modal.Footer>
                {(!rsvp &&
                    (<Button variant="success" onClick={() => rsvp_user(selectedEvent)}>
                        RSVP
                    </Button>)
                )}
                <Button variant="danger" onClick={() => {setShowModal(false); setError(null);}}>
                    Close
                </Button>
            </Modal.Footer>
        </>
    );
}
