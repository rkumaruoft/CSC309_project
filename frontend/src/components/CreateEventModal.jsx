import { useEffect, useState } from "react";
import { Button, Modal } from "react-bootstrap";

// NEEDED PARAMS: NAME, DESCRIPTION, LOCATION, STARTTIME, ENDTIME, CAPACITY (OPTIONAL), PTS

function toDateTimeLocalString(dateStr) {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    return d.toISOString().slice(0, 16);  // drop seconds + Z
}

export default function EventSettingModal({ show, onHide, onSubmit, error }) {
    const [name, setName] = useState("");
    const [description, setDesc] = useState("");
    const [location, setLocation] = useState("");
    const [startTime, setStart] = useState("");
    const [endTime, setEnd] = useState("");
    const [capacity, setCapacity] = useState("");
    const [points, setPoints] = useState("");

    // Reset form when modal closes
    useEffect(() => {
        if (!show) {
            setName("");
            setDesc("");
            setLocation("");
            setStart("");
            setEnd("");
            setCapacity("");
            setPoints("");
        }
    }, [show]);

    const handleSubmit = () => {
        // Gather all form data
        const eventData = {
            name,
            description,
            location,
            startTime,
            endTime,
            capacity: capacity ? Number(capacity) : null,
            points: Number(points)
        };

        // Call the parent's submit handler
        onSubmit(eventData);
    };

    return (
        <Modal show={show} onHide={onHide} size="lg">
            <Modal.Header closeButton>
                <Modal.Title>Create New Event</Modal.Title>
            </Modal.Header>
            
            <Modal.Body>
                {error && <div className="alert alert-danger">{error}</div>}
                
                <div className="mb-2">
                    <label>Name</label>
                    <input
                        className="form-control"
                        name="name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        required
                    />
                </div>

                <div className="mb-2">
                    <label>Description</label>
                    <textarea
                        className="form-control"
                        name="description"
                        value={description}
                        onChange={(e) => setDesc(e.target.value)}
                        rows={3}
                        required
                    />
                </div>

                <div className="mb-2">
                    <label>Location</label>
                    <input
                        className="form-control"
                        name="location"
                        value={location}
                        onChange={(e) => setLocation(e.target.value)}
                        required
                    />
                </div>
        
                <div className="mb-2">
                    <label>Start Time</label>
                    <input
                        type="datetime-local"
                        className="form-control"
                        name="startTime"
                        value={startTime}
                        onChange={(e) => setStart(e.target.value)}
                        required
                    />
                </div>

                <div className="mb-2">
                    <label>End Time</label>
                    <input
                        type="datetime-local"
                        className="form-control"
                        name="endTime"
                        value={endTime}
                        onChange={(e) => setEnd(e.target.value)}
                        required
                    />
                </div>

                <div className="d-flex flex-row gap-2">
                    <div className="mb-2 flex-grow-1">
                        <label>Capacity (leave empty for unlimited)</label>
                        <input
                            type="number"
                            className="form-control"
                            name="capacity"
                            value={capacity}
                            onChange={(e) => setCapacity(e.target.value)}
                            min="1"
                            placeholder="Optional"
                        />
                    </div>

                    <div className="mb-2 flex-grow-1">
                        <label>Total Points</label>
                        <input
                            type="number"
                            className="form-control"
                            name="points"
                            value={points}
                            onChange={(e) => setPoints(e.target.value)}
                            min="1"
                            required
                        />
                    </div>
                </div>
            </Modal.Body>

            <Modal.Footer>
                <Button variant="secondary" onClick={onHide}>
                    Cancel
                </Button>
                <Button variant="success" onClick={handleSubmit}>
                    Create Event
                </Button>
            </Modal.Footer>
        </Modal>
    );
}