import { SupabaseClient } from "@supabase/supabase-js";
import { Database } from "../../../supabase/types";

export interface Pattern {
  id: string;
  merchant_pattern: string;
  category: string;
  subcategory: string | null;
  confidence_score: number;
  created_at: string;
}

export interface LearningAnalytics {
  patternsLearned: number;
  totalTransactions: number;
  autoCategorised: number;
  autoCategorisationRate: number;
  pendingHomework: number;
  estimatedTimeSavedMinutes: number;
}

export interface IntelligencePageData {
  learningAnalytics: LearningAnalytics;
  patterns: Pattern[];
  loadError: string | null;
}

export async function getIntelligenceData(
  supabase: SupabaseClient<Database>,
  userId: string
): Promise<IntelligencePageData> {
  // Fetch transactions to compute metrics
  const [transactionsResult, mappingsResult, homeworkCountResult] = await Promise.all([
    supabase
      .from("transactions")
      .select("category, confidence_score, needs_homework")
      .eq("client_id", userId),
    supabase
      .from("category_mappings")
      .select("id, merchant_pattern, category, subcategory, confidence_score, created_at")
      .eq("owner_id", userId)
      .order("created_at", { ascending: false }),
    supabase
      .from("transactions")
      .select("id", { count: "exact", head: true })
      .eq("client_id", userId)
      .eq("needs_homework", true),
  ]);

  if (transactionsResult.error || mappingsResult.error) {
    return {
      learningAnalytics: {
        patternsLearned: 0,
        totalTransactions: 0,
        autoCategorised: 0,
        autoCategorisationRate: 0,
        pendingHomework: 0,
        estimatedTimeSavedMinutes: 0,
      },
      patterns: [],
      loadError: "Unable to load intelligence data. Please try again later.",
    };
  }

  const rawTransactions = transactionsResult.data ?? [];
  const rawMappings = mappingsResult.data ?? [];

  const totalTransactions = rawTransactions.length;
  const autoCategorised = rawTransactions.filter(
    (tx) =>
      tx.category != null &&
      tx.confidence_score != null &&
      !tx.needs_homework
  ).length;

  const autoCategorisationRate =
    totalTransactions > 0
      ? Number(((autoCategorised / totalTransactions) * 100).toFixed(2))
      : 0;

  const estimatedTimeSavedMinutes = Math.round((autoCategorised * 30) / 60);

  const patterns = rawMappings.map((m) => ({
    id: m.id,
    merchant_pattern: m.merchant_pattern,
    category: m.category,
    subcategory: m.subcategory,
    confidence_score: Number(m.confidence_score),
    created_at: m.created_at,
  }));

  const learningAnalytics: LearningAnalytics = {
    patternsLearned: patterns.length,
    totalTransactions,
    autoCategorised,
    autoCategorisationRate,
    pendingHomework: homeworkCountResult.count ?? 0,
    estimatedTimeSavedMinutes,
  };

  return {
    learningAnalytics,
    patterns,
    loadError: null,
  };
}
