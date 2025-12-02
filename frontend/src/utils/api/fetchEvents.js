const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:3000";

export default async function fetchEventsFull(page, filters, setError, totalPages){
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
        }
    });
    const data = await res.json();

    if (!res.ok) {
        setError(data.error);
        return null;
    }

    return data;
}