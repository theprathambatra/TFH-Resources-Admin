import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminAuth";

export const runtime = "nodejs";

export async function PATCH(request, { params }) {
  try {
    const auth = await requireAdmin(request);
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
    const { id } = await params;
    const body = await request.json();
    const updates = {};

    if ("title" in body) updates.title = String(body.title || "").trim().slice(0, 180);
    if ("price_paise" in body) {
      const price = Number(body.price_paise);
      if (!Number.isInteger(price) || price <= 0) return NextResponse.json({ error: "Invalid price." }, { status: 400 });
      updates.price_paise = price;
    }
    for (const key of ["category", "skill", "level"]) if (key in body) updates[key] = String(body[key] || "").trim().slice(0, 80);
    if ("short_description" in body) updates.short_description = String(body.short_description || "").trim().slice(0, 500);
    if ("description" in body) updates.description = String(body.description || "").trim().slice(0, 5000);
    if ("includes" in body) updates.includes = Array.isArray(body.includes) ? body.includes.slice(0, 30) : [];
    if ("active" in body) updates.active = !!body.active;

    if (body.cover_upload?.storage_path) {
      const path = String(body.cover_upload.storage_path);
      const { data } = auth.supabase.storage.from("resource-covers").getPublicUrl(path);
      updates.cover_storage_path = path;
      updates.cover_path = data?.publicUrl || null;
    }

    if (Object.keys(updates).length) {
      const { error } = await auth.supabase.from("products").update(updates).eq("id", id);
      if (error) throw error;
    }

    if (Array.isArray(body.files) && body.files.length) {
      const { data: last } = await auth.supabase.from("product_files").select("sort_order").eq("product_id", id).order("sort_order", { ascending: false }).limit(1);
      let sort = (last?.[0]?.sort_order || 0) + 10;
      const rows = body.files.map(file => ({
        product_id: id,
        display_name: String(file.display_name || file.file_name || "Resource").slice(0, 180),
        file_name: String(file.file_name || "resource.pdf").slice(0, 180),
        storage_path: String(file.storage_path),
        sort_order: sort += 10
      }));
      const { error } = await auth.supabase.from("product_files").insert(rows);
      if (error) throw error;
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("admin update product", error);
    return NextResponse.json({ error: "Could not update resource." }, { status: 500 });
  }
}
