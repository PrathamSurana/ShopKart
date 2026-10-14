import { Link, useNavigate } from "react-router-dom";
import { useCart } from "../context/CartContext";
import CartItem from "../components/CartItem";
import OrderSummary from "../components/OrderSummary";
import { EmptyState, ErrorState, Loading } from "../components/StateViews";

export default function Cart() {
  const { items, loading, error, refresh, subtotal } = useCart();
  const navigate = useNavigate();
  const hasOverStock = items.some((i) => i.quantity > i.product.stock);

  return (
    <main className="container page">
      <h1>My Cart</h1>
      {loading && items.length === 0 ? (
        <Loading text="Loading your cart..." />
      ) : error ? (
        <ErrorState title="Unable to load your cart." onRetry={refresh} message={error} />
      ) : items.length === 0 ? (
        <EmptyState icon="🛒" title="Your cart is empty" message="Looks like you haven't added anything yet." actionLabel="Browse Products" actionTo="/products" />
      ) : (
        <div className="two-col">
          <ul className="cart-list card">
            {items.map((i) => <CartItem key={i.product._id} item={i} />)}
          </ul>
          <OrderSummary items={items.map((i) => ({ key: i.product._id, name: i.product.name, price: i.product.price, quantity: i.quantity }))} total={subtotal}>
            <button className="btn btn-primary btn-block" disabled={hasOverStock} onClick={() => navigate("/checkout")}>Proceed to Checkout</button>
            <Link className="btn btn-link center" to="/products">Continue Shopping</Link>
          </OrderSummary>
        </div>
      )}
    </main>
  );
}
