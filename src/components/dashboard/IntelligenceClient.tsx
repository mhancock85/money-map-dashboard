"use client";

import { Brain, Zap, Clock, Target, Trash2 } from "lucide-react";
import { GlassCard } from "@/components/GlassCard";
import { Sidebar } from "@/components/Sidebar";
import { IntelligencePageData } from "@/lib/dashboard/intelligence-data";
import { getCategoryColour } from "@/lib/dashboard/insights-data";
import { useState } from "react";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";

export function IntelligenceClient({
  learningAnalytics,
  patterns: initialPatterns,
  loadError,
}: IntelligencePageData) {
  const [patterns, setPatterns] = useState(initialPatterns);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const supabase = createBrowserSupabaseClient();

  if (loadError) {
    return (
      <div className="flex-1 flex items-center justify-center p-6 text-slate-400">
        <div className="text-center space-y-4">
          <p>{loadError}</p>
        </div>
      </div>
    );
  }

  const handleDeletePattern = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this pattern? Valid similar merchants will no longer be auto-categorised.")) {
      return;
    }

    setIsDeleting(id);
    const { error } = await supabase
      .from("category_mappings")
      .delete()
      .eq("id", id);

    if (!error) {
      setPatterns((prev) => prev.filter((p) => p.id !== id));
    } else {
      console.error("Failed to delete pattern", error);
      alert("Failed to delete pattern. Please try again.");
    }
    setIsDeleting(null);
  };

  return (
    <div className="flex bg-forest min-h-screen">
      <Sidebar />

      <main className="flex-1 ml-64 p-10">
        {/* ── Header ───────────────────────────────────────────────────────── */}
        <header className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight text-white mb-2 flex items-center gap-3">
            <Brain className="text-lime w-8 h-8" />
            Intelligence
          </h1>
          <p className="text-slate-400">
            Monitor and manage your AI's learned categorisation patterns.
          </p>
        </header>

        <div className="space-y-8">
          {/* ── Analytics Overview ────────────────────────────────────────────── */}
        <GlassCard
            title="AI Learning Analytics"
            className="border-lime/20 bg-lime/[0.02]"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
              {/* Auto-categorisation gauge */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-slate-500 uppercase font-medium">
                    Auto-Categorisation Rate
                  </span>
                  <span className="text-lg font-bold text-lime">
                    {learningAnalytics.autoCategorisationRate}%
                  </span>
                </div>
                <div className="w-full h-2.5 bg-glass rounded-full overflow-hidden mb-6">
                  <div
                    className="h-full bg-gradient-to-r from-lime/70 to-lime rounded-full transition-all duration-700"
                    style={{
                      width: `${Math.min(
                        learningAnalytics.autoCategorisationRate,
                        100
                      )}%`,
                    }}
                  />
                </div>
                                
                <p className="text-sm text-slate-400 leading-relaxed">
                  <span className="text-lime font-medium">
                    Money Map AI
                  </span>{" "}
                  learns from your categorisations. Every transaction you
                  review teaches the system to auto-categorise similar
                  ones in the future. The more you use it, the smarter it gets.
                </p>
              </div>

              {/* Stats grid */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-glass border border-glass-border">
                  <Brain className="w-5 h-5 text-lime mb-2" />
                  <p className="text-2xl font-bold">
                    {learningAnalytics.patternsLearned}
                  </p>
                  <p className="text-xs text-slate-500">
                    Patterns Learned
                  </p>
                </div>
                <div className="p-4 rounded-xl bg-glass border border-glass-border">
                  <Zap className="w-5 h-5 text-violet-400 mb-2" />
                  <p className="text-2xl font-bold">
                    {learningAnalytics.autoCategorised}
                  </p>
                  <p className="text-xs text-slate-500">
                    Auto-Categorised
                  </p>
                </div>
                <div className="p-4 rounded-xl bg-glass border border-glass-border">
                  <Clock className="w-5 h-5 text-amber-400 mb-2" />
                  <p className="text-2xl font-bold">
                    {learningAnalytics.estimatedTimeSavedMinutes}
                    <span className="text-sm text-slate-500 font-normal">
                      {" "}
                      min
                    </span>
                  </p>
                  <p className="text-xs text-slate-500">Time Saved</p>
                </div>
                <div className="p-4 rounded-xl bg-glass border border-glass-border">
                  <Target className="w-5 h-5 text-orange-400 mb-2" />
                  <p className="text-2xl font-bold">
                    {learningAnalytics.pendingHomework}
                  </p>
                  <p className="text-xs text-slate-500">
                    Pending Review
                  </p>
                </div>
              </div>

            </div>
          </GlassCard>

        {/* ── Pattern Management ────────────────────────────────────────────── */}
        <GlassCard title="Stored Patterns">
          {patterns.length > 0 ? (
            <div className="overflow-x-auto rounded-xl border border-glass-border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-glass-border text-slate-600 text-xs uppercase tracking-wider">
                    <th className="text-left px-4 py-3 w-16">#</th>
                    <th className="text-left px-4 py-3">Merchant Pattern</th>
                    <th className="text-left px-4 py-3 w-32">Category</th>
                    <th className="text-left px-4 py-3 w-32">Subcategory</th>
                    <th className="text-right px-4 py-3 w-20">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-glass-border">
                  {patterns.map((pattern, i) => (
                    <tr
                      key={pattern.id}
                      className="hover:bg-glass/30 transition-colors group"
                    >
                      <td className="px-4 py-3 text-slate-600 font-mono text-xs">
                        {i + 1}
                      </td>
                      <td className="px-4 py-3 font-medium truncate max-w-[200px]">
                        {pattern.merchant_pattern}
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
                           {pattern.category}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {pattern.subcategory ? (
                          <span
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border"
                            style={{
                              backgroundColor: `${getCategoryColour(
                                pattern.category
                              )}15`,
                              color: getCategoryColour(
                                pattern.category
                              ),
                              borderColor: `${getCategoryColour(
                                pattern.category
                              )}30`,
                            }}
                          >
                            {pattern.subcategory}
                          </span>
                        ) : (
                          <span
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border"
                            style={{
                              backgroundColor: `${getCategoryColour(
                                pattern.category
                              )}15`,
                              color: getCategoryColour(
                                pattern.category
                              ),
                              borderColor: `${getCategoryColour(
                                pattern.category
                              )}30`,
                            }}
                          >
                            {pattern.category}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => handleDeletePattern(pattern.id)}
                          disabled={isDeleting === pattern.id}
                          className="p-1.5 rounded-lg border border-red-500/20 text-red-400 hover:bg-red-500/10 hover:border-red-500/30 transition-colors disabled:opacity-50"
                          title="Delete pattern"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="py-12 text-center text-slate-500">
              <Brain className="w-12 h-12 text-glass-border mx-auto mb-3" />
              <p className="font-medium text-slate-300">No patterns learned yet</p>
              <p className="text-sm mt-1">Categorise transactions in Homework to teach the AI.</p>
            </div>
          )}
        </GlassCard>
      </div>
    </main>
  </div>
);
}
