import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { Loader2, WifiOff } from "lucide-react";
import { api } from "../api/client";
import { useDeliveryLocation, readLocationCoords } from "../hooks/useDeliveryLocation";

const CatalogContext = createContext(null);

/**
 * Stores, products (with live stock) and offers from the server. Only stores that
 * deliver to the shopper's chosen location are included, so the catalog reloads
 * whenever that location changes, and after orders.
 */
export function CatalogProvider({ children }) {
  const [catalog, setCatalog] = useState(null);
  const [error, setError] = useState(null);
  const area = useDeliveryLocation();

  const refresh = useCallback(async () => {
    const params = new URLSearchParams({ area });
    const coords = readLocationCoords();
    if (coords) {
      params.set("lat", coords.lat);
      params.set("lng", coords.lng);
    }
    try {
      const data = await api(`/catalog?${params}`);
      setCatalog(data);
      setError(null);
    } catch (e) {
      setError(e.message);
    }
  }, [area]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  if (!catalog) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-md bg-surface text-on-surface-variant px-margin-mobile text-center">
        {error ? (
          <>
            <WifiOff size={40} />
            <p className="font-body text-body-md max-w-sm">{error}</p>
            <button
              onClick={refresh}
              className="px-6 py-2.5 bg-primary text-on-primary font-label text-label-md rounded-full hover:bg-primary-container transition-colors"
            >
              Try again
            </button>
          </>
        ) : (
          <>
            <Loader2 size={32} className="animate-spin text-primary" />
            <p className="font-label text-label-md">Loading NearBasket…</p>
          </>
        )}
      </div>
    );
  }

  return (
    <CatalogContext.Provider value={{ ...catalog, refresh }}>{children}</CatalogContext.Provider>
  );
}

export function useCatalog() {
  const ctx = useContext(CatalogContext);
  if (!ctx) throw new Error("useCatalog must be used inside a CatalogProvider");
  return ctx;
}
