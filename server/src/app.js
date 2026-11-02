import express from "express";
import cors from "cors";
import authRoutes from "./routes/auth.js";
import catalogRoutes from "./routes/catalog.js";
import orderRoutes from "./routes/orders.js";
import vendorRoutes from "./routes/vendor.js";
import imageRoutes from "./routes/images.js";

const app = express();

// CLIENT_ORIGIN lists the website addresses allowed to call the API, comma-separated
const allowedOrigins = (process.env.CLIENT_ORIGIN || "http://localhost:5173").split(",").map((o) => o.trim());
app.use(cors({ origin: allowedOrigins }));
app.use(express.json({ limit: "100kb" }));

app.get("/api/health", (_req, res) => res.json({ ok: true }));
app.use("/api/auth", authRoutes);
app.use("/api", catalogRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/vendor", vendorRoutes);
app.use("/api/images", imageRoutes);

app.use("/api", (_req, res) => res.status(404).json({ error: "Not found." }));

// Express 5 forwards errors from async handlers here
app.use((err, _req, res, _next) => {
  if (err.type === "entity.too.large") {
    return res.status(413).json({ error: "That file is too big. Photos can be up to 1 MB." });
  }
  console.error(err);
  res.status(err.status || 500).json({ error: err.expose ? err.message : "Something went wrong. Please try again." });
});

export default app;
