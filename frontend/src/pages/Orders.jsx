import { useEffect, useState } from "react";
import { errorMessage, fetchOrders, isCanceled } from "../services/api";
import OrderCard from "../components/OrderCard";
import { EmptyState, ErrorState, Loading } from "../components/StateViews";

export default function Orders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reload, setReload] = useState(0);

  useEffect(() => {
    const c = new AbortController();
    setLoading(true);
    setError("");
    fetchOrders(c.signal)
      .then((d) => { setOrders(d.orders); setLoading(false); })
      .catch((e) => { if (!isCanceled(e)) { setError(errorMessage(e)); setLoading(false); } });
    return () => c.abort();
  }, [reload]);

  return (
    <main className="container page">
      <h1>My Orders</h1>
      {loading ? <Loading text="Loading your orders..." />
        : error ? <ErrorState message={error} onRetry={() => setReload((n) => n + 1)} />
        : orders.length === 0 ? <EmptyState icon="📦" title="You have not placed any orders yet." actionLabel="Start Shopping" actionTo="/products" />
        : <div className="stack-lg">{orders.map((o) => <OrderCard key={o._id} order={o} />)}</div>}
    </main>
  );
}
