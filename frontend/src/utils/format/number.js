function floatToCurrency(flt) {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD'
    }).format(flt);
}

function formatRate(rate) {
    return `${Math.round(rate * 100)} point(s) per dollar.`;
}

export { floatToCurrency, formatRate };