const CLOSING_SOON_MINUTES = 60;

const toMinutes = (time) => {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
};

// "21:30" -> "9:30 PM"
export function formatTime(time) {
  const [h, m] = time.split(":").map(Number);
  const suffix = h >= 12 ? "PM" : "AM";
  return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${suffix}`;
}

/**
 * "open", "closing" (within the last hour) or "closed", from the store's daily
 * opening hours and the shopper's local time.
 */
export function getStoreStatus(store, now = new Date()) {
  if (!store.hours) return "open";
  const current = now.getHours() * 60 + now.getMinutes();
  const open = toMinutes(store.hours.open);
  const close = toMinutes(store.hours.close);
  if (current < open || current >= close) return "closed";
  return close - current <= CLOSING_SOON_MINUTES ? "closing" : "open";
}
