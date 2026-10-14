import Razorpay from "razorpay";

// The Razorpay SDK throws on construction when key_id is missing, which would crash
// the whole server (including auth/catalog routes). Create it lazily and fail only
// the payment endpoints, with a clear message.
let instance = null;

export function isRazorpayConfigured() {
  return Boolean(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET);
}

const razorpay = {
  client() {
    if (instance) return instance;
    if (!isRazorpayConfigured()) {
      const err = new Error("Razorpay is not configured on the server. Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET.");
      err.status = 503;
      throw err;
    }
    instance = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    });
    return instance;
  },
  // Test hook: lets tests inject a fake client (never used in production code paths).
  _setClient(c) {
    instance = c;
  },
};

export default razorpay;
