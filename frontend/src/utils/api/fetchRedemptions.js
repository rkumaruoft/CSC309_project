
const VITE_BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:3000";

async function processRedemption(id) {
    const token = localStorage.getItem("token");

    // Call backend
    const res = await fetch(`${VITE_BACKEND_URL}/transactions/${id}/processed`, {
        method: "PATCH",
        headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            processed: true
        })
    });
    const data = await res.json();

    // If error, data.error contains the message
    return data;

}

async function getUnprocessed(page, name) {
    const token = localStorage.getItem("token");
    const type = "redemption";
    const processed = false;

    const params = {
        ...(name ? {name: name} : {}),
        page: page,
        type: type,
        processed: processed
    };
    const url = `${VITE_BACKEND_URL}/transactions/processed?${new URLSearchParams(params).toString()}`;

    // Call backend
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

export { processRedemption, getUnprocessed };
