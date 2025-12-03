import { Form } from "react-bootstrap";
import { optional } from "../../../utils/format/string";
import { useState } from "react";


function PromoEditNumber({
        editing,
        field,
        changes,
        setChanges,
        currPromo,
        format = (arg) => arg,
        isInt = false}) {

    function handleChange(e) {
        let regex;
        if (isInt) {
            regex = /^$|^\d+$/;
        } else {
            regex = /^$|^\d+(\.\d+)?$/;
        }

        if (regex.test(e.target.value)) {
            setChanges(prev => ({
                ...(prev || {}),
                [field]: e.target.value,
            }));
        }
    }

    function getValue() {
        if (Object.keys(changes).length !== 0 && Object.keys(changes).includes(field)) {
            return changes[field];
        }

        return currPromo[field] ? currPromo[field] : "";
    }

    return (editing !== field) ? (
        <span>{optional(getValue(), format)}</span>
    ) : (<Form.Control
            type="number"
            min="0"
            readOnly={editing !== field}
            plaintext={editing !== field}
            size={editing !== field ? "" : "sm"}
            className={editing !== field ? "promo-table-body" : ""}
            value={getValue()}
            onChange={handleChange}
        />
    )
    
}

export default PromoEditNumber;