import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SCRIPT_HEADERS = {
  "Content-Type": "application/javascript; charset=utf-8",
  "Cache-Control": "no-store",
  "Cross-Origin-Resource-Policy": "cross-origin",
  "X-Content-Type-Options": "nosniff"
};

export async function GET() {
  try {
    const supabase = getSupabaseAdmin();
    const today = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Kolkata",
      year: "numeric",
      month: "2-digit",
      day: "2-digit"
    }).format(new Date());

    const { data, error } = await supabase
      .from("batches")
      .select("id,course,level,name,days,start_time,end_time,start_date,end_date,total_seats,seats_remaining,status,timezone,sort_order")
      .neq("status", "hidden")
      .or(`end_date.is.null,end_date.gte.${today}`)
      .order("sort_order", { ascending: true })
      .order("start_time", { ascending: true });

    if (error) throw error;

    const payload = JSON.stringify({ batches: data || [], timezone: "Asia/Kolkata" })
      .replace(/</g, "\\u003c")
      .replace(/\u2028/g, "\\u2028")
      .replace(/\u2029/g, "\\u2029");

    return new NextResponse(`window.__TFH_BATCH_PAYLOAD__ = ${payload};`, {
      status: 200,
      headers: SCRIPT_HEADERS
    });
  } catch (error) {
    console.error("public batch script fallback", error);
    return new NextResponse(
      "window.__TFH_BATCH_PAYLOAD__ = { batches: [], error: 'Batch availability is temporarily unavailable.' };",
      { status: 200, headers: SCRIPT_HEADERS }
    );
  }
}
