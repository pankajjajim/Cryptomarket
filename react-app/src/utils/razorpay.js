/**
 * Loads Razorpay Checkout script once (https://razorpay.com/docs/payments/payment-gateway/web-integration/standard/)
 */
export function loadRazorpayScript() {
  return new Promise((resolve, reject) => {
    if (typeof window !== "undefined" && window.Razorpay) {
      resolve();
      return;
    }
    const existing = document.getElementById("razorpay-checkout-js");
    if (existing) {
      const t = setInterval(() => {
        if (window.Razorpay) {
          clearInterval(t);
          resolve();
        }
      }, 30);
      setTimeout(() => {
        clearInterval(t);
        if (!window.Razorpay) reject(new Error("Razorpay script timeout"));
      }, 15000);
      return;
    }
    const s = document.createElement("script");
    s.id = "razorpay-checkout-js";
    s.src = "https://checkout.razorpay.com/v1/checkout.js";
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("Failed to load Razorpay"));
    document.body.appendChild(s);
  });
}
