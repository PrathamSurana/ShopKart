import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { errorMessage, fetchProduct, isCanceled } from "../services/api";
import useWishlistIds from "../hooks/useWishlistIds";
import { formatINR, stockInfo } from "../utils/format";
import ProductImage from "../components/ProductImage";
import { AddToCartButton, WishlistButton } from "../components/ProductCard";
import { ErrorState, Loading } from "../components/StateViews";

export default function ProductDetails() {
  const { id } = useParams();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null); // { message, notFound }
  const [reload, setReload] = useState(0);
  const wishlist = useWishlistIds();

  useEffect(() => {
    const c = new AbortController();
    setLoading(true);
    setError(null);
    fetchProduct(id, c.signal)
      .then((d) => {
        setProduct(d.product);
        setLoading(false);
      })
      .catch((e) => {
        if (isCanceled(e)) return;
        const s = e.response?.status;
        setError({ notFound: s === 404 || s === 400, message: errorMessage(e) });
        setLoading(false);
      });
    return () => c.abort();
  }, [id, reload]);

  if (loading) return <main className="container page"><Loading text="Loading product..." /></main>;
  if (error?.notFound)
    return (
      <main className="container page">
        <ErrorState title="Product not found." message="It may have been removed." />
        <p className="center"><Link className="btn btn-primary" to="/products">Back to products</Link></p>
      </main>
    );
  if (error) return <main className="container page"><ErrorState message={error.message} onRetry={() => setReload((n) => n + 1)} /></main>;

  const stock = stockInfo(product.stock);
  return (
    <main className="container page">
      <p><Link to="/products">← Back to products</Link></p>
      <section className="details">
        <div className="card details-media"><ProductImage src={product.image} alt={product.name} /></div>
        <div className="details-info">
          <h1>{product.name}</h1>
          <p className="muted">{product.category}</p>
          <p className="price price-lg">{formatINR(product.price)}</p>
          <p className={`stock stock-${stock.tone}`}>{stock.label}</p>
          <p>{product.description}</p>
          <div className="stack">
            <AddToCartButton product={product} />
            <WishlistButton wished={wishlist.ids.has(product._id)} busy={wishlist.busy.has(product._id)} onToggle={() => wishlist.toggle(product._id)} />
            {wishlist.errors[product._id] && <p className="field-error" role="alert">{wishlist.errors[product._id]}</p>}
          </div>
        </div>
      </section>
    </main>
  );
}
