"use client";

import { FormEvent, useState } from "react";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";

interface LoginFormProps {
  nextPath: string;
}

export function LoginForm({ nextPath }: LoginFormProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<
    "idle" | "loading_magic" | "loading_password" | "sent" | "error"
  >("idle");
  const [message, setMessage] = useState("");

  const handleMagicLinkSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStatus("loading_magic");
    setMessage("");

    try {
      const supabase = createBrowserSupabaseClient();
      const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(nextPath)}`;

      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: redirectTo },
      });

      if (error) {
        setStatus("error");
        setMessage(error.message);
        return;
      }

      setStatus("sent");
      setMessage("Check your email for the sign-in link.");
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof Error ? error.message : "Unable to start sign-in.");
    }
  };

  const handlePasswordSignIn = async () => {
    if (!password.trim()) {
      setStatus("error");
      setMessage("Enter a password to use password sign-in.");
      return;
    }

    setStatus("loading_password");
    setMessage("");

    try {
      const supabase = createBrowserSupabaseClient();
      const { error } = await supabase.auth.signInWithPassword({ email, password });

      if (error) {
        setStatus("error");
        setMessage(error.message);
        return;
      }

      window.location.assign(nextPath);
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof Error ? error.message : "Unable to sign in with password.");
    }
  };

  return (
    <form onSubmit={handleMagicLinkSubmit} className="space-y-4">
      <label className="block text-sm text-slate-300" htmlFor="email">
        Email address
      </label>
      <input
        id="email"
        type="email"
        required
        autoComplete="email"
        value={email}
        onChange={(event) => setEmail(event.target.value)}
        className="w-full bg-glass border border-glass-border rounded-lg px-4 py-3 text-sm focus:border-lime outline-none placeholder:text-slate-600"
        placeholder="you@example.com"
      />
      <label className="block text-sm text-slate-300" htmlFor="password">
        Password (temporary fallback)
      </label>
      <input
        id="password"
        type="password"
        autoComplete="current-password"
        value={password}
        onChange={(event) => setPassword(event.target.value)}
        className="w-full bg-glass border border-glass-border rounded-lg px-4 py-3 text-sm focus:border-lime outline-none placeholder:text-slate-600"
        placeholder="Enter password if provided"
      />
      <button
        type="submit"
        disabled={status === "loading_magic" || status === "loading_password"}
        className="w-full py-3 bg-lime text-forest font-bold rounded-lg hover:bg-lime/90 transition disabled:opacity-70 disabled:cursor-not-allowed"
      >
        {status === "loading_magic" ? "Sending link..." : "Send magic link"}
      </button>
      <button
        type="button"
        onClick={handlePasswordSignIn}
        disabled={status === "loading_magic" || status === "loading_password"}
        className="w-full py-3 bg-glass border border-glass-border text-white font-bold rounded-lg hover:bg-glass/80 transition disabled:opacity-70 disabled:cursor-not-allowed"
      >
        {status === "loading_password" ? "Signing in..." : "Sign in with password"}
      </button>

      <p className="text-xs text-slate-500">
        Magic link needs email delivery limits. Password sign-in is a temporary test fallback.
      </p>

      {message ? (
        <p
          className={`mt-4 text-sm ${
            status === "error" ? "text-orange-400" : "text-emerald-400"
          }`}
        >
          {message}
        </p>
      ) : null}
    </form>
  );
}
