import { SupabaseClient } from "@supabase/supabase-js";
import { Database } from "../../../supabase/types";

// ── Public types ────────────────────────────────────────────────────────────

export interface StatementWithCounts {
  id: string;
  filename: string;
  status: string;
  currency: string;
  createdAt: string;
  transactionCount: number;
  totalIn: number;
  totalOut: number;
}

export interface StatementsPageData {
  statements: StatementWithCounts[];
  defaultCurrency: string;
  loadError: string | null;
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function roundTwo(value: number) {
  return Number(value.toFixed(2));
}

// ── Data fetcher ────────────────────────────────────────────────────────────

export async function getStatementsData(
  supabase: SupabaseClient<Database>,
  userId: string
): Promise<StatementsPageData> {
  const [profileResult, statementsResult] = await Promise.all([
    supabase
      .from("profiles")
      .select("default_currency")
      .eq("id", userId)
      .maybeSingle(),
    supabase
      .from("statements")
      .select("id, filename, status, currency, created_at")
      .eq("client_id", userId)
      .order("created_at", { ascending: false }),
  ]);

  const defaultCurrency = profileResult.data?.default_currency ?? "GBP";

  if (statementsResult.error) {
    return {
      statements: [],
      defaultCurrency,
      loadError: "Unable to load statements. Please try again later.",
    };
  }

  const rawStatements = statementsResult.data ?? [];

  if (rawStatements.length === 0) {
    return { statements: [], defaultCurrency, loadError: null };
  }

  // Fetch transaction aggregates for all statements in one query.
  const statementIds = rawStatements.map((s) => s.id);
  const { data: transactions } = await supabase
    .from("transactions")
    .select("statement_id, amount")
    .in("statement_id", statementIds);

  // Build per-statement aggregates.
  const aggregates = new Map<
    string,
    { count: number; totalIn: number; totalOut: number }
  >();

  for (const tx of transactions ?? []) {
    const agg = aggregates.get(tx.statement_id) ?? {
      count: 0,
      totalIn: 0,
      totalOut: 0,
    };
    agg.count++;
    const amount = Number(tx.amount);
    if (amount >= 0) {
      agg.totalIn += amount;
    } else {
      agg.totalOut += Math.abs(amount);
    }
    aggregates.set(tx.statement_id, agg);
  }

  const statements: StatementWithCounts[] = rawStatements.map((s) => {
    const agg = aggregates.get(s.id);
    return {
      id: s.id,
      filename: s.filename,
      status: s.status,
      currency: s.currency,
      createdAt: s.created_at,
      transactionCount: agg?.count ?? 0,
      totalIn: roundTwo(agg?.totalIn ?? 0),
      totalOut: roundTwo(agg?.totalOut ?? 0),
    };
  });

  return { statements, defaultCurrency, loadError: null };
}
