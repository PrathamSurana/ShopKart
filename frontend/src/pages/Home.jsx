import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useCart } from "../context/CartContext";

export default function Home() {
  const { user } = useAuth(); // loaded from GET /customers/me
  const { itemCount } = useCart();
  return (
    <main className="container page">
      <section className="card hero">
        <h1>Welcome, {user.fullName}! 👋</h1>
        <dl className="profile">
          <div><dt>Name</dt><dd>{user.fullName}</dd></div>
          <div><dt>Email</dt><dd>{user.email}</dd></div>
          <div><dt>Phone</dt><dd>{user.phone}</dd></div>
        </dl>
      </section>
      <section className="tiles">
        <Link to="/products" className="card tile"><span aria-hidden="true">🛍️</span><h2>Browse products</h2><p className="muted">Search and filter the catalogue.</p></Link>
        <Link to="/wishlist" className="card tile"><span aria-hidden="true">❤️</span><h2>Wishlist</h2><p className="muted">Products you saved for later.</p></Link>
        <Link to="/cart" className="card tile"><span aria-hidden="true">🛒</span><h2>Cart ({itemCount})</h2><p className="muted">Review and check out.</p></Link>
        <Link to="/orders" className="card tile"><span aria-hidden="true">📦</span><h2>My orders</h2><p className="muted">Track your purchases.</p></Link>
      </section>
    </main>
  );
}
