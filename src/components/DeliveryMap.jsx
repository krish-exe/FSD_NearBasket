import { useEffect } from "react";
import { MapContainer, Marker, Polyline, Tooltip, useMap } from "react-leaflet";
import L from "leaflet";
import { BaseTiles } from "./BaseTiles";
import { storeIcon, homeIcon, PRIMARY } from "./mapIcons";

// Zooms so the whole trip is in view; only again if the trip itself changes,
// so status refreshes don't undo the shopper's own panning
function FitTrip({ points }) {
  const map = useMap();
  const key = JSON.stringify([points[0], points[points.length - 1], points.length]);
  useEffect(() => {
    map.fitBounds(L.latLngBounds(points), { padding: [40, 40], maxZoom: 16 });
  }, [map, key]); // eslint-disable-line react-hooks/exhaustive-deps
  return null;
}

/**
 * Map of one delivery: the store, the drop-off point and the road between them.
 * route = { from: {lat,lng}, to: {lat,lng}, path: [[lat,lng], ...], source }
 */
export default function DeliveryMap({ route, storeName }) {
  const from = [route.from.lat, route.from.lng];
  const to = [route.to.lat, route.to.lng];
  // Without a road path (routing service was down) a dashed straight line stands in
  const hasRoad = route.path?.length > 1;
  const line = hasRoad ? route.path : [from, to];

  return (
    <MapContainer
      center={from}
      zoom={14}
      scrollWheelZoom={false}
      className="h-72 md:h-96 w-full rounded-lg z-0"
      aria-label={`Map of the delivery route from ${storeName}`}
    >
      <BaseTiles />
      <Polyline
        positions={line}
        pathOptions={{ color: PRIMARY, weight: 5, opacity: 0.85, dashArray: hasRoad ? null : "8 10" }}
      />
      <Marker position={from} icon={storeIcon}>
        <Tooltip direction="top" offset={[0, -18]}>{storeName}</Tooltip>
      </Marker>
      <Marker position={to} icon={homeIcon}>
        <Tooltip direction="top" offset={[0, -18]}>Your delivery address</Tooltip>
      </Marker>
      <FitTrip points={line} />
    </MapContainer>
  );
}
