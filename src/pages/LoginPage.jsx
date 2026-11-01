import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { Mail, Lock, ShoppingBasket } from "lucide-react";
import { useAuth } from "../context/AuthContext";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validate(form) {
  const errors = {};

  if (!form.email.trim()) errors.email = "Email is required.";
  else if (!EMAIL_RE.test(form.email.trim())) errors.email = "Enter a valid email address.";

  if (!form.password) errors.password = "Password is required.";
  else if (form.password.length < 6) errors.password = "Password must be at least 6 characters.";

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

export default function LoginPage() {
  const [form, setForm] = useState({ email: "", password: "" });
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const redirectTo = location.state?.from || "/";

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
    const result = await login(form.email, form.password);
    setIsSubmitting(false);
    if (result.ok) {
      // Store owners go straight to their Vendor Hub unless they were heading somewhere else
      const vendorHome = result.user?.role === "vendor" && redirectTo === "/";
      navigate(vendorHome ? "/vendor" : redirectTo, { replace: true });
    } else {
      setErrors({ [result.field]: result.error });
    }
  };

  return (
    <main className="flex-grow w-full flex items-center justify-center px-margin-mobile py-2xl">
      <div className="w-full max-w-md bg-surface-container-lowest rounded-lg shadow-card p-xl space-y-lg">
        <div className="flex flex-col items-center gap-sm text-center">
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
            <ShoppingBasket className="text-primary" size={24} />
          </div>
          <h1 className="font-display text-headline-md text-on-surface">Welcome back</h1>
          <p className="font-body text-body-md text-on-surface-variant">Log in to order from stores near you.</p>
          {location.state?.notice && (
            <p className="font-body text-body-sm text-error">{location.state.notice}</p>
          )}
        </div>

        <form className="space-y-md" onSubmit={handleSubmit} noValidate>
          <Field label="Email" error={errors.email} icon={Mail}>
            <input
              type="email"
              autoComplete="email"
              value={form.email}
              onChange={handleChange("email")}
              className={inputClass("email")}
              placeholder="you@example.com"
            />
          </Field>

          <Field label="Password" error={errors.password} icon={Lock}>
            <input
              type="password"
              autoComplete="current-password"
              value={form.password}
              onChange={handleChange("password")}
              className={inputClass("password")}
              placeholder="Enter your password"
            />
          </Field>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3 bg-primary text-on-primary font-label text-label-md rounded-full hover:bg-primary-container transition-colors shadow-sm disabled:opacity-50"
          >
            {isSubmitting ? "Logging in..." : "Log In"}
          </button>
        </form>

        <p className="text-center font-body text-body-sm text-on-surface-variant">
          Don't have an account?{" "}
          <Link to="/signup" state={location.state} className="text-primary font-semibold hover:underline">
            Sign up
          </Link>
        </p>
      </div>
    </main>
  );
}
