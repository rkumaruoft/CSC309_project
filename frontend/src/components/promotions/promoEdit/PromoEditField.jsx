import { Form } from "react-bootstrap";

function PromoEditField({
        editing,
        field,
        changes,
        setChanges,
        currPromo}) {

    function handleChange(e) {
        setChanges(prev => ({
            ...(prev || {}),
            [field]: e.target.value,
        }));
    }

    function getValue() {
        if (Object.keys(changes).length !== 0 && Object.keys(changes).includes(field)) {
            return changes[field];
        }

        return currPromo[field];
    }
    
    return <Form.Control
        readOnly={editing !== field}
        plaintext={editing !== field}
        size={editing !== field ? "" : "sm"}
        className={editing !== field ? "promo-table-body" : ""}
        value={getValue()}
        onChange={handleChange}
    />
}

export default PromoEditField;