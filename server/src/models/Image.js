import mongoose from "mongoose";

// A picture uploaded by a shop owner, stored in the database itself.
// Products point at it with an image link like "/api/images/<id>".
const imageSchema = new mongoose.Schema(
  {
    data: { type: Buffer, required: true },
    contentType: { type: String, required: true },
    size: Number,
    // The shop that uploaded it; only that shop's owner may replace or delete it
    storeId: { type: String, index: true },
  },
  { timestamps: true }
);

export default mongoose.model("Image", imageSchema);
