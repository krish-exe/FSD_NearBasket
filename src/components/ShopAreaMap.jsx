import { useEffect } from "react";
import { MapContainer, Marker, Circle, useMap } from "react-leaflet";
import { BaseTiles } from "./BaseTiles";
import { storeIcon, PRIMARY } from "./mapIcons";

// Corners of the box around a circle (1 degree of latitude is about 111 km)
function circleBounds(lat, lng, radiusKm) {
  const dLat = radiusKm / 111;
  const dLng = radiusKm / (111 * Math.cos((lat * Math.PI) / 180));
  return [
    [lat - dLat, lng - dLng],
    [lat + dLat, lng + dLng],
  ];
}

// Zooms to fit the delivery circle, again whenever the shop moves
function FitCircle({ lat, lng, radiusKm }) {
  const map = useMap();
  useEffect(() => {
    map.fitBounds(circleBounds(lat, lng, radiusKm), { padding: [10, 10] });
  }, [map, lat, lng, radiusKm]);
  return null;
}

/** The shop's pin and the circle of customers who can see and order from it. */
export default function ShopAreaMap({ location, radiusKm, shopName }) {
  const center = [location.lat, location.lng];
  return (
    <MapContainer
      center={center}
      zoom={12}
      scrollWheelZoom={false}
      className="h-56 w-full rounded-md z-0"
      aria-label={`Map of ${shopName} and the area it delivers to`}
    >
      <BaseTiles />
      <Circle center={center} radius={radiusKm * 1000} pathOptions={{ color: PRIMARY, weight: 2, fillOpacity: 0.08 }} />
      <Marker position={center} icon={storeIcon} />
      <FitCircle lat={location.lat} lng={location.lng} radiusKm={radiusKm} />
    </MapContainer>
  );
}
