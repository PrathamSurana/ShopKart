import mongoose from "mongoose";

export const isValidId = (id) => typeof id === "string" && mongoose.Types.ObjectId.isValid(id) && String(new mongoose.Types.ObjectId(id)) === id;

export const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export function httpError(status, message) {
  const err = new Error(message);
  err.status = status;
  return err;
}

// Wrap async handlers so rejected promises reach the error middleware.
export const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

// ---- shipping address validation (server side; mirrors the frontend rules) ----
const PHONE_RE = /^(?:\+91|91|0)?[6-9]\d{9}$/; // Indian mobile, optional country/trunk prefix
const PINCODE_RE = /^\d{6}$/;

export function validateShippingAddress(input) {
  const errors = {};
  const a = input && typeof input === "object" ? input : {};
  const clean = {};
  for (const key of ["fullName", "phone", "addressLine1", "city", "state", "pincode"]) {
    const v = a[key];
    clean[key] = typeof v === "string" ? v.trim() : "";
    if (!clean[key]) errors[key] = "This field is required";
  }
  if (!errors.phone && !PHONE_RE.test(clean.phone.replace(/[\s-]/g, ""))) {
    errors.phone = "Enter a valid 10-digit Indian mobile number";
  }
  if (!errors.pincode && !PINCODE_RE.test(clean.pincode)) errors.pincode = "Pincode must contain 6 digits";
  return { valid: Object.keys(errors).length === 0, errors, address: clean };
}
