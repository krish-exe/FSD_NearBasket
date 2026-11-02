import { createContext, useContext } from "react";
import { useCatalog } from "./CatalogContext";

const InventoryContext = createContext(null);

export const LOW_STOCK_THRESHOLD = 5;

// Caps what the shop lets customers add to the cart. Stock lives on the server and
// vendors change it through useVendorProducts; products with no stock count are not tracked.
export function InventoryProvider({ children }) {
  const { products } = useCatalog();

  // Units left, or null when the product isn't stock-tracked
  const stockFor = (productId) => {
    const stock = products.find((p) => p.id === productId)?.stock;
    return stock ?? null;
  };

  return <InventoryContext.Provider value={{ stockFor }}>{children}</InventoryContext.Provider>;
}

export function useInventory() {
  const ctx = useContext(InventoryContext);
  if (!ctx) throw new Error("useInventory must be used inside an InventoryProvider");
  return ctx;
}
