import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { Database } from "../../../supabase/types";
import { getSupabaseConfig } from "./config";

export async function createServerSupabaseClient() {
  const cookieStore = await cookies();
  const { supabaseUrl, supabaseAnonKey } = getSupabaseConfig();

  return createServerClient<Database>(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // Server Components cannot always write cookies; middleware handles refresh.
        }
      },
    },
  });
}
