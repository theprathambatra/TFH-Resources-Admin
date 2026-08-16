import crypto from "crypto";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

function siteUrl() {
  return (process.env.SITE_URL || "").replace(/\/$/, "");
}

export async function createDownloadToken(orderId, days = 30) {
  const supabase = getSupabaseAdmin();
  const token = crypto.randomBytes(32).toString("hex");
  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
  const expires = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();

  const { error } = await supabase.from("download_tokens").insert({
    order_id: orderId,
    token_hash: tokenHash,
    expires_at: expires,
    max_downloads: 10
  });

  if (error) throw error;

  return `${siteUrl()}/download/${token}`;
}

export async function sendDeliveryEmail(order, downloadUrl) {
  if (!process.env.RESEND_API_KEY || !process.env.RESEND_FROM_EMAIL) {
    console.warn("Resend is not configured; delivery email skipped.");
    return;
  }

  const html = `
  <div style="margin:0;padding:42px 18px;background:#F5F2EC;color:#171719;font-family:Arial,sans-serif">
    <div style="max-width:620px;margin:auto">
      <div style="font-family:Georgia,serif;font-size:27px;margin-bottom:64px">the français hub.</div>
      <div style="font-size:10px;letter-spacing:.16em;text-transform:uppercase;color:#8A2938;font-weight:700">Purchase complete</div>
      <h1 style="font-family:Georgia,serif;font-size:54px;font-weight:400;line-height:1;margin:12px 0 22px">Merci, your resource is ready.</h1>
      <p style="font-size:14px;line-height:1.8;color:#706E6A">Your payment for <strong style="color:#171719">${escapeHtml(order.product_title)}</strong> was successful.</p>
      <p style="margin:30px 0">
        <a href="${downloadUrl}" style="display:inline-block;background:#8A2938;color:white;text-decoration:none;padding:16px 22px;font-size:12px;font-weight:700">Open your resource</a>
      </p>
      <p style="font-size:11px;line-height:1.7;color:#706E6A">This access link is personal to your purchase. If you have any issue opening the resource, reply to the contact address provided by The Français Hub.</p>
      <div style="border-top:1px solid #DAD5CD;margin-top:44px;padding-top:18px;font-size:11px;color:#706E6A">À bientôt,<br>The Français Hub</div>
    </div>
  </div>`;

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${process.env.RESEND_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      from: process.env.RESEND_FROM_EMAIL,
      to: [order.email],
      subject: `Your TFH resource: ${order.product_title}`,
      html
    })
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Resend failed: ${body}`);
  }
}

function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export async function fulfillOrder(orderId, paymentId) {
  const supabase = getSupabaseAdmin();

  const { data: order, error: fetchError } = await supabase
    .from("orders")
    .select("*")
    .eq("id", orderId)
    .single();

  if (fetchError || !order) throw fetchError || new Error("Order not found.");

  if (order.status !== "paid") {
    const { error: updateError } = await supabase
      .from("orders")
      .update({
        status: "paid",
        razorpay_payment_id: paymentId || order.razorpay_payment_id,
        paid_at: new Date().toISOString()
      })
      .eq("id", orderId);

    if (updateError) throw updateError;
  }

  if (!order.email_sent_at) {
    // Claim email delivery atomically so the browser callback and webhook cannot
    // both send the same purchase email at the same time.
    const claimedAt = new Date().toISOString();
    const { data: claim } = await supabase
      .from("orders")
      .update({ email_claimed_at: claimedAt })
      .eq("id", orderId)
      .is("email_sent_at", null)
      .is("email_claimed_at", null)
      .select("id")
      .maybeSingle();

    if (claim) {
      try {
        const emailUrl = await createDownloadToken(orderId);
        await sendDeliveryEmail(order, emailUrl);

        await supabase
          .from("orders")
          .update({ email_sent_at: new Date().toISOString() })
          .eq("id", orderId);
      } catch (emailError) {
        // Release the claim so a Razorpay retry can attempt delivery again.
        await supabase
          .from("orders")
          .update({ email_claimed_at: null })
          .eq("id", orderId)
          .eq("email_claimed_at", claimedAt);
        throw emailError;
      }
    }
  }

  return true;
}
