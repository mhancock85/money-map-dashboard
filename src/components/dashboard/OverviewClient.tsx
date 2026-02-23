"use client";

import { useState } from "react";
import Link from "next/link";
import { Sidebar } from "@/components/Sidebar";
import { GlassCard } from "@/components/GlassCard";
import {
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  Briefcase,
  Heart,
  AlertCircle,
  Info,
  Plus,
  Pencil,
  Trash2,
  Check,
  X,
  CheckCircle2,
} from "lucide-react";
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import {
  OverviewChartPoint,
  HomeworkItem,
  CoachingInsight,
} from "@/lib/dashboard/overview-metrics";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";

/* ——————————————————————————————————————————————
   Props
   —————————————————————————————————————————————— */

interface OverviewClientProps {
  fullName: string;
  userId: string;
  netWorth: number;
  monthlyCashflow: number;
  savingsRate: number;
  pendingHomework: number;
  chartData: OverviewChartPoint[];
  loadError: string | null;
  homeworkItems: HomeworkItem[];
  coachingInsights: CoachingInsight[];
}

/* ——————————————————————————————————————————————
   Helpers
   —————————————————————————————————————————————— */

const currencyFormatter = new Intl.NumberFormat("en-GB", {
  style: "currency",
  currency: "GBP",
  maximumFractionDigits: 0,
});

const currencyFormatterDecimals = new Intl.NumberFormat("en-GB", {
  style: "currency",
  currency: "GBP",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

function formatSignedCurrency(value: number) {
  if (value > 0) return `+${currencyFormatter.format(value)}`;
  return currencyFormatter.format(value);
}

function clampPercent(value: number) {
  return Math.max(0, Math.min(100, value));
}

function formatAxisCurrency(value: number): string {
  let rounded: number;
  if (Math.abs(value) >= 10000) {
    rounded = Math.round(value / 1000) * 1000;
  } else if (Math.abs(value) >= 1000) {
    rounded = Math.round(value / 500) * 500;
  } else {
    rounded = Math.round(value / 100) * 100;
  }
  return currencyFormatter.format(rounded);
}

type InsightType = "opportunity" | "warning" | "info";

const INSIGHT_STYLES: Record<InsightType, { bg: string; text: string }> = {
  opportunity: { bg: "bg-lime/20", text: "text-lime" },
  warning: { bg: "bg-orange-500/20", text: "text-orange-400" },
  info: { bg: "bg-sky-500/20", text: "text-sky-400" },
};

function InsightIcon({ type, className }: { type: string; className?: string }) {
  switch (type) {
    case "opportunity":
      return <Heart className={className} />;
    case "warning":
      return <AlertCircle className={className} />;
    default:
      return <Info className={className} />;
  }
}

/* ——————————————————————————————————————————————
   Component
   —————————————————————————————————————————————— */

export function OverviewClient({
  fullName,
  userId,
  netWorth,
  monthlyCashflow,
  savingsRate,
  pendingHomework,
  chartData,
  loadError,
  homeworkItems: initialHomeworkItems,
  coachingInsights: initialInsights,
}: OverviewClientProps) {
  const positiveCashflow = monthlyCashflow >= 0;
  const positiveSavingsRate = savingsRate >= 0;
  const savingsBarWidth = clampPercent(savingsRate);

  /* — Coaching Insights state — */
  const [insights, setInsights] = useState<CoachingInsight[]>(initialInsights);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editBody, setEditBody] = useState("");
  const [editType, setEditType] = useState<InsightType>("opportunity");
  const [isSaving, setIsSaving] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const supabase = createBrowserSupabaseClient();

  function startEdit(insight: CoachingInsight) {
    setEditingId(insight.id);
    setEditTitle(insight.title);
    setEditBody(insight.body);
    setEditType(insight.insight_type);
    setIsAdding(false);
  }

  function startAdd() {
    setIsAdding(true);
    setEditingId(null);
    setEditTitle("");
    setEditBody("");
    setEditType("opportunity");
  }

  function cancelEdit() {
    setEditingId(null);
    setIsAdding(false);
    setEditTitle("");
    setEditBody("");
    setEditType("opportunity");
    setDeleteConfirmId(null);
  }

  async function saveInsight() {
    if (!editTitle.trim() || !editBody.trim()) return;
    setIsSaving(true);

    try {
      if (isAdding) {
        const { data, error } = await supabase
          .from("coaching_insights")
          .insert({
            user_id: userId,
            title: editTitle.trim(),
            body: editBody.trim(),
            insight_type: editType,
          })
          .select("id, title, body, insight_type")
          .single();

        if (!error && data) {
          setInsights((prev) => [
            {
              id: data.id,
              title: data.title,
              body: data.body,
              insight_type: data.insight_type as InsightType,
            },
            ...prev,
          ]);
        }
      } else if (editingId) {
        const { error } = await supabase
          .from("coaching_insights")
          .update({
            title: editTitle.trim(),
            body: editBody.trim(),
            insight_type: editType,
            updated_at: new Date().toISOString(),
          })
          .eq("id", editingId);

        if (!error) {
          setInsights((prev) =>
            prev.map((i) =>
              i.id === editingId
                ? {
                    ...i,
                    title: editTitle.trim(),
                    body: editBody.trim(),
                    insight_type: editType,
                  }
                : i
            )
          );
        }
      }
    } finally {
      cancelEdit();
      setIsSaving(false);
    }
  }

  async function deleteInsight(id: string) {
    const { error } = await supabase
      .from("coaching_insights")
      .delete()
      .eq("id", id);

    if (!error) {
      setInsights((prev) => prev.filter((i) => i.id !== id));
    }
    setDeleteConfirmId(null);
  }

  /* — Render — */
  return (
    <div className="flex bg-forest min-h-screen">
      <Sidebar />

      <main className="flex-1 ml-64 p-10">
        <header className="mb-10 flex justify-between items-end">
          <div>
            <h1 className="text-3xl font-bold mb-2">Portfolio Overview</h1>
            <p className="text-slate-400">
              Welcome back, {fullName}. Here is your financial roadmap.
            </p>
          </div>
          <div className="bg-lime/10 text-lime px-4 py-2 rounded-full border border-lime/20 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-lime animate-pulse" />
            Live Strategy: <span className="font-bold whitespace-nowrap">Wedding Planning</span>
          </div>
        </header>

        {loadError ? (
          <div className="mb-6 rounded-lg border border-orange-500/30 bg-orange-500/10 px-4 py-3 text-sm text-orange-300">
            {loadError}
          </div>
        ) : null}

        {/* ——————— KPI Cards ——————— */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          <GlassCard title="Net Worth">
            <div className="flex items-end justify-between">
              <div>
                <p className="text-3xl font-bold">{currencyFormatter.format(netWorth)}</p>
                <div className="flex items-center gap-1 text-slate-400 text-sm mt-1">
                  <span>Live from Supabase</span>
                </div>
              </div>
              <TrendingUp className="text-lime w-12 h-12 opacity-20" />
            </div>
          </GlassCard>

          <GlassCard title="Monthly Cashflow">
            <div className="flex items-end justify-between">
              <div>
                <p className={`text-3xl font-bold ${positiveCashflow ? "text-lime" : "text-orange-400"}`}>
                  {formatSignedCurrency(monthlyCashflow)}
                </p>
                <div
                  className={`flex items-center gap-1 text-sm mt-1 ${
                    positiveCashflow ? "text-emerald-400" : "text-orange-400"
                  }`}
                >
                  {positiveCashflow ? (
                    <ArrowUpRight className="w-4 h-4" />
                  ) : (
                    <ArrowDownRight className="w-4 h-4" />
                  )}
                  <span>{positiveCashflow ? "Positive this month" : "Negative this month"}</span>
                </div>
              </div>
              <div className="w-12 h-12 rounded-full bg-lime/10 flex items-center justify-center">
                <ArrowUpRight className="text-lime w-6 h-6" />
              </div>
            </div>
          </GlassCard>

          <GlassCard title="Savings Rate">
            <div className="flex items-end justify-between">
              <div>
                <p className={`text-3xl font-bold ${positiveSavingsRate ? "" : "text-orange-400"}`}>
                  {savingsRate.toFixed(1)}%
                </p>
                <div className="flex items-center gap-1 text-slate-400 text-sm mt-1">
                  <span>Based on this month&apos;s inflow/outflow</span>
                </div>
              </div>
              <div className="w-16 h-2 bg-glass rounded-full overflow-hidden">
                <div className="h-full bg-lime lime-glow" style={{ width: `${savingsBarWidth}%` }} />
              </div>
            </div>
          </GlassCard>
        </div>

        {/* ——————— Chart ——————— */}
        <div className="mb-10">
          <GlassCard title="Wealth Trajectory & Cashflow">
            <div className="h-[350px] w-full pt-4" suppressHydrationWarning>
              <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                <ComposedChart data={chartData} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
                  <defs>
                    <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#D4F23E" stopOpacity={0.8} />
                      <stop offset="100%" stopColor="#D4F23E" stopOpacity={0.1} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1A2E2A" vertical={false} />
                  <XAxis
                    dataKey="month"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "#94a3b8", fontSize: 12 }}
                    dy={10}
                  />
                  <YAxis
                    yAxisId="left"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "#94a3b8", fontSize: 12 }}
                    width={80}
                    tickFormatter={formatAxisCurrency}
                  />
                  <YAxis
                    yAxisId="right"
                    orientation="right"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "#D4F23E", fontSize: 12 }}
                    width={80}
                    domain={[
                      (dataMin: number) => Math.floor(dataMin - 1000),
                      (dataMax: number) => Math.ceil(dataMax + 1000),
                    ]}
                    tickFormatter={formatAxisCurrency}
                  />
                  <Tooltip
                    cursor={{ fill: "transparent" }}
                    contentStyle={{
                      backgroundColor: "#0A1F1C",
                      borderColor: "#1A2E2A",
                      borderRadius: "12px",
                      color: "#fff",
                    }}
                    itemStyle={{ color: "#D4F23E" }}
                    formatter={(value) => currencyFormatter.format(Number(value ?? 0))}
                  />
                  <Legend
                    verticalAlign="top"
                    height={36}
                    iconType="circle"
                    formatter={(value) => <span className="text-slate-300 text-sm">{value}</span>}
                  />
                  <Bar
                    yAxisId="left"
                    dataKey="cashflow"
                    fill="url(#barGradient)"
                    radius={[4, 4, 0, 0]}
                    name="Monthly Cashflow"
                  />
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="netWorth"
                    stroke="#D4F23E"
                    strokeWidth={3}
                    dot={{ fill: "#D4F23E", strokeWidth: 2, r: 4, stroke: "#081412" }}
                    activeDot={{ r: 6, strokeWidth: 0 }}
                    name="Net Worth Progression"
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </GlassCard>
        </div>

        {/* ——————— Bottom Two-Column Grid ——————— */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pb-10">

          {/* ——— Coaching Insights (Live + Editable) ——— */}
          <GlassCard
            title={
              <div className="flex items-center justify-between w-full">
                <span>Bespoke Coach Insights</span>
                <button
                  onClick={startAdd}
                  className="cursor-pointer p-1.5 rounded-lg bg-lime/10 text-lime hover:bg-lime/20 transition-colors"
                  title="Add new insight"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            }
            className="border-lime/20 bg-lime/5"
          >
            <div className="space-y-4">
              {/* Add form */}
              {isAdding && (
                <div className="p-4 rounded-lg bg-glass border border-lime/30 space-y-3">
                  <div className="flex gap-2">
                    {(["opportunity", "warning", "info"] as InsightType[]).map((t) => {
                      const styles = INSIGHT_STYLES[t];
                      return (
                        <button
                          key={t}
                          onClick={() => setEditType(t)}
                          className={`cursor-pointer px-3 py-1 rounded-full text-xs font-medium transition-all ${
                            editType === t
                              ? `${styles.bg} ${styles.text} ring-1 ring-current`
                              : "bg-glass text-slate-400 hover:text-slate-200"
                          }`}
                        >
                          {t.charAt(0).toUpperCase() + t.slice(1)}
                        </button>
                      );
                    })}
                  </div>
                  <input
                    type="text"
                    placeholder="Insight title…"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    className="w-full bg-forest/50 border border-glass-border rounded-lg px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-lime/40"
                  />
                  <textarea
                    placeholder="Write your coaching insight…"
                    value={editBody}
                    onChange={(e) => setEditBody(e.target.value)}
                    rows={3}
                    className="w-full bg-forest/50 border border-glass-border rounded-lg px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-lime/40 resize-none"
                  />
                  <div className="flex gap-2 justify-end">
                    <button
                      onClick={cancelEdit}
                      className="cursor-pointer px-3 py-1.5 rounded-lg bg-glass text-slate-400 hover:text-white text-xs transition-colors"
                    >
                      <X className="w-3 h-3 inline mr-1" />
                      Cancel
                    </button>
                    <button
                      onClick={saveInsight}
                      disabled={isSaving || !editTitle.trim() || !editBody.trim()}
                      className="cursor-pointer px-3 py-1.5 rounded-lg bg-lime/20 text-lime hover:bg-lime/30 text-xs transition-colors disabled:opacity-40"
                    >
                      <Check className="w-3 h-3 inline mr-1" />
                      {isSaving ? "Saving…" : "Save"}
                    </button>
                  </div>
                </div>
              )}

              {/* Existing insights */}
              {insights.length === 0 && !isAdding && (
                <div className="text-center py-8">
                  <Info className="w-10 h-10 text-slate-600 mx-auto mb-3" />
                  <p className="text-slate-400 text-sm">No coaching insights yet.</p>
                  <p className="text-slate-500 text-xs mt-1">
                    Click the <Plus className="w-3 h-3 inline" /> button to add your first personalised insight.
                  </p>
                </div>
              )}

              {insights.map((insight, index) => {
                const styles = INSIGHT_STYLES[insight.insight_type] || INSIGHT_STYLES.info;
                const isEditing = editingId === insight.id;
                const isDeleting = deleteConfirmId === insight.id;

                if (isEditing) {
                  return (
                    <div
                      key={insight.id}
                      className="p-4 rounded-lg bg-glass border border-lime/30 space-y-3"
                    >
                      <div className="flex gap-2">
                        {(["opportunity", "warning", "info"] as InsightType[]).map((t) => {
                          const tStyles = INSIGHT_STYLES[t];
                          return (
                            <button
                              key={t}
                              onClick={() => setEditType(t)}
                              className={`cursor-pointer px-3 py-1 rounded-full text-xs font-medium transition-all ${
                                editType === t
                                  ? `${tStyles.bg} ${tStyles.text} ring-1 ring-current`
                                  : "bg-glass text-slate-400 hover:text-slate-200"
                              }`}
                            >
                              {t.charAt(0).toUpperCase() + t.slice(1)}
                            </button>
                          );
                        })}
                      </div>
                      <input
                        type="text"
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        className="w-full bg-forest/50 border border-glass-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-lime/40"
                      />
                      <textarea
                        value={editBody}
                        onChange={(e) => setEditBody(e.target.value)}
                        rows={3}
                        className="w-full bg-forest/50 border border-glass-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-lime/40 resize-none"
                      />
                      <div className="flex gap-2 justify-end">
                        <button
                          onClick={cancelEdit}
                          className="cursor-pointer px-3 py-1.5 rounded-lg bg-glass text-slate-400 hover:text-white text-xs transition-colors"
                        >
                          <X className="w-3 h-3 inline mr-1" />
                          Cancel
                        </button>
                        <button
                          onClick={saveInsight}
                          disabled={isSaving || !editTitle.trim() || !editBody.trim()}
                          className="cursor-pointer px-3 py-1.5 rounded-lg bg-lime/20 text-lime hover:bg-lime/30 text-xs transition-colors disabled:opacity-40"
                        >
                          <Check className="w-3 h-3 inline mr-1" />
                          {isSaving ? "Saving…" : "Save"}
                        </button>
                      </div>
                    </div>
                  );
                }

                return (
                  <div
                    key={insight.id}
                    className={`flex gap-4 items-start group ${
                      index > 0 ? "pt-4 border-t border-glass-border" : ""
                    }`}
                  >
                    <div className={`p-2 rounded-lg ${styles.bg} ${styles.text}`}>
                      <InsightIcon type={insight.insight_type} className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`font-semibold ${styles.text}`}>{insight.title}</p>
                      <p className="text-sm text-slate-300 mt-0.5">
                        &quot;{insight.body}&quot;
                      </p>
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                      {isDeleting ? (
                        <>
                          <button
                            onClick={() => deleteInsight(insight.id)}
                            className="cursor-pointer p-1.5 rounded bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors"
                            title="Confirm delete"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setDeleteConfirmId(null)}
                            className="cursor-pointer p-1.5 rounded bg-glass text-slate-400 hover:text-white transition-colors"
                            title="Cancel"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() => startEdit(insight)}
                            className="cursor-pointer p-1.5 rounded bg-glass text-slate-400 hover:text-lime transition-colors"
                            title="Edit insight"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setDeleteConfirmId(insight.id)}
                            className="cursor-pointer p-1.5 rounded bg-glass text-slate-400 hover:text-red-400 transition-colors"
                            title="Delete insight"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </GlassCard>

          {/* ——— Homework Required (Live Data) ——— */}
          <GlassCard title="Homework Required" className="bg-orange-500/5 border-orange-500/20">
            <div className="flex flex-col h-full justify-between">
              {initialHomeworkItems.length > 0 ? (
                <>
                  <div className="space-y-3">
                    <p className="text-sm text-slate-300 underline underline-offset-4 decoration-orange-500/50 decoration-2 mb-4 block">
                      Gaps detected in your last statement:
                    </p>
                    {initialHomeworkItems.map((item) => (
                      <div
                        key={item.id}
                        className="flex justify-between items-center p-3 rounded-lg bg-glass border border-glass-border"
                      >
                        <div className="flex gap-3 items-center min-w-0">
                          <Briefcase className="text-slate-400 w-4 h-4 shrink-0" />
                          <span className="text-sm truncate">
                            {item.description} — {currencyFormatterDecimals.format(Math.abs(item.amount))}
                          </span>
                        </div>
                        <span className="text-xs px-2 py-1 rounded bg-orange-500/20 text-orange-400 whitespace-nowrap ml-2">
                          {item.category || "Uncategorised"}
                        </span>
                      </div>
                    ))}
                    {pendingHomework > initialHomeworkItems.length && (
                      <p className="text-xs text-slate-500 text-center">
                        + {pendingHomework - initialHomeworkItems.length} more items
                      </p>
                    )}
                  </div>
                  <Link href="/homework">
                    <button className="cursor-pointer mt-6 w-full py-3 bg-orange-500 text-white font-bold rounded-xl hover:bg-orange-600 transition-colors shadow-lg shadow-orange-500/20">
                      Complete Homework ({pendingHomework} item{pendingHomework !== 1 ? "s" : ""})
                    </button>
                  </Link>
                </>
              ) : (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <div className="w-16 h-16 rounded-full bg-lime/10 flex items-center justify-center mb-4">
                    <CheckCircle2 className="w-8 h-8 text-lime" />
                  </div>
                  <p className="text-lg font-semibold text-lime mb-1">All caught up!</p>
                  <p className="text-sm text-slate-400">
                    No transactions need your attention right now.
                  </p>
                  <p className="text-xs text-slate-500 mt-2">
                    Upload a statement to get started, or check back after your next upload.
                  </p>
                  <Link href="/statements">
                    <button className="cursor-pointer mt-6 px-6 py-2.5 bg-glass border border-lime/20 text-lime font-medium rounded-xl hover:bg-lime/10 transition-colors text-sm">
                      Go to Statements
                    </button>
                  </Link>
                </div>
              )}
            </div>
          </GlassCard>
        </div>
      </main>
    </div>
  );
}
