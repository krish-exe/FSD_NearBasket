# NearBasket

[![Figma Design](https://img.shields.io/badge/Figma-Design%20Specs-F24E1E?style=for-the-badge&logo=figma&logoColor=white)](https://www.figma.com/design/YhYRGGXrpOtW1wnaHgNXJ1/Near-Basket?node-id=0-1)

A React + Vite + Tailwind implementation of the NearBasket / Vendor Hub design system, built from the [Figma Design](https://www.figma.com/design/YhYRGGXrpOtW1wnaHgNXJ1/Near-Basket?node-id=0-1) and `DESIGN.md`.

## 🎨 Figma Design Reference
- **Figma File**: [Near-Basket Design System & Prototype](https://www.figma.com/design/YhYRGGXrpOtW1wnaHgNXJ1/Near-Basket?node-id=0-1)
- **Interactive Prototype / Mockups**: See [`Figma prototype`](./Figma%20prototype) and [`DESIGN.md`](./DESIGN.md) for full design token breakdowns.

## Run it

```bash
npm install
npm run dev
```

Then open the printed local URL (usually http://localhost:5173).

## Pages

Customer-facing (NearBasket):
- `/` — Home page: hero, category grid, hot deals, top stores near you
- `/store/:storeId` — Store page with category filter, in-store search and live cart (try `/store/green-valley-organics` or `/store/punjabi-spice-bazaar`)
- `/deals` — Deals and product search across all stores (`?search=`, `?category=`, `?view=all`)
- `/offers` — Promo codes that can be applied to the cart
- `/orders` — Order history with details and one-click reorder. With no backend, new orders move from Placed to Delivered on a timer (Accepted at 2 min, Out for Delivery at 5, Delivered at 20)
- `/checkout` — Delivery address and payment (requires login). One cart can hold items from several stores: each store delivers separately with its own fee (Rs. 25 per store, and every delivery is free once the whole cart reaches Rs. 500), and checkout places one order per store. A coupon applies to the whole cart and its discount is shared between the stores
- `/login`, `/signup` — Demo authentication (stored in localStorage)

The header search supports typing with autocomplete, voice search (Chrome/Edge, via the Web Speech API) and photo search (matches words in the photo's file name against the catalog).

Vendor-facing (Vendor Hub, linked from "Sell on NearBasket" in the footer). Until vendor accounts exist on a backend, the hub is signed in as Sharma General Store:
- `/vendor` — Dashboard: active orders, low stock alerts, today's revenue, recent orders and best sellers, all from real orders placed in this browser
- `/vendor/inventory` — The store's products with editable stock. Stock is shared with the shop: sold-out items can't be added to the cart, and placing an order reduces stock
- `/vendor/orders` — Orders placed with the store
- `/vendor/settings` — Shop settings form with validation, saved in this browser

## Design system

All colors, typography, spacing, radii and shadows in `tailwind.config.js` are taken directly from `DESIGN.md`'s token list, so every component references the same palette (`primary`, `surface-container`, etc.) instead of hard-coded hex values. Fonts are Plus Jakarta Sans (display/body) and Inter (labels), loaded via Google Fonts in `index.html`.

Icons use `lucide-react` in place of the Material Symbols font referenced in the original mockups, matched one-for-one by meaning (e.g. `location_on` → `MapPin`, `shopping_basket` → `ShoppingBasket`).

## Structure

```
src/
  components/    Header, Footer, CartDrawer, DeliveryHeader, RequireAuth, StoreCard, StatusBadge, VendorLayout
  context/       AuthContext, CartContext, OrderContext, InventoryContext (persisted to localStorage)
  hooks/         useVoiceSearch, useDeliveryLocation, useNow, useVendorOrders
  utils/         imageSearch, orderStatus, storeHours, vendorSettings
  pages/         HomePage, StorePage, DealsPage, OffersPage, OrdersPage, CheckoutPage, LoginPage, SignupPage, NotFoundPage
  pages/vendor/  DashboardPage, InventoryPage, OrdersPage, SettingsPage
  data/          mockData.js — sample stores (with opening hours), products, offers, orders, starting stock
```
