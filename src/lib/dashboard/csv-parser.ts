/**
 * Flexible CSV parser for UK bank statement exports.
 *
 * Auto-detects column layout (date, description, amount or debit/credit split)
 * across Monzo, Barclays, HSBC, Nationwide, Starling, and generic formats.
 */

// ── Public types ────────────────────────────────────────────────────────────

export interface ParsedTransaction {
  date: string; // ISO format YYYY-MM-DD
  description: string;
  amount: number; // positive = credit/inflow, negative = debit/outflow
}

export interface ParseResult {
  transactions: ParsedTransaction[];
  detectedColumns: {
    date: string;
    description: string;
    amount: string | null;
    debit: string | null;
    credit: string | null;
  };
  skippedRows: number;
}

export interface ParseError {
  message: string;
  row?: number;
}

// ── Column name patterns ────────────────────────────────────────────────────

const DATE_PATTERNS = [
  "date",
  "transaction date",
  "trans date",
  "booking date",
  "value date",
  "posted date",
  "trans. date",
];

const DESCRIPTION_PATTERNS = [
  "description",
  "narrative",
  "details",
  "reference",
  "counter party",
  "counterparty",
  "merchant",
  "memo",
  "payee",
  "transaction description",
  "trans. description",
  "name",
  "type & description",
];

const AMOUNT_PATTERNS = ["amount", "value", "transaction amount"];

const DEBIT_PATTERNS = [
  "debit",
  "money out",
  "paid out",
  "debit amount",
  "withdrawal",
  "out",
];

const CREDIT_PATTERNS = [
  "credit",
  "money in",
  "paid in",
  "credit amount",
  "deposit",
  "in",
];

const BALANCE_PATTERNS = [
  "balance",
  "running balance",
  "available balance",
  "ledger balance",
];

// ── CSV field parser (RFC 4180) ─────────────────────────────────────────────

function parseCSVLine(line: string): string[] {
  const fields: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (inQuotes) {
      if (char === '"') {
        if (i + 1 < line.length && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        current += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === ",") {
        fields.push(current.trim());
        current = "";
      } else {
        current += char;
      }
    }
  }

  fields.push(current.trim());
  return fields;
}

// ── Date parsing ────────────────────────────────────────────────────────────

const MONTH_NAMES: Record<string, string> = {
  jan: "01", feb: "02", mar: "03", apr: "04", may: "05", jun: "06",
  jul: "07", aug: "08", sep: "09", oct: "10", nov: "11", dec: "12",
};

function parseDate(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  // YYYY-MM-DD (already ISO)
  const isoMatch = trimmed.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (isoMatch) {
    return `${isoMatch[1]}-${isoMatch[2].padStart(2, "0")}-${isoMatch[3].padStart(2, "0")}`;
  }

  // DD/MM/YYYY or DD-MM-YYYY or DD.MM.YYYY
  const dmy = trimmed.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{4})$/);
  if (dmy) {
    return `${dmy[3]}-${dmy[2].padStart(2, "0")}-${dmy[1].padStart(2, "0")}`;
  }

  // DD/MM/YY (2-digit year)
  const dmy2 = trimmed.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2})$/);
  if (dmy2) {
    const year = Number(dmy2[3]) > 50 ? `19${dmy2[3]}` : `20${dmy2[3]}`;
    return `${year}-${dmy2[2].padStart(2, "0")}-${dmy2[1].padStart(2, "0")}`;
  }

  // DD Mon YYYY or DD-Mon-YYYY (e.g. "15 Jan 2025" or "15-Jan-2025")
  const dMonY = trimmed.match(/^(\d{1,2})[\s\-](\w{3})[\s\-](\d{4})$/);
  if (dMonY) {
    const month = MONTH_NAMES[dMonY[2].toLowerCase()];
    if (month) {
      return `${dMonY[3]}-${month}-${dMonY[1].padStart(2, "0")}`;
    }
  }

  return null;
}

// ── Amount parsing ──────────────────────────────────────────────────────────

function parseAmount(raw: string): number | null {
  const trimmed = raw.trim();
  if (!trimmed || trimmed === "-" || trimmed === "--") return null;

  // Strip currency symbols and thousands separators, keep minus and decimal point
  const cleaned = trimmed
    .replace(/[£$€¥₹A-Z]/gi, "")
    .replace(/,/g, "")
    .trim();

  if (!cleaned) return null;

  // Handle parenthesised negatives: (123.45) → -123.45
  const parenMatch = cleaned.match(/^\(([0-9.]+)\)$/);
  if (parenMatch) {
    return -Math.abs(Number(parenMatch[1]));
  }

  const num = Number(cleaned);
  return isNaN(num) ? null : num;
}

// ── Column detection ────────────────────────────────────────────────────────

interface ColumnMapping {
  dateIndex: number;
  descriptionIndex: number;
  amountIndex: number | null;
  debitIndex: number | null;
  creditIndex: number | null;
  dateHeader: string;
  descriptionHeader: string;
  amountHeader: string | null;
  debitHeader: string | null;
  creditHeader: string | null;
}

function matchesAny(header: string, patterns: string[]): boolean {
  const normalised = header.toLowerCase().trim();
  return patterns.some((p) => normalised === p || normalised.includes(p));
}

function detectColumns(headers: string[]): ColumnMapping | null {
  let dateIndex = -1;
  let descriptionIndex = -1;
  let amountIndex = -1;
  let debitIndex = -1;
  let creditIndex = -1;

  for (let i = 0; i < headers.length; i++) {
    const h = headers[i];

    // Skip balance columns early so "balance" isn't matched as a description
    if (matchesAny(h, BALANCE_PATTERNS)) continue;

    if (dateIndex === -1 && matchesAny(h, DATE_PATTERNS)) {
      dateIndex = i;
    } else if (descriptionIndex === -1 && matchesAny(h, DESCRIPTION_PATTERNS)) {
      descriptionIndex = i;
    } else if (amountIndex === -1 && matchesAny(h, AMOUNT_PATTERNS)) {
      amountIndex = i;
    } else if (debitIndex === -1 && matchesAny(h, DEBIT_PATTERNS)) {
      debitIndex = i;
    } else if (creditIndex === -1 && matchesAny(h, CREDIT_PATTERNS)) {
      creditIndex = i;
    }
  }

  // Must have at least date + description
  if (dateIndex === -1 || descriptionIndex === -1) return null;

  // Must have either a single amount column or debit/credit pair
  if (amountIndex === -1 && (debitIndex === -1 || creditIndex === -1)) return null;

  return {
    dateIndex,
    descriptionIndex,
    amountIndex: amountIndex !== -1 ? amountIndex : null,
    debitIndex: debitIndex !== -1 ? debitIndex : null,
    creditIndex: creditIndex !== -1 ? creditIndex : null,
    dateHeader: headers[dateIndex],
    descriptionHeader: headers[descriptionIndex],
    amountHeader: amountIndex !== -1 ? headers[amountIndex] : null,
    debitHeader: debitIndex !== -1 ? headers[debitIndex] : null,
    creditHeader: creditIndex !== -1 ? headers[creditIndex] : null,
  };
}

// ── Main parser ─────────────────────────────────────────────────────────────

export function parseCSV(csvText: string): ParseResult | ParseError {
  const lines = csvText
    .split(/\r?\n/)
    .filter((line) => line.trim().length > 0);

  if (lines.length < 2) {
    return { message: "File appears empty or has no data rows." };
  }

  // Find the header row — it might not be the first line (some banks add
  // summary rows at the top). Scan the first 10 lines for a row that matches
  // at least a date + description pattern.
  let headerRowIndex = -1;
  let columns: ColumnMapping | null = null;

  const scanLimit = Math.min(lines.length, 10);
  for (let i = 0; i < scanLimit; i++) {
    const candidate = parseCSVLine(lines[i]);
    const mapping = detectColumns(candidate);
    if (mapping) {
      headerRowIndex = i;
      columns = mapping;
      break;
    }
  }

  if (headerRowIndex === -1 || !columns) {
    return {
      message:
        "Could not detect column headers. Expected columns like Date, Description, and Amount (or Debit/Credit).",
    };
  }

  const transactions: ParsedTransaction[] = [];
  let skippedRows = 0;

  for (let i = headerRowIndex + 1; i < lines.length; i++) {
    const fields = parseCSVLine(lines[i]);

    const rawDate = fields[columns.dateIndex] ?? "";
    const rawDescription = fields[columns.descriptionIndex] ?? "";

    const date = parseDate(rawDate);
    const description = rawDescription.trim();

    if (!date || !description) {
      skippedRows++;
      continue;
    }

    let amount: number | null = null;

    if (columns.amountIndex !== null) {
      // Single amount column
      amount = parseAmount(fields[columns.amountIndex] ?? "");
    } else if (columns.debitIndex !== null && columns.creditIndex !== null) {
      // Split debit/credit columns
      const debit = parseAmount(fields[columns.debitIndex] ?? "");
      const credit = parseAmount(fields[columns.creditIndex] ?? "");

      if (credit !== null && credit !== 0) {
        amount = Math.abs(credit);
      } else if (debit !== null && debit !== 0) {
        amount = -Math.abs(debit);
      } else {
        amount = 0;
      }
    }

    if (amount === null) {
      skippedRows++;
      continue;
    }

    transactions.push({ date, description, amount });
  }

  if (transactions.length === 0) {
    return {
      message: `Headers detected (${columns.dateHeader}, ${columns.descriptionHeader}) but no valid data rows found.`,
    };
  }

  return {
    transactions,
    detectedColumns: {
      date: columns.dateHeader,
      description: columns.descriptionHeader,
      amount: columns.amountHeader,
      debit: columns.debitHeader,
      credit: columns.creditHeader,
    },
    skippedRows,
  };
}

// ── Type guard ──────────────────────────────────────────────────────────────

export function isParseError(
  result: ParseResult | ParseError
): result is ParseError {
  return "message" in result && !("transactions" in result);
}
