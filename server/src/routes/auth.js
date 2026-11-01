import { Router } from "express";
import bcrypt from "bcryptjs";
import User from "../models/User.js";
import { requireAuth, signToken } from "../middleware/auth.js";

const router = Router();

// Same rules as the signup form
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PASSWORD_PATTERN = /^(?=.*[A-Za-z])(?=.*\d).{8,}$/;

// Failed requests answer { field, error } so the form can highlight the right input
router.post("/signup", async (req, res) => {
  const { name = "", email = "", phone = "", password = "" } = req.body;
  if (name.trim().length < 2) return res.status(400).json({ field: "name", error: "Please enter your full name." });
  if (!EMAIL_PATTERN.test(email.trim())) return res.status(400).json({ field: "email", error: "Enter a valid email address." });
  if (!/^\d{10}$/.test(phone.trim())) return res.status(400).json({ field: "phone", error: "Enter a valid 10-digit phone number." });
  if (!PASSWORD_PATTERN.test(password)) {
    return res.status(400).json({ field: "password", error: "Password must be at least 8 characters and include a letter and a number." });
  }

  if (await User.exists({ email: email.trim().toLowerCase() })) {
    return res.status(409).json({ field: "email", error: "An account with this email already exists. Please log in." });
  }

  const user = await User.create({
    name: name.trim(),
    email: email.trim(),
    phone: phone.trim(),
    passwordHash: await bcrypt.hash(password, 10),
  });
  res.status(201).json({ token: signToken(user), user: user.toPublic() });
});

router.post("/login", async (req, res) => {
  const { email = "", password = "" } = req.body;
  const user = await User.findOne({ email: email.trim().toLowerCase() });
  if (!user) {
    return res.status(401).json({ field: "email", error: "No account found with this email. Check it or sign up." });
  }
  if (!(await bcrypt.compare(password, user.passwordHash))) {
    return res.status(401).json({ field: "password", error: "Incorrect password. Please try again." });
  }
  res.json({ token: signToken(user), user: user.toPublic() });
});

router.get("/me", requireAuth, (req, res) => {
  res.json({ user: req.user.toPublic() });
});

export default router;
