import { Badge, Image } from "react-bootstrap";


function AppliedFilters({ filters, setFilters }) {
    return <>
        <span className="me-2">Active filters:</span>
        {Object.keys(filters).map((key) => (
            <Badge
                key={key}
                bg="light"
                className="me-1">
                    {key}: {filters[key]}
            </Badge>
        ))}

        <Image
            src="../../xButton.svg"
            alt="Clear"
            className="filter opacity-50"
            onClick={() => setFilters({})}
        />
    </>;

}

export default AppliedFilters;