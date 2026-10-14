import { formatDate, formatINR, shortId } from "../utils/format";
import StatusBadge from "./StatusBadge";

// Renders the SAVED snapshot (names/prices at purchase time), never live Product data.
export default function OrderBody({ order }) {
  const a = order.shippingAddress;
  return (
    <div className="two-col">
      <section className="card">
        <h2>Items</h2>
        <ul className="summary-list">
          {order.items.map((i) => (
            <li key={`${order._id}-${i.product}`} className="order-line">
              <span>{i.name}<br /><span className="muted small">{formatINR(i.price)} × {i.quantity}</span></span>
              <span>{formatINR(i.price * i.quantity)}</span>
            </li>
          ))}
        </ul>
        <div className="summary-row total"><span>Total</span><span>{formatINR(order.totalAmount)}</span></div>
      </section>
      <section className="card">
        <h2>Order Details</h2>
        <dl className="kv">
          <dt>Order ID</dt><dd className="mono">{order._id}</dd>
          <dt>Placed on</dt><dd>{formatDate(order.createdAt)}</dd>
          <dt>Order status</dt><dd><StatusBadge status={order.status} paymentStatus={order.paymentStatus} /></dd>
          <dt>Payment</dt><dd>{order.paymentStatus}</dd>
          {order.razorpayPaymentId && (<><dt>Payment ID</dt><dd className="mono">{order.razorpayPaymentId}</dd></>)}
          <dt>Ship to</dt>
          <dd>{a.fullName}<br />{a.addressLine1}<br />{a.city}, {a.state} {a.pincode}<br />📞 {a.phone}</dd>
        </dl>
        <p className="muted small">Reference: #{shortId(order._id)}</p>
      </section>
    </div>
  );
}
