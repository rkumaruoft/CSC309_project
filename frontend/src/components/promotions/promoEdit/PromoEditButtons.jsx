import { Button } from "react-bootstrap";

function PromoEditButtons({
        field,
        editing,
        setEditing,
        changes,
        setChanges,
        required = true }) {
    
    function handleCancel(e) {
        e.stopPropagation();
        setEditing(null);
        setChanges(prev => {
            const {[field]: _, ...rest} = prev;
            return rest;
        });
    }

    function handleDone(e) {
        e.stopPropagation();
        setEditing(null);
    }

    return <div className="d-flex">
        <Button
            size="sm"
            variant="success"
            className={editing !== field ? "invisible" : ""}
            onClick={handleDone}
            disabled={!changes[field] && required}>
                Done
        </Button>
        <Button
            size="sm"
            variant="dark"
            className={editing !== field ? "invisible" : ""}
            onClick={handleCancel}>
                Cancel
        </Button>
    </div>;
}

export default PromoEditButtons;