import { createContext, useContext } from "react";
import { api } from "../api/client";
import { useCatalog } from "./CatalogContext";

const InventoryContext = createContext(null);

export const LOW_STOCK_THRESHOLD = 5;

// Shared by the Vendor Hub (edits stock) and the shop (caps what can be added
// to the cart). Stock lives on the server; products with no stock count are not tracked.
export function InventoryProvider({ children }) {
  const { products, replaceProduct } = useCatalog();

  // Units left, or null when the product isn't stock-tracked
  const stockFor = (productId) => {
    const stock = products.find((p) => p.id === productId)?.stock;
    return stock ?? null;
  };

  // Vendor-only; resolves to an error message, or null when saved
  const adjustStock = async (productId, delta) => {
    try {
      const { product } = await api(`/vendor/products/${productId}/stock`, { method: "PATCH", body: { delta } });
      replaceProduct(product);
      return null;
    } catch (e) {
      return e.message;
    }
  };

  return <InventoryContext.Provider value={{ stockFor, adjustStock }}>{children}</InventoryContext.Provider>;
}

export function useInventory() {
  const ctx = useContext(InventoryContext);
  if (!ctx) throw new Error("useInventory must be used inside an InventoryProvider");
  return ctx;
}
