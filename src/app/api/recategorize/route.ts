import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { categorizeTransaction } from "@/lib/ai/categorize";

/**
 * POST /api/recategorize
 *
 * Re-runs AI categorisation on all transactions that have a parent
 * category but no subcategory.  Processes in batches to avoid
 * Gemini rate limits.
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Fetch transactions missing a subcategory
    const { data: transactions, error } = await supabase
      .from("transactions")
      .select("id, transaction_date, description, amount, category")
      .eq("client_id", user.id)
      .is("subcategory", null)
      .order("transaction_date", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!transactions || transactions.length === 0) {
      return NextResponse.json({
        message: "All transactions already have subcategories.",
        updated: 0,
      });
    }

    // Fetch existing category mappings for pattern matching
    const { data: mappings } = await supabase
      .from("category_mappings")
      .select("merchant_pattern, category, subcategory")
      .eq("owner_id", user.id);

    const existingMappings = (mappings || []).map((m) => ({
      merchantPattern: m.merchant_pattern,
      category: m.category,
      subcategory: m.subcategory,
    }));

    let updated = 0;
    let errors = 0;

    // Process in batches of 5 with a small delay to avoid rate limits
    const BATCH_SIZE = 5;

    for (let i = 0; i < transactions.length; i += BATCH_SIZE) {
      const batch = transactions.slice(i, i + BATCH_SIZE);

      const results = await Promise.all(
        batch.map(async (tx) => {
          try {
            const result = await categorizeTransaction(
              {
                date: tx.transaction_date,
                description: tx.description,
                amount: Number(tx.amount),
              },
              existingMappings
            );

            const { error: updateError } = await supabase
              .from("transactions")
              .update({
                category: result.category,
                subcategory: result.subcategory,
                confidence_score: result.confidence,
                needs_homework: result.confidence < 0.7,
              })
              .eq("id", tx.id);

            if (updateError) {
              console.error(`Failed to update ${tx.id}:`, updateError.message);
              return false;
            }
            return true;
          } catch (err) {
            console.error(`AI error for ${tx.id}:`, err);
            return false;
          }
        })
      );

      updated += results.filter(Boolean).length;
      errors += results.filter((r) => !r).length;

      // Small delay between batches to respect rate limits
      if (i + BATCH_SIZE < transactions.length) {
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
    }

    return NextResponse.json({
      message: `Re-categorised ${updated} transactions with subcategories.`,
      updated,
      errors,
      total: transactions.length,
    });
  } catch (error) {
    console.error("Recategorize API error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Recategorization failed",
      },
      { status: 500 }
    );
  }
}
