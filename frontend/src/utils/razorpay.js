let loading = null;

/** Loads Razorpay Standard Checkout once. Resolves false (never throws) when the script can't load. */
export function loadRazorpayScript() {
  if (typeof window !== "undefined" && window.Razorpay) return Promise.resolve(true);
  if (loading) return loading;
  loading = new Promise((resolve) => {
    const s = document.createElement("script");
    s.src = "https://checkout.razorpay.com/v1/checkout.js";
    s.onload = () => resolve(true);
    s.onerror = () => {
      loading = null; // allow a retry
      resolve(false);
    };
    document.body.appendChild(s);
  });
  return loading;
}
