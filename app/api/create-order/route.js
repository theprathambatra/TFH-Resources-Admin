import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { getProductBySlug } from "@/lib/products";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { createRazorpayOrder } from "@/lib/razorpay";

export const runtime = "nodejs";

function validEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export async function POST(request) {
  try {
    const body = await request.json();
    const name = String(body.name || "").trim().slice(0, 120);
    const email = String(body.email || "").trim().toLowerCase().slice(0, 254);
    const slug = String(body.slug || "").trim();

    if (name.length < 2 || !validEmail(email) || !slug) {
      return NextResponse.json({ error: "Please enter a valid name and email." }, { status: 400 });
    }

    // The server loads the product and price. Never trust a browser-supplied amount.
    const product = await getProductBySlug(slug);
    if (!product) {
      return NextResponse.json({ error: "This resource is unavailable." }, { status: 404 });
    }

    const supabase = getSupabaseAdmin();
    const internalOrderId = randomUUID();

    const { error: insertError } = await supabase.from("orders").insert({
      id: internalOrderId,
      product_id: product.id,
      product_title: product.title,
      name,
      email,
      amount_paise: product.price_paise,
      currency: "INR",
      status: "pending"
    });

    if (insertError) throw insertError;

    const razorpayOrder = await createRazorpayOrder({
      amount: product.price_paise,
      currency: "INR",
      receipt: `TFH-${internalOrderId.replaceAll("-", "").slice(0, 20)}`,
      notes: {
        tfh_order_id: internalOrderId,
        product_slug: product.slug
      }
    });

    const { error: updateError } = await supabase
      .from("orders")
      .update({ razorpay_order_id: razorpayOrder.id })
      .eq("id", internalOrderId);

    if (updateError) throw updateError;

    return NextResponse.json({
      internalOrderId,
      razorpayOrderId: razorpayOrder.id,
      razorpayKeyId: process.env.RAZORPAY_KEY_ID,
      amount: product.price_paise,
      currency: "INR"
    });
  } catch (error) {
    console.error("create-order", error);
    return NextResponse.json({ error: "Could not start secure checkout." }, { status: 500 });
  }
}
