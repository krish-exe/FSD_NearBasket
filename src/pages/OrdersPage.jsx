import { useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { Package, Clock, ShoppingBag, ArrowRight, RotateCcw, CheckCircle2, Eye, MapPin, CreditCard, X } from "lucide-react";
import { useOrders } from "../context/OrderContext";
import { useCart } from "../context/CartContext";
import StatusBadge from "../components/StatusBadge";
import { products as catalog } from "../data/mockData";
import { getOrderStatus } from "../utils/orderStatus";
import { useNow } from "../hooks/useNow";

export default function OrdersPage() {
  const [searchParams] = useSearchParams();
  const newOrderIds = searchParams.get("newOrderIds")?.split(",").filter(Boolean) || [];
  const { orders } = useOrders();
  const { addItems, openCart } = useCart();
  const now = useNow();

  const [selectedOrder, setSelectedOrder] = useState(null);
  const [reorderedId, setReorderedId] = useState(null);

  const handleReorder = (order) => {
    // Order history stores a trimmed snapshot; re-add the full catalog product when it still exists
    const items = order.items.map(({ product, qty }) => ({
      product: catalog.find((p) => p.id === product.id) || product,
      qty,
    }));
    addItems(items);
    setReorderedId(order.id);
    setTimeout(() => {
      setReorderedId(null);
      openCart();
    }, 800);
  };

  return (
    <main className="flex-grow w-full max-w-content mx-auto px-margin-mobile md:px-margin-desktop py-xl space-y-xl">
      {/* Header Banner */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="font-display text-display-lg-mobile md:text-display-lg text-on-surface font-bold">
            Your Orders
          </h1>
          <p className="font-body text-body-md text-on-surface-variant">
            Track active deliveries and view past grocery order details.
          </p>
        </div>
        <Link
          to="/"
          className="px-6 py-2.5 bg-primary text-on-primary font-label text-label-md rounded-full hover:bg-primary-container transition-colors shadow-sm hidden sm:flex items-center gap-2"
        >
          <ShoppingBag size={18} />
          <span>Shop More</span>
        </Link>
      </div>

      {/* New Order Placed Toast Banner */}
      {newOrderIds.length > 0 && (
        <div className="bg-primary/10 border border-primary/30 rounded-lg p-md flex items-center justify-between text-primary font-label text-label-md animate-in fade-in">
          <div className="flex items-center gap-md">
            <CheckCircle2 size={24} className="shrink-0" />
            <div>
              <p className="font-bold">
                {newOrderIds.length > 1
                  ? `Order Placed Successfully! ${newOrderIds.length} deliveries (IDs: ${newOrderIds.join(", ")})`
                  : `Order Placed Successfully! (ID: ${newOrderIds[0]})`}
              </p>
              <p className="font-body text-body-sm text-on-surface-variant">
                {newOrderIds.length > 1
                  ? "Each store is preparing its part of your order and will deliver it separately."
                  : "Your neighborhood store is preparing your delivery right now."}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Orders List */}
      {orders.length === 0 ? (
        <section className="bg-surface-container-lowest rounded-lg p-2xl text-center border border-outline-variant/30 space-y-md">
          <div className="w-20 h-20 rounded-full bg-surface-container flex items-center justify-center mx-auto text-on-surface-variant">
            <Package size={40} />
          </div>
          <h3 className="font-display text-headline-sm text-on-surface">No order history yet</h3>
          <p className="font-body text-body-md text-on-surface-variant max-w-md mx-auto">
            Place your first grocery order from neighborhood stores near you!
          </p>
          <Link
            to="/"
            className="inline-flex items-center gap-2 px-8 py-3 bg-primary text-on-primary font-label text-label-md rounded-full hover:bg-primary-container transition-colors shadow-sm"
          >
            <span>Start Shopping</span>
            <ArrowRight size={18} />
          </Link>
        </section>
      ) : (
        <section className="space-y-lg">
          {orders.map((order) => (
            <div
              key={order.id}
              className="bg-surface-container-lowest rounded-lg border border-outline-variant/30 shadow-card p-lg space-y-md transition-all hover:border-primary/40"
            >
              {/* Order Item Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-md pb-md border-b border-outline-variant/20">
                <div className="space-y-1">
                  <div className="flex items-center gap-md">
                    <span className="font-display text-headline-sm font-bold text-on-surface">
                      {order.id}
                    </span>
                    <StatusBadge status={getOrderStatus(order, now)} />
                  </div>
                  <p className="font-body text-body-sm text-on-surface-variant flex items-center gap-1">
                    <Clock size={14} /> Placed on {order.formattedDate} • Store: <strong>{order.storeName}</strong>
                  </p>
                </div>

                <div className="flex items-center gap-md">
                  <button
                    onClick={() => setSelectedOrder(order)}
                    className="px-4 py-2 bg-surface-container-low text-on-surface font-label text-label-md rounded-full hover:bg-surface-container-high transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    <Eye size={16} />
                    <span>View Details</span>
                  </button>
                  <button
                    onClick={() => handleReorder(order)}
                    className="px-4 py-2 bg-primary-container text-on-primary font-label text-label-md rounded-full hover:bg-primary transition-colors flex items-center gap-1.5 cursor-pointer active:scale-95 shadow-sm"
                  >
                    <RotateCcw size={16} />
                    <span>{reorderedId === order.id ? "Added to Cart!" : "Reorder"}</span>
                  </button>
                </div>
              </div>

              {/* Order Purchased Products Overview */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-md items-center">
                <div className="flex items-center gap-md">
                  <div className="flex -space-x-3 overflow-hidden">
                    {order.items.slice(0, 3).map((item, idx) => (
                      <img
                        key={idx}
                        src={item.product.image}
                        alt={item.product.name}
                        className="inline-block h-12 w-12 rounded-full ring-2 ring-surface object-cover"
                      />
                    ))}
                  </div>
                  <div>
                    <p className="font-body text-body-md font-semibold text-on-surface">
                      {order.items.length} {order.items.length === 1 ? "item" : "items"}
                    </p>
                    <p className="font-body text-body-sm text-on-surface-variant line-clamp-1">
                      {order.items.map((i) => i.product.name).join(", ")}
                    </p>
                  </div>
                </div>

                <div className="font-body text-body-sm text-on-surface-variant space-y-0.5">
                  <p>Payment: <strong className="text-on-surface">{order.paymentMethod}</strong></p>
                  <p>Status: <span className="text-primary font-bold">{order.paymentStatus}</span></p>
                </div>

                <div className="sm:text-right font-body">
                  <p className="text-body-sm text-on-surface-variant">Total Amount</p>
                  <p className="font-display text-headline-sm text-primary font-bold">
                    Rs. {order.total.toFixed(2)}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </section>
      )}

      {/* View Details Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-md">
          <div className="fixed inset-0 bg-black/50 backdrop-blur-xs" onClick={() => setSelectedOrder(null)} />
          <div className="relative w-full max-w-lg bg-surface-container-lowest rounded-xl shadow-lift border border-outline-variant/30 overflow-hidden z-10 space-y-md p-xl animate-in zoom-in-95">
            <div className="flex justify-between items-center pb-md border-b border-outline-variant/20">
              <div>
                <h3 className="font-display text-headline-sm font-bold text-on-surface">
                  Order Details ({selectedOrder.id})
                </h3>
                <p className="font-body text-body-sm text-on-surface-variant">{selectedOrder.formattedDate}</p>
              </div>
              <button
                onClick={() => setSelectedOrder(null)}
                className="w-8 h-8 rounded-full hover:bg-surface-container-high flex items-center justify-center text-on-surface-variant"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-md max-h-96 overflow-y-auto pr-1">
              <div className="flex justify-between items-center bg-surface-container-low p-md rounded-lg">
                <span className="font-label text-label-md text-on-surface">Order Status</span>
                <StatusBadge status={getOrderStatus(selectedOrder, now)} />
              </div>

              <div className="space-y-sm">
                <h4 className="font-label text-label-md font-bold text-on-surface">Items Ordered</h4>
                <div className="divide-y divide-outline-variant/20">
                  {selectedOrder.items.map((item, idx) => (
                    <div key={idx} className="py-sm flex items-center justify-between gap-md">
                      <div className="flex items-center gap-md">
                        <img src={item.product.image} alt={item.product.name} className="w-10 h-10 rounded-md object-cover" />
                        <div>
                          <p className="font-body text-body-sm font-semibold text-on-surface">{item.product.name}</p>
                          <p className="font-body text-body-sm text-on-surface-variant">{item.product.unit} x {item.qty}</p>
                        </div>
                      </div>
                      <span className="font-label text-label-md font-bold text-on-surface">
                        Rs. {(item.product.price * item.qty).toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-xs pt-sm border-t border-outline-variant/20 font-body text-body-sm">
                <div className="flex justify-between text-on-surface-variant">
                  <span>Subtotal</span>
                  <span>Rs. {selectedOrder.subtotal.toFixed(2)}</span>
                </div>
                {selectedOrder.discount > 0 && (
                  <div className="flex justify-between text-tertiary font-semibold">
                    <span>Discount ({selectedOrder.offerCode})</span>
                    <span>- Rs. {selectedOrder.discount.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between text-on-surface-variant">
                  <span>Delivery Charges</span>
                  <span>Rs. {selectedOrder.deliveryFee.toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-display text-headline-sm text-on-surface pt-2 border-t border-outline-variant/30">
                  <span>Total Paid</span>
                  <span className="text-primary font-bold">Rs. {selectedOrder.total.toFixed(2)}</span>
                </div>
              </div>

              <div className="bg-surface-container-low p-md rounded-lg space-y-1 font-body text-body-sm">
                <p className="flex items-center gap-1 font-semibold text-on-surface">
                  <MapPin size={14} className="text-primary" /> Delivery Address
                </p>
                <p className="text-on-surface-variant pl-5">{selectedOrder.address}</p>
                <p className="flex items-center gap-1 font-semibold text-on-surface pt-2">
                  <CreditCard size={14} className="text-primary" /> Payment
                </p>
                <p className="text-on-surface-variant pl-5">{selectedOrder.paymentMethod} ({selectedOrder.paymentStatus})</p>
              </div>
            </div>

            <div className="pt-sm border-t border-outline-variant/20 flex gap-md">
              <button
                onClick={() => {
                  handleReorder(selectedOrder);
                  setSelectedOrder(null);
                }}
                className="w-full py-2.5 bg-primary text-on-primary font-label text-label-md rounded-full hover:bg-primary-container transition-colors shadow-sm flex items-center justify-center gap-2 cursor-pointer"
              >
                <RotateCcw size={16} />
                <span>Reorder Items</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
