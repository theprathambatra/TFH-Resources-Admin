import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { fulfillOrder } from "@/lib/delivery";
import { verifyWebhookSignature } from "@/lib/razorpay";

export const runtime = "nodejs";

export async function POST(request) {
  const rawBody = await request.text();
  const signature = request.headers.get("x-razorpay-signature");

  try {
    if (!verifyWebhookSignature(rawBody, signature)) {
      return NextResponse.json({ error: "Invalid webhook signature." }, { status: 400 });
    }

    const event = JSON.parse(rawBody);

    if (!["order.paid", "payment.captured"].includes(event.event)) {
      return NextResponse.json({ ok: true });
    }

    const payment = event.payload?.payment?.entity;
    const razorpayOrderId =
      event.payload?.order?.entity?.id ||
      payment?.order_id;

    if (!razorpayOrderId) return NextResponse.json({ ok: true });

    const supabase = getSupabaseAdmin();
    const { data: order } = await supabase
      .from("orders")
      .select("*")
      .eq("razorpay_order_id", razorpayOrderId)
      .maybeSingle();

    if (order) {
      await fulfillOrder(order.id, payment?.id || order.razorpay_payment_id);
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("razorpay-webhook", error);
    return NextResponse.json({ error: "Webhook processing failed." }, { status: 500 });
  }
}
