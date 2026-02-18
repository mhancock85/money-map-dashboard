import { createBrowserSupabaseClient } from "./supabase/browser";

// Backwards-compatible export for existing imports.
export const supabase = createBrowserSupabaseClient();
