// Turns a delivery address into map coordinates and works out the shop-to-door trip.
// Uses two free public services: Nominatim (address -> coordinates) and OSRM
// (road route between two points). If either is unreachable, it falls back to
// known area centres and a straight-line estimate so ordering never breaks.

const NOMINATIM_URL = process.env.NOMINATIM_URL || "https://nominatim.openstreetmap.org";
const OSRM_URL = process.env.OSRM_URL || "https://router.project-osrm.org";
const USER_AGENT = "NearBasket/1.0 (student project)";

export const PREP_MINUTES = 10; // packing time at the store before the rider leaves
const RIDER_SPEED_KMPH = 20; // average two-wheeler speed in city traffic
const ROAD_FACTOR = 1.3; // roads are ~30% longer than a straight line

// Centres of the areas offered in the header's location menu
const KNOWN_AREAS = [
  { name: "indiranagar", lat: 12.9716, lng: 77.6412 },
  { name: "koramangala", lat: 12.9352, lng: 77.6245 },
  { name: "hsr layout", lat: 12.9116, lng: 77.6474 },
  { name: "whitefield", lat: 12.9698, lng: 77.75 },
  { name: "hal 2nd stage", lat: 12.9662, lng: 77.6459 },
];

const geocodeCache = new Map();

function knownArea(text) {
  const lower = text.toLowerCase();
  const area = KNOWN_AREAS.find((a) => lower.includes(a.name));
  return area ? { lat: area.lat, lng: area.lng } : null;
}

async function nominatim(query) {
  if (geocodeCache.has(query)) return geocodeCache.get(query);
  const url = `${NOMINATIM_URL}/search?format=json&limit=1&countrycodes=in&q=${encodeURIComponent(query)}`;
  const res = await fetch(url, { headers: { "User-Agent": USER_AGENT }, signal: AbortSignal.timeout(5000) });
  if (!res.ok) throw new Error(`Nominatim ${res.status}`);
  const [hit] = await res.json();
  const point = hit ? { lat: Number(hit.lat), lng: Number(hit.lon) } : null;
  geocodeCache.set(query, point);
  return point;
}

// How far a street-level match may be from the area's centre before we distrust it
// (free-text addresses like "12 Main Rd" often match a namesake across the city)
const MAX_STREET_OFFSET_KM = 3;

/**
 * Best guess at where to deliver: exact GPS coordinates when the shopper shared
 * them, otherwise the delivery area, refined by the street address when that
 * lands inside the area.
 */
export async function locateAddress({ coords, address, area }) {
  if (coords && Number.isFinite(coords.lat) && Number.isFinite(coords.lng)) return coords;
  const offline = knownArea(`${address || ""} ${area || ""}`);
  try {
    const areaPoint = (area && (await nominatim(area))) || offline;
    if (!areaPoint || !address) return areaPoint;
    const streetPoint = await nominatim(`${address}, ${area}`);
    return streetPoint && straightLineKm(streetPoint, areaPoint) <= MAX_STREET_OFFSET_KM ? streetPoint : areaPoint;
  } catch {
    return offline; // geocoding service unreachable
  }
}

// Coordinates of one exact address, or null; never falls back to the area centre
export async function geocodeExact(query) {
  try {
    return await nominatim(query);
  } catch {
    return null;
  }
}

function straightLineKm(a, b) {
  const rad = (deg) => (deg * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.sqrt(h));
}

async function roadRoute(from, to) {
  const url = `${OSRM_URL}/route/v1/driving/${from.lng},${from.lat};${to.lng},${to.lat}?overview=simplified&geometries=geojson`;
  const res = await fetch(url, { headers: { "User-Agent": USER_AGENT }, signal: AbortSignal.timeout(6000) });
  if (!res.ok) throw new Error(`OSRM ${res.status}`);
  const data = await res.json();
  const route = data.routes?.[0];
  if (!route) throw new Error("No route found");
  return {
    distanceKm: route.distance / 1000,
    // GeoJSON is [lng, lat]; the map wants [lat, lng]
    path: route.geometry.coordinates.map(([lng, lat]) => [lat, lng]),
  };
}

const round1 = (n) => Math.round(n * 10) / 10;

/**
 * The trip from a store to a delivery point: distance, riding time and the
 * road path for the map. `source` says how it was worked out.
 */
export async function planTrip(from, to) {
  if (!from || !to) {
    return { from, to, distanceKm: null, travelMinutes: null, prepMinutes: PREP_MINUTES, path: [], source: "none" };
  }
  let distanceKm;
  let path = [];
  let source = "road";
  try {
    ({ distanceKm, path } = await roadRoute(from, to));
  } catch {
    distanceKm = straightLineKm(from, to) * ROAD_FACTOR;
    source = "straight-line";
  }
  const travelMinutes = Math.max(3, Math.round((distanceKm / RIDER_SPEED_KMPH) * 60));
  return { from, to, distanceKm: round1(distanceKm), travelMinutes, prepMinutes: PREP_MINUTES, path, source };
}

// Minutes from order to doorstep when nothing better is known
export const FALLBACK_TOTAL_MINUTES = 30;
