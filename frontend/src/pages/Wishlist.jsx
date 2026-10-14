import { useCallback, useEffect, useState } from "react";
import { errorMessage, fetchWishlist, isCanceled, removeFromWishlist } from "../services/api";
import WishlistCard from "../components/WishlistCard";
import { EmptyState, ErrorState, Loading } from "../components/StateViews";
import { Link } from "react-router-dom";

export default function Wishlist() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");
  const [reload, setReload] = useState(0);

  useEffect(() => {
    const c = new AbortController();
    setLoading(true);
    setError("");
    fetchWishlist(c.signal)
      .then((d) => {
        setItems(d.wishlist);
        setLoading(false);
      })
      .catch((e) => {
        if (isCanceled(e)) return;
        setError(errorMessage(e));
        setLoading(false);
      });
    return () => c.abort();
  }, [reload]);

  const remove = useCallback(async (id) => {
    setActionError("");
    try {
      await removeFromWishlist(id);
      setItems((prev) => prev.filter((p) => p._id !== id));
      return true;
    } catch (e) {
      if (e.response?.status === 404) {
        setItems((prev) => prev.filter((p) => p._id !== id)); // already gone server-side
        return true;
      }
      setActionError(errorMessage(e, "Unable to remove product. Please try again."));
      return false;
    }
  }, []);

  return (
    <main className="container page">
      <h1>My Wishlist</h1>
      {loading ? (
        <Loading text="Loading your wishlist..." />
      ) : error ? (
        <ErrorState title="Something went wrong." message="We couldn't load your wishlist." onRetry={() => setReload((n) => n + 1)} />
      ) : items.length === 0 ? (
        <EmptyState icon="❤️" title="Your wishlist is empty" message="Save products you love and find them here later." actionLabel="Browse Products" actionTo="/products" />
      ) : (
        <>
          <p className="muted">{items.length} product{items.length === 1 ? "" : "s"} saved</p>
          {actionError && <p className="alert alert-error" role="alert">{actionError}</p>}
          <div className="grid">
            {items.map((p) => <WishlistCard key={p._id} product={p} onRemove={remove} />)}
          </div>
          <p><Link className="btn btn-outline" to="/products">Continue Shopping</Link></p>
        </>
      )}
    </main>
  );
}
