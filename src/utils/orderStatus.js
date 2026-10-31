// There is no backend to push status updates, so a newly placed order moves
// through these stages on a timer, counted from the moment it was placed.
const STAGES = [
  { status: "Placed", afterMinutes: 0 },
  { status: "Accepted", afterMinutes: 2 },
  { status: "Out for Delivery", afterMinutes: 5 },
  { status: "Delivered", afterMinutes: 20 },
];

export const ACTIVE_STATUSES = ["Placed", "Accepted", "Out for Delivery"];

export function getOrderStatus(order, now = Date.now()) {
  // Seeded orders already carry their final status
  if (order.status !== "Placed") return order.status;
  const minutes = (now - new Date(order.date).getTime()) / 60000;
  return STAGES.reduce((current, stage) => (minutes >= stage.afterMinutes ? stage.status : current), "Placed");
}
