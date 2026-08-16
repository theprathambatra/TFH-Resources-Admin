import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { requireAdmin } from "@/lib/adminAuth";

export const runtime = "nodejs";

function slugify(value = "") {
  return value.toLowerCase().normalize("NFKD").replace(/[^\w\s-]/g, "").trim().replace(/[\s_-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80);
}

async function uniqueSlug(supabase, title) {
  const base = slugify(title) || `resource-${Date.now()}`;
  const { data } = await supabase.from("products").select("id").eq("slug", base).maybeSingle();
  return data ? `${base}-${randomUUID().slice(0, 6)}` : base;
}

export async function GET(request) {
  const auth = await requireAdmin(request);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { data, error } = await auth.supabase.from("products").select("*").order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: "Could not load resources." }, { status: 500 });
  return NextResponse.json({ products: data || [] });
}

export async function POST(request) {
  try {
    const auth = await requireAdmin(request);
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const body = await request.json();
    const title = String(body.title || "").trim().slice(0, 180);
    const price = Number(body.price_paise);
    if (!title || !Number.isInteger(price) || price <= 0) {
      return NextResponse.json({ error: "Title and valid price are required." }, { status: 400 });
    }
    if (!Array.isArray(body.files) || body.files.length === 0) {
      return NextResponse.json({ error: "Upload at least one PDF." }, { status: 400 });
    }

    const slug = await uniqueSlug(auth.supabase, title);
    let coverPath = null;
    let coverStoragePath = null;
    if (body.cover_upload?.storage_path) {
      coverStoragePath = String(body.cover_upload.storage_path);
      const { data } = auth.supabase.storage.from("resource-covers").getPublicUrl(coverStoragePath);
      coverPath = data?.publicUrl || null;
    }

    const { data: product, error: productError } = await auth.supabase.from("products").insert({
      slug,
      title,
      short_description: String(body.short_description || "").trim().slice(0, 500),
      description: String(body.description || "").trim().slice(0, 5000),
      category: String(body.category || "").trim().slice(0, 80),
      skill: String(body.skill || "").trim().slice(0, 80),
      level: String(body.level || "").trim().slice(0, 80),
      price_paise: price,
      cover_path: coverPath,
      cover_storage_path: coverStoragePath,
      includes: Array.isArray(body.includes) ? body.includes.slice(0, 30) : [],
      active: body.active !== false,
      sort_order: 100
    }).select("*").single();

    if (productError) throw productError;

    const files = body.files.map((file, index) => ({
      product_id: product.id,
      display_name: String(file.display_name || file.file_name || `Resource ${index + 1}`).slice(0, 180),
      file_name: String(file.file_name || `resource-${index + 1}.pdf`).slice(0, 180),
      storage_path: String(file.storage_path),
      sort_order: (index + 1) * 10
    }));

    const { error: filesError } = await auth.supabase.from("product_files").insert(files);
    if (filesError) throw filesError;

    return NextResponse.json({ ok: true, product });
  } catch (error) {
    console.error("admin create product", error);
    return NextResponse.json({ error: "Could not create resource." }, { status: 500 });
  }
}
