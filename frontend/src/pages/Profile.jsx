import { useEffect, useState } from "react";
import { Button, Card, Col, Container, Form, Modal, Row, Table } from "react-bootstrap";
import { useLocation } from "react-router-dom";


// Setting up backend URL (TODO: how are we doing this?)
const VITE_BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:3000";

// TODO: should this be a separate file?
function EditModal({ edit, setEdit, addChange }) {
    const [field, setField] = useState("");
    const [error, setError] = useState("");

    function isValidDate(str) {
        const date = new Date(str);
        return (date.toString() !== "Invalid Date")
    }

    // ---------- Handle submit ----------
    function handleChange() {
        // Special field handling
        if (edit === "birthday") {
            if (!isValidDate(field)) {
                setError("Invalid birthday: Please follow MM/DD/YYYY");
                return;
            }
        }

        // Change states
        addChange(edit, field);
        setField("");
        setError("");
    }

    // ---------- Handle cancel ----------
    function handleCancel() {
        setField("");
        setError("");
        setEdit("");
    }

    // ---------- Decides the input field based on edit ----------
    let InputField;
    if (edit === "name") {
        InputField = <Form.Control
                        value={field}
                        onChange={(e) => setField(e.target.value)}
                        type="text"
                        placeholder="Enter your new name"
                        required />;
    } else if (edit === "email") {
        InputField = <Form.Control
                        value={field}
                        onChange={(e) => setField(e.target.value)}
                        type="email"
                        placeholder="Enter your new email"
                        required />;
    } else if (edit === "birthday") {
        // TODO: use react-datepicker library/component?
        InputField = <Form.Control
                        value={field}
                        onChange={(e) => setField(e.target.value)}
                        type="text"
                        placeholder="DD/MM/YYYY"
                        required />;
    } else {
        InputField = <div className="alert alert-danger">Field not recognized</div>
    }

    // ---------- Return the modal ----------
    return (
        <Modal show={edit} onHide={() => setEdit("")}>
            <Modal.Header closeButton style={{ backgroundColor: "#FFF9C4" }}>
                <Modal.Title>Editing {edit}:</Modal.Title>
            </Modal.Header>
            <Modal.Body className="d-flex flex-column justify-content-center align-items-center">
                <InputField />
                {error && <div className="alert alert-danger">{error}</div>}
            </Modal.Body>
            <Modal.Footer style={{ backgroundColor: "#FFF9C4" }}>
                <Button variant="warning" onClick={handleChange}>Confirm</Button>
                <Button variant="secondary" onClick={handleCancel}>Cancel</Button>
            </Modal.Footer>
        </Modal>
    );
}


// TODO: make user and setUser a state/context that comes from "outside"
function Profile({ user, setUser }) {
    // ---------- Page states ----------
    const [changes, setChanges] = useState(null);  // contains name, email, bday, or avatar (TODO: url?)
    const [currUser, setCurrUser] = useState(user);  // the current user (for displaying unsaved changes)

    // ---------- Component states ----------
    const [hovering, setHovering] = useState(false);
    const [edit, setEdit] = useState("");
    const [error, setError] = useState("");

    const location = useLocation();

    const token = localStorage.getItem("token");

    // ---------- Initialize some states to nothing on reload ----------
    useEffect(() => {
        setHovering(false);
        setError("");
    }, [location]);

    // ---------- Change currUser info if there are unsaved changes when user changes ----------
    useEffect(() => {
        // Assumes that the changes you want are the most recent (also separate from other possible changes)
        if (!changes) {
            setCurrUser(user);
        }
    }, [user]);
    
    // ---------- Update user info based on the changes state ----------
    async function updateUser() {
        // Assumes changes is not null
        const res = await fetch(`${VITE_BACKEND_URL}/users/me`, {
            method: "PATCH",
            headers: {
                Authorization: `Bearer ${token}`
            },
            body: JSON.stringify(changes)
        });
        const data = await res.json();

        // Handle request failure
        if (!res.ok) {
            setError(`Failed to save changes: ${data.error}`);
            return;

            // TODO: test on valid data
            // If invalid token, use demo for testing

        }
        
        // Handle successful request
        setUser(data);
        setChanges(null);
        setError("");
    }

    // ---------- Add a change to changes ----------
    function addChange(key, value) {
        // Set changes and currUser based on the input's field attribute (can i even do this lol)
        setChanges(prev => ({
            ...(prev || {}),
            [key]: value
        }));

        setCurrUser(prev => ({
            ...(prev || {}),
            [key]: value
        }));

        setError("");
    }

    // ---------- Clear all changes ----------
    function clearChanges() {
        setChanges(null);
        setCurrUser(user);
        setError("");
    }

    // ---------- Return the page ----------
    return <Container>
        {/* Label for page */}
        <Row className="justify-content-center align-items-center mt-5">
            <Col>
                <Form.Label id="profile-label" className="d-block mb-3">
                    <h1>Your Profile</h1>
                </Form.Label>
            </Col>
        </Row>

        {/* Profile display (TODO: avatar support) */}
        <Row>
            <Col>

                <Card>
                    <Table aria-labelledby="profile-label" borderless responsive hover={hovering}>
                        <tbody>
                            <tr>
                                <th>UTORid:</th>
                                <td>{currUser.utorid}</td>
                            </tr>
                            <tr onMouseEnter={() => setHovering(true)}
                                onMouseLeave={() =>setHovering(false)}
                                onClick={() => setEdit("name")}>
                                    <th>Name:</th>
                                    <td>{currUser.name}</td>
                            </tr>
                            <tr onMouseEnter={() => setHovering(true)}
                                onMouseLeave={() =>setHovering(false)}
                                onClick={() => setEdit("email")}>
                                    <th>Email:</th>
                                    <td>{currUser.email}</td>
                            </tr>
                            <tr>
                                <th>Verified:</th>
                                <td>{currUser.verified}</td>
                            </tr>
                            <tr onMouseEnter={() => setHovering(true)}
                                onMouseLeave={() =>setHovering(false)}
                                onClick={() => setEdit("birthday")}>
                                    <th>Birthday:</th>
                                    <td>{currUser.birthday}</td>
                            </tr>
                            <tr>
                                <th>Points:</th>
                                <td>{currUser.points}</td>
                            </tr>
                        </tbody>
                    </Table>

                    {/* Save and clear buttons */}
                    {changes &&
                    <Row>
                        <Col>
                            <Button variant="secondary" onClick={clearChanges}>Clear</Button>
                        </Col>

                        <Col>
                            <Button variant="warning" onClick={updateUser}>Save Changes</Button>
                        </Col>
                    </Row>}
                </Card>

            </Col>
        </Row>

        {/* The edit field */}
        <Row>
            <Col>
                <EditModal edit={edit} setEdit={setEdit} addChange={addChange} />
            </Col>
        </Row>



    </Container>

}

export default Profile;
