import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { X, ShoppingBasket, Plus, Minus, Trash2, Tag, ArrowRight, CheckCircle, AlertCircle } from "lucide-react";
import { useCart, FREE_DELIVERY_FROM } from "../context/CartContext";
import { useAuth } from "../context/AuthContext";
import DeliveryHeader from "./DeliveryHeader";
import { assetUrl } from "../api/client";

export default function CartDrawer() {
  const {
    cartItems,
    deliveries,
    itemCount,
    subtotal,
    deliveryFee,
    appliedOffer,
    discountAmount,
    offerShortfall,
    total,
    isCartOpen,
    closeCart,
    updateQuantity,
    removeFromCart,
    applyOffer,
    removeOffer,
  } = useCart();

  const { isLoggedIn } = useAuth();
  const navigate = useNavigate();

  const [promoInput, setPromoInput] = useState("");
  const [promoFeedback, setPromoFeedback] = useState(null);

  if (!isCartOpen) return null;

  const handleApplyPromo = (e) => {
    e.preventDefault();
    if (!promoInput.trim()) return;
    const res = applyOffer(promoInput);
    setPromoFeedback(res);
    if (res.success) setPromoInput("");
  };

  const handleClose = () => {
    setPromoFeedback(null);
    closeCart();
  };

  const handleProceedToCheckout = () => {
    setPromoFeedback(null);
    closeCart();
    if (!isLoggedIn) {
      navigate("/login", { state: { from: "/checkout" } });
    } else {
      navigate("/checkout");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-xs transition-opacity duration-300"
        onClick={handleClose}
      />

      {/* Slide-out Drawer */}
      <div className="relative w-full max-w-md bg-surface-container-lowest h-full shadow-lift flex flex-col z-10 animate-in slide-in-from-right duration-300">
        {/* Drawer Header */}
        <div className="flex items-center justify-between px-lg py-md border-b border-outline-variant/30 bg-surface">
          <div className="flex items-center gap-md">
            <ShoppingBasket className="text-primary" size={24} />
            <div>
              <h2 className="font-display text-headline-sm text-on-surface">Your Basket</h2>
              <p className="font-body text-body-sm text-on-surface-variant">
                {itemCount} {itemCount === 1 ? "item" : "items"}
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-surface-container-high text-on-surface-variant transition-colors cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        {/* Drawer Body */}
        {cartItems.length === 0 ? (
          <div className="flex-grow flex flex-col items-center justify-center p-2xl text-center">
            <div className="w-20 h-20 rounded-full bg-surface-container flex items-center justify-center mb-md text-on-surface-variant">
              <ShoppingBasket size={40} />
            </div>
            <h3 className="font-display text-headline-sm text-on-surface mb-xs">Your basket is empty</h3>
            <p className="font-body text-body-md text-on-surface-variant mb-xl max-w-xs">
              Explore our fresh produce, bakery goods, and daily essentials.
            </p>
            <button
              onClick={handleClose}
              className="px-8 py-3 bg-primary text-on-primary font-label text-label-md rounded-full hover:bg-primary-container transition-colors shadow-sm cursor-pointer"
            >
              Start Shopping
            </button>
          </div>
        ) : (
          <>
            {/* Items List */}
            <div className="flex-grow overflow-y-auto p-lg space-y-lg">
              {deliveries.map((delivery, index) => (
                <div key={delivery.storeId} className="space-y-md">
                  <DeliveryHeader delivery={delivery} index={index} count={deliveries.length} />
                  <div className="space-y-md divide-y divide-outline-variant/20">
                    {delivery.items.map(({ product, qty }) => (
                      <div key={product.id} className="pt-md first:pt-0 flex gap-md items-center">
                        <img
                          src={assetUrl(product.image)}
                          alt={product.name}
                          className="w-16 h-16 rounded-md object-cover border border-outline-variant/30 shrink-0"
                        />
                        <div className="flex-grow min-w-0">
                          <h4 className="font-body text-body-md font-semibold text-on-surface truncate">
                            {product.name}
                          </h4>
                          <p className="font-body text-body-sm text-on-surface-variant">{product.unit}</p>
                          <div className="font-label text-label-md font-bold text-primary mt-1">
                            Rs. {product.price.toFixed(2)}
                          </div>
                        </div>

                        <div className="flex flex-col items-end gap-2 shrink-0">
                          <button
                            onClick={() => removeFromCart(product.id)}
                            className="text-on-surface-variant hover:text-error transition-colors p-1"
                            title="Remove item"
                          >
                            <Trash2 size={16} />
                          </button>

                          <div className="flex items-center gap-2 bg-surface-container-low rounded-full px-2 py-1 border border-outline-variant/30">
                            <button
                              onClick={() => updateQuantity(product.id, qty - 1)}
                              className="w-6 h-6 rounded-full flex items-center justify-center hover:bg-surface-container-high text-on-surface transition-colors cursor-pointer"
                            >
                              <Minus size={14} />
                            </button>
                            <span className="font-label text-label-md font-bold text-on-surface w-5 text-center">
                              {qty}
                            </span>
                            <button
                              onClick={() => updateQuantity(product.id, qty + 1)}
                              className="w-6 h-6 rounded-full flex items-center justify-center hover:bg-surface-container-high text-on-surface transition-colors cursor-pointer"
                            >
                              <Plus size={14} />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Promo Code Section */}
            <div className="p-lg bg-surface-container-low border-t border-outline-variant/30 space-y-sm">
              {appliedOffer ? (
                <div className="flex items-center justify-between bg-tertiary-container/30 border border-tertiary-container px-md py-2.5 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Tag size={18} className="text-tertiary" />
                    <div>
                      <p className="font-label text-label-md font-bold text-tertiary">
                        Code {appliedOffer.code} Applied
                      </p>
                      <p className="font-body text-body-sm text-on-surface-variant">
                        {offerShortfall > 0
                          ? `Add Rs. ${offerShortfall.toFixed(0)} more to unlock this offer`
                          : `Saved Rs. ${discountAmount.toFixed(2)}`}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={removeOffer}
                    className="font-label text-label-sm text-error hover:underline cursor-pointer"
                  >
                    Remove
                  </button>
                </div>
              ) : (
                <form onSubmit={handleApplyPromo} className="flex gap-2">
                  <div className="relative flex-grow">
                    <Tag size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant" />
                    <input
                      type="text"
                      placeholder="Promo code (e.g. NEAR50)"
                      value={promoInput}
                      onChange={(e) => {
                        setPromoInput(e.target.value);
                        setPromoFeedback(null);
                      }}
                      className="w-full pl-9 pr-3 py-2 bg-surface-container-lowest border border-outline-variant rounded-md font-body text-body-sm focus:outline-none focus:ring-2 focus:ring-primary uppercase"
                    />
                  </div>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-secondary text-on-secondary font-label text-label-md rounded-md hover:opacity-90 transition-opacity cursor-pointer shrink-0"
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
                  {promoFeedback.success ? <CheckCircle size={14} /> : <AlertCircle size={14} />}
                  <span>{promoFeedback.message}</span>
                </div>
              )}
            </div>

            {/* Cart Summary Footer */}
            <div className="p-lg bg-surface border-t border-outline-variant/30 space-y-md">
              <div className="space-y-1.5 font-body text-body-sm">
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
                  <span>Delivery Fee{deliveries.length > 1 && ` (${deliveries.length} deliveries)`}</span>
                  <span>{deliveryFee === 0 ? <span className="text-primary font-bold">FREE</span> : `Rs. ${deliveryFee.toFixed(2)}`}</span>
                </div>
                {deliveryFee > 0 && (
                  <p className="text-[12px] text-on-surface-variant text-right">
                    Add Rs. {(FREE_DELIVERY_FROM - subtotal).toFixed(0)} more for free delivery from every store
                  </p>
                )}

                <div className="flex justify-between font-display text-headline-sm text-on-surface pt-2 border-t border-outline-variant/30">
                  <span>Total Amount</span>
                  <span className="text-primary font-bold">Rs. {total.toFixed(2)}</span>
                </div>
              </div>

              <div className="flex gap-md pt-xs">
                <button
                  onClick={handleClose}
                  className="w-1/3 py-3 bg-surface-container-high text-on-surface font-label text-label-md rounded-full hover:bg-surface-container-highest transition-colors cursor-pointer text-center"
                >
                  Continue Shopping
                </button>
                <button
                  onClick={handleProceedToCheckout}
                  className="w-2/3 py-3 bg-primary text-on-primary font-label text-label-md rounded-full hover:bg-primary-container transition-colors shadow-sm flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>Proceed to Checkout</span>
                  <ArrowRight size={18} />
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
