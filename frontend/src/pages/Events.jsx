import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button, Card } from "react-bootstrap";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:3000";

export default function EventsList() {
    const navigate = useNavigate();
    const location = useLocation();
    const token = localStorage.getItem("token");
    const [events, setEvents] = useState([]);
    const [pageNum, setPageNum] = useState(1);
    const [totalPages, setTotalPages] = useState(1);

    // GPT-SUGGESTED CODE TO CONVERT A DATETIME OBJECT TO A HUMAN-READABLE STRING
    function dateToString(dt){
        const date = new Date(dt);

        return date.toLocaleString("en-US", {
            dateStyle: "medium",   // e.g. "Nov 25, 2025"
            timeStyle: "short"     // e.g. "1:33 PM"
        });
    }

    function Event({id, name, location, pointsRemain, startTime, endTime, capacity, guests}){
        const redirect = () => {navigate(`/events/${id}`)};
        const numGuests = guests.length;
        const guestsRemaining = capacity - numGuests;
        
        return (
            <Card 
                className="ps-3 rounded-2 mb-3" 
                style={{
                    minHeight: "5vh", 
                    minWidth: "40vw", 
                    backgroundColor: "#E0BC49",
                    cursor: "pointer"
                }} 
                onClick={redirect}>
                <Card.Body className="d-flex flex-column justify-content-start align-items-start" style={{ color: "#2c2c2cff" }}>
                    <h3 style={{ marginBottom: "6px" }}>{name}</h3>
                    <div className="d-flex flex-column align-items-start" style={{ gap: "4px" }}>
                        <p style={{ margin: 0 }}><span style={{fontWeight: "bolder"}}>Location:</span> {location}</p>
                        <p style={{ margin: 0 }}>
                            <span style={{fontWeight: "bolder"}}>Starts at:</span> {dateToString(startTime)}, 
                            <span style={{fontWeight: "bolder"}}> Ends at:</span> {dateToString(endTime)}
                        </p>

                        <p style={{ margin: 0 }}>
                            <span style={{fontWeight: "bolder"}}>Available points:</span> {pointsRemain}
                        </p>

                        <p style={{ margin: 0, fontWeight: "bolder" }}>
                            {guestsRemaining} available slots
                        </p>
                    </div>
                </Card.Body>
            </Card>
        );
    }

    async function fetchEvent(page){
        if (page < 1 || page > totalPages) {
            return;
        }

        const params = { page: page };
        const url = `${BACKEND_URL}/events?${new URLSearchParams(params).toString()}`;

        try {
            const res = await fetch(url, {
                method: "GET",
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });
            const data = await res.json();

            if (!res.ok) {
                const numDemos = 10;
                const numPages = 2;
                const demoEvents = [];
                for (let i = 0; i < numDemos; i++) {
                    demoEvents.push({
                        id: i,
                        name: `Event ${i + 1}`,
                        location: `Location ${i + 1}`,
                        pointsRemain: 100 + i,
                        startTime: new Date(Date.now() - (1000 * 60 * 60 * 24 * (i+1))),
                        endTime: new Date(Date.now() + (1000 * 60 * 60 * 24 * (i+1))),
                        capacity: i + 20,
                        guests: ["a", "b", "c"]
                    });
                }
                setEvents(demoEvents);
                setPageNum(page);
                setTotalPages(numPages);
                return;
            }

            setEvents(data.results);
            setPageNum(page);
            setTotalPages(Math.max(1, Math.ceil(data.count / 10)));
        } catch (error) {
            setEvents([]);
        }
    }

    useEffect(() => {
        fetchEvent(pageNum);
    }, [location]);

    return (
        <div className="container mt-5">
            <h1 className="text-center mb-4">Events</h1>
            
            <div className="d-flex flex-column align-items-center">
                {events.length === 0 ? (
                    <p className="text-center">No events found</p>
                ) : (
                    events.map(event => (
                        <Event key={event.id} {...event} />
                    ))
                )}
            </div>

            {/* Pagination */}
            {events.length > 0 && (
                <div className="d-flex justify-content-center align-items-center mt-4 gap-3" style={{marginBottom: "10px"}}>
                    <Button
                        variant="warning"
                        onClick={() => fetchEvent(pageNum - 1)}
                        disabled={pageNum === 1}>
                        Back
                    </Button>
                    
                    <span>
                        Page: <strong>{pageNum}/{totalPages}</strong>
                    </span>
                    
                    <Button
                        variant="warning"
                        onClick={() => fetchEvent(pageNum + 1)}
                        disabled={pageNum === totalPages}>
                        Next
                    </Button>
                </div>
            )}
        </div>
    );
}
