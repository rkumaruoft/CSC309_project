import { useState } from "react";
import { Badge, Button, Card, Form, Stack } from "react-bootstrap";


function PromoFilter({ setFilters, setShowFilter }) {
    const [name, setName] = useState("");
    const [type, setType] = useState("");
    const [started, setStarted] = useState("");
    const [ended, setEnded] = useState("");

    const userRole = localStorage.getItem("currentRole");

    function handleFilters(e) {
        e.preventDefault();

        let new_filters = {};
        if (name) new_filters["name"] = name;
        if (type) new_filters["type"] = type;
        if (started) new_filters["started"] = started;
        if (ended) new_filters["ended"] = ended;

        setFilters(new_filters);
        setShowFilter(false);
    }

    return <Card bg="light" className="shadow-sm">
            <Form className="d-flex m-2" onSubmit={handleFilters}>
                <Form.Group className="me-2">
                    <Form.Label>Name:</Form.Label>
                    <Form.Control
                        type="text"
                        placeholder="Promotion name"
                        size="sm"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                    />
                </Form.Group>

                <Form.Group className="me-2">
                    <Form.Label>Type:</Form.Label>
                    <Form.Select
                        size="sm"
                        value={type}
                        onChange={(e) => setType(e.target.value)}>
                            <option value="">Any</option>
                            <option value="automatic">Automatic</option>
                            <option value="onetime">One-Time</option>
                    </Form.Select>
                </Form.Group>

                {(userRole === "manager" || userRole === "superuser") &&
                <>
                    <Form.Group className="me-2">
                        <Form.Label>Started:</Form.Label>
                        <Form.Select
                            size="sm"
                            value={started}
                            onChange={(e) => setStarted(e.target.value)}>
                                <option value="">Select One</option>
                                <option value="true">True</option>
                                <option value="false">False</option>
                        </Form.Select>
                    </Form.Group>

                    <Form.Group className="me-2">
                        <Form.Label>Ended:</Form.Label>
                        <Form.Select
                            size="sm"
                            value={ended}
                            onChange={(e) => setEnded(e.target.value)}>
                                <option value="">Select One</option>
                                <option value="true">True</option>
                                <option value="false">False</option>
                        </Form.Select>
                    </Form.Group>
                </>}

                <Form.Group className="align-content-center">
                    <Button
                        variant="dark"
                        size="sm"
                        type="submit">
                            Submit
                    </Button>
                </Form.Group>
            </Form>
        </Card>;

}

export default PromoFilter;