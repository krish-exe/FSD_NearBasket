import { createContext, useContext, useState, useEffect, useMemo } from "react";
import { useInventory } from "./InventoryContext";
import { useCatalog } from "./CatalogContext";
import { computeDiscount, offerProblem, splitIntoDeliveries } from "../../shared/pricing.js";

export { DELIVERY_FEE, FREE_DELIVERY_FROM } from "../../shared/pricing.js";

const CartContext = createContext(null);

// Adds items to the cart, never past what is in stock (stockFor returns null for untracked products)
function mergeItems(prevItems, newItems, stockFor) {
  const capped = (productId, qty) => {
    const left = stockFor(productId);
    return left === null ? qty : Math.min(qty, left);
  };
  const updated = [...prevItems];
  newItems.forEach(({ product, qty }) => {
    const existingIndex = updated.findIndex((item) => item.product.id === product.id);
    if (existingIndex > -1) {
      updated[existingIndex] = {
        ...updated[existingIndex],
        qty: capped(product.id, updated[existingIndex].qty + qty),
        // Always use latest product price data
        product,
      };
    } else {
      const startQty = capped(product.id, Math.max(1, qty));
      if (startQty > 0) updated.push({ product, qty: startQty });
    }
  });
  return updated;
}

const CART_STORAGE_KEY = "nearbasket_cart_v1";
const OFFER_STORAGE_KEY = "nearbasket_offer_v1";

export function CartProvider({ children }) {
  const { stockFor } = useInventory();
  const { products, offers, stores } = useCatalog();

  const [cartItems, setCartItems] = useState(() => {
    try {
      const stored = localStorage.getItem(CART_STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (e) {
      console.error("Failed to load cart from localStorage", e);
      return [];
    }
  });

  const [appliedOfferCode, setAppliedOfferCode] = useState(() => {
    try {
      return localStorage.getItem(OFFER_STORAGE_KEY) || "";
    } catch {
      return "";
    }
  });

  const [isCartOpen, setIsCartOpen] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cartItems));
    } catch (e) {
      console.error("Failed to persist cart", e);
    }
  }, [cartItems]);

  useEffect(() => {
    try {
      if (appliedOfferCode) {
        localStorage.setItem(OFFER_STORAGE_KEY, appliedOfferCode);
      } else {
        localStorage.removeItem(OFFER_STORAGE_KEY);
      }
    } catch (e) {
      console.error("Failed to persist offer", e);
    }
  }, [appliedOfferCode]);

  const addItems = (items) => {
    setCartItems((prevItems) => mergeItems(prevItems, items, stockFor));
  };

  const addToCart = (product, quantity = 1) => addItems([{ product, qty: quantity }]);

  const updateQuantity = (productId, newQuantity) => {
    if (newQuantity <= 0) {
      removeFromCart(productId);
      return;
    }
    const left = stockFor(productId);
    const qty = left === null ? newQuantity : Math.min(newQuantity, left);
    setCartItems((prevItems) =>
      prevItems.map((item) =>
        item.product.id === productId ? { ...item, qty } : item
      )
    );
  };

  const removeFromCart = (productId) => {
    setCartItems((prevItems) => prevItems.filter((item) => item.product.id !== productId));
  };

  const clearCart = () => {
    setCartItems([]);
    setAppliedOfferCode("");
  };

  const openCart = () => setIsCartOpen(true);
  const closeCart = () => setIsCartOpen(false);

  // The saved cart keeps a copy of each product; prices and details come from the live catalog
  const liveItems = useMemo(
    () => cartItems.map((item) => ({ ...item, product: products.find((p) => p.id === item.product.id) || item.product })),
    [cartItems, products]
  );

  // Calculations
  const itemCount = useMemo(() => {
    return cartItems.reduce((total, item) => total + item.qty, 0);
  }, [cartItems]);

  const subtotal = useMemo(() => {
    return liveItems.reduce((sum, item) => sum + item.product.price * item.qty, 0);
  }, [liveItems]);

  const appliedOffer = useMemo(() => {
    if (!appliedOfferCode) return null;
    return offers.find((o) => o.code.toUpperCase() === appliedOfferCode.toUpperCase()) || null;
  }, [appliedOfferCode, offers]);

  const discountAmount = useMemo(
    () => computeDiscount(appliedOffer, liveItems, subtotal),
    [appliedOffer, liveItems, subtotal]
  );

  // Each store delivers its own items, so the cart splits into one delivery per store
  const deliveries = useMemo(
    () =>
      splitIntoDeliveries(liveItems, appliedOffer, discountAmount, (storeId) => stores.find((s) => s.id === storeId)?.name),
    [liveItems, appliedOffer, discountAmount, stores]
  );

  const deliveryFee = useMemo(() => deliveries.reduce((sum, d) => sum + d.deliveryFee, 0), [deliveries]);

  // How much more the shopper must add before the applied code takes effect
  const offerShortfall = useMemo(() => {
    if (!appliedOffer) return 0;
    return Math.max(0, appliedOffer.minOrder - subtotal);
  }, [appliedOffer, subtotal]);

  const total = useMemo(() => {
    return Math.max(0, subtotal + deliveryFee - discountAmount);
  }, [subtotal, deliveryFee, discountAmount]);

  const applyOffer = (code) => {
    const cleanCode = code.trim().toUpperCase();
    const foundOffer = offers.find((o) => o.code.toUpperCase() === cleanCode);
    if (!foundOffer) {
      return { success: false, message: "Invalid offer code. Please check and try again." };
    }
    const problem = offerProblem(foundOffer, liveItems, subtotal);
    if (problem) return { success: false, message: problem };
    setAppliedOfferCode(foundOffer.code);
    return { success: true, message: `Offer '${foundOffer.code}' applied successfully!` };
  };

  const removeOffer = () => {
    setAppliedOfferCode("");
  };

  return (
    <CartContext.Provider
      value={{
        cartItems: liveItems,
        itemCount,
        subtotal,
        deliveryFee,
        appliedOffer,
        discountAmount,
        offerShortfall,
        total,
        isCartOpen,
        openCart,
        closeCart,
        addToCart,
        addItems,
        deliveries,
        updateQuantity,
        removeFromCart,
        clearCart,
        applyOffer,
        removeOffer,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used inside a CartProvider");
  return ctx;
}
