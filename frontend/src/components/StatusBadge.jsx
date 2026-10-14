import { STATUS_LABEL } from "../utils/format";

export default function StatusBadge({ status, paymentStatus }) {
  const tone = paymentStatus === "PAID" || status === "DELIVERED" ? "ok" : status === "PENDING_PAYMENT" ? "warn" : "info";
  return <span className={`badge badge-${tone}`}>{STATUS_LABEL[status] || status}</span>;
}
