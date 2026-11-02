import { Router } from "express";
import bcrypt from "bcryptjs";
import User from "../models/User.js";
import Store from "../models/Store.js";
import { requireAuth, signToken } from "../middleware/auth.js";
import { slugId } from "../services/ids.js";
import { validateSettings, locateShop } from "../services/shops.js";
import { SHOP_TYPES } from "../../../shared/categories.js";

const router = Router();

// Same rules as the signup form
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PASSWORD_PATTERN = /^(?=.*[A-Za-z])(?=.*\d).{8,}$/;

// Shown on a new shop until its owner sets their own pictures
const DEFAULT_SHOP_BANNER = "https://images.unsplash.com/photo-1604719312566-8912e9227c6a?q=80&w=1600&auto=format&fit=crop";
const DEFAULT_SHOP_IMAGE = "https://images.unsplash.com/photo-1604719312566-8912e9227c6a?q=80&w=800&auto=format&fit=crop";

// The first problem with the account details as { status, field, error }, or null when they're fine
async function accountProblem({ name, email, phone, password }) {
  if (name.trim().length < 2) return { status: 400, field: "name", error: "Please enter your full name." };
  if (!EMAIL_PATTERN.test(email.trim())) return { status: 400, field: "email", error: "Enter a valid email address." };
  if (!/^\d{10}$/.test(phone.trim())) return { status: 400, field: "phone", error: "Enter a valid 10-digit phone number." };
  if (!PASSWORD_PATTERN.test(password)) {
    return { status: 400, field: "password", error: "Password must be at least 8 characters and include a letter and a number." };
  }
  if (await User.exists({ email: email.trim().toLowerCase() })) {
    return { status: 409, field: "email", error: "An account with this email already exists. Please log in." };
  }
  return null;
}

const newUser = async ({ name, email, phone, password }, extra = {}) =>
  User.create({
    name: name.trim(),
    email: email.trim(),
    phone: phone.trim(),
    passwordHash: await bcrypt.hash(password, 10),
    ...extra,
  });

// Failed requests answer { field, error } so the form can highlight the right input
router.post("/signup", async (req, res) => {
  const account = { name: "", email: "", phone: "", password: "", ...req.body };
  const problem = await accountProblem(account);
  if (problem) return res.status(problem.status).json({ field: problem.field, error: problem.error });

  const user = await newUser(account);
  res.status(201).json({ token: signToken(user), user: user.toPublic() });
});

/**
 * "Sell on NearBasket": creates a store owner's account and their shop in one go.
 * The shop's map pin comes from its address, so it appears for nearby customers right away.
 */
router.post("/register-shop", async (req, res) => {
  const account = { name: "", email: "", phone: "", password: "", ...req.body };
  const problem = await accountProblem(account);
  if (problem) return res.status(problem.status).json({ field: problem.field, error: problem.error });

  const text = (key, fallback = "") => String(req.body[key] ?? fallback).trim();
  const settings = {
    shopName: text("shopName"),
    shopType: SHOP_TYPES.includes(req.body.shopType) ? req.body.shopType : SHOP_TYPES[0],
    phone: account.phone.trim(),
    description: text("description"),
    street: text("street"),
    city: text("city"),
    pincode: text("pincode"),
    weekdayOpen: text("openTime", "08:00"),
    weekdayClose: text("closeTime", "22:00"),
    sundayOpen: text("openTime", "08:00"),
    sundayClose: text("closeTime", "22:00"),
  };
  const errors = validateSettings(settings);
  if (Object.keys(errors).length > 0) {
    const [field] = Object.keys(errors);
    return res.status(400).json({ field: field === "weekdayHours" ? "closeTime" : field, error: errors[field], errors });
  }

  const location = await locateShop(settings);
  if (!location) {
    return res.status(400).json({
      field: "street",
      error: "We couldn't find this address on the map. Check the street, city and pincode.",
    });
  }

  const store = await Store.create({
    id: slugId(settings.shopName),
    name: settings.shopName,
    rating: null,
    reviews: 0,
    delivery: "Delivery in 20-30 mins",
    hours: { open: settings.weekdayOpen, close: settings.weekdayClose },
    address: `${settings.street}, ${settings.city}`,
    area: settings.city,
    banner: DEFAULT_SHOP_BANNER,
    image: DEFAULT_SHOP_IMAGE,
    location: { lat: location.lat, lng: location.lng },
    locationLabel: location.label,
    settings,
  });
  try {
    const user = await newUser(account, { role: "vendor", storeId: store.id });
    res.status(201).json({ token: signToken(user), user: user.toPublic() });
  } catch (e) {
    await Store.deleteOne({ _id: store._id }); // don't leave a shop without an owner
    throw e;
  }
});

router.post("/login", async (req, res) => {
  const { email = "", password = "" } = req.body;
  const user = await User.findOne({ email: email.trim().toLowerCase() });
  if (!user) {
    return res.status(401).json({ field: "email", error: "No account found with this email. Check it or sign up." });
  }
  if (!(await bcrypt.compare(password, user.passwordHash))) {
    return res.status(401).json({ field: "password", error: "Incorrect password. Please try again." });
  }
  res.json({ token: signToken(user), user: user.toPublic() });
});

router.get("/me", requireAuth, (req, res) => {
  res.json({ user: req.user.toPublic() });
});

export default router;
