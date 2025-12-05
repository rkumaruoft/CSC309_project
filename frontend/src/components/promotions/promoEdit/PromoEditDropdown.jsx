import { Form } from "react-bootstrap";
import { capitalize } from "../../../utils/format/string";

function PromoEditDropdown({
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

    return (editing !== field) ? (
        <span>{capitalize(getValue())}</span>
    ) : (
        <Form.Select
            size="sm"
            value={getValue()}
            onChange={handleChange}>
                <option value="automatic">Automatic</option>
                <option value="onetime">One-Time</option>
        </Form.Select>
    );
}

export default PromoEditDropdown;