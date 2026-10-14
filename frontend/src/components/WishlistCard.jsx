import { useState } from "react";
import { Link } from "react-router-dom";
import { formatINR, stockInfo } from "../utils/format";
import ProductImage from "./ProductImage";
import { AddToCartButton } from "./ProductCard";

export default function WishlistCard({ product, onRemove }) {
  const [removing, setRemoving] = useState(false);
  const stock = stockInfo(product.stock);
  async function handle() {
    setRemoving(true);
    const ok = await onRemove(product._id);
    if (!ok) setRemoving(false); // on success the card unmounts
  }
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
          <button className="btn btn-outline btn-sm is-wished" onClick={handle} disabled={removing}>
            {removing ? "Removing..." : "Remove ♥"}
          </button>
        </div>
        <AddToCartButton product={product} className="btn-block" />
      </div>
    </article>
  );
}
