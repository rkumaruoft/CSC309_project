import { Image } from "react-bootstrap";
import "./SortButton.css"

function SortButton({ field, sorting, setSorting, order, setOrder }) {
    
    // Handle click on sort button
    function handleClick() {
        if (sorting !== field) {
            setSorting(field);
            setOrder("asc");
        } else {
            const newOrder = rotateOrder(order);
            setOrder(newOrder);
            if (!newOrder) {
                setSorting(null);
            }
        }
    }

    // Helper for rotating order
    function rotateOrder(ord) {
        if (!ord) {
            return "asc";
        }

        return ord === "asc" ? "desc" : null;
    }

    // Set the source of the sort src
    function getSrc() {
        if (sorting !== field || !order) {
            return getNotSorting();
        }

        return order === "asc" ? getAscending() : getDescending();
    }

    // Getters for the source
    function getAscending() {
        return "../../ascending.svg";
    }

    function getDescending() {
        return "../../descending.svg";
    }

    function getNotSorting() {
        return "../../notSorting.svg";
    }

    return <Image
        draggable={false}
        src={getSrc()}
        alt="Sort"
        className={`sort-button opacity-${sorting === field ? "100" : "50"}`}
        onClick={handleClick}
    />;

}

export default SortButton;