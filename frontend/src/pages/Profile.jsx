import { useEffect, useState } from "react";
import { Button, Card, Col, Container, Form, Image, Modal, Row, Table } from "react-bootstrap";
import { useLocation } from "react-router-dom";
import EditModal from "../components/profile/EditModal";
import findAvatar from "../utils/findAvatar";
import { capitalize } from "../utils/format/string";
import { formatBirthday } from "../utils/format/date";
import PasswordModal from "../components/profile/PasswordModal";


// Setting up backend URL (TODO: how are we doing this?)
const VITE_BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:3000";

// ---------- The profile page ----------
function Profile() {
    // ---------- Page states ----------
    // TODO: is there a point in currUser?
    const [user, setUser] = useState(null);  // the actual user data, as reflected in localStorage
    const [changes, setChanges] = useState(null);  // contains name, email, bday, or avatar (TODO: url?)
    const [currUser, setCurrUser] = useState(user);  // the current user (for displaying unsaved changes)

    // ---------- Component states ----------
    const [hovering, setHovering] = useState("");
    const [edit, setEdit] = useState("");
    const [changingPw, setChangingPw] = useState(false);
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
    function formatVerified(verified) {
        return verified ? "Yes" : "No";
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
            credentials: "include",
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
                <Form.Label className="d-block mb-3">
                    <h1>{currUser ? `${capitalize(currUser.name)}'s` : "Your"} Profile</h1>
                </Form.Label>
            </Col>
        </Row>

        {/* Profile display */}
        <Row>
            <Col xs={7}>

                <Card className="p-2 shadow-sm">
                    {currUser &&
                    <Table className="profile-table" borderless responsive>
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
                                <td className="text-truncate">{capitalize(currUser.name)}</td>
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

                    {changes &&
                    <div className="d-flex">
                        <Button className="me-2" onClick={updateUser}>Save Changes</Button>
                        <Button variant="secondary" onClick={clearChanges}>Clear</Button>
                    </div>}
                </Card>

            </Col>

            {/* Change avatar */}
            <Col>
                {currUser &&
                    <div className="d-flex flex-column justify-content-center align-items-center mt-5">
                        <Image
                            className="profile-avatar"
                            src={findAvatar(currUser, VITE_BACKEND_URL)}
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

        {/* Change password */}
        {changingPw &&
        <PasswordModal changing={changingPw} setChanging={setChangingPw} />}

        {/* Change password buttons */}
        <Row className="mt-2">
            <Col>
                <Card className="shadow-sm change-pw-card">
                    <Card.Body className="d-flex justify-content-center align-items-center gap-2">
                        <span className="fw-bold">Change Password:</span>
                        <Button size="sm" onClick={() => setChangingPw(true)}>
                            Edit
                        </Button>
                    </Card.Body>
                </Card>
            </Col>
        </Row>

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
