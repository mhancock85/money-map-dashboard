"use client";

import { useState } from "react";
import { Sidebar } from "@/components/Sidebar";
import { GlassCard } from "@/components/GlassCard";
import { HelpCircle, Save, CheckCircle2, Loader2 } from "lucide-react";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";
import type { HomeworkTransaction } from "@/lib/dashboard/homework-data";
import {
  CATEGORY_TAXONOMY,
  getParentCategory,
  getCategoryColour,
} from "@/lib/dashboard/categories";

// ── Props ───────────────────────────────────────────────────────────────────

interface HomeworkClientProps {
  initialTransactions: HomeworkTransaction[];
  loadError: string | null;
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    maximumFractionDigits: 2,
  }).format(amount);
}

function formatDate(isoDate: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(isoDate));
}

function extractMerchantPattern(description: string): string {
  // Remove common noise words and extract core merchant identifier
  const cleaned = description
    .trim()
    .replace(/\b(payment|transfer|card|debit|credit|purchase|transaction)\b/gi, "")
    .replace(/[^\w\s]/g, " ") // Remove special chars
    .replace(/\s+/g, " ") // Normalize spaces
    .trim();

  // Take first 3 meaningful words or first word if it's long
  const words = cleaned.split(" ").filter((w) => w.length > 2);
  if (words.length === 0) return description.slice(0, 20); // Fallback

  return words[0].length >= 6 ? words[0] : words.slice(0, 3).join(" ");
}

// ── Component ───────────────────────────────────────────────────────────────

export function HomeworkClient({
  initialTransactions,
  loadError,
}: HomeworkClientProps) {
  const [transactions, setTransactions] = useState(initialTransactions);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<Record<string, string>>({});
  const [selectedCategories, setSelectedCategories] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const pendingCount = transactions.filter((tx) => !tx.isReviewed).length;

  async function handleSave(transactionId: string) {
    const category = selectedCategories[transactionId];
    const clientFeedback = feedback[transactionId]?.trim() || null;

    if (!category) {
      setMessage({ type: "error", text: "Please select a category first." });
      return;
    }

    setSavingId(transactionId);
    setMessage(null);

    try {
      const supabase = createBrowserSupabaseClient();

      // Get transaction details to extract merchant pattern
      const transaction = transactions.find((tx) => tx.id === transactionId);
      if (!transaction) {
        throw new Error("Transaction not found");
      }

      // Update transaction — save parent category + subcategory
      const parentCategory = getParentCategory(category);
      const { error } = await supabase
        .from("transactions")
        .update({
          category: parentCategory,
          subcategory: category,
          client_feedback: clientFeedback,
          needs_homework: false,
          is_reviewed: true,
        })
        .eq("id", transactionId);

      if (error) {
        throw new Error(error.message);
      }

      // Extract merchant pattern (first meaningful word or first 3 words)
      const merchantPattern = extractMerchantPattern(transaction.description);

      // Save to category_mappings for future auto-categorization
      const { data: { user } } = await supabase.auth.getUser();
      if (user && merchantPattern) {
        await supabase
          .from("category_mappings")
          .upsert(
            {
              owner_id: user.id,
              merchant_pattern: merchantPattern,
              category: parentCategory,
              subcategory: category,
              confidence_score: 0.9,
            },
            { onConflict: "owner_id,merchant_pattern" }
          );
      }

      setTransactions((prev) =>
        prev.map((tx) =>
          tx.id === transactionId
            ? { ...tx, category: parentCategory, subcategory: category, isReviewed: true, clientFeedback, needsHomework: false }
            : tx
        )
      );

      const subLabel = CATEGORY_TAXONOMY
        .flatMap((p) => p.subcategories)
        .find((s) => s.value === category)?.label ?? category;
      setMessage({
        type: "success",
        text: `Categorised as "${parentCategory} → ${subLabel}". Similar transactions will be auto-categorised next time!`
      });

      // Clear form state
      setSelectedCategories((prev) => {
        const next = { ...prev };
        delete next[transactionId];
        return next;
      });
      setFeedback((prev) => {
        const next = { ...prev };
        delete next[transactionId];
        return next;
      });
    } catch (err) {
      setMessage({
        type: "error",
        text: err instanceof Error ? err.message : "Failed to save categorization.",
      });
    } finally {
      setSavingId(null);
    }
  }

  const pendingTransactions = transactions.filter((tx) => !tx.isReviewed);
  const resolvedTransactions = transactions.filter((tx) => tx.isReviewed);

  return (
    <div className="flex bg-forest min-h-screen">
      <Sidebar />

      <main className="flex-1 ml-64 p-10">
        <header className="mb-10">
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-3xl font-bold">Homework</h1>
            {pendingCount > 0 && (
              <span className="bg-orange-500/20 text-orange-400 px-3 py-1 rounded-full text-xs font-bold border border-orange-500/20">
                {pendingCount} Pending
              </span>
            )}
          </div>
          <p className="text-slate-400">
            Categorize these transactions to help your coach finalize your financial report.
          </p>
        </header>

        {loadError && (
          <div className="mb-6 rounded-lg border border-orange-500/30 bg-orange-500/10 px-4 py-3 text-sm text-orange-300">
            {loadError}
          </div>
        )}

        {message && (
          <div
            className={`mb-6 rounded-lg border px-4 py-3 text-sm transition-all duration-300 ${
              message.type === "success"
                ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                : "border-red-500/30 bg-red-500/10 text-red-300"
            }`}
          >
            {message.text}
          </div>
        )}

        <div className="max-w-4xl space-y-6">
          {/* Pending Transactions */}
          {pendingTransactions.length > 0 ? (
            pendingTransactions.map((tx) => (
              <GlassCard
                key={tx.id}
                className="bg-orange-500/5 border-orange-500/20"
              >
                <div className="flex items-start gap-4">
                  <div className="p-3 rounded-xl bg-orange-500/20 text-orange-400">
                    <HelpCircle className="w-6 h-6" />
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h2 className="text-xl font-bold">{tx.description}</h2>
                        <p className="text-slate-400 text-sm">
                          {formatDate(tx.transactionDate)} •{" "}
                          <span
                            className={
                              tx.amount >= 0 ? "text-emerald-400" : "text-red-400"
                            }
                          >
                            {formatCurrency(tx.amount)}
                          </span>
                          {tx.subcategory && tx.confidenceScore !== null && (
                            <span className="ml-3 text-amber-400">
                              AI suggests: <strong>{tx.category} → {tx.subcategory}</strong>
                              {" "}({Math.round(tx.confidenceScore * 100)}% confidence)
                            </span>
                          )}
                        </p>
                      </div>
                      {tx.coachNotes && (
                        <div className="text-right max-w-xs">
                          <p className="text-xs text-slate-500 uppercase font-bold mb-1">
                            Coach Note
                          </p>
                          <p className="text-sm text-orange-400 italic">
                            &quot;{tx.coachNotes}&quot;
                          </p>
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-2">
                          Category
                        </label>
                        <select
                          value={selectedCategories[tx.id] || tx.subcategory || ""}
                          onChange={(e) =>
                            setSelectedCategories((prev) => ({
                              ...prev,
                              [tx.id]: e.target.value,
                            }))
                          }
                          className="w-full bg-glass border border-glass-border rounded-lg px-4 py-2 text-sm focus:border-lime focus:outline-none focus:ring-1 focus:ring-lime/30 cursor-pointer"
                        >
                          <option value="">Select category...</option>
                          {CATEGORY_TAXONOMY.map((parent) => (
                            <optgroup key={parent.value} label={parent.label}>
                              {parent.subcategories.map((sub) => (
                                <option key={sub.value} value={sub.value}>
                                  {sub.label}
                                </option>
                              ))}
                            </optgroup>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-2">
                          Your Feedback (Optional)
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. Printer ink for home office"
                          value={feedback[tx.id] || ""}
                          onChange={(e) =>
                            setFeedback((prev) => ({
                              ...prev,
                              [tx.id]: e.target.value,
                            }))
                          }
                          className="w-full bg-glass border border-glass-border rounded-lg px-4 py-2 text-sm focus:border-lime focus:outline-none focus:ring-1 focus:ring-lime/30 placeholder:text-slate-600"
                        />
                      </div>
                    </div>

                    <button
                      onClick={() => handleSave(tx.id)}
                      disabled={savingId === tx.id || !selectedCategories[tx.id]}
                      className="mt-6 flex items-center gap-2 px-6 py-2 bg-lime text-forest font-bold rounded-lg hover:bg-lime/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                    >
                      {savingId === tx.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Save className="w-4 h-4" />
                      )}
                      {savingId === tx.id ? "Saving..." : "Save & Mark Complete"}
                    </button>
                  </div>
                </div>
              </GlassCard>
            ))
          ) : (
            <GlassCard className="flex items-center justify-center h-48 border-dashed border-2 border-glass-border">
              <div className="text-center">
                <CheckCircle2 className="w-12 h-12 mx-auto mb-3 text-emerald-400 opacity-20" />
                <p className="text-slate-400 font-medium">All caught up!</p>
                <p className="text-sm text-slate-600 mt-1">
                  No transactions need categorization right now.
                </p>
              </div>
            </GlassCard>
          )}

          {/* Recently Resolved */}
          {resolvedTransactions.length > 0 && (
            <div className="pt-10">
              <h3 className="text-sm font-bold text-slate-500 uppercase mb-4">
                Recently Resolved
              </h3>
              <div className="space-y-3">
                {resolvedTransactions.slice(0, 5).map((tx) => (
                  <GlassCard key={tx.id} className="opacity-50">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="p-2 rounded-full bg-emerald-500/20 text-emerald-400">
                          <CheckCircle2 className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="font-bold">{tx.description}</p>
                          <p className="text-xs text-slate-400">
                            Resolved as:{" "}
                            <span
                              style={{ color: getCategoryColour(tx.subcategory || tx.category || "") }}
                            >
                              {tx.category}{tx.subcategory ? ` → ${tx.subcategory}` : ""}
                            </span>
                            {tx.clientFeedback && (
                              <> • &quot;{tx.clientFeedback}&quot;</>
                            )}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold">
                          {formatCurrency(tx.amount)}
                        </p>
                      </div>
                    </div>
                  </GlassCard>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
