function formatBirthday(bday) {
    return bday ? bday.split("T")[0] : "Not Set";
}

function formatTime(datetime) {
    return new Date(datetime).toLocaleString([], {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true
    });
}

export { formatBirthday, formatTime };