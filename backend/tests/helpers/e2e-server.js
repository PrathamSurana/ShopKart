// DEV/TEST ONLY: starts the real API with a FAKE Razorpay API client (no network, no real keys) so the browser flow can be exercised.
// Signatures are still verified by the real controller code using the test secret below.
import mongoose from "mongoose";
process.env.JWT_SECRET = "e2e_jwt_secret";
process.env.FRONTEND_URL = "http://localhost:5173";
process.env.RAZORPAY_KEY_ID = "rzp_test_e2e";
process.env.RAZORPAY_KEY_SECRET = "e2e_test_secret";
const { createApp } = await import("../../app.js");
const razorpay = (await import("../../config/razorpay.js")).default;

const orders = new Map();
let n = 0;
razorpay._setClient({
  orders: { create: async ({ amount, currency, receipt }) => { const id = `order_E2E${++n}`; orders.set(id, { amount, currency }); return { id, amount, currency, receipt }; } },
  // payment ids look like pay_<orderId>_<n>
  payments: { fetch: async (pid) => { const oid = pid.slice(4, pid.lastIndexOf("_")); const o = orders.get(oid); if (!o) throw { statusCode: 400, error: { description: "unknown payment" } }; return { order_id: oid, amount: o.amount, currency: o.currency, status: "captured" }; } },
});
await mongoose.connect(process.env.MONGODB_URI);
createApp().listen(5000, () => console.log("e2e api on 5000"));
