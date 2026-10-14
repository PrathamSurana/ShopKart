import crypto from "crypto";
import Customer from "../models/customer.model.js";
import Product from "../models/product.model.js";
import Order from "../models/order.model.js";
import razorpay from "../config/razorpay.js";
import { isValidSignature } from "../utils/razorpaySignature.js";
import { httpError, isValidId, validateShippingAddress } from "../utils/helpers.js";

const HIDDEN = "-cartFingerprint -__v";
const toPaise = (rupees) => Math.round(rupees * 100);
const checkoutPayload = (order) => ({
  success: true,
  shopKartOrderId: String(order._id),
  razorpayOrderId: order.razorpayOrderId,
  amount: toPaise(order.totalAmount),
  currency: "INR",
  key: process.env.RAZORPAY_KEY_ID, // Key ID is public by design. The Key Secret never leaves the server.
});

// Razorpay SDK rejects with plain objects ({statusCode, error:{description}}), not Error instances.
function razorpayFailure(err, fallback) {
  const detail = err?.error?.description || err?.message;
  return httpError(502, detail ? `${fallback}: ${detail}` : fallback);
}

/** POST /orders/create-payment-order */
export async function createPaymentOrder(req, res) {
  const { valid, errors, address } = validateShippingAddress(req.body?.shippingAddress);
  if (!valid) return res.status(400).json({ success: false, message: "Invalid shipping address", errors });

  // NOTE: anything else in the body (totalAmount, items, prices...) is intentionally ignored.
  const cart = req.user.cart;
  if (!cart.length) return res.status(400).json({ success: false, message: "Your cart is empty" });

  const products = await Product.find({ _id: { $in: cart.map((i) => i.product) } });
  const byId = new Map(products.map((p) => [String(p._id), p]));

  const items = [];
  for (const line of cart) {
    const p = byId.get(String(line.product));
    if (!p) return res.status(400).json({ success: false, message: "A product in your cart is no longer available. Please review your cart." });
    if (p.stock < line.quantity) {
      const msg = p.stock === 0 ? `${p.name} is out of stock.` : `Insufficient stock for ${p.name}. Only ${p.stock} available.`;
      return res.status(400).json({ success: false, message: msg });
    }
    items.push({ product: p._id, name: p.name, price: p.price, quantity: line.quantity, image: p.image });
  }

  const totalAmount = Math.round(items.reduce((sum, i) => sum + i.price * i.quantity, 0) * 100) / 100;

  // Same cart + prices + address => same pending order (prevents duplicate orders on retries/double submits).
  const fingerprint = crypto
    .createHash("sha256")
    .update(JSON.stringify({ items: items.map((i) => [String(i.product), i.quantity, i.price]).sort(), address, totalAmount }))
    .digest("hex");

  const existing = await Order.findOne({
    user: req.user._id,
    cartFingerprint: fingerprint,
    paymentStatus: "PENDING",
    status: "PENDING_PAYMENT",
    razorpayOrderId: { $exists: true, $ne: null },
  });
  if (existing) return res.status(200).json(checkoutPayload(existing));

  const order = await Order.create({ user: req.user._id, items, shippingAddress: address, totalAmount, cartFingerprint: fingerprint });

  try {
    const rzpOrder = await razorpay.client().orders.create({
      amount: toPaise(totalAmount), // integer paise
      currency: "INR",
      receipt: String(order._id),
      notes: { shopKartOrderId: String(order._id) },
    });
    order.razorpayOrderId = rzpOrder.id;
    await order.save();
  } catch (err) {
    await Order.deleteOne({ _id: order._id }); // don't leave an unpayable pending order behind; cart is untouched
    if (err.status) throw err; // e.g. 503 not configured
    throw razorpayFailure(err, "Could not create payment order with Razorpay");
  }

  res.status(201).json(checkoutPayload(order));
}

/** POST /orders/verify-payment */
export async function verifyPayment(req, res) {
  const { shopKartOrderId, razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body ?? {};
  if (![shopKartOrderId, razorpay_order_id, razorpay_payment_id, razorpay_signature].every((v) => typeof v === "string" && v)) {
    return res.status(400).json({ success: false, message: "Missing payment verification fields" });
  }
  if (!isValidId(shopKartOrderId)) return res.status(400).json({ success: false, message: "Invalid order ID" });

  // Ownership is part of the query: someone else's order id looks exactly like a missing one.
  const order = await Order.findOne({ _id: shopKartOrderId, user: req.user._id });
  if (!order) return res.status(404).json({ success: false, message: "Order not found" });
  if (!order.razorpayOrderId) return res.status(400).json({ success: false, message: "Order has no payment attached" });

  // The browser-supplied order id must match the one WE stored.
  if (razorpay_order_id !== order.razorpayOrderId) {
    return res.status(400).json({ success: false, message: "Payment does not belong to this order" });
  }

  // HMAC-SHA256 over "<stored razorpay order id>|<payment id>" with the Key Secret.
  if (!isValidSignature(order.razorpayOrderId, razorpay_payment_id, razorpay_signature, process.env.RAZORPAY_KEY_SECRET)) {
    return res.status(400).json({ success: false, message: "Invalid payment signature" }); // order stays pending, cart untouched
  }

  // Idempotency: repeating a verified request returns the same confirmed order.
  if (order.paymentStatus === "PAID") {
    if (order.razorpayPaymentId !== razorpay_payment_id) {
      return res.status(409).json({ success: false, message: "Order is already paid with a different payment" });
    }
    return res.status(200).json({ success: true, message: "Payment already verified", order: await Order.findById(order._id).select(HIDDEN) });
  }

  // Defence in depth: confirm with Razorpay that this payment is for this order, for the right amount, and succeeded.
  let payment;
  try {
    payment = await razorpay.client().payments.fetch(razorpay_payment_id);
  } catch (err) {
    if (err.status) throw err;
    throw razorpayFailure(err, "Could not confirm the payment with Razorpay. Nothing was charged to your order; please retry");
  }
  if (payment.order_id !== order.razorpayOrderId || payment.amount !== toPaise(order.totalAmount) || payment.currency !== "INR") {
    return res.status(400).json({ success: false, message: "Payment details do not match this order" });
  }
  if (!["captured", "authorized"].includes(payment.status)) {
    return res.status(400).json({ success: false, message: `Payment is not successful (status: ${payment.status})` });
  }

  // Atomically claim the PENDING -> PAID transition; only one concurrent request can win.
  const claimed = await Order.findOneAndUpdate(
    { _id: order._id, user: req.user._id, paymentStatus: { $ne: "PAID" } },
    { $set: { paymentStatus: "PAID", status: "PLACED", razorpayPaymentId: razorpay_payment_id } },
    { new: true }
  );
  if (!claimed) {
    return res.status(200).json({ success: true, message: "Payment already verified", order: await Order.findById(order._id).select(HIDDEN) });
  }

  // Decrement stock atomically per item (never below zero). Roll back if any item can't be fulfilled.
  const done = [];
  for (const item of claimed.items) {
    const r = await Product.updateOne({ _id: item.product, stock: { $gte: item.quantity } }, { $inc: { stock: -item.quantity } });
    if (r.modifiedCount === 1) {
      done.push(item);
      continue;
    }
    for (const d of done) await Product.updateOne({ _id: d.product }, { $inc: { stock: d.quantity } });
    await Order.updateOne({ _id: order._id }, { $set: { paymentStatus: "PENDING", status: "PENDING_PAYMENT" } });
    return res.status(409).json({
      success: false,
      message: `Sorry, ${item.name} just went out of stock. Your payment ${razorpay_payment_id} needs a refund; please contact support quoting order ${order._id}.`,
    });
  }

  await Customer.updateOne({ _id: req.user._id }, { $set: { cart: [] } }); // only now is the cart cleared

  res.status(200).json({ success: true, message: "Payment verified. Order placed.", order: await Order.findById(order._id).select(HIDDEN) });
}

/** GET /orders  (paid orders by default; ?includePending=true also lists unpaid attempts) */
export async function getOrders(req, res) {
  const filter = { user: req.user._id };
  if (req.query.includePending !== "true") filter.paymentStatus = "PAID";
  const orders = await Order.find(filter).select(HIDDEN).sort({ createdAt: -1 }).lean();
  res.status(200).json({ success: true, count: orders.length, orders });
}

/** GET /orders/:id */
export async function getOrderById(req, res) {
  if (!isValidId(req.params.id)) return res.status(400).json({ success: false, message: "Invalid order ID" });
  const order = await Order.findOne({ _id: req.params.id, user: req.user._id }).select(HIDDEN).lean();
  if (!order) return res.status(404).json({ success: false, message: "Order not found" });
  res.status(200).json({ success: true, order });
}
