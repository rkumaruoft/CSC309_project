
const VITE_BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:3000";

async function patchPassword(oldPw, newPw) {
    const token = localStorage.getItem("token");

    // Call backend
    const res = await fetch(`${VITE_BACKEND_URL}/users/me/password`, {
        method: "PATCH",
        headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json"
        },
        credentials: "include",
        body: JSON.stringify({
            old: oldPw,
            new: newPw
        })
    });
    const data = await res.json();

    // If invalid, error is data.error
    return data;
    
}

export { patchPassword }
