import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { Loader2, WifiOff } from "lucide-react";
import { api } from "../api/client";

const CatalogContext = createContext(null);

// Stores, products (with live stock) and offers from the server, loaded once and refreshed after orders
export function CatalogProvider({ children }) {
  const [catalog, setCatalog] = useState(null);
  const [error, setError] = useState(null);

  const refresh = useCallback(async () => {
    try {
      const data = await api("/catalog");
      setCatalog(data);
      setError(null);
    } catch (e) {
      setError(e.message);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Swaps in a product the server just returned (e.g. after a stock change)
  const replaceProduct = useCallback((product) => {
    setCatalog((prev) => prev && { ...prev, products: prev.products.map((p) => (p.id === product.id ? product : p)) });
  }, []);

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
    <CatalogContext.Provider value={{ ...catalog, refresh, replaceProduct }}>{children}</CatalogContext.Provider>
  );
}

export function useCatalog() {
  const ctx = useContext(CatalogContext);
  if (!ctx) throw new Error("useCatalog must be used inside a CatalogProvider");
  return ctx;
}
