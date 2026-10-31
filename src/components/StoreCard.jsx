import { Link } from "react-router-dom";
import { Star, MapPin, Clock } from "lucide-react";
import { getStoreStatus, formatTime } from "../utils/storeHours";

export default function StoreCard({ store }) {
  const status = getStoreStatus(store);
  return (
    <Link
      to={`/store/${store.id}`}
      className="bg-surface-container-lowest rounded-md overflow-hidden shadow-card card-hover-lift border border-outline-variant/20 block"
    >
      <div className="h-40 w-full relative">
        <img className="object-cover w-full h-full" src={store.image} alt={store.name} />
        {status === "closed" ? (
          <div className="absolute top-4 left-4 bg-surface-container-lowest/90 backdrop-blur-sm px-3 py-1 rounded-full border border-outline-variant/40">
            <span className="font-label text-label-sm text-on-surface-variant flex items-center gap-1">
              <Clock size={14} />
              Closed · Opens {formatTime(store.hours.open)}
            </span>
          </div>
        ) : status === "closing" ? (
          <div className="absolute top-4 left-4 bg-secondary-container/10 backdrop-blur-sm px-3 py-1 rounded-full border border-secondary-container/20">
            <span className="font-label text-label-sm text-secondary flex items-center gap-1">
              <Clock size={14} />
              Closes soon
            </span>
          </div>
        ) : (
          <div className="absolute top-4 left-4 bg-primary/10 backdrop-blur-sm px-3 py-1 rounded-full border border-primary/20">
            <span className="font-label text-label-sm text-primary flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-primary inline-block"></span>
              Open Now
            </span>
          </div>
        )}
      </div>
      <div className="p-md">
        <div className="flex justify-between items-start mb-xs gap-sm">
          <h3 className="font-display text-headline-sm text-on-surface line-clamp-1">{store.name}</h3>
          <div className="flex items-center gap-1 bg-surface-container px-2 py-1 rounded-md shrink-0">
            <Star size={14} className="text-secondary-container fill-secondary-container" />
            <span className="font-label text-label-sm text-on-surface">{store.rating}</span>
          </div>
        </div>
        <p className="font-body text-body-sm text-on-surface-variant flex items-center gap-1">
          <MapPin size={16} />
          {store.distance} • {store.delivery}
        </p>
      </div>
    </Link>
  );
}
