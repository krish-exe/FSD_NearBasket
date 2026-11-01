import { Link } from "react-router-dom";
import { ShoppingCart, AlertTriangle, Wallet } from "lucide-react";
import StatusBadge from "../../components/StatusBadge";
import { useCatalog } from "../../context/CatalogContext";
import { useAuth } from "../../context/AuthContext";
import { useInventory, LOW_STOCK_THRESHOLD } from "../../context/InventoryContext";
import { useVendorOrders, unitCount } from "../../hooks/useVendorOrders";
import { useNow } from "../../hooks/useNow";
import { ACTIVE_STATUSES } from "../../utils/orderStatus";

export default function DashboardPage() {
  const { orders } = useVendorOrders();
  const { products, stores } = useCatalog();
  const { user } = useAuth();
  const vendorStoreId = user.storeId;
  const { stockFor } = useInventory();
  const now = useNow();
  const shopName = stores.find((s) => s.id === vendorStoreId)?.name || "your store";

  const activeOrders = orders.filter((o) => ACTIVE_STATUSES.includes(o.status));
  const today = new Date(now).toDateString();
  const todaysOrders = orders.filter((o) => new Date(o.date).toDateString() === today);
  const todaysRevenue = todaysOrders.reduce((sum, o) => sum + o.total, 0);
  const lowStockCount = products.filter((p) => {
    const left = stockFor(p.id);
    return p.storeId === vendorStoreId && left !== null && left <= LOW_STOCK_THRESHOLD;
  }).length;

  // Units sold per product across all of this store's orders
  const soldByProduct = {};
  orders.forEach((o) =>
    o.items.forEach(({ product, qty }) => {
      soldByProduct[product.id] = { name: product.name, sold: (soldByProduct[product.id]?.sold || 0) + qty };
    })
  );
  const popularProducts = Object.values(soldByProduct)
    .sort((a, b) => b.sold - a.sold)
    .slice(0, 4);
  const topSold = popularProducts[0]?.sold || 1;

  const statCards = [
    {
      label: "Active Orders",
      value: String(activeOrders.length),
      badge: null,
      icon: ShoppingCart,
      iconBg: "bg-tertiary-fixed",
      iconFg: "text-tertiary",
    },
    {
      label: "Low Stock Alerts",
      value: `${lowStockCount} ${lowStockCount === 1 ? "Item" : "Items"}`,
      badge: null,
      icon: AlertTriangle,
      iconBg: "bg-error-container",
      iconFg: "text-error",
      valueColor: lowStockCount > 0 ? "text-error" : undefined,
    },
    {
      label: "Today's Revenue",
      value: `Rs. ${todaysRevenue.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`,
      badge: `${todaysOrders.length} ${todaysOrders.length === 1 ? "order" : "orders"} today`,
      icon: Wallet,
      iconBg: "bg-primary-fixed",
      iconFg: "text-on-primary-fixed-variant",
    },
  ];

  return (
    <div className="space-y-xl">
      <div>
        <h1 className="font-display text-display-lg-mobile text-on-surface mb-xs">Welcome back, {shopName}</h1>
        <p className="font-body text-body-lg text-on-surface-variant">Here's what's happening in your neighborhood market today.</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-lg">
        {statCards.map(({ label, value, badge, icon: Icon, iconBg, iconFg, valueColor }) => (
          <div key={label} className="bg-surface-container-lowest rounded-md p-lg shadow-card">
            <div className="flex justify-between items-start mb-md">
              <div className={`w-11 h-11 rounded-md flex items-center justify-center ${iconBg} ${iconFg}`}>
                <Icon size={22} />
              </div>
              {badge && (
                <span className="font-label text-label-sm text-primary bg-primary/10 px-2.5 py-1 rounded-full">{badge}</span>
              )}
            </div>
            <p className="font-body text-body-md text-on-surface-variant mb-1">{label}</p>
            <p className={`font-display text-headline-md md:text-display-lg-mobile ${valueColor || "text-on-surface"}`}>{value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-lg items-start">
        {/* Recent Orders */}
        <div className="bg-surface-container-low rounded-md shadow-card overflow-hidden">
          <div className="flex justify-between items-center p-lg pb-md">
            <h2 className="font-display text-headline-sm text-on-surface">Recent Orders</h2>
            <Link to="/vendor/orders" className="font-label text-label-md text-primary hover:underline">
              View All
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left border-y border-outline-variant/20 bg-surface-container-lowest/50">
                  <th className="font-label text-label-sm text-on-surface-variant uppercase tracking-wide px-lg py-3">Order ID</th>
                  <th className="font-label text-label-sm text-on-surface-variant uppercase tracking-wide px-lg py-3">Customer Name</th>
                  <th className="font-label text-label-sm text-on-surface-variant uppercase tracking-wide px-lg py-3">Items</th>
                  <th className="font-label text-label-sm text-on-surface-variant uppercase tracking-wide px-lg py-3">Total</th>
                  <th className="font-label text-label-sm text-on-surface-variant uppercase tracking-wide px-lg py-3">Status</th>
                </tr>
              </thead>
              <tbody className="bg-surface-container-lowest">
                {orders.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-lg py-xl text-center font-body text-body-md text-on-surface-variant">
                      No orders yet.
                    </td>
                  </tr>
                )}
                {orders.slice(0, 5).map((order) => (
                  <tr key={order.id} className="border-b border-outline-variant/10 last:border-0">
                    <td className="px-lg py-md font-label text-label-md text-primary">{order.id}</td>
                    <td className="px-lg py-md font-body text-body-md text-on-surface">{order.customer}</td>
                    <td className="px-lg py-md font-body text-body-md text-on-surface-variant">{unitCount(order)} items</td>
                    <td className="px-lg py-md font-body text-body-md text-on-surface">Rs. {order.total.toFixed(2)}</td>
                    <td className="px-lg py-md">
                      <StatusBadge status={order.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Popular Products */}
        <div className="bg-surface-container-low rounded-md p-lg shadow-card space-y-lg">
          <h2 className="font-display text-headline-sm text-on-surface">Popular Products</h2>
          {popularProducts.length === 0 ? (
            <p className="font-body text-body-sm text-on-surface-variant">Best sellers will show up once orders come in.</p>
          ) : (
            <div className="space-y-md">
              {popularProducts.map((p) => (
                <div key={p.name}>
                  <div className="flex justify-between font-body text-body-sm text-on-surface mb-1">
                    <span>{p.name}</span>
                    <span className="text-on-surface-variant shrink-0 ml-2">{p.sold} sold</span>
                  </div>
                  <div className="h-1.5 w-full bg-surface-container-high rounded-full overflow-hidden">
                    <div className="h-full bg-primary rounded-full" style={{ width: `${(p.sold / topSold) * 100}%` }} />
                  </div>
                </div>
              ))}
            </div>
          )}
          <Link
            to="/vendor/inventory"
            className="w-full block text-center py-2.5 border border-outline-variant rounded-full font-label text-label-md text-on-surface hover:bg-surface-container-high transition-colors"
          >
            View Full Inventory
          </Link>
        </div>
      </div>
    </div>
  );
}
