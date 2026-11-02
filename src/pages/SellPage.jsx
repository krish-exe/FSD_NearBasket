import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { User, Mail, Phone, Lock, Store, MapPin, Hash, Building2, Clock } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { SHOP_TYPES } from "../../shared/categories.js";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^\d{10}$/;
const PASSWORD_RE = /^(?=.*[A-Za-z])(?=.*\d).{8,}$/;

const INITIAL_FORM = {
  name: "",
  email: "",
  phone: "",
  password: "",
  confirmPassword: "",
  shopName: "",
  shopType: SHOP_TYPES[0],
  street: "",
  city: "Mumbai",
  pincode: "",
  openTime: "08:00",
  closeTime: "22:00",
};

// Same rules the server checks; this only saves a round trip
function validate(form) {
  const errors = {};
  if (form.name.trim().length < 2) errors.name = "Please enter your full name.";
  if (!EMAIL_RE.test(form.email.trim())) errors.email = "Enter a valid email address.";
  if (!PHONE_RE.test(form.phone.trim())) errors.phone = "Enter a valid 10-digit phone number.";
  if (!PASSWORD_RE.test(form.password)) errors.password = "Password must be at least 8 characters and include a letter and a number.";
  if (form.confirmPassword !== form.password) errors.confirmPassword = "Passwords do not match.";
  if (form.shopName.trim().length < 2) errors.shopName = "Shop name must be at least 2 characters.";
  if (!form.street.trim()) errors.street = "Street address is required.";
  if (!form.city.trim()) errors.city = "City is required.";
  if (!/^\d{6}$/.test(form.pincode.trim())) errors.pincode = "Enter a valid 6-digit pincode.";
  if (form.openTime >= form.closeTime) errors.closeTime = "Closing time must be after opening time.";
  return errors;
}

function Field({ label, error, icon: Icon, children }) {
  return (
    <label className="block space-y-1">
      <span className="font-label text-label-md text-on-surface-variant">{label}</span>
      <div className="relative">
        <Icon className="absolute left-3.5 top-1/2 -translate-y-1/2 text-on-surface-variant" size={18} />
        {children}
      </div>
      {error && <span className="block font-body text-body-sm text-error">{error}</span>}
    </label>
  );
}

/** "Sell on NearBasket": a shop owner signs up and lists their shop in one step. */
export default function SellPage() {
  const [form, setForm] = useState(INITIAL_FORM);
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { registerShop } = useAuth();
  const navigate = useNavigate();

  const handleChange = (field) => (e) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: null }));
  };

  const inputClass = (field) =>
    `w-full pl-11 pr-4 py-2.5 bg-surface-container-low border rounded-md font-body text-body-md focus:outline-none focus:ring-2 focus:ring-primary ${
      errors[field] ? "border-error focus:ring-error" : "border-outline-variant"
    }`;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;
    const nextErrors = validate(form);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setIsSubmitting(true);
    const { confirmPassword: _confirm, ...details } = form;
    const result = await registerShop(details);
    setIsSubmitting(false);
    if (result.ok) {
      navigate("/vendor/inventory?add=1", { replace: true });
    } else {
      setErrors({ [result.field]: result.error });
    }
  };

  return (
    <main className="flex-grow w-full flex items-center justify-center px-margin-mobile py-2xl">
      <div className="w-full max-w-xl bg-surface-container-lowest rounded-lg shadow-card p-xl space-y-lg">
        <div className="flex flex-col items-center gap-sm text-center">
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
            <Store className="text-primary" size={24} />
          </div>
          <h1 className="font-display text-headline-md text-on-surface">Sell on NearBasket</h1>
          <p className="font-body text-body-md text-on-surface-variant">
            List your shop and deliver to customers within 5 km of it.
          </p>
        </div>

        <form className="space-y-lg" onSubmit={handleSubmit} noValidate>
          <fieldset className="space-y-md">
            <legend className="font-display text-headline-sm text-on-surface mb-sm">About you</legend>
            <Field label="Full Name" error={errors.name} icon={User}>
              <input value={form.name} onChange={handleChange("name")} className={inputClass("name")} placeholder="Shop owner's name" />
            </Field>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-md">
              <Field label="Email" error={errors.email} icon={Mail}>
                <input type="email" value={form.email} onChange={handleChange("email")} className={inputClass("email")} placeholder="you@example.com" />
              </Field>
              <Field label="Phone Number" error={errors.phone} icon={Phone}>
                <input value={form.phone} onChange={handleChange("phone")} className={inputClass("phone")} placeholder="10-digit number" />
              </Field>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-md">
              <Field label="Password" error={errors.password} icon={Lock}>
                <input type="password" autoComplete="new-password" value={form.password} onChange={handleChange("password")} className={inputClass("password")} placeholder="At least 8 characters" />
              </Field>
              <Field label="Confirm Password" error={errors.confirmPassword} icon={Lock}>
                <input type="password" autoComplete="new-password" value={form.confirmPassword} onChange={handleChange("confirmPassword")} className={inputClass("confirmPassword")} placeholder="Re-enter it" />
              </Field>
            </div>
          </fieldset>

          <fieldset className="space-y-md">
            <legend className="font-display text-headline-sm text-on-surface mb-sm">Your shop</legend>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-md">
              <Field label="Shop Name" error={errors.shopName} icon={Store}>
                <input value={form.shopName} onChange={handleChange("shopName")} className={inputClass("shopName")} placeholder="e.g. Ghatkopar Dairy" />
              </Field>
              <Field label="Shop Type" error={errors.shopType} icon={Building2}>
                <select value={form.shopType} onChange={handleChange("shopType")} className={inputClass("shopType")}>
                  {SHOP_TYPES.map((type) => (
                    <option key={type}>{type}</option>
                  ))}
                </select>
              </Field>
            </div>
            <Field label="Street Address" error={errors.street} icon={MapPin}>
              <input value={form.street} onChange={handleChange("street")} className={inputClass("street")} placeholder="Shop no., building, road, area" />
            </Field>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-md">
              <Field label="City" error={errors.city} icon={Building2}>
                <input value={form.city} onChange={handleChange("city")} className={inputClass("city")} />
              </Field>
              <Field label="Pincode" error={errors.pincode} icon={Hash}>
                <input value={form.pincode} onChange={handleChange("pincode")} className={inputClass("pincode")} placeholder="6 digits" />
              </Field>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-md">
              <Field label="Opens at" error={errors.openTime} icon={Clock}>
                <input type="time" value={form.openTime} onChange={handleChange("openTime")} className={inputClass("openTime")} />
              </Field>
              <Field label="Closes at" error={errors.closeTime} icon={Clock}>
                <input type="time" value={form.closeTime} onChange={handleChange("closeTime")} className={inputClass("closeTime")} />
              </Field>
            </div>
            <p className="font-body text-body-sm text-on-surface-variant">
              We place your shop on the map from this address, so customers nearby can find it. You can change these details and your
              Sunday hours later in Shop Settings.
            </p>
          </fieldset>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3 bg-primary text-on-primary font-label text-label-md rounded-full hover:bg-primary-container transition-colors shadow-sm disabled:opacity-50"
          >
            {isSubmitting ? "Setting up your shop..." : "Register my shop"}
          </button>
        </form>

        <p className="text-center font-body text-body-sm text-on-surface-variant">
          Already selling on NearBasket?{" "}
          <Link to="/login" className="text-primary font-semibold hover:underline">
            Log in
          </Link>
        </p>
      </div>
    </main>
  );
}
