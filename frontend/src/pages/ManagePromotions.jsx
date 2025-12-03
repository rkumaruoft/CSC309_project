import { useEffect, useState } from "react";
import { Button, Col, Container, Row, Image, Modal, Table, Alert, Form } from "react-bootstrap";
import { useLocation } from "react-router-dom";
import { delPromoId, getAllPromos, getPromoId, patchPromoId, postPromo } from "../utils/api/fetchPromos"
import PromoTable from "../components/promotions/PromoTable.jsx";
import PromoFilter from "../components/promotions/PromoFilter.jsx";
import PromoEditButtons from "../components/promotions/promoEdit/PromoEditButtons.jsx"
import AppliedFilters from "../components/promotions/PromoAppliedFilters.jsx";
import { capitalize } from "../utils/format/string.js";
import { floatToCurrency, formatRate } from "../utils/format/number.js";
import "./Promotions.css";
import PromoEditField from "../components/promotions/promoEdit/PromoEditField.jsx";
import PromoEditDropdown from "../components/promotions/promoEdit/PromoEditDropdown.jsx";
import PromoEditDate from "../components/promotions/promoEdit/PromoEditDate.jsx";
import PromoEditNumber from "../components/promotions/promoEdit/PromoEditNumber.jsx";
import DateTimePicker from "react-datetime-picker";
import NumberControl from "../components/promotions/NumberControl.jsx";
import NewDatePicker from "../components/promotions/NewDatePicker.jsx";


function ManagePromotions() {
    // ---------- Page states ----------
    const [promos, setPromos] = useState(null);
    const [pageNum, setPageNum] = useState(1);  // start on page 1 of promotions
    const [totalPages, setTotalPages] = useState(1);  // assumes at least one page
    const [filters, setFilters] = useState({});
    const [currPromo, setCurrPromo] = useState(null);

    // ---------- Component States ----------
    const [error, setError] = useState(null);  // Error display
    const [showFilter, setShowFilter] = useState(false);
        // Editing promotion states
    const [clicked, setClicked] = useState(null);  // whichever promotion was clicked on
    const [confirm, setConfirm] = useState(0);  // like a counter for confirm button clicks
    const [editing, setEditing] = useState(null);  // the promotions field currently being edited
    const [changes, setChanges] = useState({});  // the changes to the current promotion being edited
        // Creating new promotion states
    const [creating, setCreating] = useState(false);  // when a new promotion is being created
    const [optional, setOptional] = useState([]);  // the list of optional fields to include
    const [newFields, setNewFields] = useState({});  // the values of the new promotion fields

    const location = useLocation();

    // ---------- Fetch a page of promotions (10 at a time, as per the default) ----------
    async function getPromos(page) {
        // TODO: look into adding filters???
        // Invalid page; don't do anything
        if (page < 1 || page > totalPages) {
            return;
        }

        const data = await getAllPromos(page, filters);

        // Handle request failure
        if (!data) {
            setPromos(null);
            return;
        }

        // Handle successful request
        setPromos(data.results);
        setPageNum(page);
        setTotalPages(Math.max(1, Math.ceil(data.count / 10)))
    }

    // ---------- Closes the currently opened/clicked promotion ----------
    function closeCurrPromo() {
        setCurrPromo(null);
        setClicked(null);
        setEditing(null);
    }

    // ---------- Clear the current changes to the editing promotion ----------
    function clearChanges() {
        setChanges({});
        setEditing(null);
        setError(null);
    }

    // ---------- Submit the changes ----------
    async function submitChanges() {
        // Format the body
        let body = {};
        const nums = ["minSpending", "rate", "points"];
        for (const key in changes) {
            if (nums.includes(key)) {
                body[key] = Number(changes[key]);
            } else {
                body[key] = changes[key];
            }
        }

        // Call backend
        const data = await patchPromoId(clicked, body);
        if ("error" in data) {
            setError(`Couldn't save changes: ${data.error}`);
            return;
        }

        getPromos(pageNum);
        setCurrPromo(null);
        setClicked(null);
        setConfirm(0);
        setEditing(null);
        setChanges({});
        setError(null);
    }

    // ---------- Handle enabling optional fields to new promotion ----------
    function handleOptional(e) {
        if (optional.includes(e.target.id)) {
            // id already in optional; remove it
            setOptional(prev => {
                const newOptional = prev.filter(item => item !== e.target.id);
                return newOptional;
            });
        } else {
            // Add id to optional (shallow copying since id is a string)
            setOptional(prev => {
                const newOptional = [...prev];
                newOptional.push(e.target.id);
                return newOptional;
            });
        }
    }

    // ---------- Update newFields ----------
    function addNewField(key, value) {
        setNewFields(prev => ({
            ...prev,
            [key]: value
        }));
    }

    // ---------- Create new promotion ----------
    async function createNewPromotion(e) {
        e.preventDefault();

        // Format the body
        let body = {};
        const optionalFields = ["minSpending", "rate", "points"];
        for (const newField in newFields) {
            // If optional key found:
            if (optionalFields.includes(newField)) {
                if (optional.includes(newField)) {
                    // All optional fields are numbers
                    body[newField] = Number(newFields[newField]);
                }
            } else {
                body[newField] = newFields[newField];
            }
        }

        // Call the backend
        const data = await postPromo(body);
        if ("error" in data) {
            setError(`Couldn't create promotion: ${data.error}`);
            return;
        }

        getPromos(pageNum);
        setCreating(false);
        setOptional([]);
        setNewFields({});
        setError(null);

    }

    // ---------- On navigation to promotions page, fetch promotions ----------
    useEffect(() => {
        getPromos(pageNum);
        setError(null);
    }, [location]);

    // ---------- On filters set, re-fetch promotions ----------
    useEffect(() => {
        getPromos(pageNum);
        setError(null);
    }, [filters]);

    // ---------- On clicked set, fetch the clicked promotion data ----------
    useEffect(() => {
        if (!currPromo && clicked) {
            async function loadPromoId() {
                const data = await getPromoId(clicked);
                setCurrPromo(data);
            }

            loadPromoId();
        }

        setConfirm(0);
        setEditing(null);
        setChanges({});
        setError(null);
    }, [clicked]);

    // ---------- On confirmation, delete the promotion and set confirm to 0 ----------
    useEffect(() => {
        if (confirm >= 2) {
            async function deletePromotion() {
                const data = await delPromoId(clicked);

                if ("success" in data) {
                    getPromos(pageNum);
                    setCurrPromo(null);
                    setClicked(null);
                    setConfirm(0);
                    setEditing(null);
                    setChanges({});
                    setError(null);
                } else {
                    setError(`Couldn't delete promotion: ${data.error}`);
                }

                setConfirm(0);
                setEditing(null);
            }

            deletePromotion();
        }
    }, [confirm]);

    // ---------- On creating new promotion, reset new promotion states ----------
    useEffect(() => {
        setOptional([]);
        setNewFields({});
        setError(null);
    }, [creating]);

    // ---------- Return the page ----------
    return <Container>
        {/* Label */}
        <Row className="justify-content-center align-items-center mt-5 mb-3">
            <Col xs={14} md={12} lg={10}>
                <div className="d-flex align-items-center gap-3">
                    <h1 className="m-0">Manage Promotions</h1>

                    <Image
                        src="../../filter.svg"
                        alt="Filter"
                        className="filter opacity-75"
                        onClick={() => setShowFilter(!showFilter)}
                    />

                    <Button
                        variant="success"
                        className="ms-auto"
                        onClick={() => setCreating(true)}>
                            <strong>+</strong>
                    </Button>
                </div>

                {showFilter && (
                <div className="mt-2 d-inline-block">
                    <PromoFilter setFilters={setFilters} setShowFilter={setShowFilter} />
                </div>
                )}
            </Col>
        </Row>

        {/* Creating a new promotion */}
        {creating &&
        <Modal show={creating} onHide={() => setCreating(false)}>
            <Modal.Header closeButton className="bg-light">
                <Modal.Title>Create a New Promotion</Modal.Title>
            </Modal.Header>
            <Modal.Body className="d-flex flex-column justify-content-center align-items-center">
                
                <Form onSubmit={createNewPromotion}>
                    <Form.Group className="mb-2">
                        <Form.Label className="mb-0">Name:</Form.Label>
                        <Form.Control
                            value={newFields.name ? newFields.name : ""}
                            onChange={(e) => addNewField("name", e.target.value)}
                            required
                            type="text"
                        />
                    </Form.Group>

                    <Form.Group className="mb-2">
                        <Form.Label className="mb-0">Description:</Form.Label>
                        <Form.Control
                            required
                            as="textarea"
                            value={newFields.description ? newFields.description : ""}
                            onChange={(e) => addNewField("description", e.target.value)}
                        />
                    </Form.Group>

                    <Form.Group className="mb-2">
                        <Form.Label className="mb-0">Type:</Form.Label>
                        <Form.Select
                            value={newFields.type ? newFields.type : ""}
                            onChange={(e) => addNewField("type", e.target.value)}
                            required>
                                <option value="">Select Type</option>
                                <option value="automatic">Automatic</option>
                                <option value="onetime">One-Time</option>
                        </Form.Select>
                    </Form.Group>

                    <Form.Group className="mb-2">
                        <Form.Label className="me-2">Start Time:</Form.Label>
                        <NewDatePicker
                            name="startTime"
                            addNewField={addNewField}
                        />
                    </Form.Group>

                    <Form.Group className="mb-2">
                        <Form.Label className="me-3">End Time:</Form.Label>
                        <NewDatePicker
                            name="endTime"
                            addNewField={addNewField}
                        />
                    </Form.Group>

                    <Form.Group className="mb-2">
                        <div className="d-flex">
                            <Form.Label className="me-2 mb-0">Minimum Spending:</Form.Label>
                            <Form.Check
                                id="minSpending"
                                checked={optional.includes("minSpending")}
                                onChange={handleOptional}
                                className="mb-0"
                            />
                        </div>
                        <NumberControl
                            name="minSpending"
                            disabled={!optional.includes("minSpending")}
                            addNewField={addNewField}
                        />
                    </Form.Group>

                    <Form.Group className="mb-2">
                        <div className="d-flex">
                            <Form.Label className="me-2 mb-0">Rate:</Form.Label>
                            <Form.Check
                                id="rate"
                                checked={optional.includes("rate")}
                                onChange={handleOptional}
                            />
                        </div>
                        <NumberControl
                            name="rate"
                            disabled={!optional.includes("rate")}
                            addNewField={addNewField}
                        />
                    </Form.Group>

                    <Form.Group className="mb-2">
                        <div className="d-flex">
                            <Form.Label className="me-2 mb-0">Bonus Points:</Form.Label>
                            <Form.Check
                                id="points"
                                checked={optional.includes("points")}
                                onChange={handleOptional}
                            />
                        </div>
                        <NumberControl
                            name="points"
                            disabled={!optional.includes("points")}
                            addNewField={addNewField}
                            isInt={true}
                        />
                    </Form.Group>

                    <Button variant="success" type="submit">Create</Button>
                </Form>

                {error && 
                <Alert variant="danger" className="m-2">
                    {error}
                </Alert>}

            </Modal.Body>
            <Modal.Footer className="bg-light">
                <Button variant="danger" onClick={() => setCreating(false)}>
                    Cancel
                </Button>
            </Modal.Footer>
        </Modal>}
        
        {/* Show the current filters */}
        {Object.keys(filters).length > 0 &&
        <Row className="justify-content-center align-items-center mb-1">
            <Col xs="auto">
                <AppliedFilters filters={filters} setFilters={setFilters} />
            </Col>
        </Row>}
        
        {/* Table */}
        <Row className="justify-content-center">
            <Col xs={14} md={12} lg={10}>

                <PromoTable promos={promos} setClicked={setClicked} />

            </Col>
        </Row>

        {/* Pagination and page display (TODO: add better page scrolling as an option) */}
        <Row className="justify-content-center align-items-center mb-2">
            {/* Back button */}
            <Col xs="auto">
                <Button
                    onClick={() => getPromos(pageNum - 1)}
                    disabled={pageNum === 1}>
                        Back
                </Button>
            </Col>

            {/* Page Number */}
            <Col xs="auto">
                <span>
                    Page: <strong>{pageNum}/{totalPages}</strong>
                </span>
            </Col>

            {/* Forward Button */}
            <Col xs="auto">
                <Button
                    onClick={() => getPromos(pageNum + 1)}
                    disabled={pageNum === totalPages}>
                        Next
                </Button>
            </Col>
    
        </Row>

        {/* On-click effect */}
        {currPromo && 
        <Row>
            <Col>
            
                <Modal show={clicked} onHide={closeCurrPromo} size="lg">
                    <Modal.Header closeButton className="bg-light">
                        <Modal.Title><strong>Promotion Details:</strong> Click to Edit</Modal.Title>
                    </Modal.Header>
                    <Modal.Body className="d-flex flex-column justify-content-center align-items-center">
                        
                        <Table borderless hover>
                            <colgroup>
                                <col className="edit-key" />
                                <col className="edit-data" />
                                <col className="edit-edit" />
                            </colgroup>

                            <tbody>
                                <tr>
                                    <th>ID:</th>
                                    <td>{currPromo.id}</td>
                                    <td></td>
                                </tr>

                                <tr className="promo-table-body" onClick={() => setEditing("name")}>
                                    <th>Name:</th>
                                    <td>
                                        <PromoEditField
                                            editing={editing}
                                            field={"name"}
                                            changes={changes}
                                            setChanges={setChanges}
                                            currPromo={currPromo}
                                            format={capitalize}
                                        />
                                    </td>
                                    <td>
                                        <PromoEditButtons
                                            field={"name"}
                                            editing={editing}
                                            setEditing={setEditing}
                                            changes={changes}
                                            setChanges={setChanges}
                                        />
                                    </td>
                                </tr>

                                <tr className="promo-table-body" onClick={() => setEditing("description")}>
                                    <th>Description:</th>
                                    <td>
                                        <PromoEditField
                                            editing={editing}
                                            field={"description"}
                                            changes={changes}
                                            setChanges={setChanges}
                                            currPromo={currPromo}
                                        />
                                    </td>
                                    <td>
                                        <PromoEditButtons
                                            field={"description"}
                                            editing={editing}
                                            setEditing={setEditing}
                                            changes={changes}
                                            setChanges={setChanges}
                                        />
                                    </td>
                                </tr>

                                <tr className="promo-table-body" onClick={() => setEditing("type")}>
                                    <th>Type:</th>
                                    <td>
                                        <PromoEditDropdown
                                            editing={editing}
                                            field={"type"}
                                            changes={changes}
                                            setChanges={setChanges}
                                            currPromo={currPromo}
                                            format={capitalize}
                                        />
                                    </td>
                                    <td>
                                        <PromoEditButtons
                                            field={"type"}
                                            editing={editing}
                                            setEditing={setEditing}
                                            changes={changes}
                                            setChanges={setChanges}
                                        />
                                    </td>
                                </tr>

                                <tr className="promo-table-body" onClick={() => setEditing("startTime")}>
                                    <th>Starts at:</th>
                                    <td>
                                        <PromoEditDate
                                            editing={editing}
                                            field={"startTime"}
                                            changes={changes}
                                            setChanges={setChanges}
                                            currPromo={currPromo}
                                        />
                                    </td>
                                    <td>
                                        <PromoEditButtons
                                            field={"startTime"}
                                            editing={editing}
                                            setEditing={setEditing}
                                            changes={changes}
                                            setChanges={setChanges}
                                        />
                                    </td>
                                </tr>

                                <tr className="promo-table-body" onClick={() => setEditing("endTime")}>
                                    <th>Ends at:</th>
                                    <td>
                                        <PromoEditDate
                                            editing={editing}
                                            field={"endTime"}
                                            changes={changes}
                                            setChanges={setChanges}
                                            currPromo={currPromo}
                                        />
                                    </td>
                                    <td>
                                        <PromoEditButtons
                                            field={"endTime"}
                                            editing={editing}
                                            setEditing={setEditing}
                                            changes={changes}
                                            setChanges={setChanges}
                                        />
                                    </td>
                                </tr>

                                <tr className="promo-table-body" onClick={() => setEditing("minSpending")}>
                                    <th>Minimum Spending:</th>
                                    <td>
                                        <PromoEditNumber
                                            editing={editing}
                                            field={"minSpending"}
                                            changes={changes}
                                            setChanges={setChanges}
                                            currPromo={currPromo}
                                            format={floatToCurrency}
                                        />
                                    </td>
                                    <td>
                                        <PromoEditButtons
                                            field={"minSpending"}
                                            editing={editing}
                                            setEditing={setEditing}
                                            changes={changes}
                                            setChanges={setChanges}
                                            required={false}
                                        />
                                    </td>
                                </tr>

                                <tr className="promo-table-body" onClick={() => setEditing("rate")}>
                                    <th>Rate:</th>
                                    <td>
                                        <PromoEditNumber
                                            editing={editing}
                                            field={"rate"}
                                            changes={changes}
                                            setChanges={setChanges}
                                            currPromo={currPromo}
                                            format={formatRate}
                                        />
                                    </td>
                                    <td>
                                        <PromoEditButtons
                                            field={"rate"}
                                            editing={editing}
                                            setEditing={setEditing}
                                            changes={changes}
                                            setChanges={setChanges}
                                            required={false}
                                        />
                                    </td>
                                </tr>

                                <tr className="promo-table-body" onClick={() => setEditing("points")}>
                                    <th>Bonus Points:</th>
                                    <td>
                                        <PromoEditNumber
                                            editing={editing}
                                            field={"points"}
                                            changes={changes}
                                            setChanges={setChanges}
                                            currPromo={currPromo}
                                            isInt={true}
                                        />
                                    </td>
                                    <td>
                                        <PromoEditButtons
                                            field={"points"}
                                            editing={editing}
                                            setEditing={setEditing}
                                            changes={changes}
                                            setChanges={setChanges}
                                            required={false}
                                        />
                                    </td>
                                </tr>
                            </tbody>
                        </Table>

                        <div className="d-flex w-100">
                            {Object.keys(changes).length > 0 &&
                            <>
                                <Button variant="success"
                                    value={changes}
                                    onClick={submitChanges}
                                    className="me-2">
                                        Save Changes
                                </Button>

                                <Button variant="secondary" value={changes} onClick={clearChanges}>
                                    Clear
                                </Button>
                            </>}

                            <Button
                                variant="danger"
                                value={confirm}
                                onClick={() => setConfirm(prev => prev + 1)}
                                className="ms-auto">
                                    {confirm === 0 ? "Delete Promotion" : "Are You Sure?"}
                            </Button>
                        </div>
                        
                        {error && 
                        <Alert variant="danger" className="m-2">
                            {error}
                        </Alert>}

                    </Modal.Body>
                    <Modal.Footer className="bg-light">
                        <Button onClick={closeCurrPromo}>Close</Button>
                    </Modal.Footer>
                </Modal>

            </Col>
        </Row>}

    </Container>;
}

export default ManagePromotions;
