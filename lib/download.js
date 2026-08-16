import crypto from "crypto";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

export async function resolveDownloadToken(token) {
  const supabase = getSupabaseAdmin();
  const tokenHash = crypto.createHash("sha256").update(String(token)).digest("hex");

  const { data: tokenRow, error } = await supabase
    .from("download_tokens")
    .select("*")
    .eq("token_hash", tokenHash)
    .maybeSingle();

  if (error || !tokenRow) return null;
  if (new Date(tokenRow.expires_at) < new Date()) return null;
  if (tokenRow.download_count >= tokenRow.max_downloads) return null;

  const { data: order } = await supabase
    .from("orders")
    .select("*")
    .eq("id", tokenRow.order_id)
    .eq("status", "paid")
    .maybeSingle();

  if (!order) return null;

  const { data: files } = await supabase
    .from("product_files")
    .select("*")
    .eq("product_id", order.product_id)
    .order("sort_order", { ascending: true });

  return { tokenRow, order, files: files || [] };
}
