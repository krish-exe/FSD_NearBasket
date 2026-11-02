import { Router } from "express";
import Store from "../models/Store.js";
import Product from "../models/Product.js";
import Offer from "../models/Offer.js";
import {
  locateAddress,
  planTrip,
  straightLineKm,
  quickEstimateMinutes,
  DELIVERY_RADIUS_KM,
  FALLBACK_TOTAL_MINUTES,
} from "../services/geo.js";

const router = Router();

// "450m away" / "1.2km away"
const formatDistance = (km) => (km < 1 ? `${Math.max(50, Math.round((km * 1000) / 50) * 50)}m away` : `${km.toFixed(1)}km away`);

/**
 * Everything the shop pages need in one request: stores, products (with stock) and offers.
 * Given the shopper's location (?area=... or ?lat=..&lng=..) it only returns the stores
 * that deliver there, nearest first, with their distance and delivery time. If the
 * location can't be found on the map, no stores are returned (location.found is false)
 * rather than showing shops that may be far away.
 */
router.get("/catalog", async (req, res) => {
  const { area, lat, lng } = req.query;
  const [allStores, products, offers, here] = await Promise.all([
    Store.find().select("-settings"),
    Product.find(),
    Offer.find(),
    area || (lat && lng) ? locateAddress({ coords: lat && lng ? { lat: Number(lat), lng: Number(lng) } : null, area }) : null,
  ]);

  let stores = [];
  if (here) {
    stores = allStores
      .map((store) => {
        const km = store.location ? straightLineKm(here, store.location) : Infinity;
        return {
          ...store.toJSON(),
          distanceKm: Math.round(km * 10) / 10,
          distance: formatDistance(km),
          delivery: `Delivery in ~${quickEstimateMinutes(km)} mins`,
        };
      })
      .filter((store) => store.distanceKm <= DELIVERY_RADIUS_KM)
      .sort((a, b) => a.distanceKm - b.distanceKm);
  }

  const storeIds = new Set(stores.map((s) => s.id));
  res.json({
    stores,
    products: products.filter((p) => storeIds.has(p.storeId)),
    offers,
    location: { found: Boolean(here), radiusKm: DELIVERY_RADIUS_KM },
  });
});

/**
 * Delivery time and distance from each store to the shopper, shown before ordering.
 * GET /api/delivery/estimate?storeIds=a,b&area=Ghatkopar East&address=...&lat=..&lng=..
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
