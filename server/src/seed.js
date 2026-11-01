// Fills the database with the starting stores, products, offers and demo accounts.
// It wipes those collections first, so only run it on a fresh or test database.
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import Store from "./models/Store.js";
import Product from "./models/Product.js";
import Offer from "./models/Offer.js";
import User from "./models/User.js";
import Order from "./models/Order.js";
import { stores, products, offers, vendorAccounts, demoCustomer, initialStock, initialOrders } from "./data/seedData.js";

if (!process.env.MONGODB_URI || !process.env.SEED_PASSWORD) {
  console.error("Set MONGODB_URI and SEED_PASSWORD in server/.env first.");
  process.exit(1);
}

// Sharma General Store's Shop Settings as they were before the backend
const sharmaSettings = {
  shopName: "Sharma General Store",
  shopType: "Kirana / Grocery",
  phone: "+91 98765 43210",
  description:
    "Your friendly neighborhood store for daily groceries, fresh dairy, and household essentials. Serving the community since 2015.",
  street: "45 HAL 2nd Stage",
  city: "Bengaluru",
  pincode: "560038",
  weekdayOpen: "08:00",
  weekdayClose: "22:00",
  sundayOpen: "08:00",
  sundayClose: "14:00",
};

await mongoose.connect(process.env.MONGODB_URI);
await Promise.all([Store, Product, Offer, User, Order].map((model) => model.deleteMany({})));

await Store.insertMany(
  stores.map((store) => (store.id === "sharma-general-store" ? { ...store, settings: sharmaSettings } : store))
);
await Product.insertMany(products.map((product) => ({ ...product, stock: initialStock[product.id] ?? null })));
await Offer.insertMany(offers);

const passwordHash = await bcrypt.hash(process.env.SEED_PASSWORD, 10);
await User.insertMany(vendorAccounts.map((vendor) => ({ ...vendor, role: "vendor", passwordHash })));
const customer = await User.create({ ...demoCustomer, passwordHash });

await Order.insertMany(
  initialOrders.map((order) => ({
    ...order,
    checkoutId: order.id,
    user: customer._id,
    date: new Date(order.date),
    statusTimes: { Placed: new Date(order.date), [order.status]: new Date(order.date) },
    route: { source: "none", path: [] },
  }))
);

console.log(
  `Seeded ${stores.length} stores, ${products.length} products, ${offers.length} offers, ` +
    `${vendorAccounts.length + 1} accounts and ${initialOrders.length} orders.`
);
await mongoose.disconnect();
