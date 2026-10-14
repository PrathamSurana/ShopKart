import { useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useCart } from "../context/CartContext";
import { createPaymentOrder, errorMessage, verifyPayment } from "../services/api";
import { validateShipping } from "../utils/validation";
import { loadRazorpayScript } from "../utils/razorpay";
import FormField from "../components/FormField";
import OrderSummary from "../components/OrderSummary";
import { EmptyState, ErrorState, Loading } from "../components/StateViews";

const EMPTY = { fullName: "", phone: "", addressLine1: "", city: "", state: "", pincode: "" };

export default function Checkout() {
  const { user } = useAuth();
  const { items, loading, error, refresh, subtotal, clearCartState } = useCart();
  const navigate = useNavigate();
  const [values, setValues] = useState({ ...EMPTY, fullName: user?.fullName ?? "", phone: user?.phone ?? "" });
  const [errors, setErrors] = useState({});
  const [phase, setPhase] = useState("idle"); // idle | creating | paying | verifying
  const [message, setMessage] = useState(null); // { type: 'error' | 'info', text }
  const handled = useRef(false); // a Razorpay success callback must be processed only once

  if (loading && items.length === 0) return <main className="container page"><Loading text="Loading your cart..." /></main>;
  if (error) return <main className="container page"><ErrorState title="Unable to load your cart." message={error} onRetry={refresh} /></main>;
  if (items.length === 0 && phase === "idle")
    return (
      <main className="container page">
        <EmptyState icon="🛒" title="Your cart is empty" message="Add something to your cart before checking out." actionLabel="Browse Products" actionTo="/products" />
      </main>
    );

  const busy = phase !== "idle";
  const onChange = (e) => setValues((v) => ({ ...v, [e.target.name]: e.target.value }));

  async function onSubmit(e) {
    e.preventDefault();
    if (busy) return;
    setMessage(null);
    const v = validateShipping(values);
    setErrors(v);
    if (Object.keys(v).length) return; // no backend call when client validation fails

    const shippingAddress = Object.fromEntries(Object.entries(values).map(([k, val]) => [k, val.trim()]));
    setPhase("creating");
    let data;
    try {
      data = await createPaymentOrder(shippingAddress); // server re-validates cart, stock and prices
    } catch (err) {
      const serverErrors = err.response?.data?.errors;
      if (serverErrors) setErrors(serverErrors);
      setMessage({ type: "error", text: errorMessage(err, "Could not start checkout.") });
      setPhase("idle");
      refresh(); // cart/stock may have changed
      return;
    }

    if (!(await loadRazorpayScript())) {
      setMessage({ type: "error", text: "Could not load the payment gateway. Check your internet connection and try again. Your cart has not been changed." });
      setPhase("idle");
      return;
    }

    handled.current = false;
    const rzp = new window.Razorpay({
      key: data.key || import.meta.env.VITE_RAZORPAY_KEY_ID,
      amount: data.amount,
      currency: data.currency,
      name: "ShopKart",
      description: "ShopKart Order",
      order_id: data.razorpayOrderId,
      prefill: { name: shippingAddress.fullName, contact: shippingAddress.phone, email: user?.email },
      theme: { color: "#4f46e5" },
      // NOT proof of payment. We only forward these values; the server decides.
      handler: async (response) => {
        if (handled.current) return;
        handled.current = true;
        setPhase("verifying");
        try {
          const res = await verifyPayment({
            shopKartOrderId: data.shopKartOrderId,
            razorpay_order_id: response.razorpay_order_id,
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_signature: response.razorpay_signature,
          });
          clearCartState(); // server cleared its cart after verification; mirror it so Navbar shows Cart (0)
          refresh();
          navigate(`/order-success/${res.order._id}`, { replace: true });
        } catch (err) {
          handled.current = false;
          setMessage({
            type: "error",
            text: `${errorMessage(err, "We could not verify your payment.")} Your cart has not been cleared. If money was deducted, do not pay again; contact support with order ID ${data.shopKartOrderId}.`,
          });
          setPhase("idle");
        }
      },
      modal: {
        ondismiss: () => {
          if (handled.current) return; // closed after success
          setMessage({ type: "info", text: "Payment cancelled. Your cart has not been cleared. You can try again whenever you're ready." });
          setPhase("idle");
        },
      },
    });
    rzp.on("payment.failed", (resp) => {
      setMessage({ type: "error", text: `Payment failed${resp?.error?.description ? `: ${resp.error.description}` : ""}. Your cart has not been cleared. Please try again.` });
    });
    setPhase("paying");
    rzp.open();
  }

  const label = { idle: "Place Order", creating: "Preparing payment...", paying: "Waiting for payment...", verifying: "Verifying payment..." }[phase];
  return (
    <main className="container page">
      <h1>Checkout</h1>
      {message && <p className={`alert ${message.type === "error" ? "alert-error" : "alert-info"}`} role="alert">{message.text}</p>}
      <div className="two-col">
        <form className="card" onSubmit={onSubmit} noValidate aria-label="Shipping details">
          <h2>Shipping Details</h2>
          <FormField id="fullName" label="Full Name" autoComplete="name" value={values.fullName} onChange={onChange} error={errors.fullName} disabled={busy} />
          <FormField id="phone" label="Phone" type="tel" autoComplete="tel" value={values.phone} onChange={onChange} error={errors.phone} disabled={busy} />
          <FormField id="addressLine1" label="Address" autoComplete="street-address" value={values.addressLine1} onChange={onChange} error={errors.addressLine1} disabled={busy} />
          <div className="row-2">
            <FormField id="city" label="City" autoComplete="address-level2" value={values.city} onChange={onChange} error={errors.city} disabled={busy} />
            <FormField id="state" label="State" autoComplete="address-level1" value={values.state} onChange={onChange} error={errors.state} disabled={busy} />
          </div>
          <FormField id="pincode" label="Pincode" inputMode="numeric" maxLength={6} autoComplete="postal-code" value={values.pincode} onChange={onChange} error={errors.pincode} disabled={busy} />
          <button className="btn btn-primary btn-block" type="submit" disabled={busy}>{label}</button>
          <p className="muted small">Payments run in Razorpay <strong>Test Mode</strong>. No real money is charged.</p>
        </form>
        <OrderSummary items={items.map((i) => ({ key: i.product._id, name: i.product.name, price: i.product.price, quantity: i.quantity }))} total={subtotal}>
          <Link className="btn btn-link center" to="/cart">Edit cart</Link>
        </OrderSummary>
      </div>
    </main>
  );
}
