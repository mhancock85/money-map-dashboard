import { SupabaseClient } from "@supabase/supabase-js";
import { Database } from "../../../supabase/types";

export interface HomeworkTransaction {
  id: string;
  statementId: string;
  transactionDate: string;
  description: string;
  amount: number;
  category: string | null;
  subcategory: string | null;
  confidenceScore: number | null;
  isReviewed: boolean;
  clientFeedback: string | null;
  coachNotes: string | null;
}

export interface HomeworkData {
  transactions: HomeworkTransaction[];
  loadError: string | null;
}

export async function getHomeworkTransactions(
  supabase: SupabaseClient<Database>,
  userId: string
): Promise<HomeworkData> {
  const { data, error } = await supabase
    .from("transactions")
    .select(
      "id, statement_id, transaction_date, description, amount, category, subcategory, confidence_score, is_reviewed, client_feedback, coach_intelligence"
    )
    .eq("client_id", userId)
    .eq("needs_homework", true)
    .order("transaction_date", { ascending: false });

  if (error) {
    return {
      transactions: [],
      loadError: `Failed to load homework transactions: ${error.message}`,
    };
  }

  const transactions: HomeworkTransaction[] = (data ?? []).map((row) => ({
    id: row.id,
    statementId: row.statement_id,
    transactionDate: row.transaction_date,
    description: row.description,
    amount: Number(row.amount),
    category: row.category,
    subcategory: row.subcategory,
    confidenceScore: row.confidence_score ? Number(row.confidence_score) : null,
    isReviewed: row.is_reviewed ?? false,
    clientFeedback: row.client_feedback,
    coachNotes: row.coach_intelligence,
  }));

  return {
    transactions,
    loadError: null,
  };
}
