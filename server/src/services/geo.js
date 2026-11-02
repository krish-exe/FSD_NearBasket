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

// Shops only deliver to (and are only shown to) customers within this straight-line distance
export const DELIVERY_RADIUS_KM = Number(process.env.DELIVERY_RADIUS_KM) || 5;

// Centres of the areas around the shops, used when the address lookup service is unreachable.
// More specific names first: "ghatkopar west" must match before plain "ghatkopar".
const KNOWN_AREAS = [
  { name: "ghatkopar west", lat: 19.0897, lng: 72.9048 },
  { name: "ghatkopar", lat: 19.0833, lng: 72.9123 },
  { name: "vidyavihar", lat: 19.0795, lng: 72.8971 },
  { name: "vikhroli", lat: 19.1115, lng: 72.928 },
  { name: "kurla", lat: 19.0653, lng: 72.8794 },
  { name: "chembur", lat: 19.0548, lng: 72.898 },
  { name: "powai", lat: 19.1187, lng: 72.9073 },
];

const geocodeCache = new Map();

function knownArea(text) {
  const lower = text.toLowerCase();
  const area = KNOWN_AREAS.find((a) => lower.includes(a.name));
  return area ? { lat: area.lat, lng: area.lng } : null;
}

/**
 * One Nominatim search: free text ("Tilak Road, Mumbai") or, with { postalcode },
 * a pincode-only lookup. Resolves to { lat, lng, label } or null when nothing matches.
 */
async function nominatim(query, { postalcode = false } = {}) {
  const key = `${postalcode ? "pin" : "q"}:${query}`;
  if (geocodeCache.has(key)) return geocodeCache.get(key);
  const url = `${NOMINATIM_URL}/search?format=json&limit=1&countrycodes=in&${postalcode ? "postalcode" : "q"}=${encodeURIComponent(query)}`;
  const res = await fetch(url, { headers: { "User-Agent": USER_AGENT }, signal: AbortSignal.timeout(5000) });
  if (!res.ok) throw new Error(`Nominatim ${res.status}`);
  const [hit] = await res.json();
  // label: the first few parts of the place name, e.g. "400615, Thane, Thane Subdistrict"
  const point = hit
    ? { lat: Number(hit.lat), lng: Number(hit.lon), label: hit.display_name.split(", ").slice(0, 3).join(", ") }
    : null;
  geocodeCache.set(key, point);
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
export async function locateAddress({ coords, address, area: label }) {
  if (coords && Number.isFinite(coords.lat) && Number.isFinite(coords.lng)) return coords;
  // "Home - Near Ghatkopar East, Mumbai" -> "Ghatkopar East, Mumbai"
  const area = label?.replace(/^(home|work|other)\s*-\s*/i, "").replace(/^near\s+/i, "");
  const offline = knownArea(`${address || ""} ${area || ""}`);
  // A 6-digit pincode anywhere in the area is the most reliable thing to look up
  const pincode = area?.match(/\b\d{6}\b/)?.[0];
  try {
    const areaPoint =
      (pincode && (await nominatim(pincode, { postalcode: true }))) || (area && (await nominatim(area))) || offline;
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

/**
 * Centre of an Indian pincode area, or null. Searched on its own because a text search
 * like "400615, Mumbai" ignores the pincode and returns the middle of Mumbai.
 */
export async function geocodePincode(pincode) {
  try {
    return await nominatim(pincode, { postalcode: true });
  } catch {
    return null;
  }
}

export function straightLineKm(a, b) {
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

// Quick order-to-door guess for shop listings, from the straight-line distance alone
export function quickEstimateMinutes(distanceKm) {
  return PREP_MINUTES + Math.max(3, Math.round(((distanceKm * ROAD_FACTOR) / RIDER_SPEED_KMPH) * 60));
}
