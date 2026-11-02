import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { api } from "../api/client";
import { useAuth } from "./AuthContext";
import { useCatalog } from "./CatalogContext";
import { ACTIVE_STATUSES } from "../utils/orderStatus";

const OrderContext = createContext(null);

// How often to check for status updates from the store while an order is on its way
const POLL_MS = 15000;

export function OrderProvider({ children }) {
  const { user } = useAuth();
  const { refresh: refreshCatalog } = useCatalog();
  const [orders, setOrders] = useState([]);
  const [loaded, setLoaded] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const data = await api("/orders/mine");
      setOrders(data.orders);
    } catch {
      // Keep showing what we have; the next poll tries again
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    setOrders([]);
    setLoaded(false);
    if (user) refresh();
  }, [user, refresh]);

  const hasActiveOrder = orders.some((o) => ACTIVE_STATUSES.includes(o.status));
  useEffect(() => {
    if (!user || !hasActiveOrder) return;
    const id = setInterval(refresh, POLL_MS);
    return () => clearInterval(id);
  }, [user, hasActiveOrder, refresh]);

  /**
   * Sends the basket to the server, which prices it, checks stock and splits it
   * into one order per store. Resolves to the new orders; throws ApiError on failure.
   */
  const placeOrders = async ({ customerName, phone, address, area, coords, paymentMethod, cartItems, offerCode }) => {
    const { orders: placed } = await api("/orders", {
      method: "POST",
      body: {
        items: cartItems.map(({ product, qty }) => ({ productId: product.id, qty })),
        offerCode,
        name: customerName,
        phone,
        address,
        area,
        coords,
        paymentMethod,
      },
    });
    setOrders((prev) => [...placed, ...prev]);
    refreshCatalog(); // stock went down
    return placed;
  };

  const getOrderById = (orderId) => orders.find((o) => o.id === orderId) || null;

  return (
    <OrderContext.Provider value={{ orders, loaded, refresh, placeOrders, getOrderById }}>
      {children}
    </OrderContext.Provider>
  );
}

export function useOrders() {
  const ctx = useContext(OrderContext);
  if (!ctx) throw new Error("useOrders must be used inside an OrderProvider");
  return ctx;
}
