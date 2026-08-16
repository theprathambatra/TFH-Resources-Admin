import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { createDownloadToken, fulfillOrder } from "@/lib/delivery";
import { fetchRazorpayPayment, verifyCheckoutSignature } from "@/lib/razorpay";

export const runtime = "nodejs";

export async function POST(request) {
  try {
    const body = await request.json();
    const {
      internalOrderId,
      razorpay_payment_id: paymentId,
      razorpay_signature: signature
    } = body;

    const supabase = getSupabaseAdmin();
    const { data: order, error } = await supabase
      .from("orders")
      .select("*")
      .eq("id", internalOrderId)
      .single();

    if (error || !order || !order.razorpay_order_id) {
      return NextResponse.json({ error: "Order not found." }, { status: 404 });
    }

    const authentic = verifyCheckoutSignature({
      originalOrderId: order.razorpay_order_id,
      paymentId,
      signature
    });

    if (!authentic) {
      return NextResponse.json({ error: "Invalid payment signature." }, { status: 400 });
    }

    // Stronger than trusting the browser callback alone: ask Razorpay for payment state.
    const payment = await fetchRazorpayPayment(paymentId);

    if (payment.order_id !== order.razorpay_order_id) {
      return NextResponse.json({ error: "Payment does not match this order." }, { status: 400 });
    }

    if (payment.status !== "captured") {
      return NextResponse.json(
        { error: "Payment is not captured yet. Delivery will complete through the payment webhook." },
        { status: 409 }
      );
    }

    await fulfillOrder(order.id, paymentId);

    // Separate browser token. The email may have its own token.
    const downloadUrl = await createDownloadToken(order.id);

    return NextResponse.json({ ok: true, downloadUrl });
  } catch (error) {
    console.error("verify-payment", error);
    return NextResponse.json({ error: "Could not verify payment." }, { status: 500 });
  }
}
