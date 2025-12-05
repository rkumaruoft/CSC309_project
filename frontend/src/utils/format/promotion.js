export const PROMO_TYPE_LABELS = {
  onetime: "One-time",
  automatic: "Automatic"
};

export function promoTypeLabel(type) {
  if (!type) return type;
  return PROMO_TYPE_LABELS[type] ?? (typeof type === "string"
    ? type.charAt(0).toUpperCase() + type.slice(1)
    : type);
}