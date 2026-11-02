import { useCallback, useEffect, useState } from "react";
import { api } from "../api/client";

const POLL_MS = 15000;

/**
 * Orders placed with the signed-in vendor's store, newest first, refreshed
 * every few seconds so new orders show up without reloading.
 */
export function useVendorOrders() {
  const [orders, setOrders] = useState([]);
  const [error, setError] = useState(null);

  const refresh = useCallback(async () => {
    try {
      const data = await api("/vendor/orders");
      setOrders(data.orders);
      setError(null);
    } catch (e) {
      setError(e.message);
    }
  }, []);

  useEffect(() => {
    refresh();
    const id = setInterval(refresh, POLL_MS);
    return () => clearInterval(id);
  }, [refresh]);

  // Moves an order to its next status; resolves to an error message, or null when saved
  const updateStatus = async (orderId, status) => {
    try {
      const { order } = await api(`/vendor/orders/${orderId}/status`, { method: "PATCH", body: { status } });
      setOrders((prev) => prev.map((o) => (o.id === order.id ? order : o)));
      return null;
    } catch (e) {
      return e.message;
    }
  };

  return { orders, error, updateStatus };
}

export const unitCount = (order) => order.items.reduce((sum, item) => sum + item.qty, 0);
