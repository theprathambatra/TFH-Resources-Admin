import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PUBLIC_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Cache-Control": "no-store"
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: PUBLIC_HEADERS });
}

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

    return NextResponse.json(
      { batches: data || [], timezone: "Asia/Kolkata" },
      { headers: PUBLIC_HEADERS }
    );
  } catch (error) {
    console.error("public batch availability", error);
    return NextResponse.json(
      { error: "Batch availability is temporarily unavailable.", batches: [] },
      { status: 500, headers: PUBLIC_HEADERS }
    );
  }
}
