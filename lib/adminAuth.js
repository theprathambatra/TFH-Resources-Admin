import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

export async function requireAdmin(request) {
  const header = request.headers.get("authorization") || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return { ok: false, status: 401, error: "Not signed in." };

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase.auth.getUser(token);
  const user = data?.user;
  if (error || !user) return { ok: false, status: 401, error: "Invalid session." };

  const { data: admin } = await supabase
    .from("admins")
    .select("user_id,email")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!admin) return { ok: false, status: 403, error: "This account is not a TFH admin." };
  return { ok: true, user, admin, supabase };
}
