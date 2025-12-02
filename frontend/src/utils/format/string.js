function capitalize(str) {
    if (str === "") {
        return "";
    }

    let new_str = "";
    const parts = str.split(" ");
    for (const part of parts) {
        new_str += (" " + part.charAt(0).toUpperCase() + part.slice(1));
    }

    return new_str.trim();
}

function optional(str, func = arg => arg) {
    return !str ? "N/A" : func(str);
}

export { capitalize, optional };