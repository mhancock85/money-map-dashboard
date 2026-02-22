/**
 * Known UK merchant patterns → subcategory.
 *
 * This runs BEFORE the AI, so common merchants are categorised
 * instantly with 100% accuracy and zero API cost.
 *
 * Patterns are matched case-insensitively against the transaction
 * description using `includes()`.
 *
 * Add new patterns here as they're discovered.  The merchant
 * pattern should be the shortest unambiguous substring.
 */

interface MerchantRule {
  pattern: string;
  subcategory: string;
  confidence: number;
}

export const MERCHANT_RULES: MerchantRule[] = [
  // ── GROCERIES (Essential) ────────────────────────────────────────────
  { pattern: "sainsbury", subcategory: "Groceries", confidence: 0.95 },
  { pattern: "tesco", subcategory: "Groceries", confidence: 0.95 },
  { pattern: "co-op", subcategory: "Groceries", confidence: 0.95 },
  { pattern: "morrisons", subcategory: "Groceries", confidence: 0.95 },
  { pattern: "aldi", subcategory: "Groceries", confidence: 0.95 },
  { pattern: "lidl", subcategory: "Groceries", confidence: 0.95 },
  { pattern: "asda", subcategory: "Groceries", confidence: 0.95 },
  { pattern: "waitrose", subcategory: "Groceries", confidence: 0.95 },
  { pattern: "m&s food", subcategory: "Groceries", confidence: 0.95 },
  { pattern: "iceland", subcategory: "Groceries", confidence: 0.90 },
  { pattern: "ocado", subcategory: "Groceries", confidence: 0.95 },
  { pattern: "farmfoods", subcategory: "Groceries", confidence: 0.95 },

  // ── EATING OUT (Discretionary) ───────────────────────────────────────
  { pattern: "mcdonalds", subcategory: "Eating Out", confidence: 0.95 },
  { pattern: "nandos", subcategory: "Eating Out", confidence: 0.95 },
  { pattern: "nando", subcategory: "Eating Out", confidence: 0.95 },
  { pattern: "pret a manger", subcategory: "Eating Out", confidence: 0.95 },
  { pattern: "costa", subcategory: "Eating Out", confidence: 0.90 },
  { pattern: "starbucks", subcategory: "Eating Out", confidence: 0.95 },
  { pattern: "caffe nero", subcategory: "Eating Out", confidence: 0.95 },
  { pattern: "greggs", subcategory: "Eating Out", confidence: 0.95 },
  { pattern: "subway", subcategory: "Eating Out", confidence: 0.95 },
  { pattern: "kfc", subcategory: "Eating Out", confidence: 0.95 },
  { pattern: "burger king", subcategory: "Eating Out", confidence: 0.95 },
  { pattern: "five guys", subcategory: "Eating Out", confidence: 0.95 },
  { pattern: "pizza", subcategory: "Eating Out", confidence: 0.85 },
  { pattern: "wetherspoon", subcategory: "Eating Out", confidence: 0.90 },
  { pattern: "wagamama", subcategory: "Eating Out", confidence: 0.95 },
  { pattern: "tortilla", subcategory: "Eating Out", confidence: 0.95 },
  { pattern: "itsu", subcategory: "Eating Out", confidence: 0.95 },
  { pattern: "uber eats", subcategory: "Eating Out", confidence: 0.95 },
  { pattern: "deliveroo", subcategory: "Eating Out", confidence: 0.95 },
  { pattern: "just eat", subcategory: "Eating Out", confidence: 0.95 },
  { pattern: "leon ", subcategory: "Eating Out", confidence: 0.85 },
  { pattern: "prezzo", subcategory: "Eating Out", confidence: 0.95 },
  { pattern: "slim chicken", subcategory: "Eating Out", confidence: 0.95 },

  // ── SUBSCRIPTIONS (Discretionary) ────────────────────────────────────
  { pattern: "netflix", subcategory: "Subscriptions", confidence: 0.95 },
  { pattern: "spotify", subcategory: "Subscriptions", confidence: 0.95 },
  { pattern: "youtube", subcategory: "Subscriptions", confidence: 0.95 },
  { pattern: "disney", subcategory: "Subscriptions", confidence: 0.95 },
  { pattern: "apple.com/bill", subcategory: "Subscriptions", confidence: 0.95 },
  { pattern: "dazn", subcategory: "Subscriptions", confidence: 0.95 },
  { pattern: "amazon prime", subcategory: "Subscriptions", confidence: 0.95 },
  { pattern: "prime video", subcategory: "Subscriptions", confidence: 0.90 },
  { pattern: "now tv", subcategory: "Subscriptions", confidence: 0.95 },

  // ── SHOPPING (Discretionary) ─────────────────────────────────────────
  { pattern: "amazon", subcategory: "Shopping", confidence: 0.80 },
  { pattern: "h&m", subcategory: "Shopping", confidence: 0.95 },
  { pattern: "primark", subcategory: "Shopping", confidence: 0.95 },
  { pattern: "zara", subcategory: "Shopping", confidence: 0.95 },
  { pattern: "hollister", subcategory: "Shopping", confidence: 0.95 },
  { pattern: "nike", subcategory: "Shopping", confidence: 0.95 },
  { pattern: "john lewis", subcategory: "Shopping", confidence: 0.90 },
  { pattern: "tk maxx", subcategory: "Shopping", confidence: 0.95 },
  { pattern: "argos", subcategory: "Shopping", confidence: 0.90 },
  { pattern: "ebay", subcategory: "Shopping", confidence: 0.85 },
  { pattern: "asos", subcategory: "Shopping", confidence: 0.95 },
  { pattern: "new balance", subcategory: "Shopping", confidence: 0.95 },
  { pattern: "card factory", subcategory: "Shopping", confidence: 0.90 },
  { pattern: "waterstones", subcategory: "Shopping", confidence: 0.90 },

  // ── TRANSPORT (Essential) ────────────────────────────────────────────
  { pattern: "tfl", subcategory: "Transport", confidence: 0.95 },
  { pattern: "trainline", subcategory: "Transport", confidence: 0.95 },
  { pattern: "uber trip", subcategory: "Transport", confidence: 0.90 },
  { pattern: "uber *", subcategory: "Transport", confidence: 0.85 },
  { pattern: "gwr ", subcategory: "Transport", confidence: 0.90 },
  { pattern: "national rail", subcategory: "Transport", confidence: 0.95 },
  { pattern: "shell", subcategory: "Transport", confidence: 0.85 },
  { pattern: "bp ", subcategory: "Transport", confidence: 0.85 },
  { pattern: "esso", subcategory: "Transport", confidence: 0.85 },
  { pattern: "mfg ", subcategory: "Transport", confidence: 0.85 },

  // ── PERSONAL CARE (Discretionary) ────────────────────────────────────
  { pattern: "boots", subcategory: "Personal Care", confidence: 0.85 },
  { pattern: "superdrug", subcategory: "Personal Care", confidence: 0.90 },

  // ── TRAVEL / HOLIDAYS (Discretionary) ────────────────────────────────
  { pattern: "easyjet", subcategory: "Travel/Holidays", confidence: 0.95 },
  { pattern: "ryanair", subcategory: "Travel/Holidays", confidence: 0.95 },
  { pattern: "booking.com", subcategory: "Travel/Holidays", confidence: 0.95 },
  { pattern: "airbnb", subcategory: "Travel/Holidays", confidence: 0.95 },
  { pattern: "expedia", subcategory: "Travel/Holidays", confidence: 0.95 },
  { pattern: "jet2", subcategory: "Travel/Holidays", confidence: 0.95 },
  { pattern: "british airways", subcategory: "Travel/Holidays", confidence: 0.95 },

  // ── UTILITIES (Essential) ────────────────────────────────────────────
  { pattern: "british gas", subcategory: "Utilities", confidence: 0.95 },
  { pattern: "octopus energy", subcategory: "Utilities", confidence: 0.95 },
  { pattern: "edf energy", subcategory: "Utilities", confidence: 0.95 },
  { pattern: "thames water", subcategory: "Utilities", confidence: 0.95 },
  { pattern: "severn trent", subcategory: "Utilities", confidence: 0.95 },
  { pattern: "wessex water", subcategory: "Utilities", confidence: 0.95 },
  { pattern: "scottish power", subcategory: "Utilities", confidence: 0.95 },
  { pattern: "bulb", subcategory: "Utilities", confidence: 0.90 },

  // ── PHONE / INTERNET (Essential) ─────────────────────────────────────
  { pattern: "vodafone", subcategory: "Phone/Internet", confidence: 0.95 },
  { pattern: "three.co.uk", subcategory: "Phone/Internet", confidence: 0.95 },
  { pattern: "ee limited", subcategory: "Phone/Internet", confidence: 0.95 },
  { pattern: "o2", subcategory: "Phone/Internet", confidence: 0.85 },
  { pattern: "bt group", subcategory: "Phone/Internet", confidence: 0.90 },
  { pattern: "sky", subcategory: "Phone/Internet", confidence: 0.80 },
  { pattern: "virgin media", subcategory: "Phone/Internet", confidence: 0.95 },

  // ── INSURANCE (Essential) ────────────────────────────────────────────
  { pattern: "insurance", subcategory: "Insurance", confidence: 0.85 },
  { pattern: "aviva", subcategory: "Insurance", confidence: 0.90 },
  { pattern: "admiral", subcategory: "Insurance", confidence: 0.90 },

  // ── ENTERTAINMENT (Discretionary) ────────────────────────────────────
  { pattern: "cinema", subcategory: "Entertainment", confidence: 0.90 },
  { pattern: "cineworld", subcategory: "Entertainment", confidence: 0.95 },
  { pattern: "odeon", subcategory: "Entertainment", confidence: 0.95 },
  { pattern: "vue cinema", subcategory: "Entertainment", confidence: 0.95 },
  { pattern: "ticketmaster", subcategory: "Entertainment", confidence: 0.90 },

  // ── INCOME ───────────────────────────────────────────────────────────
  { pattern: "salary", subcategory: "Salary", confidence: 0.95 },
  { pattern: "payroll", subcategory: "Salary", confidence: 0.95 },
  { pattern: "wages", subcategory: "Salary", confidence: 0.90 },
  { pattern: "refund", subcategory: "Refund", confidence: 0.85 },

  // ── TRANSFERS & CREDIT CARD PAYMENTS (Transfer) ──────────────────────
  { pattern: "payment received", subcategory: "Internal Transfer", confidence: 0.90 },
  { pattern: "thank you for your payment", subcategory: "Internal Transfer", confidence: 0.95 },
  { pattern: "payment - thank you", subcategory: "Internal Transfer", confidence: 0.95 },
  { pattern: "direct debit payment", subcategory: "Internal Transfer", confidence: 0.90 },
  { pattern: "internet payment", subcategory: "Internal Transfer", confidence: 0.85 },
  { pattern: "mobile app payment", subcategory: "Internal Transfer", confidence: 0.85 },

  // ── COUNCIL TAX (Essential) ──────────────────────────────────────────
  { pattern: "council tax", subcategory: "Council Tax", confidence: 0.95 },

  // ── RENT / MORTGAGE (Essential) ──────────────────────────────────────
  { pattern: "rent", subcategory: "Rent/Mortgage", confidence: 0.80 },
  { pattern: "mortgage", subcategory: "Rent/Mortgage", confidence: 0.95 },
  { pattern: "nationwide", subcategory: "Rent/Mortgage", confidence: 0.70 },

  // ── GIFTS (Discretionary) ────────────────────────────────────────────
  { pattern: "moonpig", subcategory: "Gifts", confidence: 0.90 },
  { pattern: "funky pigeon", subcategory: "Gifts", confidence: 0.90 },
];

/**
 * Try to match a transaction description against the known merchant rules.
 * Returns the first matching rule, or undefined if no match.
 *
 * Rules are checked in order, so put more-specific patterns before
 * less-specific ones (e.g. "uber eats" before "uber").
 */
export function matchMerchant(
  description: string
): MerchantRule | undefined {
  const lower = description.toLowerCase();
  return MERCHANT_RULES.find((rule) => lower.includes(rule.pattern));
}
