"use client";

import { createClient } from "@supabase/supabase-js";

let browserClient;

export function getSupabaseBrowser() {
  if (!browserClient) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

    if (!url || !key) throw new Error("Supabase browser environment variables are missing.");
    browserClient = createClient(url, key);
  }
  return browserClient;
}
