import crypto from "crypto";

function authHeader() {
  const id = process.env.RAZORPAY_KEY_ID;
  const secret = process.env.RAZORPAY_KEY_SECRET;
  if (!id || !secret) throw new Error("Razorpay environment variables are missing.");
  return "Basic " + Buffer.from(`${id}:${secret}`).toString("base64");
}

export async function createRazorpayOrder({ amount, currency = "INR", receipt, notes = {} }) {
  const response = await fetch("https://api.razorpay.com/v1/orders", {
    method: "POST",
    headers: {
      "Authorization": authHeader(),
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ amount, currency, receipt, notes })
  });

  const body = await response.json();
  if (!response.ok) {
    throw new Error(body?.error?.description || "Razorpay order creation failed.");
  }
  return body;
}

export async function fetchRazorpayPayment(paymentId) {
  const response = await fetch(`https://api.razorpay.com/v1/payments/${encodeURIComponent(paymentId)}`, {
    headers: { "Authorization": authHeader() },
    cache: "no-store"
  });

  const body = await response.json();
  if (!response.ok) throw new Error(body?.error?.description || "Could not verify payment status.");
  return body;
}

export function verifyCheckoutSignature({ originalOrderId, paymentId, signature }) {
  const generated = crypto
    .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
    .update(`${originalOrderId}|${paymentId}`)
    .digest("hex");

  const a = Buffer.from(generated);
  const b = Buffer.from(String(signature || ""));
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

export function verifyWebhookSignature(rawBody, receivedSignature) {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret) throw new Error("RAZORPAY_WEBHOOK_SECRET is missing.");

  const generated = crypto
    .createHmac("sha256", secret)
    .update(rawBody)
    .digest("hex");

  const a = Buffer.from(generated);
  const b = Buffer.from(String(receivedSignature || ""));
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}
