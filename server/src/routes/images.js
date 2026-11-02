import { Router } from "express";
import mongoose from "mongoose";
import Image from "../models/Image.js";

const router = Router();

// Sends the picture itself. Each upload gets a new id, so browsers may cache it forever.
router.get("/:id", async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ error: "Image not found." });
  const image = await Image.findById(req.params.id);
  if (!image) return res.status(404).json({ error: "Image not found." });
  res.set("Content-Type", image.contentType);
  res.set("Cache-Control", "public, max-age=31536000, immutable");
  res.send(image.data);
});

export default router;
