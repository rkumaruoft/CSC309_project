
const VITE_BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:3000";

async function getAllPromos(page, limit, filters) {
    const token = localStorage.getItem("token");

    // Format query params (assumes valid filters)
    const params = {
        page: page,
        limit: limit,
        ...filters
    };
    const url = `${VITE_BACKEND_URL}/promotions?${new URLSearchParams(params).toString()}`;

    // Sending backend request
    const res = await fetch(url, {
        method: "GET",
        headers: {
            Authorization: `Bearer ${token}`
        },
        credentials: "include"
    });
    const data = await res.json();

    // Handle request failure
    if (!res.ok) {
        return null;
    }

    return data;
}

async function getPromoId(id) {
    const token = localStorage.getItem("token");

    // Sending backend request
    const res = await fetch(`${VITE_BACKEND_URL}/promotions/${id}`, {
        method: "GET",
        headers: {
            Authorization: `Bearer ${token}`
        },
        credentials: "include"
    });
    const data = await res.json();

    // Handle request failure
    if (!res.ok) {
        return null;
    }

    return data;
}

async function delPromoId(id) {
    const token = localStorage.getItem("token");

    // Sending backend request
    const res = await fetch(`${VITE_BACKEND_URL}/promotions/${id}`, {
        method: "DELETE",
        headers: {
            Authorization: `Bearer ${token}`
        },
        credentials: "include"
    });

    // Handle request failure
    if (!res.ok) {
        const data = await res.json();
        return data;
    }

    return {success: true};
}

async function patchPromoId(id, body) {
    const token = localStorage.getItem("token");

    // Sending backend request
    const res = await fetch(`${VITE_BACKEND_URL}/promotions/${id}`, {
        method: "PATCH",
        headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json"
        },
        credentials: "include",
        body: JSON.stringify(body)
    });
    const data = await res.json();

    return data;
}

async function postPromo(body) {
    const token = localStorage.getItem("token");

    // Sending backend request
    const res = await fetch(`${VITE_BACKEND_URL}/promotions`, {
        method: "POST",
        headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json"
        },
        credentials: "include",
        body: JSON.stringify(body)
    });
    const data = await res.json();

    return data;
}

export { getAllPromos, getPromoId, delPromoId, patchPromoId, postPromo };
