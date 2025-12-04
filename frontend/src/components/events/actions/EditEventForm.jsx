import { toDateTimeLocalString } from "../../../utils/api/dateHandling"

export default function EditEventForm({error, editAttempted, editedEvent, handleChange}){
    return (
        <>
            {error && editAttempted && <div className="alert alert-danger">{error}</div>}
            {(error == null && editAttempted) && <div className="alert alert-success">Successfully edited event</div>}
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
    )
}