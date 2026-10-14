import "dotenv/config";
import { createApp } from "./app.js";
import { connectDB } from "./config/db.js";
import { isRazorpayConfigured } from "./config/razorpay.js";

const PORT = process.env.PORT || 5000;

for (const key of ["MONGODB_URI", "JWT_SECRET"]) {
  if (!process.env[key]) {
    console.error(`Missing required environment variable ${key}. Copy backend/.env.example to backend/.env and fill it in.`);
    process.exit(1);
  }
}
if (!isRazorpayConfigured()) {
  console.warn("[warn] RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET not set: checkout will return 503 until they are configured.");
}

await connectDB();
createApp().listen(PORT, () => console.log(`ShopKart API listening on http://localhost:${PORT}`));
