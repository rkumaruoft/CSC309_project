import { useEffect, useState } from "react";
import { Button, Card, Col, Container, Form, Image, Modal, Row, Table } from "react-bootstrap";
import { useLocation } from "react-router-dom";


// Setting up backend URL (TODO: how are we doing this?)
const VITE_BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:3000";

// ---------- Handle avatar photo finding ----------
function findAvatar(avatarUser) {
    if (!avatarUser || !avatarUser.avatarUrl) {
        return "../../defaultAvatar.svg";
    } else {
        return `${VITE_BACKEND_URL}/avatars/${avatarUser.avatarUrl}`
    }
}

// ---------- The edit-modal component ----------
// TODO: should this be a separate file?
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
            onChange={(e) => setField(e.target.files[0])} />
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



// ---------- The profile page ----------
// TODO: make user and setUser a state/context that comes from "outside"
function Profile() {
    // ---------- Page states ----------
    // TODO: is there a point in currUser?
    const [user, setUser] = useState(null);  // the actual user data, as reflected in localStorage
    const [changes, setChanges] = useState(null);  // contains name, email, bday, or avatar (TODO: url?)
    const [currUser, setCurrUser] = useState(user);  // the current user (for displaying unsaved changes)

    // ---------- Component states ----------
    const [hovering, setHovering] = useState("");
    const [edit, setEdit] = useState("");
    const [error, setError] = useState("");  // TODO: add error display somewhere

    const location = useLocation();

    const token = localStorage.getItem("token");

    // ---------- Initialize some states to nothing on reload ----------
    useEffect(() => {
        setHovering("");
        setError("");
        const userStr = localStorage.getItem("user");
        setUser(userStr ? JSON.parse(userStr) : null);
    }, [location]);

    // ---------- Change currUser info if there are unsaved changes when user changes ----------
    useEffect(() => {
        // Assumes that the changes you want are the most recent (also separate from other possible changes)
        if (!changes) {
            setCurrUser(user);
        }
    }, [user]);

    // ---------- Formatting helpers ----------
    function formatName(name) {
        let new_name = "";
        const parts = name.split(" ");
        for (const part of parts) {
            new_name += (" " + part.charAt(0).toUpperCase() + part.slice(1));
        }

        return new_name.trim();
    }

    function formatVerified(verified) {
        return verified ? "Yes" : "No";
    }

    function formatBirthday(bday) {
        return bday ? bday.split("T")[0] : "Not Set";
    }

    // ---------- Update user info based on the changes state ----------
    async function updateUser() {
        // Assumes changes is not null

        // Convert into formData
        const formChanges = new FormData();
        for (let key in changes) {
            formChanges.append(key, changes[key]);
        }

        // Call backend
        const res = await fetch(`${VITE_BACKEND_URL}/users/me`, {
            method: "PATCH",
            headers: {
                Authorization: `Bearer ${token}`,
            },
            body: formChanges
        });
        const data = await res.json();

        // Handle request failure
        if (!res.ok) {
            setError(`Failed to save changes: ${data.error}`);
            return;
        }

        // Handle successful request
        setUser(data);
        setChanges(null);
        setError("");
        localStorage.setItem("user", JSON.stringify(data));
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
                    <h1>{currUser ? `${currUser.name}'s` : "Your"} Profile</h1>
                </Form.Label>
            </Col>
        </Row>

        {/* Profile display */}
        <Row>
            <Col xs={7}>

                <Card>
                    {currUser &&
                        <Table className="profile-table" aria-labelledby="profile-label" responsive>
                            <colgroup>
                                <col className="profile-key" />
                                <col className="profile-data" />
                                <col className="profile-edit" />
                            </colgroup>

                            <tbody>
                                <tr>
                                    <th>UTORid:</th>
                                    <td className="text-truncate">{currUser.utorid}</td>
                                </tr>
                                <tr onMouseEnter={() => setHovering("name")}
                                    onMouseLeave={() => setHovering("")}>
                                    <th>Name:</th>
                                    <td className="text-truncate">{formatName(currUser.name)}</td>
                                    <td>
                                        <Button
                                            onClick={() => setEdit("name")}
                                            className={hovering === "name" ? "visible" : "invisible"}
                                            size="sm">
                                            Edit
                                        </Button>
                                    </td>
                                </tr>
                                <tr onMouseEnter={() => setHovering("email")}
                                    onMouseLeave={() => setHovering("")}>
                                    <th>Email:</th>
                                    <td className="text-truncate">{currUser.email}</td>
                                    <td>
                                        <Button
                                            onClick={() => setEdit("email")}
                                            className={hovering === "email" ? "visible" : "invisible"}
                                            size="sm">
                                            Edit
                                        </Button>
                                    </td>
                                </tr>
                                <tr>
                                    <th>Verified:</th>
                                    <td className="text-truncate">{formatVerified(currUser.verified)}</td>
                                </tr>
                                <tr onMouseEnter={() => setHovering("birthday")}
                                    onMouseLeave={() => setHovering("")}>
                                    <th>Birthday:</th>
                                    <td className="text-truncate">{formatBirthday(currUser.birthday)}</td>
                                    <td>
                                        <Button
                                            onClick={() => setEdit("birthday")}
                                            className={hovering === "birthday" ? "visible" : "invisible"}
                                            size="sm">
                                            Edit
                                        </Button>
                                    </td>
                                </tr>
                                <tr>
                                    <th>Points:</th>
                                    <td className="text-truncate">{currUser.points}</td>
                                </tr>
                            </tbody>
                        </Table>}
                </Card>

            </Col>

            {/* Change avatar */}
            <Col>
                {currUser &&
                    <div className="d-flex flex-column justify-content-center align-items-center mt-5">
                        <Image
                            src={findAvatar(currUser)}
                            roundedCircle
                            style={{
                                width: "150px",
                                height: "150px",
                                objectFit: "cover",
                                border: "4px solid #ffffff",
                                boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
                                background: "white"
                            }}
                        />


                        <div>
                            <Button className="mt-3" onClick={() => setEdit("avatarUrl")}>Edit Avatar</Button>
                        </div>
                    </div>}
            </Col>
        </Row>

        {/* Save and clear buttons */}
        {changes &&
            <Row className="mt-2">
                <Col>
                    <Button className="me-2" onClick={updateUser}>Save Changes</Button>
                    <Button variant="secondary" onClick={clearChanges}>Clear</Button>
                </Col>
            </Row>}

        {/* The edit field */}
        <Row>
            <Col>
                <EditModal edit={edit} setEdit={setEdit} addChange={addChange} />
            </Col>
        </Row>

        {/* Show error */}
        {error &&
            <Row>
                <Col>
                    <div className="m-2">{error}</div>
                </Col>
            </Row>}



    </Container>

}

export default Profile;
export { findAvatar };
