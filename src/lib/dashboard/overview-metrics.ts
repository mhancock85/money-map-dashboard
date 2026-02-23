import { SupabaseClient } from "@supabase/supabase-js";
import { Database } from "../../../supabase/types";

type TransactionRow = Pick<
  Database["public"]["Tables"]["transactions"]["Row"],
  "amount" | "transaction_date"
>;

export interface OverviewChartPoint {
  month: string;
  cashflow: number;
  netWorth: number;
}

export interface HomeworkItem {
  id: string;
  description: string;
  amount: number;
  category: string | null;
}

export interface CoachingInsight {
  id: string;
  title: string;
  body: string;
  insight_type: "opportunity" | "warning" | "info";
}

export interface OverviewMetrics {
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

const MONTH_WINDOW = 6;

function monthStart(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function addMonths(date: Date, delta: number) {
  return new Date(date.getFullYear(), date.getMonth() + delta, 1);
}

function toISODate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function monthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function monthLabelFromKey(key: string) {
  const [year, month] = key.split("-").map(Number);
  const date = new Date(year, month - 1, 1);
  return new Intl.DateTimeFormat("en-GB", { month: "short" }).format(date);
}

function roundToTwoDecimals(value: number) {
  return Number(value.toFixed(2));
}

function sumAmounts(rows: Array<Pick<TransactionRow, "amount">>) {
  return rows.reduce((total, row) => total + Number(row.amount), 0);
}

function buildEmptyChartData(rangeStart: Date): OverviewChartPoint[] {
  return Array.from({ length: MONTH_WINDOW }, (_, index) => {
    const date = addMonths(rangeStart, index);
    return {
      month: monthLabelFromKey(monthKey(date)),
      cashflow: 0,
      netWorth: 0,
    };
  });
}

export async function getOverviewMetrics(
  supabase: SupabaseClient<Database>,
  userId: string
): Promise<OverviewMetrics> {
  const now = new Date();
  const currentMonthStart = monthStart(now);
  const rangeStart = addMonths(currentMonthStart, -(MONTH_WINDOW - 1));
  const rangeStartIso = toISODate(rangeStart);
  const currentMonthIso = toISODate(currentMonthStart);

  const [
    profileResult,
    rangeTransactionsResult,
    preRangeTransactionsResult,
    homeworkCountResult,
    homeworkItemsResult,
    insightsResult,
  ] = await Promise.all([
    supabase
      .from("profiles")
      .select("full_name")
      .eq("id", userId)
      .maybeSingle(),
    supabase
      .from("transactions")
      .select("amount, transaction_date")
      .eq("client_id", userId)
      .gte("transaction_date", rangeStartIso)
      .order("transaction_date", { ascending: true }),
    supabase
      .from("transactions")
      .select("amount")
      .eq("client_id", userId)
      .lt("transaction_date", rangeStartIso),
    supabase
      .from("transactions")
      .select("id", { count: "exact", head: true })
      .eq("client_id", userId)
      .eq("needs_homework", true),
    // Fetch top 3 homework items for the overview widget
    supabase
      .from("transactions")
      .select("id, description, amount, category")
      .eq("client_id", userId)
      .eq("needs_homework", true)
      .order("created_at", { ascending: false })
      .limit(3),
    // Fetch active coaching insights
    supabase
      .from("coaching_insights")
      .select("id, title, body, insight_type")
      .eq("user_id", userId)
      .eq("is_active", true)
      .order("created_at", { ascending: false }),
  ]);

  const fullName = profileResult.data?.full_name?.trim() || "Client";

  if (
    rangeTransactionsResult.error ||
    preRangeTransactionsResult.error ||
    homeworkCountResult.error
  ) {
    return {
      fullName,
      userId,
      netWorth: 0,
      monthlyCashflow: 0,
      savingsRate: 0,
      pendingHomework: 0,
      chartData: buildEmptyChartData(rangeStart),
      loadError: "Supabase data is unavailable right now. Showing fallback values.",
      homeworkItems: [],
      coachingInsights: [],
    };
  }

  const rangeTransactions = rangeTransactionsResult.data ?? [];
  const preRangeTransactions = preRangeTransactionsResult.data ?? [];
  const pendingHomework = homeworkCountResult.count ?? 0;

  const homeworkItems: HomeworkItem[] = (homeworkItemsResult.data ?? []).map((row) => ({
    id: row.id,
    description: row.description,
    amount: Number(row.amount),
    category: row.category,
  }));

  const coachingInsights: CoachingInsight[] = (insightsResult.data ?? []).map((row) => ({
    id: row.id,
    title: row.title,
    body: row.body,
    insight_type: row.insight_type as "opportunity" | "warning" | "info",
  }));

  const monthKeys = Array.from({ length: MONTH_WINDOW }, (_, index) =>
    monthKey(addMonths(rangeStart, index))
  );
  const monthlyCashflowMap = new Map<string, number>(monthKeys.map((key) => [key, 0]));

  rangeTransactions.forEach((transaction) => {
    const key = transaction.transaction_date.slice(0, 7);
    if (!monthlyCashflowMap.has(key)) {
      return;
    }

    monthlyCashflowMap.set(
      key,
      (monthlyCashflowMap.get(key) ?? 0) + Number(transaction.amount)
    );
  });

  const baseNetWorth = sumAmounts(preRangeTransactions);
  let runningNetWorth = baseNetWorth;

  const chartData = monthKeys.map((key) => {
    const cashflow = monthlyCashflowMap.get(key) ?? 0;
    runningNetWorth += cashflow;
    return {
      month: monthLabelFromKey(key),
      cashflow: roundToTwoDecimals(cashflow),
      netWorth: roundToTwoDecimals(runningNetWorth),
    };
  });

  const currentMonthTransactions = rangeTransactions.filter(
    (transaction) => transaction.transaction_date >= currentMonthIso
  );

  const monthlyCashflow = sumAmounts(currentMonthTransactions);
  const inflow = currentMonthTransactions.reduce(
    (total, transaction) => total + Math.max(Number(transaction.amount), 0),
    0
  );
  const outflow = currentMonthTransactions.reduce(
    (total, transaction) => total + Math.abs(Math.min(Number(transaction.amount), 0)),
    0
  );
  const savingsRate = inflow > 0 ? ((inflow - outflow) / inflow) * 100 : 0;

  return {
    fullName,
    userId,
    netWorth: roundToTwoDecimals(chartData[chartData.length - 1]?.netWorth ?? baseNetWorth),
    monthlyCashflow: roundToTwoDecimals(monthlyCashflow),
    savingsRate: roundToTwoDecimals(savingsRate),
    pendingHomework,
    chartData,
    loadError: null,
    homeworkItems,
    coachingInsights,
  };
}
