import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { fallbackProducts } from "@/lib/fallbackProducts";

function normaliseProduct(p) {
  return {
    ...p,
    includes: Array.isArray(p.includes) ? p.includes : []
  };
}

export async function getProducts() {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return fallbackProducts;
  }

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .eq("active", true)
    .order("sort_order", { ascending: true });

  if (error) throw error;
  return (data || []).map(normaliseProduct);
}

export async function getProductBySlug(slug) {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return fallbackProducts.find(p => p.slug === slug) || null;
  }

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .eq("slug", slug)
    .eq("active", true)
    .maybeSingle();

  if (error) throw error;
  return data ? normaliseProduct(data) : null;
}
