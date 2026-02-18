"use client";

import { FormEvent, useRef, useState } from "react";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";

interface LoginFormProps {
  nextPath: string;
}

type Status = "idle" | "sending" | "awaiting_code" | "verifying" | "error";

export function LoginForm({ nextPath }: LoginFormProps) {
  const [email, setEmail] = useState("");
  const [otpDigits, setOtpDigits] = useState(["", "", "", "", "", ""]);
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState("");
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  /* ─── Step 1: Send the magic link / OTP email ─── */
  const handleSendCode = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStatus("sending");
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

      setStatus("awaiting_code");
      setMessage("We sent a 6-digit code to your email. Enter it below, or click the link in the email.");
      // Focus first OTP input
      setTimeout(() => inputRefs.current[0]?.focus(), 100);
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof Error ? error.message : "Unable to send sign-in code.");
    }
  };

  /* ─── Step 2: Verify the 6-digit OTP code ─── */
  const verifyOtp = async (token: string) => {
    setStatus("verifying");
    setMessage("");

    try {
      const supabase = createBrowserSupabaseClient();
      const { error } = await supabase.auth.verifyOtp({
        email,
        token,
        type: "email",
      });

      if (error) {
        setStatus("error");
        setMessage(error.message);
        setOtpDigits(["", "", "", "", "", ""]);
        setTimeout(() => inputRefs.current[0]?.focus(), 100);
        return;
      }

      // Success — redirect to the intended page
      window.location.assign(nextPath);
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof Error ? error.message : "Unable to verify code.");
      setOtpDigits(["", "", "", "", "", ""]);
    }
  };

  /* ─── OTP input handlers ─── */
  const handleOtpChange = (index: number, value: string) => {
    // Only allow digits
    const digit = value.replace(/\D/g, "").slice(-1);
    const newDigits = [...otpDigits];
    newDigits[index] = digit;
    setOtpDigits(newDigits);

    // Auto-advance to next input
    if (digit && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto-submit when all 6 digits entered
    const fullCode = newDigits.join("");
    if (fullCode.length === 6) {
      verifyOtp(fullCode);
    }
  };

  const handleOtpKeyDown = (index: number, event: React.KeyboardEvent) => {
    if (event.key === "Backspace" && !otpDigits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleOtpPaste = (event: React.ClipboardEvent) => {
    event.preventDefault();
    const pasted = event.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (!pasted) return;

    const newDigits = [...otpDigits];
    for (let i = 0; i < 6; i++) {
      newDigits[i] = pasted[i] || "";
    }
    setOtpDigits(newDigits);

    if (pasted.length === 6) {
      verifyOtp(pasted);
    } else {
      inputRefs.current[pasted.length]?.focus();
    }
  };

  const isLoading = status === "sending" || status === "verifying";

  /* ─── Email entry step ─── */
  if (status === "idle" || status === "sending" || (status === "error" && !otpDigits.some(Boolean))) {
    return (
      <form onSubmit={handleSendCode} className="space-y-4">
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
        <button
          type="submit"
          disabled={isLoading}
          className="w-full py-3 bg-lime text-forest font-bold rounded-lg hover:bg-lime/90 transition disabled:opacity-70 disabled:cursor-not-allowed"
        >
          {status === "sending" ? "Sending code…" : "Continue with email"}
        </button>

        {message && (
          <p className="mt-2 text-sm text-orange-400">{message}</p>
        )}
      </form>
    );
  }

  /* ─── OTP code entry step ─── */
  return (
    <div className="space-y-5">
      <div className="text-center">
        <p className="text-sm text-emerald-400 mb-1">{message}</p>
        <p className="text-xs text-slate-500">
          Sent to <span className="text-slate-300">{email}</span>
        </p>
      </div>

      {/* 6-digit OTP input */}
      <div className="flex justify-center gap-2" onPaste={handleOtpPaste}>
        {otpDigits.map((digit, i) => (
          <input
            key={i}
            ref={(el) => { inputRefs.current[i] = el; }}
            type="text"
            inputMode="numeric"
            maxLength={1}
            value={digit}
            onChange={(e) => handleOtpChange(i, e.target.value)}
            onKeyDown={(e) => handleOtpKeyDown(i, e)}
            disabled={status === "verifying"}
            className="w-11 h-14 text-center text-xl font-bold bg-glass border border-glass-border rounded-lg focus:border-lime outline-none transition disabled:opacity-50"
            aria-label={`Digit ${i + 1}`}
          />
        ))}
      </div>

      {status === "verifying" && (
        <p className="text-center text-sm text-slate-400 animate-pulse">Verifying…</p>
      )}

      {status === "error" && message && (
        <p className="text-center text-sm text-orange-400">{message}</p>
      )}

      <button
        type="button"
        onClick={() => {
          setStatus("idle");
          setMessage("");
          setOtpDigits(["", "", "", "", "", ""]);
        }}
        className="w-full py-2 text-sm text-slate-400 hover:text-white transition"
      >
        ← Use a different email
      </button>
    </div>
  );
}
