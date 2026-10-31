import { createContext, useContext, useState, useEffect, useMemo } from "react";
import { offers, stores } from "../data/mockData";
import { useInventory } from "./InventoryContext";

const CartContext = createContext(null);

// Subtotal of the items an offer applies to (whole cart unless the offer is category-specific)
function eligibleSubtotal(offer, cartItems) {
  return cartItems.reduce((sum, item) => {
    const eligible = !offer.categoryIds || offer.categoryIds.includes(item.product.categoryId);
    return eligible ? sum + item.product.price * item.qty : sum;
  }, 0);
}

function computeDiscount(offer, cartItems, subtotal) {
  if (!offer || subtotal <= 0 || subtotal < offer.minOrder) return 0;
  const base = eligibleSubtotal(offer, cartItems);
  if (base <= 0) return 0;

  if (offer.discountType === "flat") {
    return Math.min(offer.discountValue, base);
  }
  if (offer.discountType === "pct") {
    let disc = (base * offer.discountValue) / 100;
    if (offer.maxDiscount) disc = Math.min(disc, offer.maxDiscount);
    return Math.min(disc, base);
  }
  return 0;
}

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

export const DELIVERY_FEE = 25;
export const FREE_DELIVERY_FROM = 500;

/**
 * Groups cart items by store. Every store delivers separately with its own fee,
 * and all deliveries are free once the whole cart reaches Rs. 500. A cart-wide
 * coupon discount is shared between stores in proportion to the eligible items
 * each one supplies.
 */
function splitIntoDeliveries(cartItems, offer, discountAmount) {
  const groups = [];
  cartItems.forEach((item) => {
    const storeId = item.product.storeId || null;
    let group = groups.find((g) => g.storeId === storeId);
    if (!group) {
      group = { storeId, storeName: stores.find((s) => s.id === storeId)?.name || "NearBasket Store", items: [] };
      groups.push(group);
    }
    group.items.push(item);
  });

  const cartSubtotal = cartItems.reduce((sum, item) => sum + item.product.price * item.qty, 0);
  const deliveryFee = cartSubtotal >= FREE_DELIVERY_FROM ? 0 : DELIVERY_FEE;
  const eligibleTotal = offer ? eligibleSubtotal(offer, cartItems) : 0;
  let discountLeft = discountAmount;

  return groups.map((group, index) => {
    const subtotal = group.items.reduce((sum, item) => sum + item.product.price * item.qty, 0);
    let discount = 0;
    if (discountAmount > 0 && eligibleTotal > 0) {
      // The last store takes the rounding remainder so the shares add up exactly
      discount =
        index === groups.length - 1
          ? Math.round(discountLeft * 100) / 100
          : Math.round(((discountAmount * eligibleSubtotal(offer, group.items)) / eligibleTotal) * 100) / 100;
      discountLeft -= discount;
    }
    return { ...group, subtotal, deliveryFee, discount, total: Math.max(0, subtotal + deliveryFee - discount) };
  });
}

const CART_STORAGE_KEY = "nearbasket_cart_v1";
const OFFER_STORAGE_KEY = "nearbasket_offer_v1";

export function CartProvider({ children }) {
  const { stockFor } = useInventory();

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

  // Calculations
  const itemCount = useMemo(() => {
    return cartItems.reduce((total, item) => total + item.qty, 0);
  }, [cartItems]);

  const subtotal = useMemo(() => {
    return cartItems.reduce((sum, item) => sum + item.product.price * item.qty, 0);
  }, [cartItems]);

  const appliedOffer = useMemo(() => {
    if (!appliedOfferCode) return null;
    return offers.find((o) => o.code.toUpperCase() === appliedOfferCode.toUpperCase()) || null;
  }, [appliedOfferCode]);

  const discountAmount = useMemo(
    () => computeDiscount(appliedOffer, cartItems, subtotal),
    [appliedOffer, cartItems, subtotal]
  );

  // Each store delivers its own items, so the cart splits into one delivery per store
  const deliveries = useMemo(
    () => splitIntoDeliveries(cartItems, appliedOffer, discountAmount),
    [cartItems, appliedOffer, discountAmount]
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
    if (subtotal < foundOffer.minOrder) {
      return {
        success: false,
        message: `Minimum order amount for ${foundOffer.code} is Rs. ${foundOffer.minOrder}. Add items worth Rs. ${(
          foundOffer.minOrder - subtotal
        ).toFixed(0)} more!`,
      };
    }
    if (foundOffer.categoryIds && eligibleSubtotal(foundOffer, cartItems) <= 0) {
      return {
        success: false,
        message: `${foundOffer.code} only applies to selected categories. Add an eligible item to use it.`,
      };
    }
    setAppliedOfferCode(foundOffer.code);
    return { success: true, message: `Offer '${foundOffer.code}' applied successfully!` };
  };

  const removeOffer = () => {
    setAppliedOfferCode("");
  };

  return (
    <CartContext.Provider
      value={{
        cartItems,
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
