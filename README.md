# NearBasket

[![Figma Design](https://img.shields.io/badge/Figma-Design%20Specs-F24E1E?style=for-the-badge&logo=figma&logoColor=white)](https://www.figma.com/design/YhYRGGXrpOtW1wnaHgNXJ1/Near-Basket?node-id=0-1)

A MERN app (MongoDB, Express, React, Node) for NearBasket / Vendor Hub: a React + Vite + Tailwind frontend built from the [Figma Design](https://www.figma.com/design/YhYRGGXrpOtW1wnaHgNXJ1/Near-Basket?node-id=0-1) and `DESIGN.md`, backed by an Express API and MongoDB.

## 🎨 Figma Design Reference
- **Figma File**: [Near-Basket Design System & Prototype](https://www.figma.com/design/YhYRGGXrpOtW1wnaHgNXJ1/Near-Basket?node-id=0-1)
- **Interactive Prototype / Mockups**: See [`Figma prototype`](./Figma%20prototype) and [`DESIGN.md`](./DESIGN.md) for full design token breakdowns.

## Run it

You need Node 22.9+ and MongoDB running locally (or a MongoDB Atlas connection string).

1. Set up the server once:

   ```bash
   cd server
   npm install
   cp .env.example .env   # then edit it: MONGODB_URI, JWT_SECRET
   npm run seed           # wipes and refills the database with the sample shops and accounts (no orders)
   ```

2. Start the API (from `server/`):

   ```bash
   npm run dev
   ```

3. In another terminal, start the website (from the project root):

   ```bash
   npm install
   npm run dev
   ```

Then open http://localhost:5173. During development Vite forwards `/api` requests to the API on port 5000.

### Demo accounts

All seeded accounts use the `SEED_PASSWORD` from `server/.env` (`Demo@1234` in `.env.example`).

- Customer: `priya@example.com`
- Store owners (Vendor Hub): `sharma@nearbasket.test`, `greenvalley@nearbasket.test`, `freshmart@nearbasket.test`, `punjabi@nearbasket.test`

## Deploy

The three parts are hosted separately, all on free plans:

| Part | Host | What it runs |
|---|---|---|
| Database | MongoDB Atlas (M0 free cluster) | MongoDB |
| API | Render (free web service) | `server/` — Express on Node |
| Website | Vercel | the Vite build of `src/` |

1. **Database (MongoDB Atlas)**
   - Create a free M0 cluster.
   - Under *Database Access*, add a database user with a password.
   - Under *Network Access*, allow `0.0.0.0/0` (Render's free plan has no fixed IP address).
   - Copy the connection string from *Connect → Drivers* and add the database name before the `?`, e.g. `mongodb+srv://user:pass@cluster0.xxxxx.mongodb.net/nearbasket?retryWrites=true&w=majority`.
   - Load the starting data from your computer: put that string in `server/.env` as `MONGODB_URI` and run `npm run seed` in `server/`.
2. **API (Render)**
   - In Render, choose *New → Blueprint* and pick this GitHub repository; `render.yaml` sets everything up.
   - When asked, fill in `MONGODB_URI` (the Atlas string), `SEED_PASSWORD`, and `CLIENT_ORIGIN` (the Vercel address from step 3; put any placeholder first and update it afterwards).
   - Render generates `JWT_SECRET` itself.
   - Once it's live, `https://<your-api>.onrender.com/api/health` answers `{"ok":true}`.
   - The free plan sleeps after 15 minutes without visitors, so the first request after that takes about a minute.
3. **Website (Vercel)**
   - In Vercel, choose *Add New → Project* and import this repository. Vercel detects Vite (build `npm run build`, output `dist`).
   - Add the environment variable `VITE_API_URL` = `https://<your-api>.onrender.com` and deploy.
   - `vercel.json` makes page links like `/orders/NB-123/track` work when opened directly.
4. Put the Vercel address (e.g. `https://nearbasket.vercel.app`) into Render's `CLIENT_ORIGIN` so the API accepts requests from the website. Render redeploys by itself.

Both Render and Vercel redeploy automatically whenever the deployed branch on GitHub changes.

## How it fits together

```
React (Vite)  ──fetch /api──▶  Express API (server/)  ──Mongoose──▶  MongoDB
                                    │
                                    ├─ Nominatim: delivery address → map coordinates
                                    └─ OSRM: road route and distance from store to door
```

- `server/src/models` — User, Store, Product (with stock), Offer, Order, Image (product photos stored in the database; products link to them as `/api/images/<id>`)
- `server/src/routes` — `auth` (signup, login, me), `catalog` (stores/products/offers, delivery estimate), `orders` (place, list, view), `vendor` (store orders and status, stock, shop settings)
- `shared/pricing.js` — coupon and delivery-fee rules used by both the cart preview and the server, so the price shown is the price charged
- Logins use a token (JWT) kept in the browser; passwords are hashed with bcrypt on the server

### API

| Method | Path | Who | What |
|---|---|---|---|
| POST | `/api/auth/signup`, `/api/auth/login` | anyone | Create an account / log in; returns a token |
| POST | `/api/auth/register-shop` | anyone | Create a store owner account and their shop (placed on the map from its address) |
| GET | `/api/auth/me` | logged in | Current user |
| GET | `/api/catalog` | anyone | Stores, products with stock, offers |
| GET | `/api/delivery/estimate?storeIds=&area=` | anyone | Delivery minutes and distance per store |
| POST | `/api/orders` | customer | Place the basket (one order per store) |
| GET | `/api/orders/mine`, `/api/orders/:id` | customer | Order history / one order with its route |
| GET | `/api/vendor/orders` | vendor | Orders for the vendor's store |
| PATCH | `/api/vendor/orders/:id/status` | vendor | Accept → Out for Delivery → Delivered, or Cancel |
| GET, POST | `/api/vendor/products` | vendor | The vendor's own products / add a product |
| PUT, DELETE | `/api/vendor/products/:id` | vendor | Edit / remove a product |
| PATCH | `/api/vendor/products/:id/stock` | vendor | Change stock |
| POST, DELETE | `/api/vendor/images`, `/api/vendor/images/:id` | vendor | Upload a product photo (the file itself, JPG/PNG/WebP up to 1 MB) / discard an unused one |
| GET | `/api/images/:id` | anyone | A stored photo |
| GET, PUT | `/api/vendor/store`, `/api/vendor/store/settings` | vendor | Shop settings |

### Environment variables

Server (`server/.env`): `MONGODB_URI`, `JWT_SECRET`, `PORT`, `CLIENT_ORIGIN` (the website's address, for CORS), `SEED_PASSWORD`.

Website: `VITE_API_URL` — the API's address when the site and API are hosted separately (leave unset in development).

### Delivery time (ETA)

When an order is placed the server finds the delivery address on the map (the GPS position if the shopper used "Use my location", otherwise the delivery area, refined by the street address when it lands inside that area), gets the road route from the store, and estimates:

- packing time: 10 minutes
- ride time: road distance at an average 20 km/h

When the store sends the order out, the arrival time is reset to the ride time from that moment. If the map services can't be reached, the server falls back to known area centres and a straight-line distance, so ordering never fails because of them.

## Pages

Customer-facing (NearBasket):
- `/` — Home page: hero, category grid, hot deals, top stores near you
- `/store/:storeId` — Store page with category filter, in-store search and live cart (try `/store/green-valley-organics` or `/store/punjabi-spice-bazaar`)
- `/deals` — Deals and product search across all stores (`?search=`, `?category=`, `?view=all`)
- `/offers` — Promo codes that can be applied to the cart
- `/orders` — Order history with details, arrival time and one-click reorder (requires login). Statuses change when the store updates them, and the page refreshes itself while an order is active
- `/orders/:orderId/track` — Track Order: status timeline, arrival countdown, distance and a map of the route from the store to the delivery address
- `/checkout` — Delivery address and payment (requires login), with the expected delivery time from each store. One cart can hold items from several stores: each store delivers separately with its own fee (Rs. 25 per store, and every delivery is free once the whole cart reaches Rs. 500), and checkout places one order per store. A coupon applies to the whole cart and its discount is shared between the stores
- `/sell` — "Sell on NearBasket": a shop owner creates their account and shop in one form, then lands in the Vendor Hub to add products
- `/login`, `/signup` — Accounts stored on the server. There is no payment gateway yet, so every payment method is marked Paid when the order is delivered

The header search supports typing with autocomplete, voice search (Chrome/Edge, via the Web Speech API) and photo search (matches words in the photo's file name against the catalog).

Vendor-facing (Vendor Hub, linked from "Sell on NearBasket" in the footer and from the account menu). It needs a store owner login, and each owner only sees their own store:
- `/vendor` — Dashboard: active orders, low stock alerts, today's revenue, recent orders and best sellers
- `/vendor/inventory` — The store's products: add, edit or remove them (name, unit, category, price, optional original price to show a deal, stock, and a photo uploaded from the device, shrunk in the browser to 800px WebP and saved in the database, or a web link) and change stock. Stock is shared with the shop: sold-out items can't be added to the cart, the server reduces stock when an order is placed, and puts it back if the order is cancelled
- `/vendor/orders` — Orders placed with the store, with buttons to accept, send out, mark delivered or cancel
- `/vendor/settings` — Shop settings with validation, saved to the store (shoppers see the new name, address and hours)

## Design system

All colors, typography, spacing, radii and shadows in `tailwind.config.js` are taken directly from `DESIGN.md`'s token list, so every component references the same palette (`primary`, `surface-container`, etc.) instead of hard-coded hex values. Fonts are Plus Jakarta Sans (display/body) and Inter (labels), loaded via Google Fonts in `index.html`.

Icons use `lucide-react` in place of the Material Symbols font referenced in the original mockups, matched one-for-one by meaning (e.g. `location_on` → `MapPin`, `shopping_basket` → `ShoppingBasket`).

The Track Order map uses Leaflet with Esri's Light Gray Canvas tiles, which need no API key (Tiles © Esri, with data from © OpenStreetMap contributors).

## Structure

```
src/                 React website
  api/           client.js — fetch wrapper that adds the login token
  components/    Header, Footer, CartDrawer, DeliveryHeader, DeliveryMap, ProductFormModal, RequireAuth, RequireVendor, StoreCard, StatusBadge, VendorLayout
  context/       CatalogContext, AuthContext, CartContext (cart kept in the browser), OrderContext, InventoryContext
  hooks/         useVoiceSearch, useDeliveryLocation, useNow, useVendorOrders, useVendorProducts
  utils/         imageSearch, orderStatus, storeHours
  pages/         HomePage, StorePage, DealsPage, OffersPage, OrdersPage, TrackOrderPage, CheckoutPage, LoginPage, SignupPage, SellPage, NotFoundPage
  pages/vendor/  DashboardPage, InventoryPage, OrdersPage, SettingsPage
  data/          categories.js — category names and colours
server/              Express API
  src/models/    Mongoose schemas
  src/routes/    API endpoints
  src/services/  geo.js — address lookup, road routes and ETA; shops.js — shop details rules and map placement; ids.js — readable ids
  src/data/      seedData.js — sample stores, products, offers, accounts and orders
  src/seed.js    loads the sample data
shared/              pricing.js, categories.js — used by both the website and the API
```
