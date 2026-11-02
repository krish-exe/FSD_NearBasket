// Pricing rules shared by the browser (cart preview) and the server (the amounts actually charged).

export const DELIVERY_FEE = 25;
export const FREE_DELIVERY_FROM = 500;

// Subtotal of the items an offer applies to (whole cart unless the offer is category-specific)
export function eligibleSubtotal(offer, cartItems) {
  return cartItems.reduce((sum, item) => {
    const eligible = !offer.categoryIds?.length || offer.categoryIds.includes(item.product.categoryId);
    return eligible ? sum + item.product.price * item.qty : sum;
  }, 0);
}

export function computeDiscount(offer, cartItems, subtotal) {
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

// Why an offer can't be applied to this cart, or null when it can
export function offerProblem(offer, cartItems, subtotal) {
  if (subtotal < offer.minOrder) {
    return `Minimum order amount for ${offer.code} is Rs. ${offer.minOrder}. Add items worth Rs. ${(
      offer.minOrder - subtotal
    ).toFixed(0)} more!`;
  }
  if (offer.categoryIds?.length && eligibleSubtotal(offer, cartItems) <= 0) {
    return `${offer.code} only applies to selected categories. Add an eligible item to use it.`;
  }
  return null;
}

/**
 * Groups cart items by store. Every store delivers separately with its own fee,
 * and all deliveries are free once the whole cart reaches Rs. 500. A cart-wide
 * coupon discount is shared between stores in proportion to the eligible items
 * each one supplies.
 */
export function splitIntoDeliveries(cartItems, offer, discountAmount, storeName) {
  const groups = [];
  cartItems.forEach((item) => {
    const storeId = item.product.storeId || null;
    let group = groups.find((g) => g.storeId === storeId);
    if (!group) {
      group = { storeId, storeName: storeName(storeId) || "NearBasket Store", items: [] };
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
