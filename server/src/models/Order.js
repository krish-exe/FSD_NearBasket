import mongoose from "mongoose";

export const ORDER_STATUSES = ["Placed", "Accepted", "Out for Delivery", "Delivered", "Cancelled"];

const point = { lat: Number, lng: Number };

const orderSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true },
    checkoutId: String,
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", index: true },
    customer: String,
    email: String,
    phone: String,
    storeId: { type: String, index: true },
    storeName: String,
    // Snapshot of each product as it was bought, so later price changes don't rewrite history
    items: [
      {
        _id: false,
        product: { id: String, name: String, unit: String, price: Number, image: String, storeId: String, categoryId: String },
        qty: Number,
      },
    ],
    subtotal: Number,
    discount: Number,
    deliveryFee: Number,
    total: Number,
    offerCode: String,
    paymentMethod: String,
    paymentStatus: String,
    status: { type: String, enum: ORDER_STATUSES, default: "Placed" },
    // When each status was reached, e.g. { Placed: date, Accepted: date }
    statusTimes: { type: Map, of: Date, default: {} },
    address: String,
    // Shop-to-door trip, worked out when the order is placed
    route: {
      from: point,
      to: point,
      distanceKm: Number,
      travelMinutes: Number,
      prepMinutes: Number,
      path: [[Number]], // [lat, lng] pairs along the roads; empty when only a straight-line estimate was possible
      source: { type: String, enum: ["road", "straight-line", "none"] },
    },
    estimatedArrival: Date,
    date: { type: Date, default: Date.now },
    formattedDate: String,
  },
  {
    timestamps: true,
    toJSON: {
      flattenMaps: true,
      versionKey: false,
      transform: (_doc, ret) => {
        delete ret._id;
        delete ret.user;
        return ret;
      },
    },
  }
);

export default mongoose.model("Order", orderSchema);
