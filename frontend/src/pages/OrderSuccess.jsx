import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { errorMessage, fetchOrder, isCanceled } from "../services/api";
import { formatINR } from "../utils/format";
import { ErrorState, Loading } from "../components/StateViews";
import OrderBody from "../components/OrderBody";

export default function OrderSuccess() {
  const { id } = useParams();
  const [order, setOrder] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [reload, setReload] = useState(0);

  useEffect(() => {
    const c = new AbortController();
    setLoading(true);
    setError("");
    fetchOrder(id, c.signal)
      .then((d) => { setOrder(d.order); setLoading(false); })
      .catch((e) => { if (!isCanceled(e)) { setError(e.response?.status === 404 ? "We couldn't find that order." : errorMessage(e)); setLoading(false); } });
    return () => c.abort();
  }, [id, reload]);

  if (loading) return <main className="container page"><Loading text="Loading your order..." /></main>;
  if (error) return <main className="container page"><ErrorState message={error} onRetry={() => setReload((n) => n + 1)} /></main>;

  const paid = order.paymentStatus === "PAID";
  return (
    <main className="container page">
      <section className={`card banner ${paid ? "banner-ok" : "banner-warn"}`}>
        <div className="state-icon" aria-hidden="true">{paid ? "✅" : "⏳"}</div>
        <h1>{paid ? "Order Placed Successfully" : "Payment not confirmed yet"}</h1>
        <p>{paid ? `Thank you! We received your payment of ${formatINR(order.totalAmount)}.` : "This order has not been paid. Your cart is unchanged; you can return to checkout."}</p>
        <div className="actions">
          <Link className="btn btn-primary" to="/orders">View My Orders</Link>
          <Link className="btn btn-outline" to={paid ? "/products" : "/checkout"}>{paid ? "Continue Shopping" : "Back to Checkout"}</Link>
        </div>
      </section>
      <OrderBody order={order} />
    </main>
  );
}
