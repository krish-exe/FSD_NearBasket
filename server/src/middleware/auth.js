import jwt from "jsonwebtoken";
import User from "../models/User.js";

export function signToken(user) {
  return jwt.sign({ sub: user._id.toString() }, process.env.JWT_SECRET, { expiresIn: "7d" });
}

// Loads the logged-in user from the "Authorization: Bearer <token>" header
export async function requireAuth(req, res, next) {
  const token = req.headers.authorization?.replace(/^Bearer /, "");
  if (!token) return res.status(401).json({ error: "Please log in." });
  try {
    const { sub } = jwt.verify(token, process.env.JWT_SECRET);
    req.user = await User.findById(sub);
    if (!req.user) return res.status(401).json({ error: "Your account no longer exists. Please sign up again." });
    next();
  } catch {
    res.status(401).json({ error: "Your session has expired. Please log in again." });
  }
}

// Only store owners, and only for their own store
export function requireVendor(req, res, next) {
  if (req.user?.role !== "vendor" || !req.user.storeId) {
    return res.status(403).json({ error: "Only store owners can do this." });
  }
  next();
}
