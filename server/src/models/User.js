import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    phone: { type: String, trim: true, default: "" },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ["customer", "vendor"], default: "customer" },
    // Set for vendors: the store they manage
    storeId: { type: String, default: null },
  },
  { timestamps: true }
);

// What the browser gets to see about a user
userSchema.methods.toPublic = function () {
  return { id: this._id, name: this.name, email: this.email, phone: this.phone, role: this.role, storeId: this.storeId };
};

export default mongoose.model("User", userSchema);
