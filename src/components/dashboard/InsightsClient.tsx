"use client";

import { useState, useMemo, useCallback } from "react";
import { Sidebar } from "@/components/Sidebar";
import { GlassCard } from "@/components/GlassCard";
import {
  Sparkles,
  TrendingUp,
  TrendingDown,
  ShoppingBag,
  Brain,
  Zap,
  Target,
  Clock,
  BarChart3,
  ArrowUpRight,
  ArrowDownRight,
  CalendarDays,
  CheckCheck,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import type {
  InsightsPageData,
  CategoryBreakdown,
} from "@/lib/dashboard/insights-data";
import {
  aggregateTransactions,
} from "@/lib/dashboard/insights-data";
import { getCategoryColour } from "@/lib/dashboard/categories";


// ── Helpers ─────────────────────────────────────────────────────────────────

function formatCurrency(amount: number, currency: string): string {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatCompactCurrency(amount: number, currency: string): string {
  if (Math.abs(amount) >= 1000) {
    return new Intl.NumberFormat("en-GB", {
      style: "currency",
      currency,
      maximumFractionDigits: 1,
      notation: "compact",
    }).format(amount);
  }
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

function getCategoryIcon(category: string) {
  switch (category) {
    case "Income":
      return <ArrowUpRight className="w-3.5 h-3.5" />;
    case "Essential":
      return <ShoppingBag className="w-3.5 h-3.5" />;
    case "Savings":
      return <Target className="w-3.5 h-3.5" />;
    case "Debt Repayment":
      return <ArrowDownRight className="w-3.5 h-3.5" />;
    default:
      return <BarChart3 className="w-3.5 h-3.5" />;
  }
}

// ── Custom Recharts Tooltip ────────────────────────────────────────────────

interface TooltipPayload {
  name: string;
  value: number;
  color: string;
}

function CustomTooltip({
  active,
  payload,
  label,
  currency,
}: {
  active?: boolean;
  payload?: TooltipPayload[];
  label?: string;
  currency: string;
}) {
  if (!active || !payload) return null;
  return (
    <div className="bg-forest/95 border border-glass-border rounded-xl px-4 py-3 shadow-2xl backdrop-blur-xl">
      <p className="text-xs text-slate-500 font-medium uppercase mb-2">
        {label}
      </p>
      {payload.map((entry, i) => (
        <div key={i} className="flex items-center gap-2 text-sm">
          <div
            className="w-2.5 h-2.5 rounded-full"
            style={{ backgroundColor: entry.color }}
          />
          <span className="text-slate-400">{entry.name}:</span>
          <span className="font-bold" style={{ color: entry.color }}>
            {formatCurrency(entry.value, currency)}
          </span>
        </div>
      ))}
    </div>
  );
}

// ── Component ───────────────────────────────────────────────────────────────

export function InsightsClient({
  transactions,
  availableMonths,
  defaultCurrency,
  loadError,
}: InsightsPageData) {
  // ── Month selection state ─────────────────────────────────────────────
  // Default: select all available months
  const [selectedMonths, setSelectedMonths] = useState<Set<string>>(() => {
    if (availableMonths.length === 0) return new Set<string>();
    return new Set(availableMonths.map((m) => m.key));
  });

  const [excludeTransfers, setExcludeTransfers] = useState(true);

  const allSelected = selectedMonths.size === availableMonths.length;

  const toggleMonth = useCallback(
    (key: string) => {
      setSelectedMonths((prev) => {
        const next = new Set(prev);
        if (next.has(key)) {
          // Don't allow deselecting the last month
          if (next.size <= 1) return prev;
          next.delete(key);
        } else {
          next.add(key);
        }
        return next;
      });
    },
    []
  );

  const selectAll = useCallback(() => {
    setSelectedMonths(new Set(availableMonths.map((m) => m.key)));
  }, [availableMonths]);

  const selectSingle = useCallback(
    (key: string) => {
      setSelectedMonths(new Set([key]));
    },
    []
  );

  // ── Aggregated data (recomputed when selection changes) ───────────────
  const aggregated = useMemo(
    () =>
      aggregateTransactions(
        transactions,
        selectedMonths,
        excludeTransfers
      ),
    [transactions, selectedMonths, excludeTransfers]
  );

  const {
    categoryBreakdown,
    monthlyTrends,
    topMerchants,
    totalSpending,
    totalIncome,
  } = aggregated;

  // Find the largest category for bar widths
  const maxCategoryTotal = Math.max(
    ...categoryBreakdown.map((c) => c.total),
    1
  );

  // Category breakdown is already sorted by total (descending) from the aggregator
  const allCategories = categoryBreakdown;

  // ── Selection label ───────────────────────────────────────────────────
  const selectionLabel = useMemo(() => {
    if (allSelected) return "All months";
    if (selectedMonths.size === 1) {
      const key = Array.from(selectedMonths)[0];
      const m = availableMonths.find((am) => am.key === key);
      return m ? m.label : key;
    }
    return `${selectedMonths.size} months`;
  }, [selectedMonths, allSelected, availableMonths]);

  return (
    <div className="flex bg-forest min-h-screen">
      <Sidebar />

      <main className="flex-1 ml-64 p-10">
        <header className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <Sparkles className="text-lime w-8 h-8" />
              Insights
            </h1>
            <div className="text-sm text-slate-500 flex items-center gap-2">
              <CalendarDays className="w-4 h-4" />
              Showing: <span className="text-lime font-medium">{selectionLabel}</span>
            </div>
          </div>
          <p className="text-slate-400">
            Deep-dive analytics from your transaction data.
          </p>
        </header>

        {loadError && (
          <div className="mb-6 rounded-lg border border-orange-500/30 bg-orange-500/10 px-4 py-3 text-sm text-orange-300">
            {loadError}
          </div>
        )}

        {/* ── Month Picker ─────────────────────────────────────────── */}
        {availableMonths.length > 0 && (
          <div className="mb-8">
            <div className="flex items-center gap-2 flex-wrap">
              {/* All button */}
              <button
                onClick={selectAll}
                className={`
                  px-3 py-1.5 rounded-full text-xs font-medium border transition-all duration-200 cursor-pointer
                  flex items-center gap-1.5
                  ${
                    allSelected
                      ? "bg-lime/15 text-lime border-lime/30 shadow-[0_0_8px_rgba(163,230,53,0.15)]"
                      : "bg-glass text-slate-500 border-glass-border hover:text-slate-300 hover:border-slate-600"
                  }
                `}
              >
                <CheckCheck className="w-3 h-3" />
                All
              </button>

              {/* Divider */}
              <div className="w-px h-5 bg-glass-border mx-1" />

              {/* Individual month pills */}
              {availableMonths.map((m) => {
                const isSelected = selectedMonths.has(m.key);
                return (
                  <button
                    key={m.key}
                    onClick={(e) => {
                      if (e.metaKey || e.ctrlKey) {
                        // Cmd/Ctrl+click: toggle this month in multi-select
                        toggleMonth(m.key);
                      } else {
                        // Normal click: select only this month (or all if it's the only one selected)
                        if (selectedMonths.size === 1 && isSelected) {
                          selectAll();
                        } else {
                          selectSingle(m.key);
                        }
                      }
                    }}
                    title={`${m.transactionCount} transactions · Click to select · Cmd+click to multi-select`}
                    className={`
                      px-3 py-1.5 rounded-full text-xs font-medium border transition-all duration-200 cursor-pointer
                      ${
                        isSelected
                          ? "bg-lime/15 text-lime border-lime/30 shadow-[0_0_8px_rgba(163,230,53,0.15)]"
                          : "bg-glass text-slate-500 border-glass-border hover:text-slate-300 hover:border-slate-600"
                      }
                    `}
                  >
                    {m.label}
                    <span className={`ml-1.5 ${isSelected ? "text-lime/60" : "text-slate-700"}`}>
                      {m.transactionCount}
                    </span>
                  </button>
                );
              })}
            </div>
            <div className="flex items-center justify-between mt-3">
              <p className="text-xs text-slate-600">
                Click a month to view it · Cmd+click for multi-select · Click again to show all
              </p>
              <label className="flex items-center gap-2 text-xs text-slate-400 cursor-pointer hover:text-slate-300 transition-colors">
                <input
                  type="checkbox"
                  checked={excludeTransfers}
                  onChange={(e) => setExcludeTransfers(e.target.checked)}
                  className="rounded border-glass-border bg-glass/50 text-lime focus:ring-lime focus:ring-offset-forest/50 w-3.5 h-3.5"
                />
                Exclude internal transfers
              </label>
            </div>
          </div>
        )}

        {/* ── Summary Cards ──────────────────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
          <GlassCard>
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-emerald-500/10">
                <TrendingUp className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <p className="text-xs text-slate-500 uppercase font-medium tracking-wider">
                  Total Income
                </p>
                <p className="text-xl font-bold text-emerald-400">
                  {formatCurrency(totalIncome, defaultCurrency)}
                </p>
              </div>
            </div>
          </GlassCard>

          <GlassCard>
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-red-500/10">
                <TrendingDown className="w-5 h-5 text-red-400" />
              </div>
              <div>
                <p className="text-xs text-slate-500 uppercase font-medium tracking-wider">
                  Total Spending
                </p>
                <p className="text-xl font-bold text-red-400">
                  {formatCurrency(totalSpending, defaultCurrency)}
                </p>
              </div>
            </div>
          </GlassCard>

        </div>

        {/* ── Main Grid ──────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mb-8">
          {/* Monthly Trends Chart */}
          <GlassCard
            title="Monthly Trends"
            className="xl:col-span-2"
          >
            {monthlyTrends.length > 0 ? (
              <div className="h-72">
                <ResponsiveContainer
                  width="100%"
                  height="100%"
                  minWidth={0}
                  minHeight={0}
                >
                  <BarChart
                    data={monthlyTrends}
                    margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="rgba(148, 163, 184, 0.08)"
                      vertical={false}
                    />
                    <XAxis
                      dataKey="month"
                      tick={{ fill: "#64748b", fontSize: 12 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fill: "#64748b", fontSize: 12 }}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(v: number) =>
                        formatCompactCurrency(v, defaultCurrency)
                      }
                    />
                    <Tooltip
                      cursor={{ fill: "transparent" }}
                      content={
                        <CustomTooltip currency={defaultCurrency} />
                      }
                    />
                    <Legend
                      wrapperStyle={{ paddingTop: 16, fontSize: 12 }}
                    />
                    <Bar
                      dataKey="income"
                      name="Income"
                      fill="#34d399"
                      radius={[4, 4, 0, 0]}
                      maxBarSize={32}
                    />
                    <Bar
                      dataKey="spending"
                      name="Spending"
                      fill="#f87171"
                      radius={[4, 4, 0, 0]}
                      maxBarSize={32}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-72 flex items-center justify-center text-slate-600">
                <p>No transaction data for the selected period.</p>
              </div>
            )}
          </GlassCard>

          {/* Category Breakdown */}
          <GlassCard title="Category Breakdown">
            {allCategories.length > 0 ? (
              <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                {allCategories.map((cat) => (
                  <div key={cat.category}>
                    <div className="flex items-center justify-between text-sm mb-1">
                      <div className="flex items-center gap-2">
                        <span
                          className="flex items-center justify-center w-5 h-5 rounded"
                          style={{
                            backgroundColor: `${getCategoryColour(
                              cat.category
                            )}20`,
                            color: getCategoryColour(cat.category),
                          }}
                        >
                          {getCategoryIcon(cat.category)}
                        </span>
                        <span className="text-slate-300 font-medium">
                          {cat.category}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-600">
                          {cat.transactionCount} txns
                        </span>
                        <span
                          className="font-bold text-sm"
                          style={{
                            color: getCategoryColour(cat.category),
                          }}
                        >
                          {formatCurrency(cat.total, defaultCurrency)}
                        </span>
                      </div>
                    </div>
                    <div className="w-full h-1.5 bg-glass rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${Math.max(
                            (cat.total / maxCategoryTotal) * 100,
                            2
                          )}%`,
                          backgroundColor: getCategoryColour(cat.category),
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-8 text-center text-slate-600">
                <p>No categorised transactions for the selected period.</p>
              </div>
            )}
          </GlassCard>
        </div>

        {/* ── Bottom Grid ────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Top Merchants */}
          <GlassCard
            title="Top Spending Merchants"
            className="xl:col-span-3"
          >
            {topMerchants.length > 0 ? (
              <div className="overflow-x-auto rounded-xl border border-glass-border">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-glass-border text-slate-600 text-xs uppercase tracking-wider">
                      <th className="text-left px-4 py-2.5">#</th>
                      <th className="text-left px-4 py-2.5">
                        Merchant
                      </th>
                      <th className="text-left px-4 py-2.5">
                        Category
                      </th>
                      <th className="text-left px-4 py-2.5">
                        Subcategory
                      </th>
                      <th className="text-center px-4 py-2.5">Txns</th>
                      <th className="text-right px-4 py-2.5">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {topMerchants.map((merchant, i) => (
                      <tr
                        key={merchant.description}
                        className="border-b border-glass-border last:border-0 hover:bg-glass/30 transition-colors"
                      >
                        <td className="px-4 py-2.5 text-slate-600 font-mono text-xs">
                          {i + 1}
                        </td>
                        <td className="px-4 py-2.5 font-medium truncate max-w-[200px]">
                          {merchant.description}
                        </td>
                        <td className="px-4 py-2.5">
                          {merchant.category ? (
                            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500/80">
                              {merchant.category}
                            </span>
                          ) : (
                            <span className="text-xs text-slate-600 italic">
                              —
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-2.5">
                          {merchant.subcategory ? (
                            <span
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border"
                              style={{
                                backgroundColor: `${getCategoryColour(
                                  merchant.category || "Uncategorised"
                                )}15`,
                                color: getCategoryColour(
                                  merchant.category || "Uncategorised"
                                ),
                                borderColor: `${getCategoryColour(
                                  merchant.category || "Uncategorised"
                                )}30`,
                              }}
                            >
                              {merchant.subcategory}
                            </span>
                          ) : (
                            <span className="text-xs text-slate-600 italic">
                              —
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-2.5 text-center text-slate-500">
                          {merchant.transactionCount}
                        </td>
                        <td className="px-4 py-2.5 text-right font-bold text-red-400">
                          {formatCurrency(
                            merchant.total,
                            defaultCurrency
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="py-8 text-center text-slate-600">
                <p>No spending transactions for the selected period.</p>
              </div>
            )}
          </GlassCard>
        </div>
      </main>
    </div>
  );
}
