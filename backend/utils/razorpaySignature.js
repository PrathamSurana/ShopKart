import crypto from "crypto";

// Razorpay signs "<razorpay_order_id>|<razorpay_payment_id>" with HMAC-SHA256 using the Key Secret.
export function computeSignature(razorpayOrderId, razorpayPaymentId, secret) {
  return crypto.createHmac("sha256", secret).update(`${razorpayOrderId}|${razorpayPaymentId}`).digest("hex");
}

// Constant-time comparison; returns false for malformed input instead of throwing.
export function isValidSignature(razorpayOrderId, razorpayPaymentId, signature, secret) {
  if (!razorpayOrderId || !razorpayPaymentId || typeof signature !== "string" || !secret) return false;
  const expected = Buffer.from(computeSignature(razorpayOrderId, razorpayPaymentId, secret), "utf8");
  const received = Buffer.from(signature, "utf8");
  return expected.length === received.length && crypto.timingSafeEqual(expected, received);
}
