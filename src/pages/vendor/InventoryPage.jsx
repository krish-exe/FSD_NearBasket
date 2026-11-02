import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Search, Minus, Plus, AlertTriangle, PackagePlus, Loader2 } from "lucide-react";
import StatusBadge from "../../components/StatusBadge";
import ProductFormModal from "../../components/ProductFormModal";
import { categories } from "../../data/categories";
import { LOW_STOCK_THRESHOLD } from "../../context/InventoryContext";
import { useVendorProducts } from "../../hooks/useVendorProducts";
import { assetUrl } from "../../api/client";

const stockStatus = (stock) => {
  if (stock === null) return "Active";
  if (stock === 0) return "Out of Stock";
  if (stock <= LOW_STOCK_THRESHOLD) return "Low Stock";
  return "Active";
};

export default function InventoryPage() {
  const { products: storeProducts, loaded, error, addProduct, updateProduct, deleteProduct, adjustStock: saveStock } =
    useVendorProducts();
  const [stockError, setStockError] = useState("");
  // null = closed, "new" = adding, or the product being edited
  const [editing, setEditing] = useState(null);
  const [searchParams, setSearchParams] = useSearchParams();

  // The sidebar's "Add New Product" button links here with ?add=1
  useEffect(() => {
    if (searchParams.get("add")) {
      setEditing("new");
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const storeCategories = categories.filter(
    (cat) => cat.id === "all" || storeProducts.some((p) => p.categoryId === cat.id)
  );

  const adjustStock = async (productId, delta) => {
    setStockError((await saveStock(productId, delta))?.message || "");
  };
  const [query, setQuery] = useState("");
  const [categoryId, setCategoryId] = useState("all");

  const q = query.trim().toLowerCase();
  const visibleItems = storeProducts.filter(
    (p) =>
      (categoryId === "all" || p.categoryId === categoryId) &&
      (!q || [p.name, p.unit, p.id, p.category].some((field) => field.toLowerCase().includes(q)))
  );

  return (
    <div className="space-y-lg">
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-lg">
        <div>
          <h1 className="font-display text-headline-md text-on-surface mb-xs">Inventory</h1>
          <p className="font-body text-body-md text-on-surface-variant">Manage your products, stock levels, and pricing.</p>
        </div>
        <div className="flex flex-wrap items-center gap-sm">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant" size={18} />
            <input
              className="pl-10 pr-4 py-2.5 bg-surface-container-lowest border border-outline-variant rounded-md font-body text-body-sm focus:outline-none focus:ring-2 focus:ring-primary w-64"
              placeholder="Search products, SKUs..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <select
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            aria-label="Filter by category"
            className="px-4 py-2.5 bg-surface-container-lowest border border-outline-variant rounded-md font-label text-label-md text-on-surface focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer"
          >
            {storeCategories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.id === "all" ? "All Categories" : cat.name}
              </option>
            ))}
          </select>
          <button
            onClick={() => setEditing("new")}
            className="flex items-center gap-2 px-4 py-2.5 bg-primary text-on-primary rounded-full font-label text-label-md hover:bg-primary-container transition-colors"
          >
            <PackagePlus size={16} />
            Add Product
          </button>
        </div>
      </div>

      {(stockError || error) && (
        <p role="alert" className="font-body text-body-sm text-error bg-error/10 rounded-md px-md py-sm">
          {stockError || error}
        </p>
      )}

      <div className="bg-surface-container-low rounded-md shadow-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left border-b border-outline-variant/20">
                <th className="font-label text-label-sm text-on-surface-variant px-lg py-3">Image</th>
                <th className="font-label text-label-sm text-on-surface-variant px-lg py-3">Product Name</th>
                <th className="font-label text-label-sm text-on-surface-variant px-lg py-3">SKU</th>
                <th className="font-label text-label-sm text-on-surface-variant px-lg py-3">Category</th>
                <th className="font-label text-label-sm text-on-surface-variant px-lg py-3">Price</th>
                <th className="font-label text-label-sm text-on-surface-variant px-lg py-3">Stock Level</th>
                <th className="font-label text-label-sm text-on-surface-variant px-lg py-3">Status</th>
                <th className="font-label text-label-sm text-on-surface-variant px-lg py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {visibleItems.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-lg py-xl text-center font-body text-body-md text-on-surface-variant">
                    {!loaded ? (
                      <Loader2 size={24} className="animate-spin text-primary mx-auto" />
                    ) : storeProducts.length === 0 ? (
                      "Your shop has no products yet. Use Add Product to list your first item."
                    ) : (
                      "No products match your filters."
                    )}
                  </td>
                </tr>
              )}
              {visibleItems.map((item) => {
                const stock = item.stock ?? null;
                const warning = stock !== null && stock <= LOW_STOCK_THRESHOLD;
                return (
                  <tr key={item.id} className={`border-b border-outline-variant/10 last:border-0 ${warning ? "bg-secondary-container/5" : ""}`}>
                    <td className="px-lg py-md">
                      <div className="w-12 h-12 rounded-md overflow-hidden bg-surface-container-high">
                        <img src={assetUrl(item.image)} alt={item.name} className="w-full h-full object-cover" />
                      </div>
                    </td>
                    <td className="px-lg py-md">
                      <div className="flex items-center gap-1.5">
                        <p className="font-body text-body-md font-semibold text-on-surface">{item.name}</p>
                        {warning && <AlertTriangle size={14} className="text-error" />}
                      </div>
                      <p className="font-body text-body-sm text-on-surface-variant">{item.unit}</p>
                    </td>
                    <td className="px-lg py-md font-body text-body-sm text-on-surface-variant">{item.id}</td>
                    <td className="px-lg py-md font-body text-body-md text-on-surface">{item.category}</td>
                    <td className="px-lg py-md font-label text-label-md text-primary font-semibold">Rs. {item.price}</td>
                    <td className="px-lg py-md">
                      {stock === null ? (
                        <span className="font-body text-body-sm text-on-surface-variant">Not tracked</span>
                      ) : (
                        <div className={`flex items-center gap-2 border rounded-md px-2 py-1 w-fit ${warning ? "border-error/40" : "border-outline-variant"}`}>
                          <button
                            onClick={() => adjustStock(item.id, -1)}
                            disabled={stock === 0}
                            aria-label={`Decrease stock of ${item.name}`}
                            className="text-on-surface-variant hover:text-primary disabled:opacity-40 disabled:cursor-not-allowed"
                          >
                            <Minus size={14} />
                          </button>
                          <span className={`font-label text-label-md w-6 text-center ${warning ? "text-error" : "text-on-surface"}`}>
                            {stock}
                          </span>
                          <button
                            onClick={() => adjustStock(item.id, 1)}
                            aria-label={`Increase stock of ${item.name}`}
                            className="text-on-surface-variant hover:text-primary"
                          >
                            <Plus size={14} />
                          </button>
                        </div>
                      )}
                    </td>
                    <td className="px-lg py-md">
                      <StatusBadge status={stockStatus(stock)} />
                    </td>
                    <td className="px-lg py-md">
                      <button onClick={() => setEditing(item)} className="font-label text-label-md text-primary hover:underline">
                        Edit
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between px-lg py-md border-t border-outline-variant/20">
          <p className="font-body text-body-sm text-on-surface-variant">
            Showing {visibleItems.length} of {storeProducts.length} products
          </p>
        </div>
      </div>

      {editing && (
        <ProductFormModal
          product={editing === "new" ? null : editing}
          onSave={(form) => (editing === "new" ? addProduct(form) : updateProduct(editing.id, form))}
          onDelete={() => deleteProduct(editing.id)}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}
