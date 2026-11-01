import { Router } from "express";
import Order from "../models/Order.js";
import Product from "../models/Product.js";
import Store from "../models/Store.js";
import { requireAuth, requireVendor } from "../middleware/auth.js";
import { geocodeExact } from "../services/geo.js";
import { releaseStock, minutesFrom } from "./orders.js";

const router = Router();
router.use(requireAuth, requireVendor);

// Which status each one can move to; anything else is refused
const NEXT_STATUSES = {
  Placed: ["Accepted", "Cancelled"],
  Accepted: ["Out for Delivery", "Cancelled"],
  "Out for Delivery": ["Delivered"],
  Delivered: [],
  Cancelled: [],
};

router.get("/orders", async (req, res) => {
  const orders = await Order.find({ storeId: req.user.storeId }).sort({ date: -1 });
  res.json({ orders });
});

router.patch("/orders/:id/status", async (req, res) => {
  const order = await Order.findOne({ id: req.params.id, storeId: req.user.storeId });
  if (!order) return res.status(404).json({ error: "Order not found." });

  const { status } = req.body;
  if (!NEXT_STATUSES[order.status]?.includes(status)) {
    return res.status(400).json({ error: `An order that is "${order.status}" can't be marked "${status}".` });
  }

  const now = new Date();
  order.status = status;
  order.statusTimes.set(status, now);
  if (status === "Out for Delivery" && order.route?.travelMinutes) {
    // The rider has left, so the arrival time is now just the ride itself
    order.estimatedArrival = minutesFrom(now, order.route.travelMinutes);
  }
  if (status === "Delivered") {
    order.paymentStatus = "Paid";
    order.estimatedArrival = now;
  }
  if (status === "Cancelled") {
    await releaseStock(order.items.map(({ product, qty }) => ({ productId: product.id, qty })));
    order.paymentStatus = "Cancelled";
  }
  await order.save();
  res.json({ order });
});

// Sets a product's shelf count, by a change ({ delta: -1 }) or outright ({ stock: 12 })
router.patch("/products/:id/stock", async (req, res) => {
  const product = await Product.findOne({ id: req.params.id, storeId: req.user.storeId });
  if (!product) return res.status(404).json({ error: "Product not found in your store." });
  if (product.stock === null) return res.status(400).json({ error: "This product's stock isn't tracked." });

  const { delta, stock } = req.body;
  const next = Number.isInteger(stock) ? stock : Number.isInteger(delta) ? product.stock + delta : NaN;
  if (Number.isNaN(next)) return res.status(400).json({ error: "Send a whole-number stock or delta." });

  product.stock = Math.max(0, next);
  await product.save();
  res.json({ product });
});

// What the Shop Settings form starts with for a store that has never saved it
function defaultSettings(store, vendor) {
  const [street = "", city = "Bengaluru"] = (store.address || "").split(/,\s*(?=[^,]+$)/);
  return {
    shopName: store.name,
    shopType: "Kirana / Grocery",
    phone: vendor.phone,
    description: "",
    street,
    city,
    pincode: "",
    weekdayOpen: store.hours?.open || "08:00",
    weekdayClose: store.hours?.close || "22:00",
    sundayOpen: store.hours?.open || "08:00",
    sundayClose: store.hours?.close || "22:00",
  };
}

function validateSettings(form) {
  const errors = {};
  const phoneDigits = form.phone.replace(/[\s-]/g, "").replace(/^\+91/, "");
  if (form.shopName.length < 2) errors.shopName = "Shop name must be at least 2 characters.";
  if (!/^\d{10}$/.test(phoneDigits)) errors.phone = "Enter a valid 10-digit phone number.";
  if (form.description.length > 200) errors.description = "Keep the description under 200 characters.";
  if (!form.street) errors.street = "Street address is required.";
  if (!form.city) errors.city = "City is required.";
  if (!/^\d{6}$/.test(form.pincode)) errors.pincode = "Enter a valid 6-digit pincode.";
  if (form.weekdayOpen >= form.weekdayClose) errors.weekdayHours = "Closing time must be after opening time.";
  if (form.sundayOpen >= form.sundayClose) errors.sundayHours = "Closing time must be after opening time.";
  return errors;
}

router.get("/store", async (req, res) => {
  const store = await Store.findOne({ id: req.user.storeId });
  if (!store) return res.status(404).json({ error: "Store not found." });
  res.json({ store, settings: store.settings || defaultSettings(store, req.user) });
});

router.put("/store/settings", async (req, res) => {
  const store = await Store.findOne({ id: req.user.storeId });
  if (!store) return res.status(404).json({ error: "Store not found." });

  const fields = Object.keys(defaultSettings(store, req.user));
  const form = Object.fromEntries(fields.map((key) => [key, String(req.body[key] ?? "").trim()]));
  const errors = validateSettings(form);
  if (Object.keys(errors).length > 0) return res.status(400).json({ error: "Please fix the highlighted fields.", errors });

  const addressChanged = form.street !== store.settings?.street || form.city !== store.settings?.city || form.pincode !== store.settings?.pincode;
  store.settings = form;
  store.name = form.shopName;
  store.address = `${form.street}, ${form.city}`;
  store.hours = { open: form.weekdayOpen, close: form.weekdayClose };
  if (addressChanged) {
    // Move the store's map pin; keep the old one if the address can't be found
    const point = await geocodeExact(`${form.street}, ${form.city} ${form.pincode}`);
    if (point) store.location = point;
  }
  await store.save();
  res.json({ store, settings: store.settings });
});

export default router;
