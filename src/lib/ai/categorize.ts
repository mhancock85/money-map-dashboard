import { ParsedTransaction } from "@/lib/dashboard/csv-parser";
import {
  CATEGORY_TAXONOMY,
  normaliseCategory,
  getParentCategory,
  isSubcategory,
} from "@/lib/dashboard/categories";
import { matchMerchant } from "./merchant-rules";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = "gemini-2.0-flash-exp";

export interface CategorizationResult {
  category: string;
  subcategory: string;
  confidence: number;
  reasoning?: string;
}

interface CategoryMapping {
  merchantPattern: string;
  category: string;
  subcategory: string | null;
}

// Build the prompt dynamically from the shared taxonomy
function buildCategoryPrompt(): string {
  const taxonomyLines = CATEGORY_TAXONOMY.map((parent) => {
    const subs = parent.subcategories.map((s) => s.value).join(", ");
    return `- ${parent.value}: [${subs}]`;
  }).join("\n");

  return `You are a UK financial categorization assistant. Categorize the transaction using this two-level taxonomy.

PARENT CATEGORIES and their SUBCATEGORIES:
${taxonomyLines}

CRITICAL RULES:
- Every transaction must have BOTH a parent category and a subcategory.
- Use the subcategory value exactly as listed above (Title Case).
- UK supermarkets (Sainsbury's, Tesco, Co-op, Morrisons, Aldi, Lidl, Asda, Waitrose, M&S Food, Iceland, Ocado) are ALWAYS Essential/Groceries.
- UK fast food and restaurants (McDonald's, Nando's, Pret, Costa, Starbucks, Greggs, KFC, Burger King, Five Guys, Wagamama, Pizza Express) are ALWAYS Discretionary/Eating Out.
- Subscription services (Netflix, Spotify, YouTube, Disney+, DAZN, Apple subscriptions, Amazon Prime) are Discretionary/Subscriptions.
- Fuel stations (Shell, BP, Esso, MFG) are Essential/Transport.
- Train/travel (TfL, Trainline, GWR, National Rail) are Essential/Transport.
- Airlines (EasyJet, Ryanair, British Airways, Jet2) are Discretionary/Travel/Holidays.
- Large positive amounts with "salary", "payroll", "wages" are Income/Salary.
- Positive amounts with "refund" or "payment received" are Income/Refund.
- Amazon purchases (not Prime) are Discretionary/Shopping.

Respond with JSON only:
{
  "category": "ParentCategory",
  "subcategory": "Subcategory",
  "confidence": 0.0-1.0,
  "reasoning": "brief explanation"
}

High confidence (>0.7): Clear merchant or pattern.
Medium confidence (0.4-0.7): Ambiguous description.
Low confidence (<0.4): Cannot determine from description alone.`;
}

const CATEGORY_PROMPT = buildCategoryPrompt();

/**
 * Categorize a single transaction.
 *
 * Priority order:
 *   1. User's saved category mappings (from previous manual categorisations)
 *   2. Built-in merchant dictionary (instant, deterministic, no API call)
 *   3. Gemini AI (for genuinely ambiguous transactions)
 */
export async function categorizeTransaction(
  transaction: ParsedTransaction,
  existingMappings: CategoryMapping[]
): Promise<CategorizationResult> {
  const normalizedDesc = transaction.description.trim().toLowerCase();

  // ── Layer 1: User's saved mappings (highest priority) ────────────────
  const exactMatch = existingMappings.find((mapping) =>
    normalizedDesc.includes(mapping.merchantPattern.toLowerCase())
  );

  if (exactMatch) {
    const category = normaliseCategory(exactMatch.category);
    const subcategory = exactMatch.subcategory
      ? normaliseCategory(exactMatch.subcategory)
      : category;
    return {
      category,
      subcategory,
      confidence: 0.95,
      reasoning: `Matched saved mapping: "${exactMatch.merchantPattern}"`,
    };
  }

  // ── Layer 2: Built-in merchant dictionary ────────────────────────────
  const merchantMatch = matchMerchant(transaction.description);
  if (merchantMatch) {
    const subcategory = merchantMatch.subcategory;
    const category = getParentCategory(subcategory);
    return {
      category,
      subcategory,
      confidence: merchantMatch.confidence,
      reasoning: `Known merchant rule: "${merchantMatch.pattern}" → ${category}/${subcategory}`,
    };
  }

  // ── Layer 3: Gemini AI (last resort) ─────────────────────────────────
  if (!GEMINI_API_KEY) {
    console.warn("GEMINI_API_KEY not set, defaulting to low confidence");
    return {
      category: "Discretionary",
      subcategory: "Shopping",
      confidence: 0.3,
      reasoning: "No AI categorization available (API key missing)",
    };
  }

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: `${CATEGORY_PROMPT}\n\nTransaction to categorize:\nDescription: ${transaction.description}\nAmount: £${transaction.amount.toFixed(2)}\nDate: ${transaction.date}`,
                },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.1,
            maxOutputTokens: 200,
          },
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.statusText}`);
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!text) {
      throw new Error("No response from Gemini");
    }

    // Extract JSON from response (might be wrapped in markdown)
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("No JSON found in Gemini response");
    }

    const result = JSON.parse(jsonMatch[0]) as CategorizationResult;

    // Normalise the category
    result.category = normaliseCategory(result.category);

    // Validate subcategory
    if (result.subcategory) {
      result.subcategory = normaliseCategory(result.subcategory);
      if (isSubcategory(result.subcategory)) {
        result.category = getParentCategory(result.subcategory);
      }
    } else {
      result.subcategory = result.category;
    }

    return result;
  } catch (error) {
    console.error("AI categorization failed:", error);
    return {
      category: "Discretionary",
      subcategory: "Shopping",
      confidence: 0.2,
      reasoning: `AI error: ${error instanceof Error ? error.message : "Unknown error"}`,
    };
  }
}

/**
 * Batch categorize multiple transactions.
 * Processes sequentially to avoid rate limits.
 */
export async function categorizeTransactions(
  transactions: ParsedTransaction[],
  existingMappings: CategoryMapping[]
): Promise<Map<string, CategorizationResult>> {
  const results = new Map<string, CategorizationResult>();

  for (const transaction of transactions) {
    const result = await categorizeTransaction(transaction, existingMappings);
    results.set(`${transaction.date}-${transaction.description}`, result);
  }

  return results;
}
