import { useEffect, useState } from "react";
import { Alert, Button, Form, Image, InputGroup, Modal } from "react-bootstrap";
import { patchPassword } from "../../utils/api/fetchUsers";
import ShowPasswordButton from "./ShowPasswordButton";


function PasswordModal({ changing, setChanging }) {
    // ---------- Page states ----------
    const [oldPw, setOldPw] = useState("");
    const [newPw, setNewPw] = useState("");
    const [confirmPw, setConfirmPw] = useState("");
    // ---------- Display states ----------
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);
    const [show, setShow] = useState(null);

    // ---------- Get the path to the show-password icon ----------
    function showIcon(field) {
        // Assuming called from inside components/profile
        return show === field ? "../../../hidePassword.svg" : "../../../showPassword.svg";
    }

    // ---------- Get the control type ----------
    function showText(field) {
        return show === field ? "text" : "password";
    }

    // ---------- Handle password changing ----------
    async function handleSubmit(e) {
        e.preventDefault();

        // Confirm new = confirm
        if (newPw !== confirmPw) {
            setError("Passwords must match");
            return;
        }

        // Call backend
        const data = await patchPassword(oldPw, newPw);
        
        // Handle error
        if ("error" in data) {
            setSuccess(null);
            setError(`Couldn't change password: ${data.error}`);
            return;
        }

        // Handle success
        setError(null);
        setSuccess("Successfully changed password!");
        setOldPw("");
        setNewPw("");
        setConfirmPw("");
    }

    // ---------- On opening/closing, initialize ----------
    useEffect(() => {
        setError(null);
        setSuccess(null);
        setOldPw("");
        setNewPw("");
        setConfirmPw("");
    }, [changing]);

    // ---------- Return the modal ----------
    return (
        <Modal show={changing} onHide={() => setChanging(false)}>
            <Modal.Header closeButton className="bg-primary text-light">
                <Modal.Title>Changing password:</Modal.Title>
            </Modal.Header>
            <Modal.Body className="d-flex flex-column justify-content-center align-items-center">

                {!success &&
                <Form onSubmit={handleSubmit} id="pw-change">
                    <Form.Group className="mb-3">
                        <Form.Label className="mb-0">Old Password:</Form.Label>
                        <InputGroup className="d-flex align-items-center gap-2">
                            <Form.Control
                                type={showText("old")}
                                placeholder="Enter your old password"
                                required
                                value={oldPw}
                                onChange={(e) => setOldPw(e.target.value)}
                            />
                            <ShowPasswordButton
                                field={"old"}
                                show={show}
                                setShow={setShow}
                                showIcon={showIcon}
                            />
                        </InputGroup>
                    </Form.Group>

                    <Form.Group className="mb-3">
                        <Form.Label className="mb-0">New Password:</Form.Label>
                        <InputGroup className="d-flex align-items-center gap-2">
                            <Form.Control
                                type={showText("new")}
                                placeholder="Enter your new password"
                                required
                                value={newPw}
                                onChange={(e) => setNewPw(e.target.value)}
                            />
                            <ShowPasswordButton
                                field={"new"}
                                show={show}
                                setShow={setShow}
                                showIcon={showIcon}
                            />
                        </InputGroup>
                    </Form.Group>

                    <Form.Group className="mb-3">
                        <Form.Label className="mb-0">Confirm New Password:</Form.Label>
                        <InputGroup className="d-flex align-items-center gap-2">
                            <Form.Control
                                type={showText("confirm")}
                                placeholder="Re-enter your new password"
                                required
                                value={confirmPw}
                                onChange={(e) => setConfirmPw(e.target.value)}
                            />
                            <ShowPasswordButton
                                field={"confirm"}
                                show={show}
                                setShow={setShow}
                                showIcon={showIcon}
                            />
                        </InputGroup>
                    </Form.Group>
                </Form>}

                {success &&
                <Alert variant="success">
                    {success}
                </Alert>}

                {error &&
                <Alert variant="danger">
                    {error}
                </Alert>}

            </Modal.Body>
            <Modal.Footer className="bg-light">
                <Button type="submit" form="pw-change">Confirm</Button>
                <Button variant="outline-primary" onClick={() => setChanging(false)}>Cancel</Button>
            </Modal.Footer>
        </Modal>
    );
}

export default PasswordModal;