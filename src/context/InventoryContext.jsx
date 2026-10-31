import { createContext, useContext, useState, useEffect } from "react";
import { initialStock } from "../data/mockData";

const InventoryContext = createContext(null);

const STOCK_STORAGE_KEY = "nearbasket_stock_v1";
export const LOW_STOCK_THRESHOLD = 5;

// Shared by the Vendor Hub (edits stock) and the shop (caps what can be added
// to the cart). Products missing from initialStock are not tracked.
export function InventoryProvider({ children }) {
  const [stock, setStock] = useState(() => {
    try {
      const stored = localStorage.getItem(STOCK_STORAGE_KEY);
      return stored ? { ...initialStock, ...JSON.parse(stored) } : initialStock;
    } catch (e) {
      console.error("Failed to load stock from localStorage", e);
      return initialStock;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(STOCK_STORAGE_KEY, JSON.stringify(stock));
    } catch (e) {
      console.error("Failed to persist stock", e);
    }
  }, [stock]);

  // Units left, or null when the product isn't stock-tracked
  const stockFor = (productId) => (productId in stock ? stock[productId] : null);

  const adjustStock = (productId, delta) => {
    setStock((prev) =>
      productId in prev ? { ...prev, [productId]: Math.max(0, prev[productId] + delta) } : prev
    );
  };

  // Takes ordered quantities off the shelf when an order is placed
  const consumeStock = (items) => {
    setStock((prev) => {
      const next = { ...prev };
      items.forEach(({ product, qty }) => {
        if (product.id in next) next[product.id] = Math.max(0, next[product.id] - qty);
      });
      return next;
    });
  };

  return (
    <InventoryContext.Provider value={{ stockFor, adjustStock, consumeStock }}>
      {children}
    </InventoryContext.Provider>
  );
}

export function useInventory() {
  const ctx = useContext(InventoryContext);
  if (!ctx) throw new Error("useInventory must be used inside an InventoryProvider");
  return ctx;
}
