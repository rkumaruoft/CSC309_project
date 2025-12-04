import { useState } from "react";
import { Form } from "react-bootstrap";


function LimitSelector({ setLimit }) {
    const [display, setDisplay] = useState(10);

    function trimNumber(numStr) {
        const trimRegex = /^0+/;
        return numStr.replace(trimRegex, "");
    }

    function handleSetLimit(e) {
        const intRegex = /^\d+$/;
        if (!intRegex.test(trimNumber(e.target.value))) {
            setDisplay(1);
            setLimit(1);
            return;
        }

        const realLimit = Math.min(100, Number(display));
        setDisplay(realLimit);
        setLimit(realLimit);
    }

    function handleEnter(e) {
        if (e.key === "Enter") {
            handleSetLimit(e);
        }
    }
    
    return <div className="d-flex align-items-center gap-2 mb-2">
        <span>Showing</span>
        <Form.Control
            type="text"
            size="sm"
            value={display}
            onChange={(e) => setDisplay(e.target.value)}
            onBlur={handleSetLimit}
            onKeyDown={handleEnter}
            className="limit-control"
        />
        <span>result(s)</span>
    </div>;

}

export default LimitSelector;
