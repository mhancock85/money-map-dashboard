import { type EmailOtpType } from "@supabase/supabase-js";
import { type NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

/**
 * Server-side Route Handler for the auth callback.
 *
 * Supabase magic-link / PKCE flow redirects here with either:
 *   - ?code=xxx            (PKCE flow — needs server-side exchange)
 *   - ?token_hash=xxx&type=magiclink (older email OTP flow)
 *
 * The server-side handler has access to the PKCE code_verifier stored in
 * cookies, which a client component does NOT — hence the PKCE error we
 * were seeing previously.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const next = searchParams.get("next") ?? "/";

  // Build a redirect URL that strips auth tokens from the query string
  const redirectTo = request.nextUrl.clone();
  redirectTo.pathname = next;
  redirectTo.searchParams.delete("code");
  redirectTo.searchParams.delete("token_hash");
  redirectTo.searchParams.delete("type");
  redirectTo.searchParams.delete("next");

  if (code) {
    // PKCE flow — exchange the authorisation code for a session.
    // The server client can read the code_verifier from the cookie store.
    const supabase = await createServerSupabaseClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      return NextResponse.redirect(redirectTo);
    }

    // If code exchange fails, fall through to the error redirect below.
    console.error("[auth/callback] Code exchange failed:", error.message);
  } else if (tokenHash && type) {
    // Older email-link flow using a token hash
    const supabase = await createServerSupabaseClient();
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });

    if (!error) {
      return NextResponse.redirect(redirectTo);
    }

    console.error("[auth/callback] OTP verification failed:", error.message);
  }

  // Something went wrong — send the user to an error-aware login page
  const errorUrl = request.nextUrl.clone();
  errorUrl.pathname = "/auth/login";
  errorUrl.searchParams.set("error", "callback_failed");
  errorUrl.searchParams.delete("code");
  errorUrl.searchParams.delete("token_hash");
  errorUrl.searchParams.delete("type");
  return NextResponse.redirect(errorUrl);
}
