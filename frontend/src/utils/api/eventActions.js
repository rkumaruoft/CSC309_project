const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:3000";

// FUNCTION TO FORMAT EVENTS IN A SPECIFIC STYLING
export default function formatEvents(events) {
    const user = JSON.parse(localStorage.getItem("user"));
    const utorid = user.utorid;
    let new_events = [];
    for (const event of events) {
        let remaining_seats = 0;
        if (event.capacity == null) {
            remaining_seats = "unlimited";
        }
        else { remaining_seats = event.capacity - event.numGuests; }
        const points = event.pointsRemain + event.pointsAwarded;
        const new_event = {};
        new_event.id = event.id;
        new_event.name = event.name;
        new_event.description = event.description;
        new_event.location = event.location;
        new_event.startTime = event.startTime;
        new_event.endTime = event.endTime;
        new_event.capacity = (event.capacity == null) ? "unlimited" : event.capacity;
        new_event.availableSeats = remaining_seats;
        new_event.pointsRemain = event.pointsRemain || "-1";
        new_event.points = points;
        new_event.published = event.published;
        new_event.organizers = event.organizers.map(u => u.name);
        new_event.guests = event.guests.map(u => u.name);
        new_event.isRSVPd = (event.guests.some(guest => guest.utorid === utorid) ? "yes" : "no");
        new_events.push(new_event);
    }
    return new_events;
}

// FETCH ALL PUBLISHED EVENTS (AVAILABLE EVENTS PAGE)
async function fetchPublishedEvents(page, filters, totalPages){
    const token = localStorage.getItem("token");
    if (page < 1 || page > totalPages) {
        return;
    }

    const params = { page: page, published: true, ...filters };
    const url = `${BACKEND_URL}/events?${new URLSearchParams(params).toString()}`;

    const res = await fetch(url, {
        method: "GET",
        headers: {
            Authorization: `Bearer ${token}`
        },
        credentials: "include"
    });

    const data = await res.json();
    return data;
}

// FETCH ALL EVENTS (UNFILTERED ONES TOO)
async function fetchAllEvents(page, filters, totalPages){
    const token = localStorage.getItem("token");

    if (page < 1 || page > totalPages) {
        return;
    }

    const params = { page: page, ...filters };
    const url = `${BACKEND_URL}/events?${new URLSearchParams(params).toString()}`;

    const res = await fetch(url, {
        method: "GET",
        headers: {
            Authorization: `Bearer ${token}`
        },
        credentials: "include"
    });
    const data = await res.json();
    return data;
}

// FETCH ALL EVENTS ORGANIZED BY THIS USER
async function fetchOrganizedEvents(page, totalPages){
    const token = localStorage.getItem("token");
    if (page < 1 || page > totalPages) {
        return;
    }

    const url = `${BACKEND_URL}/users/me/events`;

    const res = await fetch(url, {
        method: "GET",
        headers: {
            Authorization: `Bearer ${token}`
        },
        credentials: "include"
    });
    const data = await res.json();
    return data;
}

// CREATE EVENT
async function createEventBackend(eventData){
    const token = localStorage.getItem("token");
    const url = `${BACKEND_URL}/events`;

    const res = await fetch(url, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`
        },
        credentials: "include",
        body: JSON.stringify(eventData)
    });

    const data = await res.json();
    return data;
}

// BACKEND FUNCTION TO ADD AN ORGANIZER
async function addOrganizerBackend(organizer, selectedEvent){
    const token = localStorage.getItem("token");
    const url = `${BACKEND_URL}/events/${selectedEvent.id}/organizers`;
    const payload = { utorid: organizer };

    const res = await fetch(url,
        {
            method: "POST",
            headers: {
                "Content-type": "application/json",
                Authorization: `Bearer ${token}`
            },
            credentials: "include",
            body: JSON.stringify(payload)
        }
    )

    const data = await res.json();
    return data;
}

// PUBLISH EVENT
async function publishEventBackend(selectedEvent){
    const token = localStorage.getItem("token");
    const url = `${BACKEND_URL}/events/${selectedEvent.id}`;
    const publish_data = { published: true };
    const res = await fetch(url, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        credentials: "include",
        body: JSON.stringify(publish_data)
    });

    const data = await res.json();
    return data;
}

// DELETE EVENT
async function deleteEventBackend(selectedEvent){
    const token = localStorage.getItem("token");
    const url = `${BACKEND_URL}/events/${selectedEvent.id}`;

    const res = await fetch(url, {
        method: "DELETE",
        headers: {
            Authorization: `Bearer ${token}`
        },
        credentials: "include"

    });

    const data = await res.json();
    return data;
}

// ADD GUEST TO EVENT
async function addGuestBackend(selectedEvent, guestId){
    const token = localStorage.getItem("token");
    const url = `${BACKEND_URL}/events/${selectedEvent.id}/guests`;
    const params = { utorid: guestId };
    const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        credentials: "include",
        body: JSON.stringify(params)
    });

    const data = await res.json();
    return data;
}

// REMOVE GUEST
async function remGuestBackend(selectedEvent, guestId){
    const token = localStorage.getItem("token");
    const url = `${BACKEND_URL}/events/${selectedEvent.id}/guests/${guestId}`;
    const res = await fetch(url, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
        credentials: "include"
    });

    const data = await res.json();
    return data;
}

async function fetchSpecificEvent(selectedEvent){
    const token = localStorage.getItem("token");
    const url = `${BACKEND_URL}/events/${selectedEvent.id}`;
    const ev = await fetch(url, {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` },
        credentials: "include"
    });

    const data = await ev.json();
    return data;
}

async function rewardGuestBackend(selectedEvent, rewardModel){
    const token = localStorage.getItem("token");
    const url = `${BACKEND_URL}/events/${selectedEvent.id}/transactions`;
    const res = await fetch(url,
        {
            method: "POST",
            headers: {
                "Content-type": "application/json",
                Authorization: `Bearer ${token}`
            },
            credentials: "include",
            body: JSON.stringify(rewardModel)
        });
    const data = await res.json();
    return data;
}

async function saveEditBackend(selectedEvent, editedEvent){
    const token = localStorage.getItem("token");
    const url = `${BACKEND_URL}/events/${selectedEvent.id}`;
    const update_body = {};
    for (const key of ["name", "description", "location", "startTime", "endTime", "capacity", "points", "published"]) {
        if (editedEvent[key] !== selectedEvent[key]) {
            // Convert capacity and points to numbers
            if (key === "capacity" || key === "points") {
                update_body[key] = Number(editedEvent[key]);
            } else {
                update_body[key] = editedEvent[key];
            }
        }
    }

    const res = await fetch(url, {
        method: "PATCH",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`
        },
        credentials: "include",
        body: JSON.stringify(update_body)
    });

    const data = await res.json();
    return data;
}

async function rsvpBackend(event){
    const token = localStorage.getItem("token")
    const url = `${BACKEND_URL}/events/${event.id}/guests/me`;
    const res = await fetch(url, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        credentials: "include"
    });
    const data = await res.json();
    return data;
}

export {
    fetchPublishedEvents, fetchAllEvents, addOrganizerBackend, fetchOrganizedEvents, createEventBackend, deleteEventBackend,
    publishEventBackend, remGuestBackend, fetchSpecificEvent, addGuestBackend, rewardGuestBackend, saveEditBackend, rsvpBackend
}