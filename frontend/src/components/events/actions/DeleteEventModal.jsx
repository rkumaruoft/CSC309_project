import { Button, Modal } from "react-bootstrap";

export default function DeleteConfirmModal({ show, onClose, onConfirm, eventName, error }) {
    return (
        <Modal show={show} onHide={onClose} centered>
            <Modal.Header closeButton>
                <Modal.Title>Confirm Delete</Modal.Title>
            </Modal.Header>
            <Modal.Body>
                {error && <div className="alert alert-danger w-80">{error}</div>}
                <p>Are you sure you want to delete the event <strong>"{eventName}"</strong>?</p>
                <p className="text-danger">This action cannot be undone.</p>
            </Modal.Body>
            <Modal.Footer>
                <Button variant="secondary" onClick={onClose}>
                    Cancel
                </Button>
                <Button variant="danger" onClick={onConfirm}>
                    Delete Event
                </Button>
            </Modal.Footer>
        </Modal>
    );
}