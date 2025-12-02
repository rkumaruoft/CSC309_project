import { useEffect, useState } from "react";
import { Button, Form, Modal } from "react-bootstrap";

// ---------- The edit-modal component ----------
function EditModal({ edit, setEdit, addChange }) {
    const [shownField, setShownField] = useState("");  // same as edit, but doesn't instantly change
    const [field, setField] = useState("");
    const [error, setError] = useState("");

    // ---------- Setting the shown field ----------
    useEffect(() => {
        if (edit) {
            setShownField(edit);
        }
    }, [edit]);

    // ---------- Formatting header display ----------
    function formatHeader(header) {
        if (header === "avatarUrl") {
            return "avatar";
        }

        return header;
    }

    // ---------- Special field handling ----------
    function isValidName(raw) {
        const name = raw.trim();
        return !(name.length < 1 || name.length > 50)
    }

    function isValidEmail(raw) {
        const email = raw.trim();
        const emailRegex = /^[A-Za-z0-9._%+-]+@mail\.utoronto\.ca$/;

        return emailRegex.test(email);
    }

    function isValidDate(raw) {
        if (raw.trim() === "") {
            return false;
        }

        // Must match YYYY-MM-DD
        const regex = /^\d{4}-\d{2}-\d{2}$/;
        if (!regex.test(raw)) {
            return false;
        }

        const d = new Date(raw);

        // Reject invalid date (e.g. Feb 30) or future date
        if (isNaN(d.getTime()) || Date.now() < d) {
            return false;
        }

        // Round-trip check: ensure date is real
        const iso = d.toISOString().split("T")[0];
        if (iso !== raw) {
            return false;
        }

        return true;
    }

    // ---------- Handle submit ----------
    function handleChange() {
        // Special field handling
        if (shownField === "name") {
            if (!isValidName(field)) {
                setError("Invalid name: Name must be between 1 and 50 characters long");
                return;
            }
        }

        if (shownField === "email") {
            if (!isValidEmail(field)) {
                setError("Invalid email: Please follow <prefix>@mail.utoronto.ca");
                return;
            }
        }

        if (shownField === "birthday") {
            if (!isValidDate(field)) {
                setError("Invalid birthday: Please follow YYYY-MM-DD for a past date");
                return;
            }
        }

        // Change states
        addChange(shownField, field);
        setEdit("");
        setField("");
        setError("");
    }

    // ---------- Handle cancel ----------
    function handleCancel() {
        setField("");
        setError("");
        setEdit("");
    }

    // ---------- Decides the input field based on shownField ----------
    let InputField;
    if (shownField === "name") {
        InputField = <Form.Control
                        value={field}
                        onChange={(e) => setField(e.target.value)}
                        type="text"
                        placeholder="Enter your new name"
                        required />;
    } else if (shownField === "email") {
        InputField = <Form.Control
                        value={field}
                        onChange={(e) => setField(e.target.value)}
                        type="email"
                        placeholder="Enter your new email"
                        required />;
    } else if (shownField === "birthday") {
        // TODO: use react-datepicker library/component?
        InputField = <Form.Control
                        value={field}
                        onChange={(e) => setField(e.target.value)}
                        type="text"
                        placeholder="YYYY-MM-DD"
                        required />;
    } else if (shownField === "avatarUrl") {
        InputField = <Form.Control
                        type="file"
                        accept="image/*"
                        onChange={(e) => setField(e.target.files[0])}/>
    } else {
        InputField = <div className="alert alert-danger">Field not recognized</div>
    }

    // ---------- Return the modal ----------
    return (
        <Modal show={edit} onHide={() => setEdit("")}>
            <Modal.Header closeButton>
                <Modal.Title>Editing {formatHeader(shownField)}:</Modal.Title>
            </Modal.Header>
            <Modal.Body className="d-flex flex-column justify-content-center align-items-center">
                {InputField}
                {error && <div className="text-center alert alert-danger mt-4">{error}</div>}
            </Modal.Body>
            <Modal.Footer>
                <Button variant="warning" onClick={handleChange}>Confirm</Button>
                <Button variant="secondary" onClick={handleCancel}>Cancel</Button>
            </Modal.Footer>
        </Modal>
    );
}

export default EditModal;