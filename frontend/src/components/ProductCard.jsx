import { useState } from "react";
import { Link } from "react-router-dom";
import { useCart } from "../context/CartContext";
import { formatINR, stockInfo } from "../utils/format";
import ProductImage from "./ProductImage";

export function WishlistButton({ wished, busy, onToggle, className = "" }) {
  const label = busy ? "⏳ Saving..." : wished ? "♥ Added to Wishlist" : "♡ Add to Wishlist";
  return (
    <button
      type="button"
      className={`btn btn-outline btn-sm ${wished ? "is-wished" : ""} ${className}`}
      onClick={onToggle}
      disabled={busy}
      aria-pressed={wished}
      title={wished ? "Click to remove from wishlist" : "Save for later"}
    >
      {label}
    </button>
  );
}

export function AddToCartButton({ product, className = "" }) {
  const { addToCart, busy, quantityOf } = useCart();
  const [error, setError] = useState("");
  const inCart = quantityOf(product._id);
  const adding = Boolean(busy[product._id]);
  const outOfStock = product.stock <= 0;
  const atLimit = inCart >= product.stock && !outOfStock;

  async function handle() {
    setError("");
    const r = await addToCart(product._id);
    if (!r.ok) setError(r.message);
  }

  return (
    <>
      <button type="button" className={`btn btn-primary ${className}`} onClick={handle} disabled={adding || outOfStock || atLimit}>
        {outOfStock ? "Out of Stock" : adding ? "Adding..." : atLimit ? "Max in Cart" : inCart ? `Add Another (${inCart} in cart)` : "Add to Cart"}
      </button>
      {error && <p className="field-error" role="alert">{error}</p>}
    </>
  );
}

export default function ProductCard({ product, wished, wishBusy, wishError, onToggleWish }) {
  const stock = stockInfo(product.stock);
  return (
    <article className="card product-card">
      <Link to={`/products/${product._id}`} className="card-media" aria-label={`View ${product.name}`}>
        <ProductImage src={product.image} alt={product.name} />
      </Link>
      <div className="card-body">
        <h3 className="card-title">{product.name}</h3>
        <p className="muted">{product.category}</p>
        <p className="price">{formatINR(product.price)}</p>
        <p className={`stock stock-${stock.tone}`}>{stock.label}</p>
        <div className="card-actions">
          <Link className="btn btn-outline btn-sm" to={`/products/${product._id}`}>View Details</Link>
          <WishlistButton wished={wished} busy={wishBusy} onToggle={onToggleWish} />
        </div>
        {wishError && <p className="field-error" role="alert">{wishError}</p>}
        <AddToCartButton product={product} className="btn-block" />
      </div>
    </article>
  );
}
