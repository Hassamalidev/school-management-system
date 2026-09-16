"use client";

import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

/**
 * A single browser client shared by the whole app. The session is persisted in
 * localStorage, so a refresh keeps the user signed in.
 */
export const supabase = createClient(url || "http://localhost", key || "public-anon-key", {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    storageKey: "kindle-sprout-auth",
  },
});

export const supabaseConfigured = Boolean(url && key);
