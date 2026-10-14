import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { errorMessage, fetchOrder, isCanceled } from "../services/api";
import { shortId } from "../utils/format";
import { ErrorState, Loading } from "../components/StateViews";
import OrderBody from "../components/OrderBody";

export default function OrderDetails() {
  const { id } = useParams();
  const [order, setOrder] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [reload, setReload] = useState(0);

  useEffect(() => {
    const c = new AbortController();
    setLoading(true);
    setError(null);
    fetchOrder(id, c.signal)
      .then((d) => { setOrder(d.order); setLoading(false); })
      .catch((e) => {
        if (isCanceled(e)) return;
        const s = e.response?.status;
        setError({ missing: s === 404 || s === 400, message: s === 404 || s === 400 ? "We couldn't find that order." : errorMessage(e) });
        setLoading(false);
      });
    return () => c.abort();
  }, [id, reload]);

  return (
    <main className="container page">
      <p><Link to="/orders">← Back to orders</Link></p>
      {loading ? <Loading text="Loading order..." />
        : error ? <ErrorState title={error.missing ? "Order not found." : undefined} message={error.message} onRetry={error.missing ? undefined : () => setReload((n) => n + 1)} />
        : (<><h1>Order #{shortId(order._id)}</h1><OrderBody order={order} /></>)}
    </main>
  );
}
