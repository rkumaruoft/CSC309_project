import { useState, useEffect } from "react";
import { useNavigate, useLocation, useParams } from "react-router-dom";
import { Button, Card } from "react-bootstrap";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:3000";

export default function EventPage(){
    const location = useLocation();
    const [event, setEvent] = useState(null);
    const [rsvp, setRSVP] = useState(false);
    let { eventId } = useParams();
    eventId = Number(eventId);

    const token = localStorage.getItem("token");
    async function fetchEvent(){
        const response = await fetch(`${BACKEND_URL}/events?${new URLSearchParams(eventId).toString()}`, 
        {
            method: "GET",
            headers: {
                Authorization: `Bearer ${token}`
            }
        });
        const returnendEvent = response.json();
        if (!response.ok){
            // TODO: CREATE A DUMMY EVENT
        }
        setEvent(returnendEvent);
    }
    useEffect(() => {
        fetchEvent();
    }, [location]);
    
    return (
        <div className="container mt-5">
            <h1>This is just a dummy page</h1>
        </div>
    )
}