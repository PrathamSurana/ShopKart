import test from "node:test";
import assert from "node:assert/strict";
import { computeSignature, isValidSignature } from "../utils/razorpaySignature.js";
import { validateShippingAddress, escapeRegex, isValidId } from "../utils/helpers.js";

test("signature: matches Razorpay's documented HMAC-SHA256 of order_id|payment_id", () => {
  const sig = computeSignature("order_ABC", "pay_XYZ", "secret");
  assert.match(sig, /^[0-9a-f]{64}$/);
  assert.ok(isValidSignature("order_ABC", "pay_XYZ", sig, "secret"));
});
test("signature: rejects tampering and malformed input", () => {
  const sig = computeSignature("order_ABC", "pay_XYZ", "secret");
  assert.equal(isValidSignature("order_ABC", "pay_OTHER", sig, "secret"), false);
  assert.equal(isValidSignature("order_ZZZ", "pay_XYZ", sig, "secret"), false);
  assert.equal(isValidSignature("order_ABC", "pay_XYZ", sig, "wrong"), false);
  assert.equal(isValidSignature("order_ABC", "pay_XYZ", "short", "secret"), false);
  assert.equal(isValidSignature("order_ABC", "pay_XYZ", undefined, "secret"), false);
  assert.equal(isValidSignature("order_ABC", "pay_XYZ", sig, undefined), false);
});
test("shipping validation", () => {
  const good = { fullName: "A B", phone: "9876543210", addressLine1: "1 Road", city: "X", state: "Y", pincode: "560001" };
  assert.ok(validateShippingAddress(good).valid);
  assert.ok(validateShippingAddress({ ...good, phone: "+91 98765-43210" }).valid);
  assert.equal(validateShippingAddress({ ...good, pincode: "5600" }).errors.pincode, "Pincode must contain 6 digits");
  assert.ok(validateShippingAddress({ ...good, city: "   " }).errors.city);
  assert.ok(validateShippingAddress({ ...good, phone: "12345" }).errors.phone);
  assert.equal(validateShippingAddress(null).valid, false);
});
test("helpers", () => {
  assert.equal(escapeRegex("a.b*(c)"), "a\\.b\\*\\(c\\)");
  assert.ok(isValidId("66d123abc456def789012345"));
  assert.equal(isValidId("123"), false);
  assert.equal(isValidId(undefined), false);
});
