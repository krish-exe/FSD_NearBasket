import { createContext, useContext, useState, useEffect } from "react";
import { initialOrders } from "../data/mockData";
import { useInventory } from "./InventoryContext";

const OrderContext = createContext(null);

const ORDERS_STORAGE_KEY = "nearbasket_orders_v1";

export function OrderProvider({ children }) {
  const { consumeStock } = useInventory();

  const [orders, setOrders] = useState(() => {
    try {
      const stored = localStorage.getItem(ORDERS_STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {
      console.error("Failed to load orders from localStorage", e);
    }
    return initialOrders;
  });

  useEffect(() => {
    try {
      localStorage.setItem(ORDERS_STORAGE_KEY, JSON.stringify(orders));
    } catch (e) {
      console.error("Failed to save orders to localStorage", e);
    }
  }, [orders]);

  // Places one order per store delivery (see splitIntoDeliveries in CartContext) and returns them
  const placeOrders = ({ customerName, email, address, paymentMethod, deliveries, offerCode }) => {
    // No leading "#": the id is passed around in URLs, where "#" starts the fragment
    const baseId = `NB-${Date.now().toString().slice(-6)}`;
    const now = new Date();
    const formattedDate = now.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

    const newOrders = deliveries.map((delivery, index) => ({
      id: deliveries.length > 1 ? `${baseId}-${index + 1}` : baseId,
      checkoutId: baseId,
      date: now.toISOString(),
      formattedDate,
      customer: customerName || "Valued Customer",
      email: email || "customer@example.com",
      storeName: delivery.storeName,
      storeId: delivery.storeId,
      items: delivery.items.map((item) => ({
        product: {
          id: item.product.id,
          name: item.product.name,
          unit: item.product.unit,
          price: item.product.price,
          image: item.product.image,
          storeId: item.product.storeId,
          categoryId: item.product.categoryId,
        },
        qty: item.qty,
      })),
      subtotal: delivery.subtotal,
      discount: delivery.discount,
      deliveryFee: delivery.deliveryFee,
      total: delivery.total,
      offerCode: delivery.discount > 0 ? offerCode : null,
      paymentMethod: paymentMethod || "Cash on Delivery",
      paymentStatus: paymentMethod === "Cash on Delivery" ? "Pending" : "Paid",
      status: "Placed",
      address: address || "Indiranagar, Bengaluru",
    }));

    setOrders((prev) => [...newOrders, ...prev]);
    consumeStock(deliveries.flatMap((delivery) => delivery.items));
    return newOrders;
  };

  const getOrderById = (orderId) => {
    return orders.find((o) => o.id === orderId) || null;
  };

  return (
    <OrderContext.Provider value={{ orders, placeOrders, getOrderById }}>
      {children}
    </OrderContext.Provider>
  );
}

export function useOrders() {
  const ctx = useContext(OrderContext);
  if (!ctx) throw new Error("useOrders must be used inside an OrderProvider");
  return ctx;
}
