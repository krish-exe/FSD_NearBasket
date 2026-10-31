import { useEffect, useState } from "react";

const LOCATION_STORAGE_KEY = "nearbasket_location";
const DEFAULT_LOCATION = "Home - Near Indiranagar, Bengaluru";

function readLocation() {
  try {
    return localStorage.getItem(LOCATION_STORAGE_KEY) || DEFAULT_LOCATION;
  } catch {
    return DEFAULT_LOCATION;
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
