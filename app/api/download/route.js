import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { resolveDownloadToken } from "@/lib/download";

export const runtime = "nodejs";

export async function GET(request) {
  try {
    const url = new URL(request.url);
    const token = url.searchParams.get("token");
    const fileId = url.searchParams.get("file");

    if (!token || !fileId) {
      return NextResponse.json({ error: "Missing download information." }, { status: 400 });
    }

    const resolved = await resolveDownloadToken(token);
    if (!resolved) {
      return NextResponse.json({ error: "This download link is no longer valid." }, { status: 403 });
    }

    const file = resolved.files.find(f => String(f.id) === String(fileId));
    if (!file) {
      return NextResponse.json({ error: "File not included in this purchase." }, { status: 403 });
    }

    const supabase = getSupabaseAdmin();
    const bucket = process.env.SUPABASE_STORAGE_BUCKET || "paid-resources";

    const { data, error } = await supabase
      .storage
      .from(bucket)
      .createSignedUrl(file.storage_path, 90, {
        download: file.file_name || true
      });

    if (error || !data?.signedUrl) throw error || new Error("Could not create signed URL.");

    await supabase
      .from("download_tokens")
      .update({ download_count: resolved.tokenRow.download_count + 1 })
      .eq("id", resolved.tokenRow.id);

    return Response.redirect(data.signedUrl, 302);
  } catch (error) {
    console.error("download", error);
    return NextResponse.json({ error: "Could not prepare download." }, { status: 500 });
  }
}
