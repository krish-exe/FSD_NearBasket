// The store moves an order through these statuses from the Vendor Hub.
export const ORDER_STAGES = ["Placed", "Accepted", "Out for Delivery", "Delivered"];

export const ACTIVE_STATUSES = ["Placed", "Accepted", "Out for Delivery"];

// Whole minutes until the order's estimated arrival (never negative), or null when unknown
export function minutesUntilArrival(order, now = Date.now()) {
  if (!order.estimatedArrival || !ACTIVE_STATUSES.includes(order.status)) return null;
  return Math.max(0, Math.ceil((new Date(order.estimatedArrival).getTime() - now) / 60000));
}

// "4:35 PM" in the shopper's local time
export function formatClock(date) {
  return new Date(date).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" });
}
