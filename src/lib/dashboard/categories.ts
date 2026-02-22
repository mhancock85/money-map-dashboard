/**
 * Shared two-level category taxonomy.
 *
 * Parent categories group subcategories for high-level reporting.
 * Subcategories provide the detail users actually assign.
 *
 * IMPORTANT — canonical casing:
 *   Parent and subcategory values are **Title Case** everywhere:
 *   database, UI, AI prompt, pattern mappings.  Legacy lowercase
 *   values are normalised via `normaliseCategory()`.
 */

// ── Taxonomy definition ─────────────────────────────────────────────────────

export interface Subcategory {
  value: string;
  label: string;
}

export interface ParentCategory {
  value: string;
  label: string;
  colour: string;
  subcategories: Subcategory[];
}

export const CATEGORY_TAXONOMY: ParentCategory[] = [
  {
    value: "Income",
    label: "Income",
    colour: "#34d399", // emerald-400
    subcategories: [
      { value: "Salary", label: "Salary" },
      { value: "Freelance", label: "Freelance" },
      { value: "Benefits", label: "Benefits" },
      { value: "Refund", label: "Refund" },
      { value: "Investment Income", label: "Investment Income" },
      { value: "Other Income", label: "Other Income" },
    ],
  },
  {
    value: "Essential",
    label: "Essential",
    colour: "#60a5fa", // blue-400
    subcategories: [
      { value: "Rent/Mortgage", label: "Rent / Mortgage" },
      { value: "Utilities", label: "Utilities" },
      { value: "Groceries", label: "Groceries" },
      { value: "Insurance", label: "Insurance" },
      { value: "Medical", label: "Medical / Health" },
      { value: "Childcare", label: "Childcare" },
      { value: "Council Tax", label: "Council Tax" },
      { value: "Phone/Internet", label: "Phone / Internet" },
      { value: "Transport", label: "Transport / Fuel" },
    ],
  },
  {
    value: "Discretionary",
    label: "Discretionary",
    colour: "#fb923c", // orange-400
    subcategories: [
      { value: "Eating Out", label: "Eating Out" },
      { value: "Entertainment", label: "Entertainment" },
      { value: "Shopping", label: "Shopping" },
      { value: "Subscriptions", label: "Subscriptions" },
      { value: "Hobbies", label: "Hobbies" },
      { value: "Travel/Holidays", label: "Travel / Holidays" },
      { value: "Personal Care", label: "Personal Care" },
      { value: "Gifts", label: "Gifts" },
    ],
  },
  {
    value: "Business",
    label: "Business",
    colour: "#a78bfa", // violet-400
    subcategories: [
      { value: "Office/Equipment", label: "Office / Equipment" },
      { value: "Software/Tools", label: "Software / Tools" },
      { value: "Professional Services", label: "Professional Services" },
      { value: "Business Travel", label: "Business Travel" },
      { value: "Marketing", label: "Marketing" },
    ],
  },
  {
    value: "Debt Repayment",
    label: "Debt Repayment",
    colour: "#f87171", // red-400
    subcategories: [
      { value: "Credit Card", label: "Credit Card" },
      { value: "Loan", label: "Loan" },
      { value: "Student Loan", label: "Student Loan" },
    ],
  },
  {
    value: "Savings",
    label: "Savings",
    colour: "#a3e635", // lime-400
    subcategories: [
      { value: "Emergency Fund", label: "Emergency Fund" },
      { value: "Pension", label: "Pension" },
      { value: "Investments", label: "Investments" },
      { value: "General Savings", label: "General Savings" },
    ],
  },
  {
    value: "Transfer",
    label: "Transfer",
    colour: "#94a3b8", // slate-400
    subcategories: [
      { value: "Internal Transfer", label: "Internal Transfer" },
      { value: "Person-to-Person", label: "Person-to-Person" },
    ],
  },
];

// ── Lookup helpers ──────────────────────────────────────────────────────────

/** Map of subcategory value → parent category value. */
const _subcatToParent = new Map<string, string>();
/** Map of subcategory value → parent colour. */
const _subcatToColour = new Map<string, string>();
/** Set of all valid parent values. */
const _parentSet = new Set<string>();
/** Map parent value → colour. */
const _parentColour = new Map<string, string>();

for (const parent of CATEGORY_TAXONOMY) {
  _parentSet.add(parent.value);
  _parentColour.set(parent.value, parent.colour);
  for (const sub of parent.subcategories) {
    _subcatToParent.set(sub.value, parent.value);
    _subcatToColour.set(sub.value, parent.colour);
  }
}

/** Flat list of all subcategory values (for validation). */
export const ALL_SUBCATEGORY_VALUES: string[] = Array.from(
  _subcatToParent.keys()
);

/** All parent category values. */
export const ALL_PARENT_VALUES: string[] = Array.from(_parentSet);

/**
 * Get the parent category for a subcategory value.
 * If the value is already a parent, returns itself.
 * Handles legacy lowercase values.
 */
export function getParentCategory(subcategoryOrCategory: string): string {
  const normalised = normaliseCategory(subcategoryOrCategory);
  if (_parentSet.has(normalised)) return normalised;
  return _subcatToParent.get(normalised) ?? "Discretionary";
}

/**
 * Get the colour for a category or subcategory.
 */
export function getCategoryColour(categoryOrSubcategory: string): string {
  const normalised = normaliseCategory(categoryOrSubcategory);
  return (
    _parentColour.get(normalised) ??
    _subcatToColour.get(normalised) ??
    "#64748b" // slate-500 fallback
  );
}

/**
 * Check whether a value is a known subcategory.
 */
export function isSubcategory(value: string): boolean {
  return _subcatToParent.has(normaliseCategory(value));
}

/**
 * Check whether a value is a known parent category.
 */
export function isParentCategory(value: string): boolean {
  return _parentSet.has(normaliseCategory(value));
}

// ── Legacy normalisation ────────────────────────────────────────────────────

/**
 * Normalise a raw category value from the database into canonical Title Case.
 *
 * Handles:
 *  - lowercase AI output:  "discretionary" → "Discretionary"
 *  - snake_case AI output: "debt_repayment" → "Debt Repayment"
 *  - already correct:      "Essential" → "Essential"
 *  - unknown values:       returned unchanged (Title Cased)
 */
const _legacyMap: Record<string, string> = {
  income: "Income",
  essential: "Essential",
  discretionary: "Discretionary",
  business: "Business",
  debt_repayment: "Debt Repayment",
  savings: "Savings",
  transfer: "Transfer",
};

export function normaliseCategory(raw: string): string {
  if (!raw) return "Uncategorised";
  const lower = raw.trim().toLowerCase();
  if (_legacyMap[lower]) return _legacyMap[lower];
  // Already valid?
  if (_parentSet.has(raw) || _subcatToParent.has(raw)) return raw;
  // Last attempt: title case
  return raw
    .split(/[\s_]+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}
