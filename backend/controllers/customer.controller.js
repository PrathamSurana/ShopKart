import bcrypt from "bcrypt";
import Customer from "../models/customer.model.js";
import { generateToken, setAuthCookie, clearAuthCookie } from "../utils/generateToken.js";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const publicCustomer = (c) => ({ _id: c._id, fullName: c.fullName, email: c.email, phone: c.phone });
const str = (v) => (typeof v === "string" ? v.trim() : "");

// A real hash used to equalise timing when the email does not exist.
const DUMMY_HASH = bcrypt.hashSync("shopkart-dummy-password", 10);

export async function register(req, res) {
  const fullName = str(req.body?.fullName);
  const email = str(req.body?.email).toLowerCase();
  const phone = str(req.body?.phone);
  const password = typeof req.body?.password === "string" ? req.body.password : "";

  const errors = {};
  if (!fullName) errors.fullName = "Full name is required";
  if (!email) errors.email = "Email is required";
  else if (!EMAIL_RE.test(email)) errors.email = "Enter a valid email address";
  if (!password) errors.password = "Password is required";
  else if (password.length < 6) errors.password = "Password must contain at least 6 characters";
  if (!phone) errors.phone = "Phone number is required";
  else if (!/^\+?[0-9][0-9\s-]{6,17}$/.test(phone)) errors.phone = "Enter a valid phone number";

  if (Object.keys(errors).length) {
    return res.status(400).json({ success: false, message: Object.values(errors)[0], errors });
  }

  if (await Customer.exists({ email })) {
    return res.status(409).json({ success: false, message: "An account with this email already exists" });
  }

  const hash = await bcrypt.hash(password, 10);
  const customer = await Customer.create({ fullName, email, phone, password: hash }); // duplicate race -> 11000 -> 409

  res.status(201).json({ success: true, message: "Customer registered successfully", customer: publicCustomer(customer) });
}

export async function login(req, res) {
  const email = str(req.body?.email).toLowerCase();
  const password = typeof req.body?.password === "string" ? req.body.password : "";
  const invalid = () => res.status(401).json({ success: false, message: "Invalid credentials" });

  if (!email || !password) return invalid();

  const customer = await Customer.findOne({ email }).select("+password");
  const ok = await bcrypt.compare(password, customer?.password || DUMMY_HASH);
  if (!customer || !ok) return invalid();

  setAuthCookie(res, generateToken(customer._id));
  res.status(200).json({ success: true, message: "Login successful", customer: publicCustomer(customer) });
}

// Lab 01 specifies the bare customer object as the response body.
export function me(req, res) {
  res.status(200).json(publicCustomer(req.user));
}

export function logout(req, res) {
  clearAuthCookie(res);
  res.status(200).json({ success: true, message: "Logged out successfully" });
}
