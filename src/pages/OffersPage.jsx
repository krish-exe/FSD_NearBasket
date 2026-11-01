import { useState } from "react";
import { Tag, Copy, Check, Calendar, ArrowRight, ShieldCheck, ShoppingBag, AlertCircle } from "lucide-react";
import { useCatalog } from "../context/CatalogContext";
import { useCart } from "../context/CartContext";

export default function OffersPage() {
  const { offers } = useCatalog();
  const [copiedCode, setCopiedCode] = useState(null);
  const [feedback, setFeedback] = useState(null); // { code, message }
  const { applyOffer, openCart } = useCart();

  const handleCopyCode = async (code) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedCode(code);
      setTimeout(() => setCopiedCode(null), 2000);
    } catch {
      setFeedback({ code, message: "Couldn't access the clipboard. Please copy the code manually." });
    }
  };

  const handleApplyOffer = (code) => {
    const res = applyOffer(code);
    if (res.success) {
      setFeedback(null);
      openCart();
    } else {
      setFeedback({ code, message: res.message });
    }
  };

  return (
    <main className="flex-grow w-full max-w-content mx-auto px-margin-mobile md:px-margin-desktop py-xl space-y-xl">
      {/* Header Banner */}
      <section className="relative rounded-lg overflow-hidden bg-gradient-to-r from-tertiary-container via-primary-container to-secondary-container p-xl md:p-2xl text-on-tertiary-container shadow-card">
        <div className="relative z-10 max-w-2xl space-y-md">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-white font-label text-label-sm font-bold uppercase tracking-wider">
            <Tag size={16} />
            Exclusive Neighborhood Vouchers & Promo Codes
          </div>
          <h1 className="font-display text-display-lg-mobile md:text-display-lg text-white font-bold">
            Offers & Savings Hub
          </h1>
          <p className="font-body text-body-lg text-white/90">
            Apply valid promo codes during checkout or save on your daily grocery baskets.
          </p>
        </div>
      </section>

      {/* Offers Grid */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-lg">
        {offers.map((offer) => {
          const isCopied = copiedCode === offer.code;

          return (
            <div
              key={offer.id}
              className="bg-surface-container-lowest rounded-lg border border-outline-variant/30 shadow-card p-xl flex flex-col justify-between space-y-lg relative overflow-hidden card-hover-lift"
            >
              {/* Top Tag Badge */}
              <div className="flex justify-between items-start">
                <span className={`px-3 py-1 rounded-full text-white font-label text-label-sm font-bold ${offer.bg}`}>
                  {offer.tag}
                </span>
                <span className="flex items-center gap-1 font-body text-body-sm text-on-surface-variant">
                  <Calendar size={14} />
                  {offer.expiryDate}
                </span>
              </div>

              {/* Offer Details */}
              <div className="space-y-sm">
                <h3 className="font-display text-headline-sm text-on-surface font-bold">
                  {offer.title}
                </h3>
                <p className="font-body text-body-md text-on-surface-variant">
                  {offer.description}
                </p>

                <div className="flex flex-wrap gap-md pt-sm font-body text-body-sm text-on-surface-variant">
                  <div className="flex items-center gap-1.5 bg-surface-container-low px-3 py-1.5 rounded-md border border-outline-variant/20">
                    <ShieldCheck size={16} className="text-primary" />
                    <span>Min Order: <strong>Rs. {offer.minOrder}</strong></span>
                  </div>
                  {offer.maxDiscount && (
                    <div className="flex items-center gap-1.5 bg-surface-container-low px-3 py-1.5 rounded-md border border-outline-variant/20">
                      <Tag size={16} className="text-secondary" />
                      <span>Max Savings: <strong>Rs. {offer.maxDiscount}</strong></span>
                    </div>
                  )}
                </div>
              </div>

              {/* Promo Code & Action Bar */}
              <div className="pt-md border-t border-outline-variant/20 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-md">
                <div className="flex items-center gap-2 bg-surface-container-low border border-dashed border-primary px-4 py-2 rounded-lg">
                  <span className="font-mono text-headline-sm font-bold text-primary tracking-wider">
                    {offer.code}
                  </span>
                  <button
                    onClick={() => handleCopyCode(offer.code)}
                    className="p-1 text-on-surface-variant hover:text-primary transition-colors cursor-pointer"
                    title="Copy promo code"
                  >
                    {isCopied ? <Check size={18} className="text-primary" /> : <Copy size={18} />}
                  </button>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => handleCopyCode(offer.code)}
                    className="flex-1 sm:flex-initial px-4 py-2.5 bg-surface-container-high text-on-surface font-label text-label-md rounded-full hover:bg-surface-container-highest transition-colors cursor-pointer text-center"
                  >
                    {isCopied ? "Copied!" : "Copy Code"}
                  </button>

                  <button
                    onClick={() => handleApplyOffer(offer.code)}
                    className="flex-1 sm:flex-initial px-6 py-2.5 bg-primary text-on-primary font-label text-label-md rounded-full hover:bg-primary-container transition-colors shadow-sm flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <span>Use Code</span>
                    <ArrowRight size={16} />
                  </button>
                </div>
              </div>

              {feedback?.code === offer.code && (
                <div className="flex items-center gap-2 text-xs p-2 rounded-md bg-error-container text-on-error-container">
                  <AlertCircle size={14} className="shrink-0" />
                  <span>{feedback.message}</span>
                </div>
              )}
            </div>
          );
        })}
      </section>

      {/* Terms & Guidance */}
      <section className="bg-surface-container-low rounded-lg p-xl border border-outline-variant/30 space-y-md">
        <h3 className="font-display text-headline-sm text-on-surface flex items-center gap-2">
          <ShoppingBag className="text-primary" size={20} />
          How to Redeem Coupon Codes
        </h3>
        <ul className="grid grid-cols-1 md:grid-cols-3 gap-md font-body text-body-md text-on-surface-variant">
          <li className="flex items-start gap-2">
            <span className="w-6 h-6 rounded-full bg-primary text-on-primary font-bold text-sm flex items-center justify-center shrink-0 mt-0.5">1</span>
            <span>Copy your desired promo code or click "Use Code" to apply it to your active basket.</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="w-6 h-6 rounded-full bg-primary text-on-primary font-bold text-sm flex items-center justify-center shrink-0 mt-0.5">2</span>
            <span>Ensure your basket meets the minimum order total required by the selected voucher.</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="w-6 h-6 rounded-full bg-primary text-on-primary font-bold text-sm flex items-center justify-center shrink-0 mt-0.5">3</span>
            <span>Your order total will instantly update with the calculated discount before payment!</span>
          </li>
        </ul>
      </section>
    </main>
  );
}
