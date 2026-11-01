import { Router } from "express";
import Store from "../models/Store.js";
import Product from "../models/Product.js";
import Offer from "../models/Offer.js";
import { locateAddress, planTrip, FALLBACK_TOTAL_MINUTES } from "../services/geo.js";

const router = Router();

// Everything the shop pages need in one request: stores, products (with stock) and offers
router.get("/catalog", async (_req, res) => {
  const [stores, products, offers] = await Promise.all([
    Store.find().select("-settings").sort({ name: 1 }),
    Product.find(),
    Offer.find(),
  ]);
  res.json({ stores, products, offers });
});

/**
 * Delivery time and distance from each store to the shopper, shown before ordering.
 * GET /api/delivery/estimate?storeIds=a,b&area=Koramangala&address=...&lat=..&lng=..
 */
router.get("/delivery/estimate", async (req, res) => {
  const storeIds = String(req.query.storeIds || "").split(",").filter(Boolean);
  const lat = Number(req.query.lat);
  const lng = Number(req.query.lng);
  const to = await locateAddress({
    coords: req.query.lat && req.query.lng ? { lat, lng } : null,
    address: req.query.address,
    area: req.query.area,
  });

  const stores = await Store.find({ id: { $in: storeIds } });
  const estimates = await Promise.all(
    stores.map(async (store) => {
      const trip = await planTrip(store.location, to);
      return {
        storeId: store.id,
        distanceKm: trip.distanceKm,
        minutes: trip.travelMinutes === null ? FALLBACK_TOTAL_MINUTES : trip.prepMinutes + trip.travelMinutes,
        source: trip.source,
      };
    })
  );
  res.json({ estimates });
});

export default router;
