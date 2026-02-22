import { SupabaseClient } from "@supabase/supabase-js";
import { Database } from "../../../supabase/types";

// ── Public types ────────────────────────────────────────────────────────────

/** Minimal transaction shape sent to the client for aggregation. */
export interface InsightTransaction {
  transactionDate: string;
  description: string;
  amount: number;
  category: string | null;
  subcategory: string | null;
  confidenceScore: number | null;
  needsHomework: boolean;
}

export interface AvailableMonth {
  key: string;      // e.g. "2026-02"
  label: string;    // e.g. "Feb 26"
  transactionCount: number;
}

export interface InsightsPageData {
  transactions: InsightTransaction[];
  availableMonths: AvailableMonth[];
  defaultCurrency: string;
  loadError: string | null;
}

// ── Aggregated types (computed client-side) ─────────────────────────────────

export interface CategoryBreakdown {
  category: string;
  total: number;
  percentage: number;
  transactionCount: number;
}

export interface MonthlyTrend {
  month: string;
  monthKey: string;
  income: number;
  spending: number;
  net: number;
}

export interface TopMerchant {
  description: string;
  total: number;
  transactionCount: number;
  category: string | null;
  subcategory: string | null;
}



export interface AggregatedInsights {
  categoryBreakdown: CategoryBreakdown[];
  monthlyTrends: MonthlyTrend[];
  topMerchants: TopMerchant[];
  totalSpending: number;
  totalIncome: number;
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function roundTwo(value: number) {
  return Number(value.toFixed(2));
}

function monthLabelFromKey(key: string) {
  const [year, month] = key.split("-").map(Number);
  const date = new Date(year, month - 1, 1);
  return new Intl.DateTimeFormat("en-GB", {
    month: "short",
    year: "2-digit",
  }).format(date);
}

/** Extract a shortened merchant name from a raw description. */
function extractMerchantName(description: string): string {
  const noise = [
    "payment", "transfer", "direct debit", "standing order", "card",
    "pos", "purchase", "contactless", "debit", "credit", "ref",
    "to", "from", "gbp", "usd", "eur",
  ];
  const words = description
    .replace(/[^a-zA-Z0-9\s&'.-]/g, " ")
    .split(/\s+/)
    .filter(
      (w) => w.length > 1 && !noise.includes(w.toLowerCase())
    );
  if (words.length === 0) return description.trim().slice(0, 30);
  if (words[0] && words[0].length >= 6) return words[0];
  return words.slice(0, 3).join(" ");
}

// ── Category colours (for consistent UI) ────────────────────────────────────

export const CATEGORY_COLOURS: Record<string, string> = {
  Income: "#34d399",       // emerald-400
  Essential: "#60a5fa",    // blue-400
  Discretionary: "#fb923c", // orange-400
  Business: "#a78bfa",     // violet-400
  "Debt Repayment": "#f87171", // red-400
  Savings: "#a3e635",      // lime-400
  Transfer: "#94a3b8",     // slate-400
};

export function getCategoryColour(category: string): string {
  return CATEGORY_COLOURS[category] ?? "#64748b"; // slate-500 fallback
}

// ── Client-side aggregation function ────────────────────────────────────────

/**
 * Aggregates a filtered set of transactions into all the metrics the
 * Insights page needs. Called client-side whenever the month selection
 * changes so the UI updates instantly.
 */
export function aggregateTransactions(
  transactions: InsightTransaction[],
  selectedMonths: Set<string>,
  excludeTransfers: boolean = true
): AggregatedInsights {
  // Filter to selected months
  const filtered = transactions.filter((tx) =>
    selectedMonths.has(tx.transactionDate.slice(0, 7))
  );

  // ── Category breakdown ────────────────────────────────────────────────

  const categoryMap = new Map<string, { total: number; count: number }>();
  let totalSpending = 0;
  let totalIncome = 0;

  for (const tx of filtered) {
    if (excludeTransfers && tx.category === "Transfer") continue; // Ignore internal transfers from totals
    
    const isIncome = tx.category === "Income" || (!tx.category && tx.amount >= 0);

    if (isIncome) {
      totalIncome += Math.abs(tx.amount);
    } else {
      totalSpending += Math.abs(tx.amount);
    }

    const cat = tx.subcategory || tx.category || "Uncategorised";
    const existing = categoryMap.get(cat) ?? { total: 0, count: 0 };
    existing.total += Math.abs(tx.amount);
    existing.count++;
    categoryMap.set(cat, existing);
  }

  const totalAbsolute = totalIncome + totalSpending;
  const categoryBreakdown: CategoryBreakdown[] = Array.from(
    categoryMap.entries()
  )
    .map(([category, { total, count }]) => ({
      category,
      total: roundTwo(total),
      percentage:
        totalAbsolute > 0 ? roundTwo((total / totalAbsolute) * 100) : 0,
      transactionCount: count,
    }))
    .sort((a, b) => b.total - a.total);

  // ── Monthly trends ────────────────────────────────────────────────────

  const monthMap = new Map<string, { income: number; spending: number }>();

  // Seed selected months
  const sortedMonthKeys = Array.from(selectedMonths).sort();
  for (const key of sortedMonthKeys) {
    monthMap.set(key, { income: 0, spending: 0 });
  }

  for (const tx of filtered) {
    if (excludeTransfers && tx.category === "Transfer") continue;

    const key = tx.transactionDate.slice(0, 7);
    const existing = monthMap.get(key);
    if (!existing) continue;

    const isIncome = tx.category === "Income" || (!tx.category && tx.amount >= 0);

    if (isIncome) {
      existing.income += Math.abs(tx.amount);
    } else {
      existing.spending += Math.abs(tx.amount);
    }
  }

  const monthlyTrends: MonthlyTrend[] = Array.from(monthMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, { income, spending }]) => ({
      month: monthLabelFromKey(key),
      monthKey: key,
      income: roundTwo(income),
      spending: roundTwo(spending),
      net: roundTwo(income - spending),
    }));

  // ── Top merchants (by absolute spend, top 10) ────────────────────────

  const merchantMap = new Map<
    string,
    { total: number; count: number; category: string | null; subcategory: string | null }
  >();

  for (const tx of filtered) {
    if (excludeTransfers && tx.category === "Transfer") continue; 
    
    const isIncome = tx.category === "Income" || (!tx.category && tx.amount >= 0);
    if (isIncome) continue; // Skip income

    const key = extractMerchantName(tx.description);
    const existing = merchantMap.get(key) ?? {
      total: 0,
      count: 0,
      category: null,
      subcategory: null,
    };
    existing.total += Math.abs(tx.amount);
    existing.count++;
    if (tx.category) existing.category = tx.category;
    if (tx.subcategory) existing.subcategory = tx.subcategory;
    merchantMap.set(key, existing);
  }

  const topMerchants: TopMerchant[] = Array.from(merchantMap.entries())
    .map(([description, { total, count, category, subcategory }]) => ({
      description,
      total: roundTwo(total),
      transactionCount: count,
      category,
      subcategory,
    }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 10);

  return {
    categoryBreakdown,
    monthlyTrends,
    topMerchants,
    totalSpending: roundTwo(totalSpending),
    totalIncome: roundTwo(totalIncome),
  };
}

// ── Server-side data fetcher ────────────────────────────────────────────────

export async function getInsightsData(
  supabase: SupabaseClient<Database>,
  userId: string
): Promise<InsightsPageData> {
  // Fetch last 12 months to give plenty of history for filtering.
  const now = new Date();
  const twelveMonthsAgo = new Date(
    now.getFullYear(),
    now.getMonth() - 11,
    1
  );
  const rangeStartIso = twelveMonthsAgo.toISOString().slice(0, 10);

  const [profileResult, transactionsResult] =
    await Promise.all([
      supabase
        .from("profiles")
        .select("default_currency")
        .eq("id", userId)
        .maybeSingle(),
      supabase
        .from("transactions")
        .select(
          "transaction_date, description, amount, category, subcategory, confidence_score, needs_homework"
        )
        .eq("client_id", userId)
        .gte("transaction_date", rangeStartIso)
        .order("transaction_date", { ascending: false }),
    ]);

  const defaultCurrency = profileResult.data?.default_currency ?? "GBP";

  if (transactionsResult.error) {
    return {
      transactions: [],
      availableMonths: [],
      defaultCurrency,
      loadError: "Unable to load insights. Please try again later.",
    };
  }

  const rawTransactions = transactionsResult.data ?? [];

  // Build minimal transaction records for client
  const transactions: InsightTransaction[] = rawTransactions.map((tx) => ({
    transactionDate: tx.transaction_date,
    description: tx.description,
    amount: Number(tx.amount),
    category: tx.category,
    subcategory: tx.subcategory || null,
    confidenceScore: tx.confidence_score ? Number(tx.confidence_score) : null,
    needsHomework: tx.needs_homework,
  }));

  // Compute available months with transaction counts
  const monthCounts = new Map<string, number>();
  for (const tx of transactions) {
    const key = tx.transactionDate.slice(0, 7);
    monthCounts.set(key, (monthCounts.get(key) ?? 0) + 1);
  }

  const availableMonths: AvailableMonth[] = Array.from(monthCounts.entries())
    .sort(([a], [b]) => b.localeCompare(a)) // Newest first
    .map(([key, count]) => ({
      key,
      label: monthLabelFromKey(key),
      transactionCount: count,
    }));

  return {
    transactions,
    availableMonths,
    defaultCurrency,
    loadError: null,
  };
}
