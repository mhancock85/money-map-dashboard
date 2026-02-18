"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { EmailOtpType } from "@supabase/supabase-js";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";

interface AuthCallbackClientProps {
  nextPath: string;
  code: string | null;
  tokenHash: string | null;
  type: EmailOtpType | null;
}

function parseHashTokens() {
  const hash = window.location.hash.startsWith("#")
    ? window.location.hash.slice(1)
    : window.location.hash;
  const params = new URLSearchParams(hash);
  const accessToken = params.get("access_token");
  const refreshToken = params.get("refresh_token");

  if (!accessToken || !refreshToken) {
    return null;
  }

  return { accessToken, refreshToken };
}

export function AuthCallbackClient({
  nextPath,
  code,
  tokenHash,
  type,
}: AuthCallbackClientProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      try {
        const supabase = createBrowserSupabaseClient();

        if (code) {
          const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
          if (exchangeError) {
            throw exchangeError;
          }
        } else if (tokenHash && type) {
          const { error: verifyError } = await supabase.auth.verifyOtp({
            type,
            token_hash: tokenHash,
          });
          if (verifyError) {
            throw verifyError;
          }
        } else {
          const hashTokens = parseHashTokens();
          if (hashTokens) {
            const { error: setSessionError } = await supabase.auth.setSession({
              access_token: hashTokens.accessToken,
              refresh_token: hashTokens.refreshToken,
            });
            if (setSessionError) {
              throw setSessionError;
            }
          }
        }

        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session) {
          throw new Error("Unable to establish an authenticated session.");
        }

        if (!cancelled) {
          router.replace(nextPath);
        }
      } catch (callbackError) {
        if (!cancelled) {
          setError(
            callbackError instanceof Error
              ? callbackError.message
              : "Authentication failed. Please request a new magic link."
          );
        }
      }
    };

    run();

    return () => {
      cancelled = true;
    };
  }, [code, nextPath, router, tokenHash, type]);

  return (
    <main className="min-h-screen bg-forest text-white flex items-center justify-center px-6">
      <section className="w-full max-w-md glass-card p-8">
        <h1 className="text-2xl font-bold mb-3">Signing you in...</h1>
        {!error ? (
          <p className="text-slate-400">Please wait while we complete authentication.</p>
        ) : (
          <>
            <p className="text-orange-400 mb-4">{error}</p>
            <a
              href="/auth/login"
              className="inline-block px-4 py-2 bg-lime text-forest font-bold rounded-lg hover:bg-lime/90 transition"
            >
              Back to login
            </a>
          </>
        )}
      </section>
    </main>
  );
}
