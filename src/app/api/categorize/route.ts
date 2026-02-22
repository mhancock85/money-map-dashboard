import { NextRequest, NextResponse } from "next/server";
import { categorizeTransactions } from "@/lib/ai/categorize";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { ParsedTransaction } from "@/lib/dashboard/csv-parser";

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

    // Fetch user's existing category mappings for pattern matching
    const { data: mappings } = await supabase
      .from("category_mappings")
      .select("merchant_pattern, category, subcategory")
      .eq("owner_id", user.id);

    const existingMappings = (mappings || []).map((m) => ({
      merchantPattern: m.merchant_pattern,
      category: m.category,
      subcategory: m.subcategory,
    }));

    // Categorize all transactions using AI + pattern matching
    const categorizations = await categorizeTransactions(
      transactions as ParsedTransaction[],
      existingMappings
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
