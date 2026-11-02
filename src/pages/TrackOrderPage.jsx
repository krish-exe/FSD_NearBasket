import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Clock, MapPin, Route, Store, Loader2, Check, XCircle } from "lucide-react";
import { useOrders } from "../context/OrderContext";
import StatusBadge from "../components/StatusBadge";
import DeliveryMap from "../components/DeliveryMap";
import { useNow } from "../hooks/useNow";
import { ORDER_STAGES, ACTIVE_STATUSES, minutesUntilArrival, formatClock } from "../utils/orderStatus";

function Timeline({ order }) {
  const reached = ORDER_STAGES.indexOf(order.status);
  return (
    <ol className="space-y-md">
      {ORDER_STAGES.map((stage, index) => {
        const done = order.status !== "Cancelled" && index <= reached;
        const time = order.statusTimes?.[stage];
        return (
          <li key={stage} className="flex items-center gap-md">
            <span
              className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${
                done ? "bg-primary text-on-primary" : "bg-surface-container-high text-on-surface-variant"
              }`}
            >
              {done ? <Check size={16} /> : <span className="w-2 h-2 rounded-full bg-current" />}
            </span>
            <div className="flex-grow flex justify-between gap-md font-body text-body-md">
              <span className={done ? "text-on-surface font-semibold" : "text-on-surface-variant"}>{stage}</span>
              {time && <span className="text-body-sm text-on-surface-variant">{formatClock(time)}</span>}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

export default function TrackOrderPage() {
  const { orderId } = useParams();
  const { getOrderById, loaded } = useOrders();
  const now = useNow(15000);
  const order = getOrderById(orderId);

  if (!loaded) {
    return (
      <main className="flex-grow flex justify-center py-2xl text-primary">
        <Loader2 size={32} className="animate-spin" />
      </main>
    );
  }

  if (!order) {
    return (
      <main className="flex-grow w-full max-w-content mx-auto px-margin-mobile md:px-margin-desktop py-2xl text-center space-y-md">
        <h1 className="font-display text-headline-md text-on-surface">Order not found</h1>
        <p className="font-body text-body-md text-on-surface-variant">We couldn't find order {orderId} on your account.</p>
        <Link to="/orders" className="inline-block px-6 py-2.5 bg-primary text-on-primary font-label text-label-md rounded-full">
          Back to your orders
        </Link>
      </main>
    );
  }

  const active = ACTIVE_STATUSES.includes(order.status);
  const minutesLeft = minutesUntilArrival(order, now);
  const route = order.route;
  const hasMap = route?.from?.lat != null && route?.to?.lat != null;

  let headline;
  if (order.status === "Delivered") headline = `Delivered${order.statusTimes?.Delivered ? ` at ${formatClock(order.statusTimes.Delivered)}` : ""}`;
  else if (order.status === "Cancelled") headline = "This order was cancelled";
  else if (minutesLeft === 0) headline = "Arriving any minute now";
  else if (minutesLeft != null) headline = `Arriving in about ${minutesLeft} min`;
  else headline = "On its way soon";

  return (
    <main className="flex-grow w-full max-w-content mx-auto px-margin-mobile md:px-margin-desktop py-xl space-y-lg">
      <Link to="/orders" className="inline-flex items-center gap-1 font-label text-label-md text-primary hover:underline">
        <ArrowLeft size={16} /> All orders
      </Link>

      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-md">
        <div className="space-y-1">
          <p className="font-label text-label-md text-on-surface-variant flex items-center gap-2">
            Order {order.id} <StatusBadge status={order.status} />
          </p>
          <h1 className="font-display text-display-lg-mobile md:text-headline-md text-on-surface font-bold flex items-center gap-2">
            {order.status === "Cancelled" && <XCircle className="text-error" size={28} />}
            {headline}
          </h1>
          {active && order.estimatedArrival && (
            <p className="font-body text-body-md text-on-surface-variant">
              Expected by <strong className="text-on-surface">{formatClock(order.estimatedArrival)}</strong>
              {order.status !== "Out for Delivery" && route?.prepMinutes
                ? ` · includes about ${route.prepMinutes} min for the store to pack your order`
                : ""}
            </p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-lg items-start">
        <section className="space-y-md">
          {hasMap ? (
            <DeliveryMap route={route} storeName={order.storeName} />
          ) : (
            <div className="h-48 rounded-lg bg-surface-container-low border border-outline-variant/30 flex items-center justify-center text-center px-lg font-body text-body-md text-on-surface-variant">
              A map isn't available for this order.
            </div>
          )}
          <div className="grid grid-cols-2 gap-md">
            <div className="bg-surface-container-lowest rounded-lg border border-outline-variant/30 p-md">
              <p className="font-label text-label-sm text-on-surface-variant flex items-center gap-1">
                <Route size={14} /> Distance
              </p>
              <p className="font-display text-headline-sm text-on-surface font-bold">
                {route?.distanceKm != null ? `${route.distanceKm} km` : "—"}
              </p>
              {route?.source === "straight-line" && (
                <p className="font-body text-body-sm text-on-surface-variant">Estimated; road route unavailable</p>
              )}
            </div>
            <div className="bg-surface-container-lowest rounded-lg border border-outline-variant/30 p-md">
              <p className="font-label text-label-sm text-on-surface-variant flex items-center gap-1">
                <Clock size={14} /> Ride time
              </p>
              <p className="font-display text-headline-sm text-on-surface font-bold">
                {route?.travelMinutes != null ? `${route.travelMinutes} min` : "—"}
              </p>
            </div>
          </div>
        </section>

        <aside className="bg-surface-container-lowest rounded-lg border border-outline-variant/30 shadow-card p-lg space-y-lg">
          <Timeline order={order} />
          <div className="space-y-sm pt-md border-t border-outline-variant/20 font-body text-body-sm">
            <p className="flex items-start gap-2 text-on-surface">
              <Store size={16} className="text-primary shrink-0 mt-0.5" />
              <span>
                From <strong>{order.storeName}</strong>
              </span>
            </p>
            <p className="flex items-start gap-2 text-on-surface">
              <MapPin size={16} className="text-secondary-container shrink-0 mt-0.5" />
              <span>{order.address}</span>
            </p>
          </div>
          {active && (
            <p className="font-body text-body-sm text-on-surface-variant">
              This page updates by itself as the store moves your order along.
            </p>
          )}
        </aside>
      </div>
    </main>
  );
}
