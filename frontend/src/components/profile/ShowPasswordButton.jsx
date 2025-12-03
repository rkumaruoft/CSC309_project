import { Image } from "react-bootstrap";
import "../../pages/Profile.css"


function ShowPasswordButton({ field, show, showIcon, setShow }) {

    return <Image
        src={showIcon(field)}
        alt="Toggle"
        onMouseDown={() => setShow(field)}
        onMouseUp={() => setShow(null)}
        onMouseLeave={() => setShow(null)}
        draggable={false}
        className={`opacity-${show === field ? 100 : 50} show-button-image`}
    />
}

export default ShowPasswordButton;