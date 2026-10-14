import jwt from "jsonwebtoken";
import Customer from "../models/customer.model.js";
import { COOKIE_NAME } from "../utils/generateToken.js";

const unauthorized = (res, message = "Not authenticated") => res.status(401).json({ success: false, message });

export async function protect(req, res, next) {
  try {
    // Cookie is the primary mechanism (Labs 01-02). A Bearer header is also accepted to make Postman testing easy.
    let token = req.cookies?.[COOKIE_NAME];
    const header = req.headers.authorization;
    if (!token && header?.startsWith("Bearer ")) token = header.slice(7);
    if (!token) return unauthorized(res);

    let payload;
    try {
      payload = jwt.verify(token, process.env.JWT_SECRET);
    } catch {
      return unauthorized(res, "Invalid or expired token");
    }

    const customer = await Customer.findById(payload.id); // password is select:false
    if (!customer) return unauthorized(res, "Account no longer exists");

    req.user = customer; // identity always comes from the token, never from the request body
    next();
  } catch (err) {
    next(err);
  }
}
