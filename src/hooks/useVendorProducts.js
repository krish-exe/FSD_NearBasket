import { useCallback, useEffect, useState } from "react";
import { api } from "../api/client";
import { useCatalog } from "../context/CatalogContext";

/**
 * The signed-in vendor's own products, with add / edit / delete / stock changes.
 * Each change also refreshes the shop catalog so customers see it straight away.
 * Every action resolves to null on success, or an ApiError (with per-field errors).
 */
export function useVendorProducts() {
  const { refresh: refreshCatalog } = useCatalog();
  const [products, setProducts] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    api("/vendor/products")
      .then((data) => setProducts(data.products))
      .catch((e) => setError(e.message))
      .finally(() => setLoaded(true));
  }, []);

  const run = useCallback(
    async (request, update) => {
      try {
        update(await request());
        refreshCatalog();
        return null;
      } catch (e) {
        return e;
      }
    },
    [refreshCatalog]
  );

  const replace = ({ product }) => setProducts((prev) => prev.map((p) => (p.id === product.id ? product : p)));

  const addProduct = (form) =>
    run(
      () => api("/vendor/products", { method: "POST", body: form }),
      ({ product }) => setProducts((prev) => [...prev, product].sort((a, b) => a.name.localeCompare(b.name)))
    );

  const updateProduct = (id, form) => run(() => api(`/vendor/products/${id}`, { method: "PUT", body: form }), replace);

  const deleteProduct = (id) =>
    run(
      () => api(`/vendor/products/${id}`, { method: "DELETE" }),
      () => setProducts((prev) => prev.filter((p) => p.id !== id))
    );

  const adjustStock = (id, delta) =>
    run(() => api(`/vendor/products/${id}/stock`, { method: "PATCH", body: { delta } }), replace);

  return { products, loaded, error, addProduct, updateProduct, deleteProduct, adjustStock };
}
