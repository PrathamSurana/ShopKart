import { useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useCart } from "../context/CartContext";

export default function Navbar() {
  const { user, logout } = useAuth();
  const { itemCount } = useCart();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const close = () => setOpen(false);
  async function handleLogout() {
    setLoggingOut(true);
    await logout();
    setLoggingOut(false);
    close();
    navigate("/login", { replace: true });
  }
  const cls = ({ isActive }) => (isActive ? "nav-link active" : "nav-link");

  return (
    <header className="navbar">
      <div className="container nav-inner">
        <Link to={user ? "/home" : "/login"} className="brand" onClick={close}>
          🛒 ShopKart
        </Link>
        <button className="nav-toggle" aria-label="Toggle menu" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
          ☰
        </button>
        <nav className={`nav-links ${open ? "open" : ""}`} aria-label="Main">
          {user ? (
            <>
              <NavLink to="/home" className={cls} onClick={close}>Home</NavLink>
              <NavLink to="/products" className={cls} onClick={close}>Products</NavLink>
              <NavLink to="/wishlist" className={cls} onClick={close}>Wishlist</NavLink>
              <NavLink to="/orders" className={cls} onClick={close}>Orders</NavLink>
              <NavLink to="/cart" className={cls} onClick={close}>
                Cart <span className="count" aria-label={`${itemCount} items in cart`}>({itemCount})</span>
              </NavLink>
              <button className="btn btn-outline btn-sm" onClick={handleLogout} disabled={loggingOut}>
                {loggingOut ? "Logging out..." : "Logout"}
              </button>
            </>
          ) : (
            <>
              <NavLink to="/login" className={cls} onClick={close}>Login</NavLink>
              <NavLink to="/register" className={cls} onClick={close}>Register</NavLink>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
