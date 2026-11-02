import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { ShieldCheck, MapPin, CreditCard, Tag, ArrowRight, ShoppingBasket, CheckCircle2, AlertCircle } from "lucide-react";
import { useCart, FREE_DELIVERY_FROM } from "../context/CartContext";
import { useAuth } from "../context/AuthContext";
import { useOrders } from "../context/OrderContext";
import { useDeliveryLocation, readLocationCoords } from "../hooks/useDeliveryLocation";
import { api, assetUrl } from "../api/client";
import DeliveryHeader from "../components/DeliveryHeader";

export default function CheckoutPage() {
  const { cartItems, deliveries, subtotal, deliveryFee, appliedOffer, discountAmount, offerShortfall, total, clearCart, applyOffer, removeOffer } = useCart();
  const { user } = useAuth();
  const { placeOrders } = useOrders();
  const navigate = useNavigate();
  const deliveryArea = useDeliveryLocation();

  // Prefilled only from the shopper's own account; the street address is theirs to enter
  const [form, setForm] = useState(() => ({
    name: user?.name || "",
    phone: user?.phone || "",
    address: "",
    paymentMethod: "Cash on Delivery",
  }));

  const [errors, setErrors] = useState({});
  const [promoInput, setPromoInput] = useState("");
  const [promoFeedback, setPromoFeedback] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [etas, setEtas] = useState({}); // storeId -> { minutes, distanceKm }

  // Delivery time from each store in the basket to the chosen area
  const storeIds = deliveries.map((d) => d.storeId).join(",");
  useEffect(() => {
    if (!storeIds) return;
    const coords = readLocationCoords();
    const params = new URLSearchParams({ storeIds, area: deliveryArea });
    if (coords) {
      params.set("lat", coords.lat);
      params.set("lng", coords.lng);
    }
    let cancelled = false;
    api(`/delivery/estimate?${params}`)
      .then(({ estimates }) => {
        if (!cancelled) setEtas(Object.fromEntries(estimates.map((e) => [e.storeId, e])));
      })
      .catch(() => {}); // the ETA is a nice-to-have; checkout works without it
    return () => {
      cancelled = true;
    };
  }, [storeIds, deliveryArea]);

  if (cartItems.length === 0) {
    return (
      <main className="flex-grow w-full max-w-content mx-auto px-margin-mobile md:px-margin-desktop py-2xl text-center space-y-md">
        <div className="w-20 h-20 rounded-full bg-surface-container flex items-center justify-center mx-auto text-on-surface-variant">
          <ShoppingBasket size={40} />
        </div>
        <h2 className="font-display text-headline-md text-on-surface">Your basket is empty</h2>
        <p className="font-body text-body-md text-on-surface-variant max-w-md mx-auto">
          Add items to your basket before proceeding to checkout.
        </p>
        <Link
          to="/"
          className="inline-block px-8 py-3 bg-primary text-on-primary font-label text-label-md rounded-full hover:bg-primary-container transition-colors shadow-sm"
        >
          Explore Stores
        </Link>
      </main>
    );
  }

  const handleChange = (field) => (e) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: null }));
    }
  };

  const handleApplyPromo = (e) => {
    e.preventDefault();
    if (!promoInput.trim()) return;
    const res = applyOffer(promoInput);
    setPromoFeedback(res);
    if (res.success) setPromoInput("");
  };

  const validate = () => {
    const nextErrors = {};
    if (!form.name.trim()) nextErrors.name = "Full name is required.";
    if (!form.phone.trim()) nextErrors.phone = "Phone number is required.";
    else if (!/^\d{10}$/.test(form.phone.trim())) nextErrors.phone = "Enter a valid 10-digit phone number.";
    if (!form.address.trim()) nextErrors.address = "Delivery address is required.";
    return nextErrors;
  };

  const handleSubmitOrder = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;
    const nextErrors = validate();
    setErrors(nextErrors);
    setSubmitError("");
    if (Object.keys(nextErrors).length > 0) return;

    setIsSubmitting(true);
    try {
      const placed = await placeOrders({
        customerName: form.name.trim(),
        phone: form.phone.trim(),
        address: form.address.trim(),
        area: deliveryArea,
        coords: readLocationCoords(),
        paymentMethod: form.paymentMethod,
        cartItems,
        offerCode: appliedOffer?.code || null,
      });
      clearCart();
      const ids = placed.map((order) => order.id).join(",");
      navigate(`/orders?newOrderIds=${encodeURIComponent(ids)}`, { replace: true });
    } catch (err) {
      if (err.field) setErrors((prev) => ({ ...prev, [err.field]: err.message }));
      else setSubmitError(err.message);
      setIsSubmitting(false);
    }
  };

  return (
    <main className="flex-grow w-full max-w-content mx-auto px-margin-mobile md:px-margin-desktop py-xl space-y-xl">
      <div className="flex items-center gap-md">
        <h1 className="font-display text-display-lg-mobile md:text-display-lg text-on-surface font-bold">
          Checkout
        </h1>
        <span className="bg-primary/10 text-primary font-label text-label-sm font-bold px-3 py-1 rounded-full flex items-center gap-1">
          <ShieldCheck size={16} /> Secure Payment
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-xl items-start">
        {/* Left: Address & Payment Details Form */}
        <form onSubmit={handleSubmitOrder} className="space-y-xl">
          {/* Delivery Details */}
          <div className="bg-surface-container-lowest rounded-lg p-xl border border-outline-variant/30 shadow-card space-y-md">
            <h2 className="font-display text-headline-sm text-on-surface flex items-center gap-2">
              <MapPin className="text-primary" size={20} />
              1. Delivery Address
            </h2>
            <div className="border-t border-outline-variant/20 pt-md grid grid-cols-1 sm:grid-cols-2 gap-md">
              <div className="space-y-1">
                <label className="font-label text-label-md text-on-surface-variant">Full Name *</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={handleChange("name")}
                  className={`w-full px-4 py-2.5 bg-surface-container-low border rounded-md font-body text-body-md focus:outline-none focus:ring-2 focus:ring-primary ${
                    errors.name ? "border-error focus:ring-error" : "border-outline-variant"
                  }`}
                  placeholder="e.g. Priya Patel"
                />
                {errors.name && <span className="font-body text-body-sm text-error">{errors.name}</span>}
              </div>

              <div className="space-y-1">
                <label className="font-label text-label-md text-on-surface-variant">Phone Number *</label>
                <input
                  type="tel"
                  inputMode="numeric"
                  value={form.phone}
                  onChange={handleChange("phone")}
                  className={`w-full px-4 py-2.5 bg-surface-container-low border rounded-md font-body text-body-md focus:outline-none focus:ring-2 focus:ring-primary ${
                    errors.phone ? "border-error focus:ring-error" : "border-outline-variant"
                  }`}
                  placeholder="10-digit mobile number"
                />
                {errors.phone && <span className="font-body text-body-sm text-error">{errors.phone}</span>}
              </div>

              <div className="sm:col-span-2 space-y-1">
                <label className="font-label text-label-md text-on-surface-variant">House / Flat and Street *</label>
                <textarea
                  rows={3}
                  value={form.address}
                  onChange={handleChange("address")}
                  className={`w-full px-4 py-2.5 bg-surface-container-low border rounded-md font-body text-body-md focus:outline-none focus:ring-2 focus:ring-primary ${
                    errors.address ? "border-error focus:ring-error" : "border-outline-variant"
                  }`}
                  placeholder="House/Flat No., Building Name, Street"
                />
                {errors.address && <span className="font-body text-body-sm text-error">{errors.address}</span>}
                <p className="font-body text-body-sm text-on-surface-variant flex flex-wrap items-center gap-1">
                  <MapPin size={14} className="text-primary shrink-0" />
                  Delivery area: <strong className="text-on-surface">{deliveryArea}</strong>
                  <span>(change it from the location menu at the top)</span>
                </p>
              </div>
            </div>
          </div>

          {/* Payment Method */}
          <div className="bg-surface-container-lowest rounded-lg p-xl border border-outline-variant/30 shadow-card space-y-md">
            <h2 className="font-display text-headline-sm text-on-surface flex items-center gap-2">
              <CreditCard className="text-primary" size={20} />
              2. Payment Method
            </h2>
            <div className="border-t border-outline-variant/20 pt-md space-y-sm">
              {[
                { id: "Cash on Delivery", title: "Cash on Delivery / Pay on Delivery", desc: "Pay with Cash or UPI upon delivery" },
                { id: "UPI (Google Pay / PhonePe)", title: "UPI Instant Payment (Demo)", desc: "Pay via Google Pay, PhonePe, or Paytm" },
                { id: "Credit / Debit Card", title: "Credit or Debit Card (Demo)", desc: "Visa, MasterCard, RuPay accepted" },
              ].map((method) => (
                <label
                  key={method.id}
                  className={`flex items-start gap-md p-md rounded-lg border transition-colors cursor-pointer ${
                    form.paymentMethod === method.id
                      ? "bg-secondary-container/20 border-secondary font-semibold"
                      : "bg-surface-container-low border-outline-variant/30 hover:bg-surface-container-high"
                  }`}
                >
                  <input
                    type="radio"
                    name="paymentMethod"
                    value={method.id}
                    checked={form.paymentMethod === method.id}
                    onChange={(e) => setForm((prev) => ({ ...prev, paymentMethod: e.target.value }))}
                    className="mt-1 accent-primary"
                  />
                  <div>
                    <p className="font-label text-label-md text-on-surface">{method.title}</p>
                    <p className="font-body text-body-sm text-on-surface-variant">{method.desc}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {submitError && (
            <p role="alert" className="flex items-start gap-2 font-body text-body-sm text-error bg-error/10 rounded-lg p-md">
              <AlertCircle size={18} className="shrink-0" />
              {submitError}
            </p>
          )}

          {/* Submit Action */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-4 bg-primary text-on-primary font-label text-label-md rounded-full hover:bg-primary-container transition-colors shadow-sm flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 text-base font-bold"
          >
            {isSubmitting ? (
              <span>Placing Your Order...</span>
            ) : (
              <>
                <span>Confirm & Place Order • Rs. {total.toFixed(2)}</span>
                <ArrowRight size={20} />
              </>
            )}
          </button>
        </form>

        {/* Right: Order Summary Sidebar */}
        <aside className="bg-surface-container-low rounded-lg p-xl border border-outline-variant/30 shadow-card sticky top-24 space-y-md">
          <h2 className="font-display text-headline-sm text-on-surface flex items-center gap-2">
            <ShoppingBasket className="text-primary" size={20} />
            Order Summary
          </h2>

          {/* Cart Items, one group per store delivery */}
          <div className="space-y-md max-h-80 overflow-y-auto pr-1">
            {deliveries.map((delivery, index) => (
              <div key={delivery.storeId} className="space-y-xs">
                <DeliveryHeader delivery={delivery} index={index} count={deliveries.length} eta={etas[delivery.storeId]} />
                <div className="divide-y divide-outline-variant/20">
                  {delivery.items.map(({ product, qty }) => (
                    <div key={product.id} className="py-sm flex items-center justify-between gap-md">
                      <div className="flex items-center gap-sm">
                        <img src={assetUrl(product.image)} alt={product.name} className="w-10 h-10 rounded-md object-cover" />
                        <div>
                          <p className="font-body text-body-sm font-semibold text-on-surface line-clamp-1">{product.name}</p>
                          <p className="font-body text-body-sm text-on-surface-variant">Qty: {qty}</p>
                        </div>
                      </div>
                      <span className="font-label text-label-md font-bold text-on-surface">
                        Rs. {(product.price * qty).toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Applied Offer Banner */}
          <div className="pt-md border-t border-outline-variant/30 space-y-sm">
            {appliedOffer ? (
              <div className="flex items-center justify-between bg-tertiary-container/30 border border-tertiary-container px-md py-2.5 rounded-lg">
                <div className="flex items-center gap-2">
                  <Tag size={18} className="text-tertiary" />
                  <div>
                    <p className="font-label text-label-md font-bold text-tertiary">
                      Offer {appliedOffer.code} Applied
                    </p>
                    <p className="font-body text-body-sm text-on-surface-variant">
                      {offerShortfall > 0
                        ? `Add Rs. ${offerShortfall.toFixed(0)} more to unlock this offer`
                        : `Discount: -Rs. ${discountAmount.toFixed(2)}`}
                    </p>
                  </div>
                </div>
                <button type="button" onClick={removeOffer} className="font-label text-label-sm text-error hover:underline">
                  Remove
                </button>
              </div>
            ) : (
              <form onSubmit={handleApplyPromo} className="flex gap-2">
                <input
                  type="text"
                  placeholder="Voucher code"
                  value={promoInput}
                  onChange={(e) => {
                    setPromoInput(e.target.value);
                    setPromoFeedback(null);
                  }}
                  className="w-full px-3 py-2 bg-surface-container-lowest border border-outline-variant rounded-md font-body text-body-sm focus:outline-none focus:ring-2 focus:ring-primary uppercase"
                />
                <button
                  type="submit"
                  className="px-4 py-2 bg-secondary text-on-secondary font-label text-label-md rounded-md hover:opacity-90"
                >
                  Apply
                </button>
              </form>
            )}

            {promoFeedback && (
              <div
                className={`flex items-center gap-2 text-xs p-2 rounded-md ${
                  promoFeedback.success ? "bg-primary/10 text-primary" : "bg-error-container text-on-error-container"
                }`}
              >
                {promoFeedback.success ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
                <span>{promoFeedback.message}</span>
              </div>
            )}
          </div>

          {/* Totals Breakdown */}
          <div className="pt-md border-t border-outline-variant/30 space-y-2 font-body text-body-sm">
            <div className="flex justify-between text-on-surface-variant">
              <span>Subtotal</span>
              <span>Rs. {subtotal.toFixed(2)}</span>
            </div>

            {appliedOffer && (
              <div className="flex justify-between text-tertiary font-semibold">
                <span>Discount ({appliedOffer.code})</span>
                <span>- Rs. {discountAmount.toFixed(2)}</span>
              </div>
            )}

            <div className="flex justify-between text-on-surface-variant">
              <span>
                Delivery Charges{deliveries.length > 1 && ` (${deliveries.length} deliveries)`}
              </span>
              <span>{deliveryFee === 0 ? <span className="text-primary font-bold">FREE</span> : `Rs. ${deliveryFee.toFixed(2)}`}</span>
            </div>
            {deliveryFee > 0 && (
              <p className="text-[12px] text-on-surface-variant text-right">
                Add Rs. {(FREE_DELIVERY_FROM - subtotal).toFixed(0)} more for free delivery from every store
              </p>
            )}

            <div className="flex justify-between font-display text-headline-sm text-on-surface pt-2 border-t border-outline-variant/30">
              <span>Total Payable</span>
              <span className="text-primary font-bold">Rs. {total.toFixed(2)}</span>
            </div>
          </div>
        </aside>
      </div>
    </main>
  );
}
