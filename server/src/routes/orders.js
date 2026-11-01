import { Router } from "express";
import Order from "../models/Order.js";
import Product from "../models/Product.js";
import Store from "../models/Store.js";
import Offer from "../models/Offer.js";
import { requireAuth } from "../middleware/auth.js";
import { computeDiscount, offerProblem, splitIntoDeliveries } from "../../../shared/pricing.js";
import { locateAddress, planTrip, FALLBACK_TOTAL_MINUTES } from "../services/geo.js";

const router = Router();
router.use(requireAuth);

const PAYMENT_METHODS = ["Cash on Delivery", "UPI (Google Pay / PhonePe)", "Credit / Debit Card"];

const formatDate = (date) =>
  date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
    timeZone: "Asia/Kolkata",
  })
    // en-GB writes "pm"; the seeded orders use "PM"
    .replace(/\b(am|pm)$/, (m) => m.toUpperCase());

const minutesFrom = (date, minutes) => new Date(date.getTime() + minutes * 60000);

// "NB-482913"; checks the database so two checkouts in the same millisecond can't clash
async function newCheckoutId() {
  for (;;) {
    const id = `NB-${String(Date.now()).slice(-6)}`;
    if (!(await Order.exists({ checkoutId: id }))) return id;
    await new Promise((resolve) => setTimeout(resolve, 5));
  }
}

/**
 * Takes the ordered units off the shelf. Each product is only decremented if
 * enough is left, so two shoppers can't both buy the last packet. If any item
 * falls short, the ones already taken are put back.
 */
async function reserveStock(cartItems) {
  const taken = [];
  for (const { product, qty } of cartItems) {
    if (product.stock === null || product.stock === undefined) continue;
    const updated = await Product.findOneAndUpdate(
      { id: product.id, stock: { $gte: qty } },
      { $inc: { stock: -qty } },
      { new: true }
    );
    if (!updated) {
      await releaseStock(taken);
      const left = (await Product.findOne({ id: product.id }))?.stock ?? 0;
      return left === 0 ? `${product.name} just sold out.` : `Only ${left} of ${product.name} left. Please lower the quantity.`;
    }
    taken.push({ productId: product.id, qty });
  }
  return null;
}

export async function releaseStock(items) {
  await Promise.all(
    items.map(({ productId, qty }) =>
      Product.updateOne({ id: productId, stock: { $ne: null } }, { $inc: { stock: qty } })
    )
  );
}

// The logged-in shopper's orders, newest first
router.get("/mine", async (req, res) => {
  const orders = await Order.find({ user: req.user._id }).sort({ date: -1 });
  res.json({ orders });
});

// One order, for the shopper who placed it or the store that fulfils it
router.get("/:id", async (req, res) => {
  const order = await Order.findOne({ id: req.params.id });
  const allowed =
    order && (order.user?.equals(req.user._id) || (req.user.role === "vendor" && req.user.storeId === order.storeId));
  if (!allowed) return res.status(404).json({ error: "Order not found." });
  res.json({ order });
});

/**
 * Places the checkout as one order per store. Prices, discounts and stock all
 * come from the database; the browser only says what and how many.
 * Body: { items: [{ productId, qty }], offerCode, name, phone, address, area, coords, paymentMethod }
 */
router.post("/", async (req, res) => {
  const { items = [], offerCode, name = "", phone = "", address = "", area = "", coords, paymentMethod } = req.body;

  if (!Array.isArray(items) || items.length === 0) return res.status(400).json({ error: "Your basket is empty." });
  if (!name.trim()) return res.status(400).json({ field: "name", error: "Full name is required." });
  if (!/^\d{10}$/.test(phone.trim())) return res.status(400).json({ field: "phone", error: "Enter a valid 10-digit phone number." });
  if (!address.trim()) return res.status(400).json({ field: "address", error: "Delivery address is required." });
  if (!PAYMENT_METHODS.includes(paymentMethod)) return res.status(400).json({ error: "Choose a payment method." });

  const products = await Product.find({ id: { $in: items.map((i) => i.productId) } });
  const cartItems = [];
  for (const { productId, qty } of items) {
    const product = products.find((p) => p.id === productId);
    if (!product) return res.status(400).json({ error: "An item in your basket is no longer sold. Please remove it." });
    if (!Number.isInteger(qty) || qty < 1) return res.status(400).json({ error: "Invalid quantity in your basket." });
    cartItems.push({ product, qty });
  }

  const subtotal = cartItems.reduce((sum, item) => sum + item.product.price * item.qty, 0);
  let offer = null;
  if (offerCode) {
    offer = await Offer.findOne({ code: String(offerCode).toUpperCase() });
    if (!offer) return res.status(400).json({ error: "That offer code doesn't exist any more. Please remove it." });
    const problem = offerProblem(offer, cartItems, subtotal);
    if (problem) return res.status(400).json({ error: problem });
  }
  const discount = computeDiscount(offer, cartItems, subtotal);

  const stores = await Store.find({ id: { $in: [...new Set(cartItems.map((i) => i.product.storeId))] } });
  const storeById = (id) => stores.find((s) => s.id === id);
  const deliveries = splitIntoDeliveries(cartItems, offer, discount, (id) => storeById(id)?.name);

  const stockProblem = await reserveStock(cartItems);
  if (stockProblem) return res.status(409).json({ error: stockProblem });

  const deliverTo = await locateAddress({ coords, address: address.trim(), area: area.trim() });
  const checkoutId = await newCheckoutId();
  const now = new Date();

  const docs = await Promise.all(
    deliveries.map(async (delivery, index) => {
      const route = await planTrip(storeById(delivery.storeId)?.location, deliverTo);
      const totalMinutes = route.travelMinutes === null ? FALLBACK_TOTAL_MINUTES : route.prepMinutes + route.travelMinutes;
      return {
        id: deliveries.length > 1 ? `${checkoutId}-${index + 1}` : checkoutId,
        checkoutId,
        user: req.user._id,
        customer: name.trim(),
        email: req.user.email,
        phone: phone.trim(),
        storeId: delivery.storeId,
        storeName: delivery.storeName,
        items: delivery.items.map(({ product, qty }) => ({
          product: {
            id: product.id,
            name: product.name,
            unit: product.unit,
            price: product.price,
            image: product.image,
            storeId: product.storeId,
            categoryId: product.categoryId,
          },
          qty,
        })),
        subtotal: delivery.subtotal,
        discount: delivery.discount,
        deliveryFee: delivery.deliveryFee,
        total: delivery.total,
        offerCode: delivery.discount > 0 ? offer.code : null,
        paymentMethod,
        // No payment gateway yet: every method is settled when the order is delivered
        paymentStatus: "Pending",
        status: "Placed",
        statusTimes: { Placed: now },
        address: area.trim() ? `${address.trim()}, ${area.trim()}` : address.trim(),
        route,
        estimatedArrival: minutesFrom(now, totalMinutes),
        date: now,
        formattedDate: formatDate(now),
      };
    })
  );

  const orders = await Order.insertMany(docs);
  res.status(201).json({ orders });
});

export { minutesFrom };
export default router;
