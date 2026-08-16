"use client";

import { useState } from "react";

export default function CheckoutBox({ product }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(null);

  async function beginCheckout(e) {
    e.preventDefault();
    setError("");

    if (!window.Razorpay) {
      setError("Secure checkout is still loading. Please try again in a moment.");
      return;
    }

    setBusy(true);

    try {
      const createRes = await fetch("/api/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug: product.slug,
          name: name.trim(),
          email: email.trim()
        })
      });

      const order = await createRes.json();
      if (!createRes.ok) throw new Error(order.error || "Could not start checkout.");

      const options = {
        key: order.razorpayKeyId,
        amount: order.amount,
        currency: order.currency,
        name: "The Français Hub",
        description: product.title,
        order_id: order.razorpayOrderId,
        prefill: { name, email },
        theme: { color: "#8A2938" },
        modal: {
          ondismiss: () => setBusy(false)
        },
        handler: async function (response) {
          try {
            const verifyRes = await fetch("/api/verify-payment", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                internalOrderId: order.internalOrderId,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_order_id: response.razorpay_order_id,
                razorpay_signature: response.razorpay_signature
              })
            });

            const verified = await verifyRes.json();
            if (!verifyRes.ok) throw new Error(verified.error || "Payment verification failed.");

            setSuccess({
              email,
              downloadUrl: verified.downloadUrl
            });
          } catch (verifyError) {
            setError(
              "Your payment may have succeeded, but we could not confirm delivery on this screen. " +
              "Please check your email. If nothing arrives, contact TFH with your payment reference."
            );
          } finally {
            setBusy(false);
          }
        }
      };

      const rzp = new window.Razorpay(options);
      rzp.on("payment.failed", function () {
        setError("The payment was not completed. No resource has been unlocked.");
        setBusy(false);
      });
      rzp.open();
    } catch (err) {
      setError(err.message || "Something went wrong.");
      setBusy(false);
    }
  }

  if (success) {
    return (
      <div className="success-panel">
        <div className="eyebrow">Purchase complete</div>
        <h2 className="success-title">Merci.</h2>
        <p>
          Your resource is ready. We have also sent access to <strong>{success.email}</strong>.
        </p>
        <div className="success-actions">
          <a className="primary-btn" href={success.downloadUrl}>Open resource</a>
        </div>
      </div>
    );
  }

  return (
    <form className="checkout-box" onSubmit={beginCheckout}>
      <div className="eyebrow">Secure purchase</div>
      <div className="field-row" style={{marginTop: 16}}>
        <input
          className="field"
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="Your name"
          autoComplete="name"
          required
        />
        <input
          className="field"
          value={email}
          onChange={e => setEmail(e.target.value)}
          placeholder="Email for delivery"
          type="email"
          autoComplete="email"
          required
        />
      </div>
      <button className="primary-btn" disabled={busy}>
        {busy ? "Opening secure checkout…" : "Purchase resource"}
      </button>
      <div className="microcopy">
        Secure payment via Razorpay. Your PDF is unlocked only after server-side payment verification.
      </div>
      {error && <div className="error">{error}</div>}
    </form>
  );
}
