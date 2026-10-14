import { formatINR } from "../utils/format";

// items: [{ name, price, quantity }]  (works for both live cart lines and saved order snapshots)
export default function OrderSummary({ items, total, children }) {
  const units = items.reduce((n, i) => n + i.quantity, 0);
  return (
    <aside className="card summary" aria-label="Order summary">
      <h2>Order Summary</h2>
      <ul className="summary-list">
        {items.map((i) => (
          <li key={i.key}>
            <span>{i.name} × {i.quantity}</span>
            <span>{formatINR(i.price * i.quantity)}</span>
          </li>
        ))}
      </ul>
      <div className="summary-row"><span>Items</span><span>{units}</span></div>
      <div className="summary-row total"><span>Total</span><span>{formatINR(total)}</span></div>
      {children}
    </aside>
  );
}
