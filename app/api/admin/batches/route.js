import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminAuth";

export const runtime = "nodejs";

const COURSES = ["TEF", "TCF", "DELF"];
const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const STATUSES = ["available", "few_seats", "full", "waitlist", "hidden"];

function timeToMinutes(value) {
  const match = String(value || "").match(/^(\d{2}):(\d{2})(?::\d{2})?$/);
  if (!match) return NaN;
  return Number(match[1]) * 60 + Number(match[2]);
}

function cleanBatch(body = {}) {
  const course = String(body.course || "").trim();
  const name = String(body.name || "").trim().slice(0, 180);
  const level = String(body.level || "").trim().slice(0, 80) || null;
  const days = Array.isArray(body.days) ? [...new Set(body.days.map(String))] : [];
  const startTime = String(body.start_time || "").slice(0, 5);
  const endTime = String(body.end_time || "").slice(0, 5);
  const start = timeToMinutes(startTime);
  const end = timeToMinutes(endTime);
  const totalSeats = Number(body.total_seats);
  const seatsRemaining = Number(body.seats_remaining);
  const status = String(body.status || "available");
  const startDate = body.start_date ? String(body.start_date) : null;
  const endDate = body.end_date ? String(body.end_date) : null;

  if (!COURSES.includes(course)) throw new Error("Choose TEF, TCF or DELF.");
  if (!name) throw new Error("Add a batch name.");
  if (!days.length || days.some(day => !DAYS.includes(day))) throw new Error("Choose at least one day from Monday to Saturday.");
  if (!Number.isFinite(start) || !Number.isFinite(end) || start < 480 || end > 1080 || end <= start) throw new Error("Batch time must stay between 8:00 AM and 6:00 PM IST.");
  if (!Number.isInteger(totalSeats) || totalSeats < 1) throw new Error("Total seats must be at least 1.");
  if (!Number.isInteger(seatsRemaining) || seatsRemaining < 0 || seatsRemaining > totalSeats) throw new Error("Seats remaining must be between 0 and total seats.");
  if (!STATUSES.includes(status)) throw new Error("Choose a valid batch status.");
  if (startDate && endDate && endDate < startDate) throw new Error("End date cannot be before start date.");

  return {
    course,
    level,
    name,
    days,
    start_time: startTime,
    end_time: endTime,
    start_date: startDate,
    end_date: endDate,
    total_seats: totalSeats,
    seats_remaining: seatsRemaining,
    status,
    timezone: "Asia/Kolkata",
    sort_order: Number.isInteger(Number(body.sort_order)) ? Number(body.sort_order) : 100
  };
}

export async function GET(request) {
  const auth = await requireAdmin(request);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { data, error } = await auth.supabase
    .from("batches")
    .select("*")
    .order("sort_order", { ascending: true })
    .order("start_time", { ascending: true });

  if (error) return NextResponse.json({ error: "Could not load batches." }, { status: 500 });
  return NextResponse.json({ batches: data || [] });
}

export async function POST(request) {
  try {
    const auth = await requireAdmin(request);
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const payload = cleanBatch(await request.json());
    const { data, error } = await auth.supabase.from("batches").insert(payload).select("*").single();
    if (error) throw error;

    return NextResponse.json({ ok: true, batch: data });
  } catch (error) {
    console.error("admin create batch", error);
    const message = error?.message || "Could not create batch.";
    const known = message.startsWith("Choose") || message.startsWith("Add") || message.startsWith("Batch") || message.startsWith("Total") || message.startsWith("Seats") || message.startsWith("End");
    return NextResponse.json({ error: known ? message : "Could not create batch." }, { status: known ? 400 : 500 });
  }
}
