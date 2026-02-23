import { NextRequest, NextResponse } from "next/server";
import { categorizeTransactions } from "@/lib/ai/categorize";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { ParsedTransaction } from "@/lib/dashboard/csv-parser";

/**
 * POST /api/categorize
 *
 * Accepts transactions that have NOT already been matched by saved
 * mappings on the client side.  Only these "unknown" transactions
 * are sent to the merchant-rules dictionary and Gemini AI.
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();

    // Verify authentication
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { transactions } = await request.json();

    if (!Array.isArray(transactions) || transactions.length === 0) {
      return NextResponse.json(
        { error: "Invalid transactions array" },
        { status: 400 }
      );
    }

    console.log(
      `[categorize] User ${user.id}: ${transactions.length} unmatched transactions to categorise via AI`
    );

    // No saved mappings passed — the client already handled those.
    // Only merchant-rules and Gemini AI run here.
    const categorizations = await categorizeTransactions(
      transactions as ParsedTransaction[],
      [] // empty mappings — client already applied them
    );

    // Convert Map to object for JSON response
    const results: Record<string, { category: string; subcategory: string; confidence: number; needsHomework: boolean }> = {};
    categorizations.forEach((result, key) => {
      results[key] = {
        category: result.category,
        subcategory: result.subcategory,
        confidence: result.confidence,
        needsHomework: result.confidence < 0.7,
      };
    });

    return NextResponse.json({ categorizations: results });
  } catch (error) {
    console.error("Categorization API error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Categorization failed" },
      { status: 500 }
    );
  }
}
