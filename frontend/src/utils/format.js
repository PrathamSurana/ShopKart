const inr = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2, minimumFractionDigits: 0 });
export const formatINR = (n) => inr.format(Number(n) || 0);
export const formatDate = (d) =>
  new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
export const shortId = (id) => String(id).slice(-8).toUpperCase();

export function stockInfo(stock) {
  if (stock <= 0) return { label: "Out of stock", tone: "danger" };
  if (stock <= 5) return { label: `Only ${stock} left`, tone: "warn" };
  return { label: `${stock} units left`, tone: "ok" };
}

export const STATUS_LABEL = {
  PENDING_PAYMENT: "Awaiting payment",
  PLACED: "Placed",
  CONFIRMED: "Confirmed",
  SHIPPED: "Shipped",
  DELIVERED: "Delivered",
};
