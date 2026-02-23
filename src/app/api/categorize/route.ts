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

    const { transactions, mappings: clientMappings } = await request.json();

    if (!Array.isArray(transactions) || transactions.length === 0) {
      return NextResponse.json(
        { error: "Invalid transactions array" },
        { status: 400 }
      );
    }

    // Prefer client-sent mappings (guaranteed auth context) over server-fetched
    let existingMappings: { merchantPattern: string; category: string; subcategory: string | null }[];

    if (Array.isArray(clientMappings) && clientMappings.length > 0) {
      existingMappings = clientMappings;
      console.log(`[categorize] Using ${existingMappings.length} client-sent mappings`);
    } else {
      // Fallback: fetch server-side
      const { data: mappings } = await supabase
        .from("category_mappings")
        .select("merchant_pattern, category, subcategory")
        .eq("owner_id", user.id);

      existingMappings = (mappings || []).map((m) => ({
        merchantPattern: m.merchant_pattern,
        category: m.category,
        subcategory: m.subcategory,
      }));
      console.log(`[categorize] Server-fetched ${existingMappings.length} mappings`);
    }

    console.log(
      `[categorize] User ${user.id}: ${existingMappings.length} mappings, ${transactions.length} transactions`,
      existingMappings.length > 0
        ? existingMappings.map((m) => `${m.merchantPattern} → ${m.category}/${m.subcategory}`)
        : "(none)"
    );

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

    return NextResponse.json({ categorizations: results, mappingsUsed: existingMappings.length });
  } catch (error) {
    console.error("Categorization API error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Categorization failed" },
      { status: 500 }
    );
  }
}
