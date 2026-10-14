import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import customerRoutes from "./routes/customer.routes.js";
import productRoutes from "./routes/product.routes.js";
import wishlistRoutes from "./routes/wishlist.routes.js";
import cartRoutes from "./routes/cart.routes.js";
import orderRoutes from "./routes/order.routes.js";
import { notFound, errorHandler } from "./middlewares/error.middleware.js";

export function createApp() {
  const app = express();
  app.disable("x-powered-by");

  // Credentialed CORS needs an explicit origin (not "*").
  const allowed = (process.env.FRONTEND_URL || "http://localhost:5173").split(",").map((s) => s.trim());
  app.use(cors({ origin: allowed, credentials: true }));
  app.use(express.json({ limit: "20kb" }));
  app.use(cookieParser());

  app.get("/health", (req, res) => res.json({ success: true, status: "ok" }));
  app.use("/customers", customerRoutes);
  app.use("/products", productRoutes);
  app.use("/wishlist", wishlistRoutes);
  app.use("/cart", cartRoutes);
  app.use("/orders", orderRoutes);

  app.use(notFound);
  app.use(errorHandler);
  return app;
}
