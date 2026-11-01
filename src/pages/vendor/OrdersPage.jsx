import { useState } from "react";
import StatusBadge from "../../components/StatusBadge";
import { useVendorOrders, unitCount } from "../../hooks/useVendorOrders";
import { formatClock } from "../../utils/orderStatus";

// The step the store takes next for each status, plus whether it can still cancel
const NEXT_STEP = {
  Placed: { status: "Accepted", label: "Accept", canCancel: true },
  Accepted: { status: "Out for Delivery", label: "Send out", canCancel: true },
  "Out for Delivery": { status: "Delivered", label: "Mark delivered", canCancel: false },
};

export default function OrdersPage() {
  const { orders, error, updateStatus } = useVendorOrders();
  const [busyId, setBusyId] = useState(null);
  const [actionError, setActionError] = useState("");

  const changeStatus = async (order, status) => {
    if (status === "Cancelled" && !window.confirm(`Cancel order ${order.id}? Its items go back into stock.`)) return;
    setBusyId(order.id);
    setActionError((await updateStatus(order.id, status)) || "");
    setBusyId(null);
  };

  return (
    <div className="space-y-lg">
      <div>
        <h1 className="font-display text-headline-md text-on-surface mb-xs">Orders</h1>
        <p className="font-body text-body-md text-on-surface-variant">Track and manage incoming orders from your customers.</p>
      </div>

      {(actionError || error) && (
        <p role="alert" className="font-body text-body-sm text-error bg-error/10 rounded-md px-md py-sm">
          {actionError || error}
        </p>
      )}

      <div className="bg-surface-container-low rounded-md shadow-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left border-b border-outline-variant/20">
                <th className="font-label text-label-sm text-on-surface-variant px-lg py-3">Order ID</th>
                <th className="font-label text-label-sm text-on-surface-variant px-lg py-3">Placed</th>
                <th className="font-label text-label-sm text-on-surface-variant px-lg py-3">Customer</th>
                <th className="font-label text-label-sm text-on-surface-variant px-lg py-3">Items</th>
                <th className="font-label text-label-sm text-on-surface-variant px-lg py-3">Total</th>
                <th className="font-label text-label-sm text-on-surface-variant px-lg py-3">Status</th>
                <th className="font-label text-label-sm text-on-surface-variant px-lg py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {orders.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-lg py-xl text-center font-body text-body-md text-on-surface-variant">
                    No orders yet. New orders from customers will appear here.
                  </td>
                </tr>
              )}
              {orders.map((order) => {
                const next = NEXT_STEP[order.status];
                const busy = busyId === order.id;
                return (
                  <tr key={order.id} className="border-b border-outline-variant/10 last:border-0 align-top">
                    <td className="px-lg py-md font-label text-label-md text-primary whitespace-nowrap">{order.id}</td>
                    <td className="px-lg py-md font-body text-body-sm text-on-surface-variant">{order.formattedDate}</td>
                    <td className="px-lg py-md font-body text-body-md text-on-surface">
                      <p>{order.customer}</p>
                      <p className="font-body text-body-sm text-on-surface-variant max-w-56">{order.address}</p>
                      {order.phone && <p className="font-body text-body-sm text-on-surface-variant">{order.phone}</p>}
                    </td>
                    <td className="px-lg py-md font-body text-body-md text-on-surface-variant whitespace-nowrap">{unitCount(order)} items</td>
                    <td className="px-lg py-md font-body text-body-md text-on-surface whitespace-nowrap">
                      Rs. {order.total.toFixed(2)}
                      <p className="font-body text-body-sm text-on-surface-variant">{order.paymentMethod}</p>
                    </td>
                    <td className="px-lg py-md">
                      <StatusBadge status={order.status} />
                      {next && order.estimatedArrival && (
                        <p className="font-body text-body-sm text-on-surface-variant mt-1 whitespace-nowrap">
                          Due {formatClock(order.estimatedArrival)}
                          {order.route?.distanceKm != null && ` · ${order.route.distanceKm} km`}
                        </p>
                      )}
                    </td>
                    <td className="px-lg py-md">
                      {next && (
                        <div className="flex flex-wrap gap-2">
                          <button
                            onClick={() => changeStatus(order, next.status)}
                            disabled={busy}
                            className="px-4 py-1.5 bg-primary text-on-primary font-label text-label-md rounded-full hover:bg-primary-container transition-colors disabled:opacity-50 whitespace-nowrap"
                          >
                            {next.label}
                          </button>
                          {next.canCancel && (
                            <button
                              onClick={() => changeStatus(order, "Cancelled")}
                              disabled={busy}
                              className="px-4 py-1.5 border border-outline-variant text-error font-label text-label-md rounded-full hover:bg-error/10 transition-colors disabled:opacity-50"
                            >
                              Cancel
                            </button>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
