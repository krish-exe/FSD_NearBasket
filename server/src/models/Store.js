import mongoose from "mongoose";

const point = { lat: Number, lng: Number };

const storeSchema = new mongoose.Schema(
  {
    // Readable ids ("sharma-general-store") so store URLs stay the same as before the backend
    id: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    rating: Number,
    reviews: Number,
    distance: String,
    delivery: String,
    hours: { open: String, close: String },
    address: String,
    banner: String,
    image: String,
    location: point,
    // Neighbourhood shown when the shopper's distance is unknown
    area: String,
    // Where the map lookup placed the shop, e.g. "400615, Thane, Thane Subdistrict"
    locationLabel: String,
    // Vendor Hub "Shop Settings" form, kept as entered
    settings: { type: mongoose.Schema.Types.Mixed, default: null },
  },
  {
    timestamps: true,
    toJSON: { versionKey: false, transform: (_doc, ret) => { delete ret._id; return ret; } },
  }
);

export default mongoose.model("Store", storeSchema);
