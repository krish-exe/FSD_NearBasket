import express, { Router } from "express";
import Order from "../models/Order.js";
import Product from "../models/Product.js";
import Store from "../models/Store.js";
import Image from "../models/Image.js";
import { requireAuth, requireVendor } from "../middleware/auth.js";
import { releaseStock, minutesFrom } from "./orders.js";
import { slugId } from "../services/ids.js";
import { validateSettings, locateShop } from "../services/shops.js";
import { PRODUCT_CATEGORIES } from "../../../shared/categories.js";

// Shown when a vendor adds a product without a photo link
// Link to a photo stored in the database by POST /vendor/images
const UPLOADED_IMAGE = /^\/api\/images\/([a-f0-9]{24})$/;

const DEFAULT_PRODUCT_IMAGE = "https://images.unsplash.com/photo-1542838132-92c53300491e?q=80&w=600&auto=format&fit=crop";

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

// The vendor's own products, wherever the vendor happens to be browsing from
router.get("/products", async (req, res) => {
  const products = await Product.find({ storeId: req.user.storeId }).sort({ name: 1 });
  res.json({ products });
});

/**
 * Checks the Add / Edit Product form. Resolves to { errors } or { fields } ready to save.
 * Stock left blank means "don't track stock" for that product.
 */
function readProductForm(body) {
  const errors = {};
  const name = String(body.name ?? "").trim();
  const unit = String(body.unit ?? "").trim();
  const description = String(body.description ?? "").trim();
  const image = String(body.image ?? "").trim();
  const price = Number(body.price);
  const originalPrice = body.originalPrice === "" || body.originalPrice == null ? null : Number(body.originalPrice);
  const stock = body.stock === "" || body.stock == null ? null : Number(body.stock);
  const category = PRODUCT_CATEGORIES.find((c) => c.id === body.categoryId);

  if (name.length < 2 || name.length > 80) errors.name = "Name must be 2 to 80 characters.";
  if (!unit) errors.unit = "Say how it's sold, e.g. 1 kg or 500 ml.";
  if (!Number.isFinite(price) || price <= 0) errors.price = "Enter a price above 0.";
  if (originalPrice !== null && !(Number.isFinite(originalPrice) && originalPrice > price)) {
    errors.originalPrice = "The original price must be higher than the selling price, or left empty.";
  }
  if (!category) errors.categoryId = "Choose a category.";
  if (stock !== null && !(Number.isInteger(stock) && stock >= 0)) errors.stock = "Stock must be a whole number, or empty to not track it.";
  if (image && !/^https?:\/\/\S+$/.test(image) && !UPLOADED_IMAGE.test(image)) {
    errors.image = "Upload a photo, or paste a web link starting with http:// or https://.";
  }
  if (description.length > 200) errors.description = "Keep the description under 200 characters.";
  if (Object.keys(errors).length > 0) return { errors };

  const discount = originalPrice ? Math.round(((originalPrice - price) / originalPrice) * 100) : 0;
  return {
    fields: {
      name,
      unit,
      description,
      image: image || DEFAULT_PRODUCT_IMAGE,
      price: Math.round(price * 100) / 100,
      originalPrice,
      isDeal: discount > 0,
      dealTag: discount > 0 ? `${discount}% OFF` : null,
      categoryId: category.id,
      category: category.name,
      stock,
    },
  };
}

// An uploaded photo may only be used by the shop that uploaded it
async function imageProblem(image, storeId) {
  const match = image.match(UPLOADED_IMAGE);
  if (match && !(await Image.exists({ _id: match[1], storeId }))) {
    return { image: "That photo couldn't be found. Please upload it again." };
  }
  return null;
}

/**
 * Deletes an uploaded photo once nothing points at it any more: no product,
 * and no past order (orders keep a copy of the product, picture link included).
 */
async function removeUnusedImage(image, storeId) {
  const match = image?.match(UPLOADED_IMAGE);
  if (!match) return;
  const inUse = (await Product.exists({ image })) || (await Order.exists({ "items.product.image": image }));
  if (!inUse) await Image.deleteOne({ _id: match[1], storeId });
}

router.post("/products", async (req, res) => {
  const { errors, fields } = readProductForm(req.body);
  if (errors) return res.status(400).json({ error: "Please fix the highlighted fields.", errors });
  const badImage = await imageProblem(fields.image, req.user.storeId);
  if (badImage) return res.status(400).json({ error: badImage.image, errors: badImage });
  const product = await Product.create({ ...fields, id: slugId(fields.name), storeId: req.user.storeId, rating: null });
  res.status(201).json({ product });
});

router.put("/products/:id", async (req, res) => {
  const product = await Product.findOne({ id: req.params.id, storeId: req.user.storeId });
  if (!product) return res.status(404).json({ error: "Product not found in your store." });
  const { errors, fields } = readProductForm(req.body);
  if (errors) return res.status(400).json({ error: "Please fix the highlighted fields.", errors });
  const badImage = await imageProblem(fields.image, req.user.storeId);
  if (badImage) return res.status(400).json({ error: badImage.image, errors: badImage });
  const oldImage = product.image;
  product.set(fields);
  await product.save();
  if (oldImage !== product.image) await removeUnusedImage(oldImage, req.user.storeId);
  res.json({ product });
});

// Past orders keep their own copy of the product, so removing it doesn't change order history
router.delete("/products/:id", async (req, res) => {
  const product = await Product.findOneAndDelete({ id: req.params.id, storeId: req.user.storeId });
  if (!product) return res.status(404).json({ error: "Product not found in your store." });
  await removeUnusedImage(product.image, req.user.storeId);
  res.json({ ok: true });
});

// File signatures of the accepted picture types, so a renamed file can't pose as a photo
const IMAGE_SIGNATURES = {
  "image/jpeg": (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff,
  "image/png": (b) => b.subarray(0, 4).toString("hex") === "89504e47",
  "image/webp": (b) => b.subarray(0, 4).toString() === "RIFF" && b.subarray(8, 12).toString() === "WEBP",
};

/**
 * Uploads a product photo. The body is the picture file itself (Content-Type image/jpeg,
 * image/png or image/webp, up to 1 MB). Answers { image: "/api/images/<id>" } to put in
 * the product's image field.
 */
router.post(
  "/images",
  express.raw({ type: Object.keys(IMAGE_SIGNATURES), limit: "1mb" }),
  async (req, res) => {
    const type = req.get("Content-Type");
    const isImage = Buffer.isBuffer(req.body) && req.body.length > 12 && IMAGE_SIGNATURES[type]?.(req.body);
    if (!isImage) return res.status(400).json({ error: "Choose a JPG, PNG or WebP photo." });
    const image = await Image.create({ data: req.body, contentType: type, size: req.body.length, storeId: req.user.storeId });
    res.status(201).json({ image: `/api/images/${image._id}` });
  }
);

// Throws away a photo uploaded in a form that was then closed without saving (kept if anything uses it)
router.delete("/images/:id", async (req, res) => {
  await removeUnusedImage(`/api/images/${req.params.id}`, req.user.storeId);
  res.json({ ok: true });
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
  const [street = "", city = "Mumbai"] = (store.address || "").split(/,\s*(?=[^,]+$)/);
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
    const point = await locateShop(form);
    if (point) {
      store.location = { lat: point.lat, lng: point.lng };
      store.locationLabel = point.label;
    }
  }
  await store.save();
  res.json({ store, settings: store.settings });
});

export default router;
