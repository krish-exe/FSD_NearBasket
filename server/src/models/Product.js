import mongoose from "mongoose";

const productSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    unit: String,
    price: { type: Number, required: true },
    originalPrice: Number,
    isDeal: Boolean,
    dealTag: String,
    category: String,
    categoryId: String,
    storeId: { type: String, required: true, index: true },
    rating: Number,
    image: String,
    description: String,
    // Units on the shelf; null means the store doesn't track stock for this product
    stock: { type: Number, default: null, min: 0 },
  },
  {
    timestamps: true,
    toJSON: { versionKey: false, transform: (_doc, ret) => { delete ret._id; return ret; } },
  }
);

export default mongoose.model("Product", productSchema);
