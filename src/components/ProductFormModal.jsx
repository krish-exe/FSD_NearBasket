import { useRef, useState } from "react";
import { X, Trash2, ImageUp, Loader2, ImageOff } from "lucide-react";
import { PRODUCT_CATEGORIES } from "../../shared/categories.js";
import { api, assetUrl, uploadImage } from "../api/client";
import { resizeImage } from "../utils/resizeImage";

const inputBase =
  "w-full px-4 py-2.5 bg-surface-container-low border rounded-md font-body text-body-md focus:outline-none focus:ring-2";

const EMPTY = { name: "", unit: "", price: "", originalPrice: "", categoryId: "", stock: "", image: "", description: "" };

// Asks the server to delete a photo uploaded in this form; it keeps the photo if anything uses it
const discardUpload = (image) => {
  if (image.startsWith("/api/images/")) {
    api(image.replace("/api/images/", "/vendor/images/"), { method: "DELETE" }).catch(() => {});
  }
};

// The form keeps text; numbers become "" when missing so inputs stay controlled
const toForm = (product) =>
  product
    ? Object.fromEntries(Object.keys(EMPTY).map((key) => [key, product[key] == null ? "" : String(product[key])]))
    : EMPTY;

/**
 * Add or edit one product. onSave(form) and onDelete() resolve to null when done,
 * or an error whose `errors` map field names to messages.
 */
export default function ProductFormModal({ product, onSave, onDelete, onClose }) {
  const [form, setForm] = useState(() => toForm(product));
  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  // Shrinks the chosen photo, uploads it to the database and puts its link in the form
  const handlePhoto = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // lets the same file be picked again
    if (!file) return;
    setUploading(true);
    setErrors((prev) => ({ ...prev, image: null }));
    try {
      const replaced = form.image;
      const link = await uploadImage(await resizeImage(file));
      setForm((prev) => ({ ...prev, image: link }));
      // A photo uploaded earlier in this same form is no longer needed
      if (replaced !== (product?.image ?? "")) discardUpload(replaced);
    } catch (err) {
      setErrors((prev) => ({ ...prev, image: err.message }));
    } finally {
      setUploading(false);
    }
  };

  const handleChange = (field) => (e) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: null }));
  };

  const inputClass = (field) =>
    `${inputBase} ${errors[field] ? "border-error focus:ring-error" : "border-outline-variant focus:ring-primary"}`;

  const finish = async (action) => {
    setBusy(true);
    const err = await action();
    setBusy(false);
    if (!err) return onClose();
    setErrors(err.errors || {});
    setMessage(err.message);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!busy) finish(() => onSave(form));
  };

  // Closing without saving: drop a photo uploaded in this form
  const handleCancel = () => {
    if (form.image !== (product?.image ?? "")) discardUpload(form.image);
    onClose();
  };

  const handleDelete = () => {
    if (window.confirm(`Remove ${product.name} from your shop? Past orders keep their copy.`)) finish(onDelete);
  };

  const field = (name, label, input, hint) => (
    <label className="block space-y-1">
      <span className="font-label text-label-md text-on-surface-variant">{label}</span>
      {input}
      {errors[name] ? (
        <span className="block font-body text-body-sm text-error">{errors[name]}</span>
      ) : (
        hint && <span className="block font-body text-body-sm text-on-surface-variant">{hint}</span>
      )}
    </label>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-md">
      <div className="fixed inset-0 bg-black/50" onClick={handleCancel} />
      <form
        onSubmit={handleSubmit}
        noValidate
        className="relative z-10 w-full max-w-lg max-h-[90vh] overflow-y-auto bg-surface-container-lowest rounded-xl shadow-lift border border-outline-variant/30 p-xl space-y-md"
      >
        <div className="flex justify-between items-center">
          <h2 className="font-display text-headline-sm text-on-surface font-bold">{product ? "Edit product" : "Add a product"}</h2>
          <button
            type="button"
            onClick={handleCancel}
            aria-label="Close"
            className="w-8 h-8 rounded-full hover:bg-surface-container-high flex items-center justify-center text-on-surface-variant"
          >
            <X size={20} />
          </button>
        </div>

        {field("name", "Product name *", <input className={inputClass("name")} value={form.name} onChange={handleChange("name")} placeholder="e.g. Fresh Buffalo Milk" />)}

        <div className="grid grid-cols-2 gap-md">
          {field("unit", "Sold as *", <input className={inputClass("unit")} value={form.unit} onChange={handleChange("unit")} placeholder="e.g. 1 L" />)}
          {field(
            "categoryId",
            "Category *",
            <select className={inputClass("categoryId")} value={form.categoryId} onChange={handleChange("categoryId")}>
              <option value="">Choose…</option>
              {PRODUCT_CATEGORIES.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          )}
        </div>

        <div className="grid grid-cols-2 gap-md">
          {field("price", "Price (Rs.) *", <input type="number" min="0" step="0.5" className={inputClass("price")} value={form.price} onChange={handleChange("price")} />)}
          {field(
            "originalPrice",
            "Original price (Rs.)",
            <input type="number" min="0" step="0.5" className={inputClass("originalPrice")} value={form.originalPrice} onChange={handleChange("originalPrice")} />,
            "Fill in to show it as a deal"
          )}
        </div>

        {field(
          "stock",
          "Units in stock",
          <input type="number" min="0" step="1" className={inputClass("stock")} value={form.stock} onChange={handleChange("stock")} />,
          "Leave empty if you don't count stock for this item"
        )}

        <div className="space-y-1">
          <span className="font-label text-label-md text-on-surface-variant">Photo</span>
          <div className="flex items-center gap-md">
            <div className="w-20 h-20 rounded-md overflow-hidden bg-surface-container-high shrink-0 flex items-center justify-center text-on-surface-variant">
              {uploading ? (
                <Loader2 size={24} className="animate-spin text-primary" />
              ) : form.image ? (
                <img src={assetUrl(form.image)} alt="Product photo preview" className="w-full h-full object-cover" />
              ) : (
                <ImageOff size={24} />
              )}
            </div>
            <div className="space-y-xs min-w-0">
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhoto} />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="px-4 py-2 border border-primary text-primary font-label text-label-md rounded-full hover:bg-primary/10 transition-colors flex items-center gap-2 disabled:opacity-50"
              >
                <ImageUp size={16} />
                {uploading ? "Uploading…" : form.image ? "Change photo" : "Upload photo"}
              </button>
              <p className="font-body text-body-sm text-on-surface-variant">JPG, PNG or WebP. Large photos are shrunk automatically.</p>
            </div>
          </div>
          {field(
            "image",
            "…or paste a web link",
            <input
              className={inputClass("image")}
              value={form.image.startsWith("/api/") ? "" : form.image}
              onChange={handleChange("image")}
              placeholder={form.image.startsWith("/api/") ? "Using your uploaded photo" : "https://…"}
            />,
            "A stock grocery photo is used if you add neither"
          )}
        </div>

        {field(
          "description",
          "Description",
          <textarea rows={2} className={inputClass("description")} value={form.description} onChange={handleChange("description")} />
        )}

        {message && <p role="alert" className="font-body text-body-sm text-error">{message}</p>}

        <div className="flex flex-wrap gap-md pt-sm">
          <button
            type="submit"
            disabled={busy || uploading}
            className="flex-1 py-3 bg-primary text-on-primary font-label text-label-md rounded-full hover:bg-primary-container transition-colors disabled:opacity-50"
          >
            {busy ? "Saving…" : product ? "Save changes" : "Add product"}
          </button>
          {product && (
            <button
              type="button"
              onClick={handleDelete}
              disabled={busy}
              className="px-5 py-3 border border-outline-variant text-error font-label text-label-md rounded-full hover:bg-error/10 transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              <Trash2 size={16} />
              Remove
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
