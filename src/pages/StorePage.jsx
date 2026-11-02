import { useState, useMemo, useEffect } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { Star, Map, Plus, Minus, ShoppingBasket, Search, ArrowRight } from "lucide-react";
import { categories as globalCategories } from "../data/categories";
import { useCatalog } from "../context/CatalogContext";
import { useCart } from "../context/CartContext";
import { useAuth } from "../context/AuthContext";
import { useInventory, LOW_STOCK_THRESHOLD } from "../context/InventoryContext";
import NotFoundPage from "./NotFoundPage";
import { assetUrl } from "../api/client";

export default function StorePage() {
  const { stores, products } = useCatalog();
  const { storeId } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const categoryParam = searchParams.get("category") || "all";
  const highlightedProductId = searchParams.get("product");

  const store = stores.find((s) => s.id === storeId);

  const [activeCategory, setActiveCategory] = useState(categoryParam);
  const [searchTerm, setSearchTerm] = useState("");

  const {
    cartItems,
    deliveries,
    subtotal,
    deliveryFee,
    appliedOffer,
    discountAmount,
    total,
    addToCart,
    updateQuantity,
  } = useCart();

  const { isLoggedIn } = useAuth();
  const { stockFor } = useInventory();
  const navigate = useNavigate();

  useEffect(() => {
    if (categoryParam) {
      setActiveCategory(categoryParam);
    }
  }, [categoryParam]);

  // Everything this store sells, and the categories it actually stocks
  const allStoreProducts = useMemo(
    () => (store ? products.filter((p) => p.storeId === store.id) : []),
    [store, products]
  );
  const storeCategories = useMemo(
    () => globalCategories.filter((cat) => cat.id === "all" || allStoreProducts.some((p) => p.categoryId === cat.id)),
    [allStoreProducts]
  );

  const storeProductsList = useMemo(() => {
    return allStoreProducts.filter((p) => {
      const matchesCat =
        activeCategory === "all" ||
        p.categoryId === activeCategory ||
        p.category.toLowerCase().includes(activeCategory.toLowerCase());

      const matchesSearch =
        !searchTerm.trim() ||
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.category.toLowerCase().includes(searchTerm.toLowerCase());

      return matchesCat && matchesSearch;
    });
  }, [allStoreProducts, activeCategory, searchTerm]);

  const handleCategorySelect = (catId) => {
    setActiveCategory(catId);
    setSearchParams({ category: catId });
  };

  const getCartQuantity = (productId) => {
    const item = cartItems.find((i) => i.product.id === productId);
    return item ? item.qty : 0;
  };

  const handleProceedToCheckout = () => {
    if (!isLoggedIn) {
      navigate("/login", { state: { from: "/checkout" } });
    } else {
      navigate("/checkout");
    }
  };

  if (!store) return <NotFoundPage />;

  return (
    <main className="flex-grow w-full max-w-content mx-auto px-margin-mobile md:px-margin-desktop py-xl space-y-xl">
      {/* Store Hero Banner */}
      <section className="relative rounded-xl overflow-hidden h-[260px] md:h-[320px] shadow-card">
        <img src={assetUrl(store.banner || store.image)} alt={store.name} className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
        
        <div className="absolute bottom-0 left-0 p-lg md:p-xl flex items-center gap-md z-10">
          <div className="w-16 h-16 rounded-full bg-surface-container-lowest border-4 border-surface-container-lowest overflow-hidden shrink-0 flex items-center justify-center shadow-md">
            <ShoppingBasket className="text-primary" size={32} />
          </div>
          <div>
            <h1 className="font-display text-headline-md md:text-display-lg-mobile text-white font-bold">
              {store.name}
            </h1>
            <div className="flex flex-wrap items-center gap-2 text-white/90 font-body text-body-sm mt-1">
              <span className="flex items-center gap-1 font-semibold text-secondary-container">
                <Star size={14} className="fill-secondary-container text-secondary-container" />
                {store.rating ? `${store.rating} (${store.reviews} reviews)` : "New on NearBasket"}
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <Map size={14} />
                {store.distance}
              </span>
              <span>•</span>
              <span className="flex items-center gap-1 text-primary-fixed font-semibold">
                <span className="w-2 h-2 rounded-full bg-primary-fixed inline-block" />
                {store.delivery}
              </span>
            </div>
            {store.address && (
              <p className="text-white/80 text-body-sm mt-0.5 max-w-lg truncate">{store.address}</p>
            )}
          </div>
        </div>
      </section>

      {/* Main Grid: Categories | Products | Cart Sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-[220px_1fr_340px] gap-xl items-start">
        {/* Categories Sidebar */}
        <aside className="space-y-xs bg-surface-container-low p-md rounded-lg border border-outline-variant/30">
          <h2 className="font-display text-headline-sm text-on-surface mb-xs hidden lg:block font-bold">
            Categories
          </h2>
          <div className="flex lg:flex-col gap-sm overflow-x-auto lg:overflow-visible pb-2 lg:pb-0 scrollbar-none">
            {storeCategories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => handleCategorySelect(cat.id)}
                className={`px-md py-2.5 rounded-md text-left font-label text-label-md whitespace-nowrap transition-colors cursor-pointer ${
                  activeCategory === cat.id
                    ? "bg-primary text-on-primary font-bold shadow-xs"
                    : "text-on-surface-variant hover:bg-surface-container-high"
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>
        </aside>

        {/* Products Section */}
        <section className="space-y-md">
          {/* Search Bar inside store */}
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-on-surface-variant" size={18} />
            <input
              type="text"
              placeholder={`Search products in ${store.name}...`}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-surface-container-low border border-outline-variant rounded-full font-body text-body-md focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          {/* Products Grid */}
          {storeProductsList.length === 0 ? (
            <div className="bg-surface-container-lowest rounded-lg p-xl text-center border border-outline-variant/30 space-y-sm">
              <ShoppingBasket size={32} className="mx-auto text-on-surface-variant" />
              <h3 className="font-display text-headline-sm text-on-surface">No products found</h3>
              <p className="font-body text-body-sm text-on-surface-variant">
                Try searching for another item or choose a different category.
              </p>
              <button
                onClick={() => {
                  handleCategorySelect("all");
                  setSearchTerm("");
                }}
                className="px-4 py-2 bg-primary text-on-primary font-label text-label-sm rounded-full"
              >
                Show All Items
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-lg">
              {storeProductsList.map((product) => {
                const qtyInCart = getCartQuantity(product.id);
                const isHighlighted = highlightedProductId === product.id;
                const stockLeft = stockFor(product.id);
                const isSoldOut = stockLeft === 0;
                const atStockLimit = stockLeft !== null && qtyInCart >= stockLeft;

                return (
                  <div
                    key={product.id}
                    className={`bg-surface-container-lowest rounded-lg overflow-hidden shadow-card card-hover-lift border transition-all ${
                      isHighlighted ? "ring-2 ring-primary border-primary" : "border-outline-variant/20"
                    }`}
                  >
                    <div className="relative h-44 w-full bg-surface-container-low">
                      <img src={assetUrl(product.image)} alt={product.name} className="w-full h-full object-cover" />
                      {product.isDeal && (
                        <span className="absolute top-2 left-2 bg-secondary text-on-secondary text-xs font-bold px-2 py-0.5 rounded-full">
                          {product.dealTag || "DEAL"}
                        </span>
                      )}
                    </div>

                    <div className="p-md space-y-sm">
                      <div>
                        <h3 className="font-display text-headline-sm text-on-surface font-bold line-clamp-1">
                          {product.name}
                        </h3>
                        <p className="font-body text-body-sm text-on-surface-variant">
                          {product.unit}
                          {stockLeft > 0 && stockLeft <= LOW_STOCK_THRESHOLD && (
                            <span className="text-secondary font-semibold"> · Only {stockLeft} left</span>
                          )}
                        </p>
                      </div>

                      <div className="flex items-center justify-between pt-xs">
                        <div>
                          <span className="font-display text-headline-sm text-primary font-bold">
                            Rs. {product.price.toFixed(2)}
                          </span>
                          {product.originalPrice > product.price && (
                            <span className="font-body text-body-sm text-on-surface-variant line-through ml-2">
                              Rs. {product.originalPrice}
                            </span>
                          )}
                        </div>

                        {qtyInCart > 0 ? (
                          <div className="flex items-center gap-2 bg-primary-container/20 rounded-full px-2 py-1 border border-primary/40">
                            <button
                              onClick={() => updateQuantity(product.id, qtyInCart - 1)}
                              className="w-7 h-7 rounded-full bg-primary text-on-primary flex items-center justify-center hover:opacity-90 transition-opacity cursor-pointer"
                            >
                              <Minus size={14} />
                            </button>
                            <span className="font-label text-label-md font-bold text-primary w-6 text-center">
                              {qtyInCart}
                            </span>
                            <button
                              onClick={() => addToCart(product, 1)}
                              disabled={atStockLimit}
                              title={atStockLimit ? "No more in stock" : undefined}
                              className="w-7 h-7 rounded-full bg-primary text-on-primary flex items-center justify-center hover:opacity-90 transition-opacity cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                              <Plus size={14} />
                            </button>
                          </div>
                        ) : isSoldOut ? (
                          <span className="px-4 py-2 rounded-full bg-surface-container-high text-on-surface-variant font-label text-label-md">
                            Out of stock
                          </span>
                        ) : (
                          <button
                            onClick={() => addToCart(product, 1)}
                            className="px-4 py-2 rounded-full bg-primary-container text-on-primary font-label text-label-md hover:bg-primary transition-colors flex items-center gap-1 active:scale-95 shadow-sm cursor-pointer"
                          >
                            <Plus size={16} />
                            <span>Add</span>
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

        {/* Live Cart Sidebar */}
        <aside className="bg-surface-container-low rounded-lg p-lg border border-outline-variant/30 shadow-card sticky top-24 space-y-md">
          <div className="flex justify-between items-center pb-xs border-b border-outline-variant/30">
            <h2 className="font-display text-headline-sm text-on-surface flex items-center gap-2 font-bold">
              <ShoppingBasket size={20} className="text-primary" />
              Your Cart
            </h2>
            {cartItems.length > 0 && (
              <span className="bg-primary text-on-primary text-xs font-bold px-2 py-0.5 rounded-full">
                {cartItems.reduce((acc, i) => acc + i.qty, 0)} items
              </span>
            )}
          </div>

          {cartItems.length === 0 ? (
            <p className="font-body text-body-sm text-on-surface-variant py-lg text-center">
              Your cart is empty. Click + Add on any item to build your grocery basket.
            </p>
          ) : (
            <div className="divide-y divide-outline-variant/20 max-h-72 overflow-y-auto pr-1 space-y-xs">
              {cartItems.map(({ product, qty }) => (
                <div key={product.id} className="py-xs flex justify-between items-center">
                  <div className="min-w-0 flex-grow pr-2">
                    <p className="font-body text-body-sm font-semibold text-on-surface truncate">{product.name}</p>
                    <p className="font-body text-body-sm text-on-surface-variant">
                      Rs. {product.price} × {qty}
                    </p>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={() => updateQuantity(product.id, qty - 1)}
                      className="w-6 h-6 rounded-full bg-surface-container-high flex items-center justify-center text-on-surface text-xs hover:bg-surface-container-highest cursor-pointer"
                    >
                      -
                    </button>
                    <span className="font-label text-label-sm font-bold text-on-surface w-4 text-center">{qty}</span>
                    <button
                      onClick={() => updateQuantity(product.id, qty + 1)}
                      className="w-6 h-6 rounded-full bg-surface-container-high flex items-center justify-center text-on-surface text-xs hover:bg-surface-container-highest cursor-pointer"
                    >
                      +
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {cartItems.length > 0 && (
            <div className="border-t border-outline-variant/30 pt-md space-y-2 font-body text-body-sm">
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
                <span>Delivery Charges{deliveries.length > 1 && ` (${deliveries.length} stores)`}</span>
                <span>{deliveryFee === 0 ? <span className="text-primary font-bold">FREE</span> : `Rs. ${deliveryFee.toFixed(2)}`}</span>
              </div>
              <div className="flex justify-between font-display text-headline-sm text-on-surface pt-2 border-t border-outline-variant/30 font-bold">
                <span>Total Amount</span>
                <span className="text-primary">Rs. {total.toFixed(2)}</span>
              </div>
            </div>
          )}

          {!isLoggedIn && cartItems.length > 0 && (
            <p className="font-body text-body-sm text-on-surface-variant text-center">
              Log in to complete your order.
            </p>
          )}

          <button
            onClick={handleProceedToCheckout}
            disabled={cartItems.length === 0}
            className="w-full py-3 bg-primary text-on-primary font-label text-label-md rounded-full hover:bg-primary-container transition-colors shadow-sm disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer font-bold"
          >
            <span>Proceed to Checkout</span>
            <ArrowRight size={16} />
          </button>
        </aside>
      </div>
    </main>
  );
}
