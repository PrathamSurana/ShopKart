import { Link } from "react-router-dom";
import { formatDate, formatINR, shortId } from "../utils/format";
import StatusBadge from "./StatusBadge";

export default function OrderCard({ order }) {
  return (
    <article className="card order-card">
      <div className="order-head">
        <div>
          <h3>Order #{shortId(order._id)}</h3>
          <p className="muted">{formatDate(order.createdAt)}</p>
        </div>
        <StatusBadge status={order.status} paymentStatus={order.paymentStatus} />
      </div>
      <ul className="order-items">
        {order.items.map((i) => (
          <li key={`${order._id}-${i.product}`}>{i.name} × {i.quantity}</li>
        ))}
      </ul>
      <div className="order-foot">
        <strong>Total: {formatINR(order.totalAmount)}</strong>
        <Link className="btn btn-outline btn-sm" to={`/orders/${order._id}`}>View Details</Link>
      </div>
    </article>
  );
}
