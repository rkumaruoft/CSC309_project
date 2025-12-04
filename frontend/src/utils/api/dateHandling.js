function formatDateTime(dateInput) {
    const date = new Date(dateInput);
    if (isNaN(date.getTime())) return "";

    return date.toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
        hour12: true
    });
}

function toDateTimeLocalString(dateStr) {
    const d = new Date(dateStr);
    return d.toISOString().slice(0, 16);  // drop seconds + Z
}

export { formatDateTime, toDateTimeLocalString }