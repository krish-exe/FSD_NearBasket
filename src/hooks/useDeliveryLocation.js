import { useEffect, useState } from "react";

const LOCATION_STORAGE_KEY = "nearbasket_location";
const COORDS_STORAGE_KEY = "nearbasket_location_coords";
const DEFAULT_LOCATION = "Home - Near Indiranagar, Bengaluru";

function readLocation() {
  try {
    return localStorage.getItem(LOCATION_STORAGE_KEY) || DEFAULT_LOCATION;
  } catch {
    return DEFAULT_LOCATION;
  }
}

// Exact GPS position behind the current location, or null when it was typed or picked from the list
export function readLocationCoords() {
  try {
    const stored = localStorage.getItem(COORDS_STORAGE_KEY);
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
}

export function saveLocationCoords(coords) {
  try {
    if (coords) localStorage.setItem(COORDS_STORAGE_KEY, JSON.stringify(coords));
    else localStorage.removeItem(COORDS_STORAGE_KEY);
  } catch {
    // Storage unavailable; the server falls back to looking up the area name
  }
}

/**
 * The delivery area picked in the header's location menu. Follows changes made
 * while the page is open (the header fires "nearbasket_location_change") and
 * changes made in other tabs.
 */
export function useDeliveryLocation() {
  const [location, setLocation] = useState(readLocation);

  useEffect(() => {
    const sync = () => setLocation(readLocation());
    window.addEventListener("nearbasket_location_change", sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener("nearbasket_location_change", sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  return location;
}
