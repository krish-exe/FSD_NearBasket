import { useState, useMemo, useEffect, useCallback } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Sparkles, Plus, Check, Search, Tag, Filter, Store } from "lucide-react";
import { categories } from "../data/categories";
import { useCatalog } from "../context/CatalogContext";
import { useCart } from "../context/CartContext";
import { useInventory } from "../context/InventoryContext";
import StoreCard from "../components/StoreCard";

const isDeal = (p) => p.isDeal || p.originalPrice > p.price;

const matchesText = (product, term, storeName) => {
  const q = term.trim().toLowerCase();
  if (!q) return true;
  return (
    product.name.toLowerCase().includes(q) ||
    product.category.toLowerCase().includes(q) ||
    storeName(product.storeId).toLowerCase().includes(q)
  );
};

export default function DealsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const urlSearch = searchParams.get("search") || "";
  const urlCategory = searchParams.get("category") || "all";
  // Arriving with a search, a category or ?view=all means "find this", not "show discounts"
  const wantsAll = Boolean(urlSearch) || urlCategory !== "all" || searchParams.get("view") === "all";

  const [selectedCategory, setSelectedCategory] = useState(urlCategory);
  const [searchTerm, setSearchTerm] = useState(urlSearch);
  const [dealsOnly, setDealsOnly] = useState(!wantsAll);
  const [addedItemIds, setAddedItemIds] = useState(new Set());

  const { addToCart } = useCart();
  const { stockFor } = useInventory();
  const { products: allProducts, stores } = useCatalog();
  const storeName = useCallback((id) => stores.find((s) => s.id === id)?.name || "", [stores]);

  // Follow new searches made from the header while already on this page
  useEffect(() => {
    setSearchTerm(urlSearch);
    setSelectedCategory(urlCategory);
    if (wantsAll) setDealsOnly(false);
  }, [urlSearch, urlCategory, wantsAll]);

  const updateParams = (next) => {
    const params = new URLSearchParams(searchParams);
    Object.entries(next).forEach(([key, value]) => {
      if (value && value !== "all") params.set(key, value);
      else params.delete(key);
    });
    setSearchParams(params, { replace: true });
  };

  const handleCategoryChange = (catId) => {
    setSelectedCategory(catId);
    updateParams({ category: catId });
  };

  const dealProducts = useMemo(() => {
    return allProducts.filter((p) => {
      if (dealsOnly && !isDeal(p)) return false;
      const matchesCat = selectedCategory === "all" || p.categoryId === selectedCategory;
      return matchesCat && matchesText(p, searchTerm, storeName);
    });
  }, [selectedCategory, searchTerm, dealsOnly, allProducts, storeName]);

  const matchingStores = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return [];
    return stores.filter((s) => s.name.toLowerCase().includes(q));
  }, [searchTerm, stores]);

  const handleAddToCart = (product) => {
    addToCart(product, 1);
    setAddedItemIds((prev) => new Set(prev).add(product.id));
    setTimeout(() => {
      setAddedItemIds((prev) => {
        const next = new Set(prev);
        next.delete(product.id);
        return next;
      });
    }, 1500);
  };

  return (
    <main className="flex-grow w-full max-w-content mx-auto px-margin-mobile md:px-margin-desktop py-xl space-y-xl">
      {/* Deals Header Banner */}
      <section className="relative rounded-lg overflow-hidden bg-gradient-to-r from-secondary-container via-primary-container to-tertiary-container p-xl md:p-2xl text-on-secondary-container shadow-card">
        <div className="relative z-10 max-w-2xl space-y-md">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-white font-label text-label-sm font-bold uppercase tracking-wider">
            <Sparkles size={16} />
            Hot Daily Deals & Discounts
          </div>
          <h1 className="font-display text-display-lg-mobile md:text-display-lg text-white font-bold">
            {dealsOnly ? "Neighborhood Super Deals" : "Browse Products"}
          </h1>
          <p className="font-body text-body-lg text-white/90">
            Save big on fresh produce, dairy, bakery, and everyday pantry staples directly from local vendors.
          </p>
        </div>
      </section>

      {/* Filter & Search Bar */}
      <section className="flex flex-col md:flex-row gap-md justify-between items-stretch md:items-center bg-surface-container-low p-md rounded-lg border border-outline-variant/30">
        {/* Category Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 md:pb-0 scrollbar-none">
          <span className="font-label text-label-md font-bold text-on-surface flex items-center gap-1 shrink-0 mr-1">
            <Filter size={16} /> Filter:
          </span>
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => handleCategoryChange(cat.id)}
              className={`px-4 py-2 rounded-full font-label text-label-md whitespace-nowrap transition-colors cursor-pointer ${
                selectedCategory === cat.id
                  ? "bg-primary text-on-primary font-bold shadow-sm"
                  : "bg-surface-container-lowest text-on-surface-variant hover:bg-surface-container-high border border-outline-variant/30"
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>

        {/* Deals-only toggle + Search Input */}
        <div className="flex items-center gap-md">
          <label className="flex items-center gap-2 font-label text-label-md text-on-surface whitespace-nowrap cursor-pointer select-none">
            <input
              type="checkbox"
              checked={dealsOnly}
              onChange={(e) => setDealsOnly(e.target.checked)}
              className="accent-primary w-4 h-4"
            />
            Deals only
          </label>
        <div className="relative min-w-[200px] flex-grow">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-on-surface-variant" size={18} />
          <input
            type="text"
            placeholder="Search deals..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onBlur={() => updateParams({ search: searchTerm.trim() })}
            className="w-full pl-10 pr-4 py-2 bg-surface-container-lowest border border-outline-variant rounded-full font-body text-body-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
        </div>
      </section>

      {/* Stores whose name matches the search */}
      {matchingStores.length > 0 && (
        <section className="space-y-md">
          <h2 className="font-display text-headline-sm text-on-surface flex items-center gap-2">
            <Store size={20} className="text-primary" />
            Stores matching "{searchTerm.trim()}"
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-lg">
            {matchingStores.map((store) => (
              <StoreCard key={store.id} store={store} />
            ))}
          </div>
        </section>
      )}

      {/* Deals Products Grid */}
      <section>
        {dealProducts.length === 0 ? (
          <div className="bg-surface-container-lowest rounded-lg p-2xl text-center border border-outline-variant/30 space-y-md">
            <div className="w-16 h-16 rounded-full bg-surface-container flex items-center justify-center mx-auto text-on-surface-variant">
              <Tag size={32} />
            </div>
            <h3 className="font-display text-headline-sm text-on-surface">
              {dealsOnly ? "No deals match your criteria" : "No products match your search"}
            </h3>
            <p className="font-body text-body-md text-on-surface-variant max-w-md mx-auto">
              Try changing your category filter or search term to discover available deals.
            </p>
            <button
              onClick={() => {
                setSelectedCategory("all");
                setSearchTerm("");
                setSearchParams({}, { replace: true });
              }}
              className="px-6 py-2.5 bg-primary text-on-primary font-label text-label-md rounded-full hover:bg-primary-container transition-colors"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-lg">
            {dealProducts.map((product) => {
              const discountPct = product.originalPrice
                ? Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)
                : 0;

              const isAdded = addedItemIds.has(product.id);

              return (
                <div
                  key={product.id}
                  className="bg-surface-container-lowest rounded-lg overflow-hidden shadow-card card-hover-lift border border-outline-variant/20 flex flex-col justify-between"
                >
                  <div className="relative h-48 w-full bg-surface-container-low">
                    <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
                    
                    {/* Deal Badge */}
                    {isDeal(product) && (
                      <div className="absolute top-3 left-3 bg-secondary text-on-secondary font-label text-label-sm font-bold px-3 py-1 rounded-full shadow-sm flex items-center gap-1">
                        <Tag size={12} />
                        {product.dealTag || `${discountPct}% OFF`}
                      </div>
                    )}

                    <div className="absolute top-3 right-3 bg-surface/90 backdrop-blur-md text-on-surface font-label text-label-sm font-bold px-2.5 py-1 rounded-full border border-outline-variant/30">
                      ★ {product.rating}
                    </div>
                  </div>

                  <div className="p-md flex-grow flex flex-col justify-between space-y-md">
                    <div>
                      <span className="font-label text-label-sm text-on-surface-variant uppercase tracking-wider">
                        {product.category}
                      </span>
                      <h3 className="font-display text-headline-sm text-on-surface line-clamp-1 mt-0.5">
                        {product.name}
                      </h3>
                      <p className="font-body text-body-sm text-on-surface-variant line-clamp-2 mt-1">
                        {product.description}
                      </p>
                    </div>

                    <div className="flex items-center justify-between pt-sm border-t border-outline-variant/20">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-display text-headline-sm text-primary font-bold">
                            Rs. {product.price}
                          </span>
                          {product.originalPrice > product.price && (
                            <span className="font-body text-body-sm text-on-surface-variant line-through">
                              Rs. {product.originalPrice}
                            </span>
                          )}
                        </div>
                        <span className="text-[12px] text-on-surface-variant">
                          {product.unit} •{" "}
                          <Link to={`/store/${product.storeId}?product=${product.id}`} className="hover:text-primary hover:underline">
                            {storeName(product.storeId)}
                          </Link>
                        </span>
                      </div>

                      {stockFor(product.id) === 0 ? (
                        <span className="px-4 py-2.5 rounded-full bg-surface-container-high text-on-surface-variant font-label text-label-md">
                          Out of stock
                        </span>
                      ) : (
                        <button
                          onClick={() => handleAddToCart(product)}
                          className={`px-4 py-2.5 rounded-full font-label text-label-md flex items-center gap-1.5 transition-all shadow-sm cursor-pointer active:scale-95 ${
                            isAdded
                              ? "bg-primary text-on-primary"
                              : "bg-primary-container text-on-primary hover:bg-primary"
                          }`}
                        >
                          {isAdded ? (
                            <>
                              <Check size={16} />
                              Added
                            </>
                          ) : (
                            <>
                              <Plus size={16} />
                              Add to Cart
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}
