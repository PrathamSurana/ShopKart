import jwt from "jsonwebtoken";

export const COOKIE_NAME = "shopkart_token";

export function generateToken(customerId) {
  if (!process.env.JWT_SECRET) throw new Error("JWT_SECRET is not set");
  return jwt.sign({ id: String(customerId) }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
  });
}

// Same options must be used to set AND clear the cookie, otherwise browsers keep it.
//  - development (http://localhost): SameSite=Lax, not Secure. localhost:5173 -> localhost:5000 is
//    same-site, so Lax cookies are sent on XHR/fetch with credentials.
//  - production over HTTPS with frontend and API on different sites: SameSite=None; Secure.
export function cookieOptions() {
  const isProd = process.env.NODE_ENV === "production";
  return {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? "none" : "lax",
    path: "/",
  };
}

export function setAuthCookie(res, token) {
  res.cookie(COOKIE_NAME, token, { ...cookieOptions(), maxAge: 7 * 24 * 60 * 60 * 1000 });
}

export function clearAuthCookie(res) {
  res.clearCookie(COOKIE_NAME, cookieOptions());
}
