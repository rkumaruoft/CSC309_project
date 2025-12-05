import { useState } from "react";
import { Button, Card, Form } from "react-bootstrap";

export default function EventsFilter({ setFilters, setShowFilter }) {
    const [name, setName] = useState("");
    const [started, setStarted] = useState("");
    const [ended, setEnded] = useState("");
    const [published, setPublished] = useState("");

    function handleFilters(e) {
        e.preventDefault();

        let new_filters = {};
        if (name) new_filters["name"] = name;
        if (started) new_filters["started"] = started;
        if (ended) new_filters["ended"] = ended;
        if (published) new_filters["published"] = published;

        setFilters(new_filters);
        setShowFilter(false);
    }

    function handleClear() {
        setName("");
        setStarted("");
        setEnded("");
        setPublished("");
        setFilters({});
        setShowFilter(false);
    }

    return <Card bg="light">
            <Form className="d-flex m-2" onSubmit={handleFilters}>
                <Form.Group className="me-2">
                    <Form.Label>Name:</Form.Label>
                    <Form.Control
                        type="text"
                        placeholder="Event name"
                        size="sm"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                    />
                </Form.Group>
            
                <Form.Group className="me-2">
                    <Form.Label>Started:</Form.Label>
                    <Form.Select
                        size="sm"
                        value={started}
                        onChange={(e) => setStarted(e.target.value)}>
                            <option value="">Any</option>
                            <option value="true">Yes</option>
                            <option value="false">No</option>
                    </Form.Select>
                </Form.Group>

                <Form.Group className="me-2">
                    <Form.Label>Ended:</Form.Label>
                    <Form.Select
                        size="sm"
                        value={ended}
                        onChange={(e) => setEnded(e.target.value)}>
                            <option value="">Any</option>
                            <option value="true">Yes</option>
                            <option value="false">No</option>
                    </Form.Select>
                </Form.Group>

                <Form.Group className="me-2">
                    <Form.Label>Published:</Form.Label>
                    <Form.Select
                        size="sm"
                        value={published}
                        onChange={(e) => setPublished(e.target.value)}>
                            <option value="">Any</option>
                            <option value="true">Yes</option>
                            <option value="false">No</option>
                    </Form.Select>
                </Form.Group>

                <Form.Group className="align-content-center">
                    <div className="gap-5">
                    <Button
                        variant="dark"
                        size="sm"
                        type="submit">
                            Submit
                    </Button>
                    <Button 
                        variant="dark" 
                        size="sm" 
                        type="button"
                        onClick={handleClear}>
                        Clear filters
                    </Button>
                    </div>
                </Form.Group>
            </Form>
        </Card>;

}