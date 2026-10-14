// Client-side validation. The server re-validates everything; these rules mirror backend/utils/helpers.js.
const PHONE_RE = /^(?:\+91|91|0)?[6-9]\d{9}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateShipping(values) {
  const errors = {};
  const labels = { fullName: "Full name", phone: "Phone number", addressLine1: "Address", city: "City", state: "State" };
  for (const [k, label] of Object.entries(labels)) {
    if (!String(values[k] ?? "").trim()) errors[k] = `${label} is required.`;
  }
  const phone = String(values.phone ?? "").trim();
  if (!errors.phone && !PHONE_RE.test(phone.replace(/[\s-]/g, ""))) errors.phone = "Enter a valid 10-digit mobile number.";
  const pin = String(values.pincode ?? "").trim();
  if (!pin) errors.pincode = "Pincode is required.";
  else if (!/^\d{6}$/.test(pin)) errors.pincode = "Pincode must contain 6 digits.";
  return errors;
}

export function validateRegister(v) {
  const errors = {};
  if (!v.fullName.trim()) errors.fullName = "Full name is required.";
  if (!v.email.trim()) errors.email = "Email is required.";
  else if (!EMAIL_RE.test(v.email.trim())) errors.email = "Enter a valid email address.";
  if (!v.password) errors.password = "Password is required.";
  else if (v.password.length < 6) errors.password = "Password must contain at least 6 characters.";
  if (!v.phone.trim()) errors.phone = "Phone number is required.";
  else if (!/^\+?[0-9][0-9\s-]{6,17}$/.test(v.phone.trim())) errors.phone = "Enter a valid phone number.";
  return errors;
}

export function validateLogin(v) {
  const errors = {};
  if (!v.email.trim()) errors.email = "Email is required.";
  if (!v.password) errors.password = "Password is required.";
  return errors;
}
