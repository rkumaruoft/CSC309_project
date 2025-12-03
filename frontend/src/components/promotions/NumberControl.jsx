import { useEffect, useState } from "react";
import { Form } from "react-bootstrap";


function NumberControl({ name, addNewField, disabled, isInt = false }) {
    const [field, setField] = useState("");

    function handleChange(e) {
        let regex;
        if (isInt) {
            regex = /^$|^\d+$/;
        } else {
            regex = /^$|^\d+(\.\d+)?$/;
        }

        if (regex.test(e.target.value)) {
            setField(e.target.value);
        }
    }

    useEffect(() => {
        addNewField(name, field);
    }, [field]);

    return <Form.Control
        type="number"
        min="0"
        step="any"
        required={!disabled}
        disabled={disabled}
        value={field}
        onChange={handleChange}
    />

}

export default NumberControl;