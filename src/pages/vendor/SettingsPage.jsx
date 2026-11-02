import { useState, useEffect, lazy, Suspense } from "react";
import { Store, MapPin, Clock, BadgeCheck, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { api } from "../../api/client";
import { useCatalog } from "../../context/CatalogContext";

// The map library is only downloaded when this page needs it
const ShopAreaMap = lazy(() => import("../../components/ShopAreaMap"));

const SHOP_TYPES = ["Kirana / Grocery", "Bakery", "Pharmacy"];

const inputBase =
  "w-full px-4 py-2.5 bg-surface-container-low border rounded-md font-body text-body-md focus:outline-none focus:ring-2";

function validate(form) {
  const errors = {};
  const phoneDigits = form.phone.replace(/[\s-]/g, "").replace(/^\+91/, "");

  if (form.shopName.trim().length < 2) errors.shopName = "Shop name must be at least 2 characters.";
  if (!/^\d{10}$/.test(phoneDigits)) errors.phone = "Enter a valid 10-digit phone number.";
  if (form.description.trim().length > 200) errors.description = "Keep the description under 200 characters.";
  if (!form.street.trim()) errors.street = "Street address is required.";
  if (!form.city.trim()) errors.city = "City is required.";
  if (!/^\d{6}$/.test(form.pincode.trim())) errors.pincode = "Enter a valid 6-digit pincode.";
  if (form.weekdayOpen >= form.weekdayClose) errors.weekdayHours = "Closing time must be after opening time.";
  if (form.sundayOpen >= form.sundayClose) errors.sundayHours = "Closing time must be after opening time.";

  return errors;
}

export default function SettingsPage() {
  const [saved, setSaved] = useState(null);
  const [form, setForm] = useState(null);
  const [errors, setErrors] = useState({});
  const [feedback, setFeedback] = useState(null); // { ok, message }
  const [isSaving, setIsSaving] = useState(false);
  const { refresh: refreshCatalog, location: catalogLocation } = useCatalog();
  const [store, setStore] = useState(null); // where the shop sits on the map

  useEffect(() => {
    api("/vendor/store")
      .then(({ store: shop, settings }) => {
        setStore(shop);
        setSaved(settings);
        setForm(settings);
      })
      .catch((e) => setFeedback({ ok: false, message: e.message }));
  }, []);

  const handleChange = (field) => (e) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
    setFeedback(null);
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: null }));
  };

  const inputClass = (field) =>
    `${inputBase} ${errors[field] ? "border-error focus:ring-error" : "border-outline-variant focus:ring-primary"}`;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSaving) return;
    const nextErrors = validate(form);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      setFeedback({ ok: false, message: "Please fix the highlighted fields." });
      return;
    }
    const cleaned = Object.fromEntries(Object.entries(form).map(([k, v]) => [k, v.trim()]));
    setIsSaving(true);
    try {
      const { store: shop, settings } = await api("/vendor/store/settings", { method: "PUT", body: cleaned });
      setStore(shop);
      setSaved(settings);
      setForm(settings);
      setFeedback({ ok: true, message: "Changes saved." });
      refreshCatalog(); // shoppers see the new name, address and hours
    } catch (err) {
      if (err.errors) setErrors(err.errors);
      setFeedback({ ok: false, message: err.message });
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setForm(saved);
    setErrors({});
    setFeedback(null);
  };

  const isDirty = JSON.stringify(form) !== JSON.stringify(saved);

  if (!form) {
    return feedback ? (
      <p role="alert" className="font-body text-body-md text-error">{feedback.message}</p>
    ) : (
      <div className="flex justify-center py-2xl text-primary">
        <Loader2 size={32} className="animate-spin" />
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="max-w-2xl space-y-lg">
      <div>
        <h1 className="font-display text-headline-md text-on-surface mb-xs">Shop Settings</h1>
        <p className="font-body text-body-md text-on-surface-variant">Manage your store's public profile and operational details.</p>
      </div>

      <span className="inline-flex items-center gap-1.5 bg-primary/10 text-primary font-label text-label-md px-4 py-2 rounded-full">
        <BadgeCheck size={16} />
        Verified Vendor
      </span>

      {/* Basic Information */}
      <section className="bg-surface-container-lowest rounded-md p-lg shadow-card space-y-md">
        <h2 className="font-display text-headline-sm text-on-surface flex items-center gap-2">
          <Store size={20} className="text-primary" />
          Basic Information
        </h2>

        <label className="block space-y-1">
          <span className="font-label text-label-md text-on-surface-variant">Shop Name</span>
          <input value={form.shopName} onChange={handleChange("shopName")} className={inputClass("shopName")} />
          {errors.shopName && <span className="block font-body text-body-sm text-error">{errors.shopName}</span>}
        </label>

        <label className="block space-y-1">
          <span className="font-label text-label-md text-on-surface-variant">Shop Type</span>
          <select value={form.shopType} onChange={handleChange("shopType")} className={inputClass("shopType")}>
            {SHOP_TYPES.map((type) => (
              <option key={type}>{type}</option>
            ))}
          </select>
        </label>

        <label className="block space-y-1">
          <span className="font-label text-label-md text-on-surface-variant">Contact Phone</span>
          <input type="tel" value={form.phone} onChange={handleChange("phone")} className={inputClass("phone")} />
          {errors.phone && <span className="block font-body text-body-sm text-error">{errors.phone}</span>}
        </label>

        <label className="block space-y-1">
          <span className="font-label text-label-md text-on-surface-variant">Short Description</span>
          <textarea
            rows={3}
            value={form.description}
            onChange={handleChange("description")}
            className={`${inputClass("description")} resize-none`}
          />
          <span className={`block font-body text-body-sm ${errors.description ? "text-error" : "text-on-surface-variant"}`}>
            {errors.description || `${form.description.trim().length}/200`}
          </span>
        </label>
      </section>

      {/* Location Details */}
      <section className="bg-surface-container-lowest rounded-md p-lg shadow-card space-y-md">
        <h2 className="font-display text-headline-sm text-on-surface flex items-center gap-2">
          <MapPin size={20} className="text-primary" />
          Location Details
        </h2>

        <label className="block space-y-1">
          <span className="font-label text-label-md text-on-surface-variant">Street Address</span>
          <input value={form.street} onChange={handleChange("street")} className={inputClass("street")} />
          {errors.street && <span className="block font-body text-body-sm text-error">{errors.street}</span>}
        </label>

        <div className="grid grid-cols-2 gap-md">
          <label className="block space-y-1">
            <span className="font-label text-label-md text-on-surface-variant">City</span>
            <input value={form.city} onChange={handleChange("city")} className={inputClass("city")} />
            {errors.city && <span className="block font-body text-body-sm text-error">{errors.city}</span>}
          </label>
          <label className="block space-y-1">
            <span className="font-label text-label-md text-on-surface-variant">Pincode</span>
            <input inputMode="numeric" value={form.pincode} onChange={handleChange("pincode")} className={inputClass("pincode")} />
            {errors.pincode && <span className="block font-body text-body-sm text-error">{errors.pincode}</span>}
          </label>
        </div>

        {store?.location ? (
          <div className="space-y-xs">
            <Suspense fallback={<div className="h-56 w-full bg-surface-container-high rounded-md" />}>
              <ShopAreaMap location={store.location} radiusKm={catalogLocation.radiusKm} shopName={store.name} />
            </Suspense>
            <p className="font-body text-body-sm text-on-surface-variant">
              {store.locationLabel ? (
                <>
                  On the map at <strong className="text-on-surface">{store.locationLabel}</strong>.{" "}
                </>
              ) : null}
              Customers inside the circle ({catalogLocation.radiusKm} km) can see your shop and order from it. If the pin is in
              the wrong place, check the street and pincode and save.
            </p>
          </div>
        ) : (
          <div className="h-40 w-full bg-surface-container-high rounded-md flex items-center justify-center">
            <MapPin size={28} className="text-on-surface-variant" />
          </div>
        )}
      </section>

      {/* Hours */}
      <section className="bg-surface-container-lowest rounded-md p-lg shadow-card space-y-md">
        <h2 className="font-display text-headline-sm text-on-surface flex items-center gap-2">
          <Clock size={20} className="text-primary" />
          Hours
        </h2>
        {[
          { label: "Mon - Sat", open: "weekdayOpen", close: "weekdayClose", error: "weekdayHours" },
          { label: "Sunday", open: "sundayOpen", close: "sundayClose", error: "sundayHours" },
        ].map((row) => (
          <div key={row.label} className="space-y-1">
            <div className="flex justify-between items-center gap-md font-body text-body-md">
              <span className="text-on-surface-variant">{row.label}</span>
              <div className="flex items-center gap-2">
                <input
                  type="time"
                  value={form[row.open]}
                  onChange={handleChange(row.open)}
                  aria-label={`${row.label} opening time`}
                  className="px-3 py-1.5 bg-surface-container-low border border-outline-variant rounded-md font-body text-body-md focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <span className="text-on-surface-variant">–</span>
                <input
                  type="time"
                  value={form[row.close]}
                  onChange={handleChange(row.close)}
                  aria-label={`${row.label} closing time`}
                  className="px-3 py-1.5 bg-surface-container-low border border-outline-variant rounded-md font-body text-body-md focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>
            {errors[row.error] && <span className="block text-right font-body text-body-sm text-error">{errors[row.error]}</span>}
          </div>
        ))}
      </section>

      {feedback && (
        <div
          className={`flex items-center gap-2 text-body-sm p-3 rounded-md ${
            feedback.ok ? "bg-primary/10 text-primary" : "bg-error-container text-on-error-container"
          }`}
        >
          {feedback.ok ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
          <span>{feedback.message}</span>
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-md pb-xl">
        <button
          type="submit"
          disabled={isSaving}
          className="flex-1 py-3 bg-primary text-on-primary font-label text-label-md rounded-full hover:bg-primary-container transition-colors shadow-sm disabled:opacity-50"
        >
          {isSaving ? "Saving…" : "Save Changes"}
        </button>
        <button
          type="button"
          onClick={handleCancel}
          disabled={!isDirty}
          className="flex-1 py-3 border border-outline-variant text-on-surface font-label text-label-md rounded-full hover:bg-surface-container-high transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
