// Integration tests: real Express app + real MongoDB-compatible server. Razorpay network calls are replaced by a fake client;
// signatures are generated with the same HMAC algorithm using a TEST secret. This proves OUR logic, not Razorpay's servers.
import test, { before, after } from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";
import { createServer } from "node:http";
import razorpay from "../config/razorpay.js";
import { computeSignature } from "../utils/razorpaySignature.js";

process.env.JWT_SECRET = "test_jwt_secret";
process.env.NODE_ENV = "test";
process.env.FRONTEND_URL = "http://localhost:5173";
process.env.RAZORPAY_KEY_ID = "rzp_test_unit";
process.env.RAZORPAY_KEY_SECRET = "unit_test_secret";

const { createApp } = await import("../app.js");
const Product = (await import("../models/product.model.js")).default;
const Customer = (await import("../models/customer.model.js")).default;
const Order = (await import("../models/order.model.js")).default;

const URI = process.env.MONGODB_URI_TEST || "mongodb://127.0.0.1:27017/shopkart_test";
let server, base;
const payments = new Map(); // fake razorpay payments store
let rzpCounter = 0;

class Client {
  cookie = "";
  async call(method, path, body, headers = {}) {
    const res = await fetch(base + path, {
      method,
      headers: { "Content-Type": "application/json", ...(this.cookie ? { Cookie: this.cookie } : {}), ...headers },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const set = res.headers.getSetCookie?.() ?? [];
    for (const c of set) this.cookie = c.split(";")[0].endsWith("=") ? "" : c.split(";")[0];
    const text = await res.text();
    let json; try { json = JSON.parse(text); } catch { json = text; }
    return { status: res.status, body: json, setCookie: set };
  }
  get = (p) => this.call("GET", p);
  post = (p, b) => this.call("POST", p, b ?? {});
  patch = (p, b) => this.call("PATCH", p, b);
  del = (p) => this.call("DELETE", p);
}

before(async () => {
  await mongoose.connect(URI);
  await mongoose.connection.dropDatabase();
  await Promise.all([Product.init(), Customer.init(), Order.init()]);
  razorpay._setClient({
    orders: { create: async ({ amount, currency, receipt }) => { const id = `order_T${++rzpCounter}`; payments.set(id, { amount, currency, receipt }); return { id, amount, currency, receipt }; } },
    payments: { fetch: async (id) => { const p = payments.get(id); if (!p) throw { statusCode: 400, error: { description: "not found" } }; return p; } },
  });
  server = createServer(createApp());
  await new Promise((r) => server.listen(0, r));
  base = `http://127.0.0.1:${server.address().port}`;
});
after(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
  server.close();
});

const user = { fullName: "John Doe", email: "John@Gmail.com", password: "john123", phone: "9876543210" };
const ids = {};
const A = new Client(), B = new Client();
const good = { fullName: "Aarav Sharma", phone: "9876543210", addressLine1: "22 MG Road", city: "Bengaluru", state: "Karnataka", pincode: "560001" };

test("auth: register validation + 201 + no password + 409 duplicate", async () => {
  for (const [patch, label] of [[{ fullName: "" }, "name"], [{ email: "" }, "email"], [{ password: "12345" }, "short pw"], [{ phone: "" }, "phone"], [{ email: "nope" }, "bad email"]]) {
    const r = await A.post("/customers/register", { ...user, ...patch });
    assert.equal(r.status, 400, label);
  }
  const ok = await A.post("/customers/register", user);
  assert.equal(ok.status, 201);
  assert.equal(ok.body.customer.password, undefined);
  assert.equal(ok.body.customer.email, "john@gmail.com");
  const dup = await A.post("/customers/register", { ...user, email: "john@gmail.com" });
  assert.equal(dup.status, 409);
  const raw = await Customer.findOne({ email: "john@gmail.com" }).select("+password").lean();
  assert.match(raw.password, /^\$2[aby]\$/); // bcrypt hash, not plaintext
  await B.post("/customers/register", { ...user, email: "other@x.com", fullName: "Other" });
});

test("auth: login (generic 401), HttpOnly cookie, /me, logout", async () => {
  const bad1 = await A.post("/customers/login", { email: user.email, password: "wrong" });
  const bad2 = await A.post("/customers/login", { email: "ghost@x.com", password: "wrong" });
  assert.equal(bad1.status, 401);
  assert.deepEqual(bad1.body, bad2.body); // no email/password hint
  assert.equal((await A.get("/customers/me")).status, 401);
  const ok = await A.post("/customers/login", { email: user.email, password: user.password });
  assert.equal(ok.status, 200);
  assert.ok(ok.setCookie[0].includes("HttpOnly"));
  assert.equal(ok.body.customer.password, undefined);
  const me = await A.get("/customers/me");
  assert.equal(me.status, 200);
  assert.equal(me.body.password, undefined);
  assert.equal(me.body.fullName, "John Doe");
  assert.equal((await new Client().call("GET", "/customers/me", undefined, { Cookie: "shopkart_token=garbage" })).status, 401);
  await B.post("/customers/login", { email: "other@x.com", password: "john123" });
  const out = await B.post("/customers/logout");
  assert.equal(out.status, 200);
  assert.ok(/shopkart_token=;/.test(out.setCookie[0]));
  assert.equal((await B.get("/customers/me")).status, 401);
  await B.post("/customers/login", { email: "other@x.com", password: "john123" });
});

test("products: create validation, list, search, category, sort, single", async () => {
  const p = { name: "Mechanical Keyboard", description: "RGB", price: 2999, category: "Electronics", image: "https://x/k.jpg", stock: 10 };
  assert.equal((await A.post("/products", { ...p, name: undefined })).status, 400);
  assert.equal((await A.post("/products", { ...p, price: 0 })).status, 400);
  assert.equal((await A.post("/products", { ...p, price: -5 })).status, 400);
  assert.equal((await A.post("/products", { ...p, price: "abc" })).status, 400);
  assert.equal((await A.post("/products", { ...p, stock: -1 })).status, 400);
  const c = await A.post("/products", p);
  assert.equal(c.status, 201);
  ids.kb = c.body.product._id;
  ids.mouse = (await A.post("/products", { ...p, name: "Wireless Mouse", price: 1499, stock: 5 })).body.product._id;
  ids.book = (await A.post("/products", { ...p, name: "Keyboard Cookbook", category: "Books", price: 499, stock: 1 })).body.product._id;
  ids.zero = (await A.post("/products", { ...p, name: "Sold Out Thing", price: 100, stock: 0 })).body.product._id;

  const all = await A.get("/products");
  assert.equal(all.body.count, 4);
  assert.equal(all.body.products[0].description, undefined);
  assert.equal((await A.get("/products?search=KEYBOARD")).body.count, 2);
  assert.equal((await A.get("/products?category=Electronics")).body.count, 3);
  assert.equal((await A.get("/products?search=keyboard&category=Electronics")).body.count, 1);
  assert.equal((await A.get("/products?search=.*")).body.count, 0); // regex is escaped
  const asc = (await A.get("/products?sort=price_asc")).body.products.map((x) => x.price);
  assert.deepEqual(asc, [...asc].sort((a, b) => a - b));
  const desc = (await A.get("/products?sort=price_desc")).body.products.map((x) => x.price);
  assert.deepEqual(desc, [...desc].sort((a, b) => b - a));
  assert.equal((await A.get(`/products/${ids.kb}`)).body.product.name, "Mechanical Keyboard");
  assert.equal((await A.get("/products/not-an-id")).status, 400);
  assert.equal((await A.get("/products/66d123abc456def789012345")).status, 404);
});

test("wishlist: protected, add/duplicate/get/remove, per-user isolation", async () => {
  assert.equal((await new Client().get("/wishlist")).status, 401);
  assert.equal((await new Client().post(`/wishlist/${ids.kb}`)).status, 401);
  assert.equal((await A.post("/wishlist/bad")).status, 400);
  assert.equal((await A.post("/wishlist/66d123abc456def789012345")).status, 404);
  assert.equal((await A.post(`/wishlist/${ids.kb}`)).status, 201);
  assert.equal((await A.post(`/wishlist/${ids.kb}`)).status, 409);
  const w = await A.get("/wishlist");
  assert.equal(w.body.count, 1);
  assert.equal(w.body.wishlist[0].name, "Mechanical Keyboard"); // populated
  assert.equal((await B.get("/wishlist")).body.count, 0);
  assert.equal((await A.del("/wishlist/bad")).status, 400);
  assert.equal((await B.del(`/wishlist/${ids.kb}`)).status, 404);
  assert.equal((await A.del(`/wishlist/${ids.kb}`)).status, 200);
  assert.equal((await A.del(`/wishlist/${ids.kb}`)).status, 404);
  assert.equal((await A.get("/wishlist")).body.count, 0);
});

test("cart: add/increment/stock limit/update/remove/persist/protect", async () => {
  assert.equal((await new Client().get("/cart")).status, 401);
  assert.equal((await A.post("/cart/bad")).status, 400);
  assert.equal((await A.post("/cart/66d123abc456def789012345")).status, 404);
  assert.equal((await A.post(`/cart/${ids.zero}`)).status, 400);
  let r = await A.post(`/cart/${ids.book}`); // stock 1
  assert.equal(r.status, 200);
  assert.equal(r.body.cart[0].quantity, 1);
  assert.equal((await A.post(`/cart/${ids.book}`)).status, 400); // would exceed stock
  r = await A.post(`/cart/${ids.mouse}`);
  r = await A.post(`/cart/${ids.mouse}`);
  assert.equal(r.body.cart.find((i) => i.product._id === ids.mouse).quantity, 2);
  assert.equal(r.body.cart.length, 2); // no duplicate rows
  assert.equal((await A.patch(`/cart/${ids.mouse}`, { quantity: "3" })).status, 400);
  assert.equal((await A.patch(`/cart/${ids.mouse}`, { quantity: 0 })).status, 400);
  assert.equal((await A.patch(`/cart/${ids.mouse}`, { quantity: 1.5 })).status, 400);
  assert.equal((await A.patch(`/cart/${ids.mouse}`, { quantity: 6 })).status, 400); // stock 5
  assert.equal((await A.patch(`/cart/${ids.kb}`, { quantity: 1 })).status, 404); // not in cart
  assert.equal((await A.patch("/cart/66d123abc456def789012345", { quantity: 1 })).status, 404);
  assert.equal((await A.patch(`/cart/${ids.mouse}`, { quantity: 4 })).body.cart.find((i) => i.product._id === ids.mouse).quantity, 4);
  assert.equal((await A.get("/cart")).body.cart.length, 2); // persisted
  assert.equal((await B.get("/cart")).body.cart.length, 0);
  assert.equal((await A.del(`/cart/${ids.book}`)).body.cart.length, 1);
  assert.equal((await A.del(`/cart/${ids.book}`)).status, 404);
  // latest price is reflected (not copied into cart)
  await Product.updateOne({ _id: ids.mouse }, { price: 1600 });
  assert.equal((await A.get("/cart")).body.cart[0].product.price, 1600);
  await Product.updateOne({ _id: ids.mouse }, { price: 1499 });
});

test("checkout: auth, empty cart, address validation, fake total ignored, paise, stock check", async () => {
  assert.equal((await new Client().post("/orders/create-payment-order", { shippingAddress: good })).status, 401);
  assert.equal((await B.post("/orders/create-payment-order", { shippingAddress: good })).status, 400); // empty cart
  const badAddr = await A.post("/orders/create-payment-order", { shippingAddress: { ...good, pincode: "12" } });
  assert.equal(badAddr.status, 400);
  assert.equal((await A.post("/orders/create-payment-order", {})).status, 400);

  // cart now: mouse x4 @1499 = 5996 ; add keyboard x1 @2999 => 8995
  await A.post(`/cart/${ids.kb}`);
  const r = await A.post("/orders/create-payment-order", { shippingAddress: good, totalAmount: 1, items: [] });
  assert.equal(r.status, 201);
  assert.equal(r.body.amount, 899500);
  assert.equal(r.body.currency, "INR");
  assert.equal(r.body.key, "rzp_test_unit");
  assert.equal(JSON.stringify(r.body).includes("unit_test_secret"), false);
  ids.order1 = r.body.shopKartOrderId; ids.rzp1 = r.body.razorpayOrderId;
  const o = await Order.findById(ids.order1).lean();
  assert.equal(o.totalAmount, 8995);
  assert.equal(o.status, "PENDING_PAYMENT");
  assert.equal(o.paymentStatus, "PENDING");
  assert.equal(o.items.length, 2);
  assert.ok(o.items.every((i) => i.name && i.price));
  assert.equal((await A.get("/cart")).body.cart.length, 2); // cart untouched before payment

  // repeat request => same pending order, no duplicate
  const again = await A.post("/orders/create-payment-order", { shippingAddress: good });
  assert.equal(again.body.shopKartOrderId, ids.order1);
  assert.equal(await Order.countDocuments({ user: o.user }), 1);

  // stock drops below cart quantity
  await Product.updateOne({ _id: ids.mouse }, { stock: 2 });
  const low = await A.post("/orders/create-payment-order", { shippingAddress: good });
  assert.equal(low.status, 400);
  assert.match(low.body.message, /Insufficient stock for Wireless Mouse/);
  await Product.updateOne({ _id: ids.mouse }, { stock: 5 });
});

test("verify-payment: rejects fake/foreign/mismatched, cart kept; accepts valid once; idempotent", async () => {
  const S = process.env.RAZORPAY_KEY_SECRET;
  const pay = "pay_TEST1";
  const base = { shopKartOrderId: ids.order1, razorpay_order_id: ids.rzp1, razorpay_payment_id: pay };

  assert.equal((await new Client().post("/orders/verify-payment", base)).status, 401);
  assert.equal((await A.post("/orders/verify-payment", { shopKartOrderId: ids.order1 })).status, 400);
  assert.equal((await A.post("/orders/verify-payment", { ...base, razorpay_signature: "deadbeef" })).status, 400);
  assert.equal((await A.post("/orders/verify-payment", { ...base, paymentSuccess: true })).status, 400); // client boolean means nothing
  // signature valid for a DIFFERENT razorpay order id supplied by browser
  assert.equal((await A.post("/orders/verify-payment", { ...base, razorpay_order_id: "order_OTHER", razorpay_signature: computeSignature("order_OTHER", pay, S) })).status, 400);
  // signature made with wrong secret
  assert.equal((await A.post("/orders/verify-payment", { ...base, razorpay_signature: computeSignature(ids.rzp1, pay, "attacker") })).status, 400);
  let o = await Order.findById(ids.order1);
  assert.equal(o.paymentStatus, "PENDING");
  assert.equal((await A.get("/cart")).body.cart.length, 2);

  const sig = computeSignature(ids.rzp1, pay, S);
  // another customer cannot verify/see it (even with a valid signature)
  assert.equal((await B.post("/orders/verify-payment", { ...base, razorpay_signature: sig })).status, 404);
  assert.equal((await B.get(`/orders/${ids.order1}`)).status, 404);

  // payment amount mismatch at Razorpay => rejected
  const rec = (await import("../config/razorpay.js")).default.client();
  const real = payments.get(ids.rzp1);
  payments.set(pay, { order_id: ids.rzp1, amount: 100, currency: "INR", status: "captured" });
  assert.equal((await A.post("/orders/verify-payment", { ...base, razorpay_signature: sig })).status, 400);
  // payment failed status => rejected
  payments.set(pay, { order_id: ids.rzp1, amount: 899500, currency: "INR", status: "failed" });
  assert.equal((await A.post("/orders/verify-payment", { ...base, razorpay_signature: sig })).status, 400);
  assert.equal((await Order.findById(ids.order1)).paymentStatus, "PENDING");
  assert.equal((await A.get("/cart")).body.cart.length, 2);

  payments.set(pay, { order_id: ids.rzp1, amount: 899500, currency: "INR", status: "captured" });
  const stockBefore = (await Product.findById(ids.mouse)).stock;
  const ok = await A.post("/orders/verify-payment", { ...base, razorpay_signature: sig });
  assert.equal(ok.status, 200, JSON.stringify(ok.body));
  assert.equal(ok.body.order.paymentStatus, "PAID");
  assert.equal(ok.body.order.status, "PLACED");
  assert.equal(ok.body.order.razorpayPaymentId, pay);
  assert.equal((await A.get("/cart")).body.cart.length, 0); // cleared only now
  assert.equal((await Product.findById(ids.mouse)).stock, stockBefore - 4);

  // repeat => safe, no double stock decrement
  const rep = await A.post("/orders/verify-payment", { ...base, razorpay_signature: sig });
  assert.equal(rep.status, 200);
  assert.equal((await Product.findById(ids.mouse)).stock, stockBefore - 4);
  // different payment id on paid order => 409
  assert.equal((await A.post("/orders/verify-payment", { ...base, razorpay_payment_id: "pay_OTHER", razorpay_signature: computeSignature(ids.rzp1, "pay_OTHER", S) })).status, 409);
  void rec; void real;
});

test("orders: list (paid only, newest first), detail, ownership, snapshot immutability", async () => {
  const list = await A.get("/orders");
  assert.equal(list.status, 200);
  assert.equal(list.body.count, 1);
  assert.equal(list.body.orders[0]._id, ids.order1);
  assert.equal(list.body.orders[0].cartFingerprint, undefined);
  assert.equal((await B.get("/orders")).body.count, 0);
  assert.equal((await new Client().get("/orders")).status, 401);
  assert.equal((await A.get("/orders/bad")).status, 400);
  assert.equal((await A.get("/orders/66d123abc456def789012345")).status, 404);
  // price change / deletion of product must not change history
  await Product.updateOne({ _id: ids.kb }, { price: 9999, name: "Renamed" });
  await Product.deleteOne({ _id: ids.mouse });
  const d = await A.get(`/orders/${ids.order1}`);
  assert.equal(d.body.order.items.find((i) => i.name === "Mechanical Keyboard").price, 2999);
  assert.equal(d.body.order.totalAmount, 8995);
  assert.equal(d.body.order.items.length, 2);
});

test("cart tolerates deleted products", async () => {
  await A.post(`/cart/${ids.kb}`);
  await Product.deleteOne({ _id: ids.kb });
  assert.equal((await A.get("/cart")).body.cart.length, 0);
  assert.equal((await A.get("/products")).status, 200);
});

test("unconfigured Razorpay => 503 on checkout, order not left behind, cart kept", async () => {
  const p = (await A.post("/products", { name: "Gadget", description: "d", price: 10, category: "Home", image: "x", stock: 5 })).body.product;
  await A.post(`/cart/${p._id}`);
  const key = process.env.RAZORPAY_KEY_ID, sec = process.env.RAZORPAY_KEY_SECRET;
  razorpay._setClient(null);
  delete process.env.RAZORPAY_KEY_ID; delete process.env.RAZORPAY_KEY_SECRET;
  const before = await Order.countDocuments();
  const r = await A.post("/orders/create-payment-order", { shippingAddress: good });
  process.env.RAZORPAY_KEY_ID = key; process.env.RAZORPAY_KEY_SECRET = sec;
  assert.equal(r.status, 503);
  assert.equal(await Order.countDocuments(), before);
  assert.equal((await A.get("/cart")).body.cart.length, 1);
});
