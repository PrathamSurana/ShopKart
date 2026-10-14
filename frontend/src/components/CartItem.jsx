import { useState } from "react";
import { Link } from "react-router-dom";
import { useCart } from "../context/CartContext";
import { formatINR } from "../utils/format";
import ProductImage from "./ProductImage";

export default function CartItem({ item }) {
  const { updateQuantity, removeFromCart, busy } = useCart();
  const [error, setError] = useState("");
  const { product, quantity } = item;
  const working = Boolean(busy[product._id]); // only THIS row is disabled while its request runs
  const overStock = quantity > product.stock;

  async function change(q) {
    setError("");
    const r = await updateQuantity(product._id, q);
    if (!r.ok) setError(r.message);
  }
  async function remove() {
    setError("");
    const r = await removeFromCart(product._id);
    if (!r.ok) setError(r.message);
  }

  return (
    <li className="cart-item">
      <Link to={`/products/${product._id}`} className="cart-thumb">
        <ProductImage src={product.image} alt={product.name} />
      </Link>
      <div className="cart-info">
        <Link to={`/products/${product._id}`} className="card-title">{product.name}</Link>
        <p className="muted">{product.category} · {formatINR(product.price)} each</p>
        <div className="qty" role="group" aria-label={`Quantity for ${product.name}`}>
          <button className="btn btn-outline btn-sm" onClick={() => change(quantity - 1)} disabled={working || quantity <= 1} aria-label="Decrease quantity">−</button>
          <span className="qty-value" aria-live="polite">{quantity}</span>
          <button className="btn btn-outline btn-sm" onClick={() => change(quantity + 1)} disabled={working || quantity >= product.stock} aria-label="Increase quantity">+</button>
          <button className="btn btn-link danger" onClick={remove} disabled={working}>{working ? "Updating..." : "Remove"}</button>
        </div>
        {overStock && <p className="field-error">Only {product.stock} in stock now. Reduce the quantity to continue.</p>}
        {error && <p className="field-error" role="alert">{error}</p>}
      </div>
      <p className="line-total">{formatINR(product.price * quantity)}</p>
    </li>
  );
}
