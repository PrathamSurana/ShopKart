import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "./AuthContext";
import { addCartItem, errorMessage, fetchCart, isCanceled, removeCartItem, updateCartItem } from "../services/api";

// The single source of frontend truth for the cart. Navbar, product cards, cart and checkout all read from here.
const CartContext = createContext(null);

export function CartProvider({ children }) {
  const { user } = useAuth();
  const [items, setItems] = useState([]); // [{ product, quantity }]
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState({}); // productId -> true while a mutation for that product is in flight
  const controller = useRef(null);

  const refresh = useCallback(async () => {
    controller.current?.abort();
    const c = new AbortController();
    controller.current = c;
    setLoading(true);
    setError("");
    try {
      const data = await fetchCart(c.signal);
      setItems(data.cart);
    } catch (e) {
      if (!isCanceled(e)) setError(errorMessage(e, "Unable to load your cart."));
    } finally {
      if (controller.current === c) setLoading(false);
    }
  }, []);

  // Load when a user is logged in; reset when they log out.
  useEffect(() => {
    if (user) refresh();
    else {
      controller.current?.abort();
      setItems([]);
      setError("");
      setLoading(false);
    }
  }, [user, refresh]);

  // Every mutation: call backend -> replace state with the server's returned cart (no drift between views).
  const mutate = useCallback(async (productId, call) => {
    setBusy((b) => ({ ...b, [productId]: true }));
    try {
      const data = await call();
      setItems(data.cart);
      return { ok: true };
    } catch (e) {
      return { ok: false, message: errorMessage(e, "Could not update your cart.") };
    } finally {
      setBusy((b) => {
        const { [productId]: _drop, ...rest } = b;
        return rest;
      });
    }
  }, []);

  const addToCart = useCallback((id) => mutate(id, () => addCartItem(id)), [mutate]);
  const updateQuantity = useCallback((id, q) => mutate(id, () => updateCartItem(id, q)), [mutate]);
  const removeFromCart = useCallback((id) => mutate(id, () => removeCartItem(id)), [mutate]);
  const clearCartState = useCallback(() => setItems([]), []); // used after VERIFIED payment

  // Derived values: never stored.
  const itemCount = useMemo(() => items.reduce((n, i) => n + i.quantity, 0), [items]);
  const subtotal = useMemo(() => items.reduce((sum, i) => sum + i.product.price * i.quantity, 0), [items]);
  const quantityOf = useCallback((id) => items.find((i) => i.product._id === id)?.quantity ?? 0, [items]);

  const value = useMemo(
    () => ({ items, loading, error, busy, itemCount, subtotal, quantityOf, refresh, addToCart, updateQuantity, removeFromCart, clearCartState }),
    [items, loading, error, busy, itemCount, subtotal, quantityOf, refresh, addToCart, updateQuantity, removeFromCart, clearCartState]
  );
  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export const useCart = () => {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used inside <CartProvider>");
  return ctx;
};
