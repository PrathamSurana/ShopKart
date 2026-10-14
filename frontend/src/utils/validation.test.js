import test from "node:test";
import assert from "node:assert/strict";
import { validateShipping, validateRegister, validateLogin } from "./validation.js";
import { formatINR, stockInfo } from "./format.js";

const good = { fullName: "A", phone: "9876543210", addressLine1: "1 Rd", city: "C", state: "S", pincode: "560001" };

test("shipping: valid passes", () => assert.deepEqual(validateShipping(good), {}));
test("shipping: whitespace-only is invalid", () => {
  const e = validateShipping({ ...good, fullName: "   ", city: "\t" });
  assert.ok(e.fullName && e.city);
});
test("shipping: pincode must be exactly 6 digits", () => {
  assert.equal(validateShipping({ ...good, pincode: "5600" }).pincode, "Pincode must contain 6 digits.");
  assert.equal(validateShipping({ ...good, pincode: "56000a" }).pincode, "Pincode must contain 6 digits.");
  assert.equal(validateShipping({ ...good, pincode: "5600011" }).pincode, "Pincode must contain 6 digits.");
});
test("shipping: phone format", () => {
  assert.ok(validateShipping({ ...good, phone: "12345" }).phone);
  assert.ok(validateShipping({ ...good, phone: "1234567890" }).phone); // must start 6-9
  assert.deepEqual(validateShipping({ ...good, phone: "+91 98765 43210" }), {});
});
test("register / login rules", () => {
  assert.ok(validateRegister({ fullName: "", email: "x", password: "123", phone: "" }).password);
  assert.deepEqual(validateRegister({ fullName: "A", email: "a@b.co", password: "123456", phone: "9876543210" }), {});
  assert.ok(validateLogin({ email: "", password: "" }).email);
});
test("format helpers", () => {
  assert.equal(formatINR(2999), "₹2,999");
  assert.equal(stockInfo(0).label, "Out of stock");
  assert.equal(stockInfo(3).tone, "warn");
});
