import mongoose from "mongoose";

const offerSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  code: { type: String, required: true, unique: true, uppercase: true },
  title: String,
  description: String,
  discountType: { type: String, enum: ["flat", "pct"], required: true },
  discountValue: { type: Number, required: true },
  maxDiscount: Number,
  minOrder: { type: Number, default: 0 },
  categoryIds: [String],
  expiryDate: String,
  tag: String,
  bg: String,
  textColor: String,
}, { toJSON: { versionKey: false, transform: (_doc, ret) => { delete ret._id; return ret; } } });

export default mongoose.model("Offer", offerSchema);
