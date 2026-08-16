import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { requireAdmin } from "@/lib/adminAuth";

export const runtime = "nodejs";

function extension(name = "") {
  const match = name.toLowerCase().match(/\.([a-z0-9]{1,8})$/);
  return match ? `.${match[1]}` : "";
}

export async function POST(request) {
  try {
    const auth = await requireAdmin(request);
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const body = await request.json();
    const kind = body.kind;
    const fileName = String(body.fileName || "");
    const contentType = String(body.contentType || "");

    if (!["cover", "pdf"].includes(kind) || !fileName) {
      return NextResponse.json({ error: "Invalid upload request." }, { status: 400 });
    }
    if (kind === "pdf" && !(contentType === "application/pdf" || fileName.toLowerCase().endsWith(".pdf"))) {
      return NextResponse.json({ error: "Only PDF files are allowed." }, { status: 400 });
    }
    if (kind === "cover" && contentType && !contentType.startsWith("image/")) {
      return NextResponse.json({ error: "Cover must be an image." }, { status: 400 });
    }

    const bucket = kind === "cover" ? "resource-covers" : (process.env.SUPABASE_STORAGE_BUCKET || "paid-resources");
    const folder = kind === "cover" ? "covers" : "resources";
    const path = `${folder}/${Date.now()}-${randomUUID()}${extension(fileName)}`;

    const { data, error } = await auth.supabase.storage.from(bucket).createSignedUploadUrl(path);
    if (error || !data?.token) throw error || new Error("Could not create upload URL.");

    return NextResponse.json({ bucket, path, token: data.token });
  } catch (error) {
    console.error("admin upload-url", error);
    return NextResponse.json({ error: "Could not prepare upload." }, { status: 500 });
  }
}
