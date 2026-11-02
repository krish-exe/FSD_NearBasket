import { Store, Clock } from "lucide-react";

// Heading for one store's items in the cart: each store delivers separately with its own fee
// eta (optional): { minutes, distanceKm } from the server's delivery estimate
export default function DeliveryHeader({ delivery, index, count, eta }) {
  return (
    <div className="flex items-start justify-between gap-md">
      <div className="min-w-0">
        <p className="font-label text-label-md font-bold text-on-surface flex items-center gap-1.5">
          <Store size={16} className="text-primary shrink-0" />
          <span className="truncate">{delivery.storeName}</span>
        </p>
        {count > 1 && (
          <p className="font-body text-body-sm text-on-surface-variant pl-[22px]">
            Delivery {index + 1} of {count}
          </p>
        )}
        {eta && (
          <p className="font-body text-body-sm text-on-surface-variant pl-[22px] flex items-center gap-1">
            <Clock size={12} className="shrink-0" />
            Arrives in ~{eta.minutes} min{eta.distanceKm != null && ` · ${eta.distanceKm} km away`}
          </p>
        )}
      </div>
      <div className="text-right shrink-0 font-body text-body-sm">
        {delivery.deliveryFee === 0 ? (
          <span className="text-primary font-bold">FREE delivery</span>
        ) : (
          <span className="text-on-surface-variant">Delivery Rs. {delivery.deliveryFee.toFixed(2)}</span>
        )}
      </div>
    </div>
  );
}
