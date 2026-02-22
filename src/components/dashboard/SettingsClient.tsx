"use client";

import { useState, useRef, useEffect } from "react";
import { Sidebar } from "@/components/Sidebar";
import { GlassCard } from "@/components/GlassCard";
import {
  User,
  Mail,
  Shield,
  Calendar,
  FileText,
  ArrowRightLeft,
  ClipboardList,
  Pencil,
  Check,
  X,
  LogOut,
  Loader2,
  UserCog,
  Coins,
} from "lucide-react";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";

const CURRENCY_OPTIONS = [
  { code: "GBP", label: "GBP (£)", symbol: "£" },
  { code: "USD", label: "USD ($)", symbol: "$" },
  { code: "EUR", label: "EUR (€)", symbol: "€" },
  { code: "AUD", label: "AUD (A$)", symbol: "A$" },
  { code: "CAD", label: "CAD (C$)", symbol: "C$" },
  { code: "CHF", label: "CHF (Fr)", symbol: "Fr" },
  { code: "SAR", label: "SAR (﷼)", symbol: "﷼" },
  { code: "AED", label: "AED (د.إ)", symbol: "د.إ" },
  { code: "NZD", label: "NZD (NZ$)", symbol: "NZ$" },
  { code: "ZAR", label: "ZAR (R)", symbol: "R" },
  { code: "SGD", label: "SGD (S$)", symbol: "S$" },
  { code: "HKD", label: "HKD (HK$)", symbol: "HK$" },
] as const;

interface SettingsClientProps {
  fullName: string;
  email: string;
  role: string;
  defaultCurrency: string;
  coachName: string | null;
  memberSince: string;
  statementsCount: number;
  transactionsCount: number;
  pendingHomework: number;
  loadError: string | null;
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

function formatDate(isoString: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(isoString));
}

function capitalise(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export function SettingsClient({
  fullName: initialFullName,
  email,
  role,
  defaultCurrency: initialCurrency,
  coachName,
  memberSince,
  statementsCount,
  transactionsCount,
  pendingHomework,
  loadError,
}: SettingsClientProps) {
  const [fullName, setFullName] = useState(initialFullName);
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(initialFullName);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Currency state
  const [currency, setCurrency] = useState(initialCurrency);
  const [isSavingCurrency, setIsSavingCurrency] = useState(false);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  // Clear save message after 4 seconds
  useEffect(() => {
    if (saveMessage) {
      const timer = setTimeout(() => setSaveMessage(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [saveMessage]);

  async function handleSave() {
    const trimmed = editValue.trim();
    if (!trimmed || trimmed === fullName) {
      setIsEditing(false);
      setEditValue(fullName);
      return;
    }

    setIsSaving(true);
    setSaveMessage(null);

    try {
      const supabase = createBrowserSupabaseClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setSaveMessage({ type: "error", text: "Session expired. Please log in again." });
        setIsSaving(false);
        return;
      }

      const { error } = await supabase
        .from("profiles")
        .update({ full_name: trimmed })
        .eq("id", user.id);

      if (error) {
        setSaveMessage({ type: "error", text: `Update failed: ${error.message}` });
      } else {
        setFullName(trimmed);
        setSaveMessage({ type: "success", text: "Profile updated successfully." });
        setIsEditing(false);
      }
    } catch {
      setSaveMessage({ type: "error", text: "An unexpected error occurred." });
    } finally {
      setIsSaving(false);
    }
  }

  function handleCancel() {
    setEditValue(fullName);
    setIsEditing(false);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSave();
    } else if (e.key === "Escape") {
      handleCancel();
    }
  }

  async function handleCurrencyChange(newCurrency: string) {
    if (newCurrency === currency) return;

    setIsSavingCurrency(true);
    setSaveMessage(null);

    try {
      const supabase = createBrowserSupabaseClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setSaveMessage({ type: "error", text: "Session expired. Please log in again." });
        setIsSavingCurrency(false);
        return;
      }

      const { error } = await supabase
        .from("profiles")
        .update({ default_currency: newCurrency })
        .eq("id", user.id);

      if (error) {
        setSaveMessage({ type: "error", text: `Currency update failed: ${error.message}` });
      } else {
        setCurrency(newCurrency);
        setSaveMessage({ type: "success", text: `Default currency updated to ${newCurrency}.` });
      }
    } catch {
      setSaveMessage({ type: "error", text: "An unexpected error occurred." });
    } finally {
      setIsSavingCurrency(false);
    }
  }

  const stats = [
    {
      icon: FileText,
      label: "Statements Uploaded",
      value: statementsCount.toString(),
      colour: "text-lime",
    },
    {
      icon: ArrowRightLeft,
      label: "Total Transactions",
      value: transactionsCount.toString(),
      colour: "text-emerald-400",
    },
    {
      icon: ClipboardList,
      label: "Pending Homework",
      value: pendingHomework.toString(),
      colour: pendingHomework > 0 ? "text-orange-400" : "text-emerald-400",
    },
  ];

  return (
    <div className="flex bg-forest min-h-screen">
      <Sidebar />

      <main className="flex-1 ml-64 p-10">
        <header className="mb-10">
          <h1 className="text-3xl font-bold mb-2">Settings</h1>
          <p className="text-slate-400">
            Manage your profile and account preferences.
          </p>
        </header>

        {loadError && (
          <div className="mb-6 rounded-lg border border-orange-500/30 bg-orange-500/10 px-4 py-3 text-sm text-orange-300">
            {loadError}
          </div>
        )}

        {saveMessage && (
          <div
            className={`mb-6 rounded-lg border px-4 py-3 text-sm transition-all duration-300 ${
              saveMessage.type === "success"
                ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                : "border-red-500/30 bg-red-500/10 text-red-300"
            }`}
          >
            {saveMessage.text}
          </div>
        )}

        <div className="max-w-4xl space-y-6">
          {/* Profile Card */}
          <GlassCard title="Profile Information">
            <div className="flex items-start gap-6">
              {/* Avatar */}
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-lime/30 to-lime/5 border border-lime/20 flex items-center justify-center text-lime text-2xl font-bold shrink-0">
                {getInitials(fullName)}
              </div>

              {/* Details */}
              <div className="flex-1 space-y-4">
                {/* Name row */}
                <div className="flex items-center gap-3">
                  {isEditing ? (
                    <div className="flex items-center gap-2 flex-1">
                      <input
                        ref={inputRef}
                        type="text"
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onKeyDown={handleKeyDown}
                        disabled={isSaving}
                        className="flex-1 bg-glass border border-lime/30 rounded-lg px-4 py-2 text-lg font-bold focus:border-lime focus:outline-none focus:ring-1 focus:ring-lime/30 placeholder:text-slate-600 disabled:opacity-50"
                        placeholder="Your full name"
                        maxLength={100}
                      />
                      <button
                        onClick={handleSave}
                        disabled={isSaving}
                        className="p-2 rounded-lg bg-lime/20 text-lime hover:bg-lime/30 transition-colors disabled:opacity-50"
                        title="Save"
                      >
                        {isSaving ? (
                          <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                          <Check className="w-5 h-5" />
                        )}
                      </button>
                      <button
                        onClick={handleCancel}
                        disabled={isSaving}
                        className="p-2 rounded-lg bg-glass text-slate-400 hover:bg-glass/80 hover:text-red-400 transition-colors disabled:opacity-50"
                        title="Cancel"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                  ) : (
                    <>
                      <p className="text-xl font-bold">{fullName}</p>
                      <button
                        onClick={() => {
                          setEditValue(fullName);
                          setIsEditing(true);
                        }}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-lime hover:bg-lime/10 transition-colors"
                        title="Edit name"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                    </>
                  )}
                </div>

                {/* Info rows */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="flex items-center gap-3 text-slate-400">
                    <Mail className="w-4 h-4 shrink-0" />
                    <span className="text-sm truncate">{email}</span>
                  </div>
                  <div className="flex items-center gap-3 text-slate-400">
                    <Shield className="w-4 h-4 shrink-0" />
                    <span className="text-sm">
                      <span className="px-2 py-0.5 rounded-full text-xs font-bold border bg-lime/10 text-lime border-lime/20">
                        {capitalise(role)}
                      </span>
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-slate-400">
                    <Calendar className="w-4 h-4 shrink-0" />
                    <span className="text-sm">
                      Member since {formatDate(memberSince)}
                    </span>
                  </div>
                  {coachName && (
                    <div className="flex items-center gap-3 text-slate-400">
                      <UserCog className="w-4 h-4 shrink-0" />
                      <span className="text-sm">
                        Coach: <span className="text-lime font-medium">{coachName}</span>
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </GlassCard>

          {/* Account Statistics */}
          <GlassCard title="Account Overview">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {stats.map((stat) => (
                <div
                  key={stat.label}
                  className="flex items-center gap-4 p-4 rounded-xl bg-glass border border-glass-border"
                >
                  <div
                    className={`p-3 rounded-xl bg-glass ${stat.colour}`}
                  >
                    <stat.icon className="w-5 h-5" />
                  </div>
                  <div>
                    <p className={`text-2xl font-bold ${stat.colour}`}>
                      {stat.value}
                    </p>
                    <p className="text-xs text-slate-500 uppercase font-medium tracking-wider">
                      {stat.label}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </GlassCard>

          {/* Default Currency */}
          <GlassCard title="Default Currency">
            <div className="flex items-center justify-between p-4 rounded-xl bg-glass border border-glass-border">
              <div className="flex items-center gap-3">
                <Coins className="w-5 h-5 text-lime" />
                <div>
                  <p className="font-medium">Statement Currency</p>
                  <p className="text-sm text-slate-500">
                    Pre-selected when uploading new statements.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {isSavingCurrency && (
                  <Loader2 className="w-4 h-4 text-lime animate-spin" />
                )}
                <select
                  value={currency}
                  onChange={(e) => handleCurrencyChange(e.target.value)}
                  disabled={isSavingCurrency}
                  className="bg-glass border border-glass-border rounded-lg px-3 py-2 text-sm font-medium focus:border-lime focus:outline-none focus:ring-1 focus:ring-lime/30 disabled:opacity-50 cursor-pointer"
                >
                  {CURRENCY_OPTIONS.map((opt) => (
                    <option key={opt.code} value={opt.code} className="bg-forest">
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </GlassCard>

          {/* Authentication */}
          <GlassCard title="Authentication">
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 rounded-xl bg-glass border border-glass-border">
                <div className="flex items-center gap-3">
                  <Mail className="w-5 h-5 text-lime" />
                  <div>
                    <p className="font-medium">Sign-In Method</p>
                    <p className="text-sm text-slate-500">
                      One-time code sent to your email
                    </p>
                  </div>
                </div>
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/20">
                  Active
                </span>
              </div>

              <div className="flex items-center justify-between p-4 rounded-xl bg-glass border border-glass-border">
                <div className="flex items-center gap-3">
                  <User className="w-5 h-5 text-slate-400" />
                  <div>
                    <p className="font-medium">Account Email</p>
                    <p className="text-sm text-slate-500">{email}</p>
                  </div>
                </div>
              </div>
            </div>
          </GlassCard>

          {/* Danger Zone */}
          <GlassCard
            title="Session"
            className="border-red-500/10 bg-red-500/[0.02]"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Sign Out</p>
                <p className="text-sm text-slate-500">
                  End your current session on this device.
                </p>
              </div>
              <form action="/auth/signout" method="post">
                <button
                  type="submit"
                  className="flex items-center gap-2 px-5 py-2.5 rounded-lg border border-red-500/30 text-red-400 hover:bg-red-500/10 transition-colors font-medium text-sm"
                >
                  <LogOut className="w-4 h-4" />
                  Sign Out
                </button>
              </form>
            </div>
          </GlassCard>
        </div>
      </main>
    </div>
  );
}
