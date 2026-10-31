import { useOrders } from "../context/OrderContext";
import { vendorStoreId } from "../data/mockData";

// Customer orders placed with the vendor's store, newest first
export function useVendorOrders() {
  const { orders } = useOrders();
  return orders.filter((order) => order.storeId === vendorStoreId);
}

export const unitCount = (order) => order.items.reduce((sum, item) => sum + item.qty, 0);
