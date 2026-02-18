import { type EmailOtpType } from "@supabase/supabase-js";
import { type NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { getSupabaseConfig } from "@/lib/supabase/config";
import type { Database } from "../../../../supabase/types";

/**
 * Server-side Route Handler for the auth callback.
 *
 * Supabase magic-link / PKCE flow redirects here with either:
 *   - ?code=xxx            (PKCE flow — needs server-side exchange)
 *   - ?token_hash=xxx&type=magiclink (older email OTP flow)
 *
 * We create the Supabase client directly here (instead of using
 * createServerSupabaseClient) because Route Handlers need to write
 * cookies onto the outgoing Response, not via next/headers cookies().
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const next = searchParams.get("next") ?? "/";

  // Build the success redirect URL
  const redirectTo = request.nextUrl.clone();
  redirectTo.pathname = next;
  redirectTo.searchParams.delete("code");
  redirectTo.searchParams.delete("token_hash");
  redirectTo.searchParams.delete("type");
  redirectTo.searchParams.delete("next");

  // We need a mutable response so the Supabase client can set session cookies.
  // Start with the success redirect — we'll override if there's an error.
  const { supabaseUrl, supabaseAnonKey } = getSupabaseConfig();

  // Log incoming params for debugging
  const cookieNames = request.cookies.getAll().map((c) => c.name);
  console.log("[auth/callback] params:", { code: !!code, tokenHash: !!tokenHash, type, next });
  console.log("[auth/callback] cookie names:", cookieNames);

  let response = NextResponse.redirect(redirectTo);

  const supabase = createServerClient<Database>(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
      },
    },
  });

  if (code) {
    // PKCE flow — exchange the authorisation code for a session.
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      console.log("[auth/callback] Code exchange succeeded — redirecting to:", next);
      return response;
    }

    console.error("[auth/callback] Code exchange failed:", error.message, error.status);

    // Build error redirect
    const errorUrl = request.nextUrl.clone();
    errorUrl.pathname = "/auth/login";
    errorUrl.searchParams.set("error", "code_exchange_failed");
    errorUrl.searchParams.set("detail", error.message.substring(0, 100));
    errorUrl.searchParams.delete("code");
    errorUrl.searchParams.delete("token_hash");
    errorUrl.searchParams.delete("type");
    return NextResponse.redirect(errorUrl);
  }

  if (tokenHash && type) {
    // Email-link flow using a token hash
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });

    if (!error) {
      console.log("[auth/callback] OTP verification succeeded — redirecting to:", next);
      return response;
    }

    console.error("[auth/callback] OTP verification failed:", error.message);

    const errorUrl = request.nextUrl.clone();
    errorUrl.pathname = "/auth/login";
    errorUrl.searchParams.set("error", "otp_failed");
    errorUrl.searchParams.set("detail", error.message.substring(0, 100));
    errorUrl.searchParams.delete("code");
    errorUrl.searchParams.delete("token_hash");
    errorUrl.searchParams.delete("type");
    return NextResponse.redirect(errorUrl);
  }

  // No code or token_hash — nothing to process
  console.error("[auth/callback] No code or token_hash found in URL");

  const errorUrl = request.nextUrl.clone();
  errorUrl.pathname = "/auth/login";
  errorUrl.searchParams.set("error", "no_auth_params");
  errorUrl.searchParams.delete("code");
  errorUrl.searchParams.delete("token_hash");
  errorUrl.searchParams.delete("type");
  return NextResponse.redirect(errorUrl);
}
