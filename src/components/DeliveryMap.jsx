import { useEffect } from "react";
import { MapContainer, TileLayer, Marker, Polyline, Tooltip, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Colours from tailwind.config.js (Leaflet draws outside Tailwind, so they are repeated here)
const PRIMARY = "#0d631b";
const ACCENT = "#ff8f00";

const ESRI_TILES = "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas";

// Small round pins drawn in HTML, so no marker image files are needed
const pin = (color, svgPath) =>
  L.divIcon({
    className: "",
    iconSize: [36, 36],
    iconAnchor: [18, 18],
    html: `<div style="width:36px;height:36px;border-radius:9999px;background:${color};border:3px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,.3);display:flex;align-items:center;justify-content:center">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${svgPath}</svg>
    </div>`,
  });

// Outlines of the lucide "store" and "house" icons
const storeIcon = pin(
  PRIMARY,
  '<path d="m2 7 4.41-4.41A2 2 0 0 1 7.83 2h8.34a2 2 0 0 1 1.42.59L22 7"/><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><path d="M15 22v-4a2 2 0 0 0-2-2h-2a2 2 0 0 0-2 2v4"/><path d="M2 7h20"/>'
);
const homeIcon = pin(
  ACCENT,
  '<path d="M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8"/><path d="M3 10a2 2 0 0 1 .709-1.528l7-5.999a2 2 0 0 1 2.582 0l7 5.999A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>'
);

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
      {/* Esri Light Gray Canvas: a muted keyless basemap, drawn as a base layer plus a labels layer */}
      <TileLayer
        url={`${ESRI_TILES}/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}`}
        attribution='Tiles &copy; Esri &mdash; Esri, HERE, Garmin, &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        maxNativeZoom={16}
        maxZoom={19}
      />
      <TileLayer url={`${ESRI_TILES}/World_Light_Gray_Reference/MapServer/tile/{z}/{y}/{x}`} maxNativeZoom={16} maxZoom={19} />
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
