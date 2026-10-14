import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:5000",
  withCredentials: true, // send/receive the HttpOnly auth cookie
  headers: { "Content-Type": "application/json" },
});

// When a session expires mid-use, any protected call returns 401; let AuthContext react to it.
let onUnauthorized = null;
export const setUnauthorizedHandler = (fn) => {
  onUnauthorized = fn;
};
api.interceptors.response.use(
  (r) => r,
  (error) => {
    const url = error.config?.url || "";
    const isAuthProbe = url.includes("/customers/login") || url.includes("/customers/me") || url.includes("/customers/register");
    if (error.response?.status === 401 && !isAuthProbe) onUnauthorized?.();
    return Promise.reject(error);
  }
);

/** Turn any axios error into a user-friendly string. */
export function errorMessage(err, fallback = "Something went wrong. Please try again.") {
  if (err?.code === "ERR_CANCELED") return "";
  if (err?.response?.data?.message) return err.response.data.message;
  if (err?.request && !err.response) return "Cannot reach the server. Check your connection and that the backend is running.";
  return fallback;
}
export const isCanceled = (err) => err?.code === "ERR_CANCELED";

// ---- customers ----
export const registerCustomer = (data) => api.post("/customers/register", data).then((r) => r.data);
export const loginCustomer = (data) => api.post("/customers/login", data).then((r) => r.data);
export const fetchMe = () => api.get("/customers/me").then((r) => r.data);
export const logoutCustomer = () => api.post("/customers/logout").then((r) => r.data);

// ---- products ----
export const fetchProducts = (params, signal) => api.get("/products", { params, signal }).then((r) => r.data);
export const fetchProduct = (id, signal) => api.get(`/products/${id}`, { signal }).then((r) => r.data);

// ---- wishlist ----
export const fetchWishlist = (signal) => api.get("/wishlist", { signal }).then((r) => r.data);
export const addToWishlist = (id) => api.post(`/wishlist/${id}`).then((r) => r.data);
export const removeFromWishlist = (id) => api.delete(`/wishlist/${id}`).then((r) => r.data);

// ---- cart ----
export const fetchCart = (signal) => api.get("/cart", { signal }).then((r) => r.data);
export const addCartItem = (id) => api.post(`/cart/${id}`).then((r) => r.data);
export const updateCartItem = (id, quantity) => api.patch(`/cart/${id}`, { quantity }).then((r) => r.data);
export const removeCartItem = (id) => api.delete(`/cart/${id}`).then((r) => r.data);

// ---- orders / payments ----
export const createPaymentOrder = (shippingAddress) => api.post("/orders/create-payment-order", { shippingAddress }).then((r) => r.data);
export const verifyPayment = (payload) => api.post("/orders/verify-payment", payload).then((r) => r.data);
export const fetchOrders = (signal) => api.get("/orders", { signal }).then((r) => r.data);
export const fetchOrder = (id, signal) => api.get(`/orders/${id}`, { signal }).then((r) => r.data);

export default api;
