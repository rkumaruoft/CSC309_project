
const VITE_BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:3000";

async function getAllPromos(page, filters) {
    const token = localStorage.getItem("token");

    // Format query params (assumes valid filters)
    const params = {
        page: page,
        ...filters
    };
    const url = `${VITE_BACKEND_URL}/promotions?${new URLSearchParams(params).toString()}`;

    // Sending backend request
    const res = await fetch(url, {
        method: "GET",
        headers: {
            Authorization: `Bearer ${token}`
        }
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
        }
    });
    const data = await res.json();

    // Handle request failure
    if (!res.ok) {
        return null;
    }

    return data;
}

export { getAllPromos, getPromoId };
