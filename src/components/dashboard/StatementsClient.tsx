"use client";

import { useState, useCallback, useRef } from "react";
import { Sidebar } from "@/components/Sidebar";
import { GlassCard } from "@/components/GlassCard";
import {
  Upload,
  FileText,
  FilePlus,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Trash2,
  Clock,
  X,
  Tag,
  Pencil,
  Check,
  Copy,
  Search,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import {
  CATEGORY_TAXONOMY,
  normaliseCategory,
  getParentCategory,
  getCategoryColour,
} from "@/lib/dashboard/categories";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";
import {
  parseCSV,
  isParseError,
  type ParsedTransaction,
  type ParseResult,
} from "@/lib/dashboard/csv-parser";
import type { StatementWithCounts } from "@/lib/dashboard/statements-data";

// ── Constants ───────────────────────────────────────────────────────────────

const CURRENCY_OPTIONS = [
  { code: "GBP", label: "GBP (£)", symbol: "£" },
  { code: "USD", label: "USD ($)", symbol: "$" },
  { code: "EUR", label: "EUR (€)", symbol: "€" },
  { code: "AUD", label: "AUD (A$)", symbol: "A$" },
  { code: "CAD", label: "CAD (C$)", symbol: "C$" },
  { code: "CHF", label: "CHF (Fr)", symbol: "Fr" },
  { code: "SAR", label: "SAR (﷼)", symbol: "﷼" },
  { code: "AED", label: "AED (د.إ)", symbol: "د.إ" },
  { code: "NZD", label: "NZD (NZ$)", symbol: "NZ$" },
  { code: "ZAR", label: "ZAR (R)", symbol: "R" },
  { code: "SGD", label: "SGD (S$)", symbol: "S$" },
  { code: "HKD", label: "HKD (HK$)", symbol: "HK$" },
  { code: "BRL", label: "BRL (R$)", symbol: "R$" },
] as const;

const ACCEPTED_TYPES = [".csv", ".pdf"];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
const PREVIEW_ROWS = 5;
const TRANSACTIONS_PAGE_SIZE = 20;

/** Extract a merchant pattern from a raw description for category_mappings. */
function extractMerchantPattern(description: string): string {
  const noise = [
    "payment", "transfer", "direct debit", "standing order", "card",
    "pos", "purchase", "contactless", "debit", "credit", "ref",
    "to", "from", "gbp", "usd", "eur",
  ];
  const words = description
    .replace(/[^a-zA-Z0-9\s&'.-]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 1 && !noise.includes(w.toLowerCase()));
  if (words.length === 0) return description.trim().slice(0, 30).toLowerCase();
  if (words[0] && words[0].length >= 6) return words[0].toLowerCase();
  return words.slice(0, 3).join(" ").toLowerCase();
}

// ── Props ───────────────────────────────────────────────────────────────────

interface StatementsClientProps {
  userId: string;
  statements: StatementWithCounts[];
  defaultCurrency: string;
  loadError: string | null;
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function formatCurrency(amount: number, currencyCode: string): string {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: currencyCode,
    maximumFractionDigits: 2,
  }).format(amount);
}

function formatDate(isoString: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(isoString));
}

function statusBadge(status: string) {
  switch (status) {
    case "uploaded":
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/20">
          <CheckCircle2 className="w-3 h-3" /> Parsed
        </span>
      );
    case "pending_processing":
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500/20 text-amber-400 border border-amber-500/20">
          <Clock className="w-3 h-3" /> PDF — Processing Soon
        </span>
      );
    case "error":
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-red-500/20 text-red-400 border border-red-500/20">
          <AlertTriangle className="w-3 h-3" /> Error
        </span>
      );
    default:
      return (
        <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-slate-500/20 text-slate-400 border border-slate-500/20">
          {status}
        </span>
      );
  }
}

// ── Component ───────────────────────────────────────────────────────────────

export function StatementsClient({
  userId,
  statements: initialStatements,
  defaultCurrency,
  loadError,
}: StatementsClientProps) {
  // Statement list state
  const [statements, setStatements] = useState(initialStatements);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [expandedTransactions, setExpandedTransactions] = useState<
    Array<{ id: string; date: string; description: string; amount: number; category: string | null; subcategory: string | null; needsHomework: boolean }>
  >([]);
  const [expandedPage, setExpandedPage] = useState(0);
  const [isLoadingTransactions, setIsLoadingTransactions] = useState(false);
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [savingCategoryId, setSavingCategoryId] = useState<string | null>(null);
  const [pendingChange, setPendingChange] = useState<{
    txId: string;
    subcategory: string;
    parentCategory: string;
    description: string;
    matchCount: number;
  } | null>(null);

  // Filter state
  const [filterDate, setFilterDate] = useState("");
  const [filterDescription, setFilterDescription] = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [filterSubcategory, setFilterSubcategory] = useState("");

  // Sort state
  type SortField = "date" | "description" | "category" | "subcategory" | "amount";
  type SortDir = "asc" | "desc" | null;
  const [sortField, setSortField] = useState<SortField | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>(null);

  // Upload flow state
  const [uploadPhase, setUploadPhase] = useState<
    "idle" | "preview" | "uploading" | "done" | "error"
  >("idle");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [parsedResult, setParsedResult] = useState<ParseResult | null>(null);
  const [uploadCurrency, setUploadCurrency] = useState(defaultCurrency);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | null>(null);
  const [confirmingTxDeleteId, setConfirmingTxDeleteId] = useState<string | null>(null);
  const [deletingTxId, setDeletingTxId] = useState<string | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");

  // Feedback
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── File selection ──────────────────────────────────────────────────────

  const handleFile = useCallback(
    (file: File) => {
      setUploadError(null);
      setMessage(null);

      const ext = file.name.split(".").pop()?.toLowerCase();
      if (!ext || !ACCEPTED_TYPES.includes(`.${ext}`)) {
        setUploadError("Please select a CSV or PDF file.");
        return;
      }

      if (file.size > MAX_FILE_SIZE) {
        setUploadError("File is too large (max 10 MB).");
        return;
      }

      setSelectedFile(file);
      setUploadCurrency(defaultCurrency);

      if (ext === "csv") {
        const reader = new FileReader();
        reader.onload = (e) => {
          const text = e.target?.result as string;
          const result = parseCSV(text);

          if (isParseError(result)) {
            setUploadError(result.message);
            setUploadPhase("error");
            return;
          }

          setParsedResult(result);
          setUploadPhase("preview");
        };
        reader.readAsText(file);
      } else {
        // PDF — skip straight to preview with no parsed data
        setParsedResult(null);
        setUploadPhase("preview");
      }
    },
    [defaultCurrency]
  );

  function handleFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    // Reset input so the same file can be re-selected
    e.target.value = "";
  }

  // ── Drag and drop ─────────────────────────────────────────────────────

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(true);
  }

  function handleDragLeave(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }

  // ── Upload + commit ───────────────────────────────────────────────────

  async function handleConfirmUpload() {
    if (!selectedFile) return;

    setUploadPhase("uploading");
    setUploadError(null);

    try {
      const supabase = createBrowserSupabaseClient();
      const ext = selectedFile.name.split(".").pop()?.toLowerCase();
      const isPdf = ext === "pdf";

      // 1. Upload file to storage
      const storagePath = `${userId}/${Date.now()}_${selectedFile.name}`;
      const { error: storageError } = await supabase.storage
        .from("statements")
        .upload(storagePath, selectedFile);

      if (storageError) {
        throw new Error(`File upload failed: ${storageError.message}`);
      }

      // 2. Insert statement row
      const { data: stmt, error: stmtError } = await supabase
        .from("statements")
        .insert({
          client_id: userId,
          filename: selectedFile.name,
          storage_path: storagePath,
          status: isPdf ? "pending_processing" : "uploaded",
          currency: uploadCurrency,
        })
        .select("id, filename, storage_path, status, currency, created_at")
        .single();

      if (stmtError || !stmt) {
        throw new Error(`Statement record failed: ${stmtError?.message}`);
      }

      // 3. For CSV: AI categorize + batch-insert transactions
      let txCount = 0;
      let totalIn = 0;
      let totalOut = 0;
      let aiCategorizedCount = 0;

      if (!isPdf && parsedResult) {
        // Call AI categorization API
        const categorizationResponse = await fetch("/api/categorize", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ transactions: parsedResult.transactions }),
        });

        if (!categorizationResponse.ok) {
          console.warn("AI categorization failed, proceeding without categories");
        }

        const catResponse = await categorizationResponse.json();
        const categorizations = catResponse.categorizations;
        console.log(`[upload] Categorised with ${catResponse.mappingsUsed ?? '?'} saved mappings:`, categorizations);

        // Build transaction rows with AI categorization
        const rows = parsedResult.transactions.map((tx) => {
          const key = `${tx.date}-${tx.description}`;
          const aiResult = categorizations?.[key];

          if (aiResult && !aiResult.needsHomework) {
            aiCategorizedCount++;
          }

          return {
            statement_id: stmt.id,
            client_id: userId,
            transaction_date: tx.date,
            description: tx.description,
            amount: tx.amount,
            category: aiResult?.category ? normaliseCategory(aiResult.category) : null,
            subcategory: aiResult?.subcategory || null,
            confidence_score: aiResult?.confidence || null,
            needs_homework: aiResult ? aiResult.needsHomework : true,
          };
        });

        const { error: txError } = await supabase
          .from("transactions")
          .insert(rows);

        if (txError) {
          throw new Error(`Transaction insert failed: ${txError.message}`);
        }

        txCount = rows.length;
        for (const tx of parsedResult.transactions) {
          if (tx.amount >= 0) totalIn += tx.amount;
          else totalOut += Math.abs(tx.amount);
        }
      }

      // 4. Optimistic UI update
      const newStatement: StatementWithCounts = {
        id: stmt.id,
        filename: stmt.filename,
        storagePath: stmt.storage_path,
        status: stmt.status,
        currency: stmt.currency,
        createdAt: stmt.created_at,
        transactionCount: txCount,
        totalIn: Number(totalIn.toFixed(2)),
        totalOut: Number(totalOut.toFixed(2)),
      };

      setStatements((prev) => [newStatement, ...prev]);
      setUploadPhase("done");

      setMessage({
        type: "success",
        text: isPdf
          ? `${selectedFile.name} uploaded. PDF processing will be available soon.`
          : aiCategorizedCount > 0
            ? `${selectedFile.name} uploaded — ${txCount} transactions imported, ${aiCategorizedCount} auto-categorized by AI.`
            : `${selectedFile.name} uploaded — ${txCount} transactions imported.`,
      });

      // Reset after a brief pause
      setTimeout(() => {
        resetUpload();
      }, 1500);
    } catch (err) {
      setUploadError(
        err instanceof Error ? err.message : "Upload failed unexpectedly."
      );
      setUploadPhase("error");
    }
  }

  function resetUpload() {
    setUploadPhase("idle");
    setSelectedFile(null);
    setParsedResult(null);
    setUploadError(null);
    setUploadCurrency(defaultCurrency);
  }

  // ── Rename statement ──────────────────────────────────────────────────

  function startRename(stmt: { id: string; filename: string }) {
    setRenamingId(stmt.id);
    setRenameValue(stmt.filename);
  }

  function cancelRename() {
    setRenamingId(null);
    setRenameValue("");
  }

  async function saveRename(statementId: string) {
    const trimmed = renameValue.trim();
    if (!trimmed) {
      cancelRename();
      return;
    }

    try {
      const supabase = createBrowserSupabaseClient();
      const { error } = await supabase
        .from("statements")
        .update({ filename: trimmed })
        .eq("id", statementId);

      if (error) {
        setMessage({ type: "error", text: `Rename failed: ${error.message}` });
        return;
      }

      setStatements((prev) =>
        prev.map((s) => (s.id === statementId ? { ...s, filename: trimmed } : s))
      );
      setMessage({ type: "success", text: "Statement renamed." });
    } catch {
      setMessage({ type: "error", text: "Rename failed unexpectedly." });
    } finally {
      cancelRename();
    }
  }

  // ── Expand statement → load transactions ──────────────────────────────

  async function toggleExpand(statementId: string) {
    if (expandedId === statementId) {
      setExpandedId(null);
      setExpandedTransactions([]);
      setExpandedPage(0);
      return;
    }

    setExpandedId(statementId);
    setExpandedPage(0);
    setIsLoadingTransactions(true);

    try {
      const supabase = createBrowserSupabaseClient();
      const { data, error } = await supabase
        .from("transactions")
        .select("id, transaction_date, description, amount, category, subcategory, needs_homework")
        .eq("statement_id", statementId)
        .order("transaction_date", { ascending: false });

      if (error) {
        setExpandedTransactions([]);
      } else {
        setExpandedTransactions(
          (data ?? []).map((tx) => ({
            id: tx.id,
            date: tx.transaction_date,
            description: tx.description,
            amount: Number(tx.amount),
            category: tx.category ? normaliseCategory(tx.category) : null,
            subcategory: tx.subcategory || null,
            needsHomework: tx.needs_homework,
          }))
        );
      }
    } catch {
      setExpandedTransactions([]);
    } finally {
      setIsLoadingTransactions(false);
    }
  }

  // ── Category editing ──────────────────────────────────────────────────

  /** Called when user picks a subcategory from the dropdown. */
  async function handleSubcategoryPick(txId: string, newSubcategory: string) {
    setEditingCategoryId(null);

    const tx = expandedTransactions.find((t) => t.id === txId);
    if (!tx) return;

    const parentCategory = getParentCategory(newSubcategory);
    const pattern = extractMerchantPattern(tx.description);

    // Count how many transactions in the current view share the same merchant pattern
    const matchCount = expandedTransactions.filter((t) => {
      const tp = extractMerchantPattern(t.description);
      return tp === pattern && t.id !== txId;
    }).length;

    if (matchCount > 0) {
      // Show confirmation prompt
      setPendingChange({
        txId,
        subcategory: newSubcategory,
        parentCategory,
        description: tx.description,
        matchCount: matchCount + 1, // +1 to include the clicked one
      });
    } else {
      // Only one transaction — apply directly
      await applyCategory(txId, newSubcategory, false);
    }
  }

  /** Apply category change to one or all matching transactions. */
  async function applyCategory(
    txId: string,
    newSubcategory: string,
    applyToAll: boolean
  ) {
    setSavingCategoryId(txId);
    setPendingChange(null);

    const parentCategory = getParentCategory(newSubcategory);

    try {
      const supabase = createBrowserSupabaseClient();
      const tx = expandedTransactions.find((t) => t.id === txId);
      if (!tx) return;

      const pattern = extractMerchantPattern(tx.description);

      if (applyToAll) {
        // Bulk update: find all transactions matching this merchant pattern
        const { data: matchingTxs } = await supabase
          .from('transactions')
          .select('id')
          .eq('client_id', userId)
          .ilike('description', `%${pattern}%`);

        if (matchingTxs && matchingTxs.length > 0) {
          const ids = matchingTxs.map((t) => t.id);
          await supabase
            .from('transactions')
            .update({
              category: parentCategory,
              subcategory: newSubcategory,
              needs_homework: false,
              is_reviewed: true,
              confidence_score: 0.9,
            })
            .in('id', ids);
        }

        // Optimistic UI: update all matching in the expanded list
        setExpandedTransactions((prev) =>
          prev.map((t) => {
            const tp = extractMerchantPattern(t.description);
            if (tp === pattern) {
              return { ...t, category: parentCategory, subcategory: newSubcategory, needsHomework: false };
            }
            return t;
          })
        );

        // Count how many we updated for the message
        const updatedCount = expandedTransactions.filter((t) => {
          const tp = extractMerchantPattern(t.description);
          return tp === pattern;
        }).length;

        setMessage({ type: 'success', text: `Applied "${parentCategory} → ${newSubcategory}" to ${updatedCount} transactions.` });
      } else {
        // Single update
        const { error } = await supabase
          .from('transactions')
          .update({
            category: parentCategory,
            subcategory: newSubcategory,
            needs_homework: false,
            is_reviewed: true,
            confidence_score: 0.9,
          })
          .eq('id', txId);

        if (error) {
          setMessage({ type: 'error', text: `Failed to update: ${error.message}` });
          return;
        }

        // Optimistic UI update
        setExpandedTransactions((prev) =>
          prev.map((t) =>
            t.id === txId
              ? { ...t, category: parentCategory, subcategory: newSubcategory, needsHomework: false }
              : t
          )
        );

        setMessage({ type: 'success', text: `Categorised as "${parentCategory} → ${newSubcategory}".` });
      }

      // Save the mapping for future auto-categorisation
      if (tx) {
        await supabase
          .from('category_mappings')
          .upsert(
            {
              owner_id: userId,
              merchant_pattern: pattern,
              category: parentCategory,
              subcategory: newSubcategory,
              confidence_score: 0.9,
            },
            { onConflict: 'owner_id,merchant_pattern' }
          );
      }
    } catch {
      setMessage({ type: 'error', text: 'Category update failed unexpectedly.' });
    } finally {
      setSavingCategoryId(null);
    }
  }

  // ── Delete statement ──────────────────────────────────────────────────

  function requestDelete(statementId: string) {
    setConfirmingDeleteId(statementId);
  }

  function cancelDelete() {
    setConfirmingDeleteId(null);
  }

  async function handleDelete(statementId: string, storagePath?: string) {
    setConfirmingDeleteId(null);
    setIsDeleting(statementId);

    try {
      const supabase = createBrowserSupabaseClient();

      // Delete transactions first (cascade should handle this, but be explicit)
      await supabase
        .from("transactions")
        .delete()
        .eq("statement_id", statementId);

      // Delete statement row
      const { error } = await supabase
        .from("statements")
        .delete()
        .eq("id", statementId);

      if (error) {
        setMessage({
          type: "error",
          text: `Delete failed: ${error.message}`,
        });
        return;
      }

      // Clean up storage (best effort)
      if (storagePath) {
        await supabase.storage.from("statements").remove([storagePath]);
      }

      // Update UI
      setStatements((prev) => prev.filter((s) => s.id !== statementId));
      if (expandedId === statementId) {
        setExpandedId(null);
        setExpandedTransactions([]);
      }
      setMessage({ type: "success", text: "Statement deleted." });
    } catch {
      setMessage({ type: "error", text: "Delete failed unexpectedly." });
    } finally {
      setIsDeleting(null);
    }
  }

  // ── Delete individual transaction ─────────────────────────────────────

  async function deleteTransaction(txId: string) {
    setDeletingTxId(txId);
    setConfirmingTxDeleteId(null);

    try {
      const supabase = createBrowserSupabaseClient();
      const tx = expandedTransactions.find((t) => t.id === txId);

      const { error } = await supabase
        .from("transactions")
        .delete()
        .eq("id", txId);

      if (error) {
        setMessage({ type: "error", text: `Delete failed: ${error.message}` });
        return;
      }

      // Remove from expanded list
      setExpandedTransactions((prev) => prev.filter((t) => t.id !== txId));

      // Update statement counts optimistically
      if (expandedId && tx) {
        setStatements((prev) =>
          prev.map((s) => {
            if (s.id !== expandedId) return s;
            const newCount = Math.max(0, s.transactionCount - 1);
            const amt = tx.amount;
            return {
              ...s,
              transactionCount: newCount,
              totalIn: amt >= 0 ? Number((s.totalIn - amt).toFixed(2)) : s.totalIn,
              totalOut: amt < 0 ? Number((s.totalOut - Math.abs(amt)).toFixed(2)) : s.totalOut,
            };
          })
        );
      }

      setMessage({ type: "success", text: "Transaction deleted." });
    } catch {
      setMessage({ type: "error", text: "Delete failed unexpectedly." });
    } finally {
      setDeletingTxId(null);
    }
  }

  // ── Filter + Pagination helpers ────────────────────────────────────────────

  const hasActiveFilters = filterDate || filterDescription || filterCategory || filterSubcategory;

  const filteredTransactions = expandedTransactions.filter((tx) => {
    if (filterDate && !tx.date.includes(filterDate) && !formatDate(tx.date).toLowerCase().includes(filterDate.toLowerCase())) {
      return false;
    }
    if (filterDescription && !tx.description.toLowerCase().includes(filterDescription.toLowerCase())) {
      return false;
    }
    if (filterCategory && tx.category !== filterCategory) {
      return false;
    }
    if (filterSubcategory && tx.subcategory !== filterSubcategory) {
      return false;
    }
    return true;
  });

  // Sort filtered results
  const sortedTransactions = [...filteredTransactions].sort((a, b) => {
    if (!sortField || !sortDir) return 0;

    let cmp = 0;
    switch (sortField) {
      case "date":
        cmp = a.date.localeCompare(b.date);
        break;
      case "description":
        cmp = a.description.localeCompare(b.description);
        break;
      case "category":
        cmp = (a.category || "").localeCompare(b.category || "");
        break;
      case "subcategory":
        cmp = (a.subcategory || "").localeCompare(b.subcategory || "");
        break;
      case "amount":
        cmp = a.amount - b.amount;
        break;
    }
    return sortDir === "desc" ? -cmp : cmp;
  });

  const totalPages = Math.ceil(
    sortedTransactions.length / TRANSACTIONS_PAGE_SIZE
  );
  const pagedTransactions = sortedTransactions.slice(
    expandedPage * TRANSACTIONS_PAGE_SIZE,
    (expandedPage + 1) * TRANSACTIONS_PAGE_SIZE
  );

  // Get unique values for dropdown filters
  const uniqueCategories = [...new Set(expandedTransactions.map((tx) => tx.category).filter(Boolean))] as string[];
  const uniqueSubcategories = [...new Set(expandedTransactions.map((tx) => tx.subcategory).filter(Boolean))] as string[];

  function clearFilters() {
    setFilterDate("");
    setFilterDescription("");
    setFilterCategory("");
    setFilterSubcategory("");
    setSortField(null);
    setSortDir(null);
    setExpandedPage(0);
  }

  function toggleSort(field: SortField) {
    if (sortField !== field) {
      setSortField(field);
      setSortDir("asc");
    } else if (sortDir === "asc") {
      setSortDir("desc");
    } else {
      setSortField(null);
      setSortDir(null);
    }
    setExpandedPage(0);
  }

  function SortIcon({ field }: { field: SortField }) {
    if (sortField !== field) return <ArrowUpDown className="w-3 h-3 opacity-30" />;
    if (sortDir === "asc") return <ArrowUp className="w-3 h-3 text-lime" />;
    return <ArrowDown className="w-3 h-3 text-lime" />;
  }

  // ── Currency mismatch warning ─────────────────────────────────────────

  const showCurrencyWarning = uploadCurrency !== defaultCurrency;

  // ── Render ────────────────────────────────────────────────────────────

  return (
    <div className="flex bg-forest min-h-screen">
      <Sidebar />

      <main className="flex-1 ml-64 p-10">
        <header className="mb-10 flex justify-between items-end">
          <div>
            <h1 className="text-3xl font-bold mb-2">Statements</h1>
            <p className="text-slate-400">
              Upload and manage your financial data.
            </p>
          </div>
          {uploadPhase === "idle" && (
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-2 px-6 py-2 bg-lime text-forest font-bold rounded-lg hover:bg-lime/90 transition-all cursor-pointer"
            >
              <Upload className="w-4 h-4" />
              Upload New
            </button>
          )}
        </header>

        {loadError && (
          <div className="mb-6 rounded-lg border border-orange-500/30 bg-orange-500/10 px-4 py-3 text-sm text-orange-300">
            {loadError}
          </div>
        )}

        {message && (
          <div
            className={`mb-6 rounded-lg border px-4 py-3 text-sm transition-all duration-300 ${
              message.type === "success"
                ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                : "border-red-500/30 bg-red-500/10 text-red-300"
            }`}
          >
            {message.text}
          </div>
        )}

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,.pdf"
          onChange={handleFileInput}
          className="hidden"
        />

        {/* Upload Area — shown when idle or in upload flow */}
        {uploadPhase === "idle" && (
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`mb-8 cursor-pointer rounded-2xl border-2 border-dashed p-10 text-center transition-all duration-200 ${
              isDragging
                ? "border-lime bg-lime/5 scale-[1.01]"
                : "border-glass-border hover:border-lime/40 hover:bg-glass"
            }`}
          >
            <FilePlus
              className={`w-12 h-12 mx-auto mb-4 ${
                isDragging ? "text-lime" : "text-slate-600"
              }`}
            />
            <p className="text-slate-400 mb-1">
              Drag and drop a CSV or PDF here, or click to browse.
            </p>
            <p className="text-xs text-slate-600">
              Supports most UK bank CSV exports. PDF parsing coming soon.
            </p>
          </div>
        )}

        {/* Upload Error */}
        {uploadPhase === "error" && uploadError && (
          <GlassCard className="mb-8 border-red-500/20">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-medium text-red-400">Upload Error</p>
                <p className="text-sm text-slate-400 mt-1">{uploadError}</p>
              </div>
              <button
                onClick={resetUpload}
                className="p-1.5 rounded-lg text-slate-500 hover:text-white hover:bg-glass transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </GlassCard>
        )}

        {/* Preview Phase — CSV preview or PDF confirmation */}
        {uploadPhase === "preview" && selectedFile && (
          <GlassCard className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <FileText className="w-5 h-5 text-lime" />
                <div>
                  <p className="font-medium">{selectedFile.name}</p>
                  <p className="text-xs text-slate-500">
                    {(selectedFile.size / 1024).toFixed(1)} KB
                  </p>
                </div>
              </div>
              <button
                onClick={resetUpload}
                className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-glass transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Currency selector */}
            <div className="flex items-center gap-4 mb-4 p-3 rounded-xl bg-glass border border-glass-border">
              <label className="text-sm text-slate-400 whitespace-nowrap">
                Currency:
              </label>
              <select
                value={uploadCurrency}
                onChange={(e) => setUploadCurrency(e.target.value)}
                className="bg-glass border border-glass-border rounded-lg px-3 py-1.5 text-sm font-medium focus:border-lime focus:outline-none focus:ring-1 focus:ring-lime/30 cursor-pointer"
              >
                {CURRENCY_OPTIONS.map((opt) => (
                  <option key={opt.code} value={opt.code} className="bg-forest">
                    {opt.label}
                  </option>
                ))}
              </select>
              {showCurrencyWarning && (
                <span className="flex items-center gap-1 text-xs text-amber-400">
                  <AlertTriangle className="w-3 h-3" />
                  Differs from your default ({defaultCurrency}). Mixing
                  currencies may affect dashboard totals.
                </span>
              )}
            </div>

            {/* CSV Preview Table */}
            {parsedResult && (
              <>
                <p className="text-sm text-slate-400 mb-2">
                  Detected columns:{" "}
                  <span className="text-lime font-medium">
                    {parsedResult.detectedColumns.date}
                  </span>
                  ,{" "}
                  <span className="text-lime font-medium">
                    {parsedResult.detectedColumns.description}
                  </span>
                  ,{" "}
                  <span className="text-lime font-medium">
                    {parsedResult.detectedColumns.amount ??
                      `${parsedResult.detectedColumns.debit} / ${parsedResult.detectedColumns.credit}`}
                  </span>
                  {parsedResult.skippedRows > 0 && (
                    <span className="text-slate-600">
                      {" "}
                      ({parsedResult.skippedRows} rows skipped)
                    </span>
                  )}
                </p>

                <div className="overflow-x-auto rounded-xl border border-glass-border mb-4">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-glass-border text-slate-500 text-xs uppercase tracking-wider">
                        <th className="text-left px-4 py-3">Date</th>
                        <th className="text-left px-4 py-3">Description</th>
                        <th className="text-right px-4 py-3">Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {parsedResult.transactions
                        .slice(0, PREVIEW_ROWS)
                        .map((tx, i) => (
                          <tr
                            key={i}
                            className="border-b border-glass-border last:border-0"
                          >
                            <td className="px-4 py-2.5 text-slate-400 whitespace-nowrap">
                              {formatDate(tx.date)}
                            </td>
                            <td className="px-4 py-2.5 truncate max-w-[300px]">
                              {tx.description}
                            </td>
                            <td
                              className={`px-4 py-2.5 text-right font-medium whitespace-nowrap ${
                                tx.amount >= 0
                                  ? "text-emerald-400"
                                  : "text-red-400"
                              }`}
                            >
                              {formatCurrency(tx.amount, uploadCurrency)}
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>

                {parsedResult.transactions.length > PREVIEW_ROWS && (
                  <p className="text-xs text-slate-600 mb-4">
                    Showing {PREVIEW_ROWS} of{" "}
                    {parsedResult.transactions.length} transactions.
                  </p>
                )}
              </>
            )}

            {/* PDF info */}
            {!parsedResult && (
              <div className="p-6 rounded-xl bg-amber-500/5 border border-amber-500/20 text-center mb-4">
                <Clock className="w-8 h-8 mx-auto mb-2 text-amber-400" />
                <p className="text-sm text-amber-400 font-medium">
                  PDF Processing Coming Soon
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  The file will be stored securely. Automatic parsing will be
                  available in a future update.
                </p>
              </div>
            )}

            {/* Confirm / Cancel */}
            <div className="flex items-center gap-3 justify-end">
              <button
                onClick={resetUpload}
                className="px-5 py-2 rounded-lg text-sm text-slate-400 hover:text-white hover:bg-glass transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmUpload}
                className="flex items-center gap-2 px-6 py-2 bg-lime text-forest font-bold rounded-lg hover:bg-lime/90 transition-all text-sm"
              >
                <Upload className="w-4 h-4" />
                {parsedResult
                  ? `Import ${parsedResult.transactions.length} Transactions`
                  : "Upload PDF"}
              </button>
            </div>
          </GlassCard>
        )}

        {/* Uploading Phase */}
        {uploadPhase === "uploading" && (
          <GlassCard className="mb-8">
            <div className="flex items-center gap-4 justify-center py-6">
              <Loader2 className="w-6 h-6 text-lime animate-spin" />
              <p className="text-slate-400">
                Uploading and importing transactions...
              </p>
            </div>
          </GlassCard>
        )}

        {/* Done Phase */}
        {uploadPhase === "done" && (
          <GlassCard className="mb-8 border-emerald-500/20">
            <div className="flex items-center gap-4 justify-center py-6">
              <CheckCircle2 className="w-6 h-6 text-emerald-400" />
              <p className="text-emerald-400 font-medium">
                Upload complete!
              </p>
            </div>
          </GlassCard>
        )}

        {/* Statements List */}
        {statements.length > 0 ? (
          <div className="space-y-3">
            {statements.map((stmt) => (
              <div key={stmt.id}>
                <GlassCard className="!p-0 overflow-hidden">
                  <div className="flex items-center gap-4 px-6 py-4">
                    <FileText className="w-5 h-5 text-lime shrink-0" />

                    <div className="flex-1 min-w-0">
                      {renamingId === stmt.id ? (
                        <input
                          autoFocus
                          type="text"
                          value={renameValue}
                          onChange={(e) => setRenameValue(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") saveRename(stmt.id);
                            if (e.key === "Escape") cancelRename();
                          }}
                          onBlur={() => saveRename(stmt.id)}
                          className="w-full bg-forest/50 border border-lime/30 rounded px-2 py-0.5 text-sm font-medium text-white focus:outline-none focus:ring-1 focus:ring-lime/40"
                        />
                      ) : (
                        <p
                          className="font-medium truncate cursor-pointer hover:text-lime transition-colors"
                          onClick={() => startRename(stmt)}
                          title="Click to rename"
                        >
                          {stmt.filename}
                        </p>
                      )}
                      <p className="text-xs text-slate-500">
                        {formatDate(stmt.createdAt)} · {stmt.currency}
                      </p>
                    </div>

                    {statusBadge(stmt.status)}

                    {stmt.transactionCount > 0 && (
                      <div className="hidden sm:flex items-center gap-4 text-sm">
                        <span className="text-slate-500">
                          {stmt.transactionCount} txns
                        </span>
                        <span className="text-emerald-400">
                          +{formatCurrency(stmt.totalIn, stmt.currency)}
                        </span>
                        <span className="text-red-400">
                          -{formatCurrency(stmt.totalOut, stmt.currency)}
                        </span>
                      </div>
                    )}

                    {confirmingDeleteId === stmt.id ? (
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs text-red-400 whitespace-nowrap">
                          Delete?
                        </span>
                        <button
                          onClick={() =>
                            handleDelete(stmt.id, stmt.storagePath)
                          }
                          className="px-2 py-1 rounded-md text-xs font-bold bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30 transition-colors"
                        >
                          Yes
                        </button>
                        <button
                          onClick={cancelDelete}
                          className="px-2 py-1 rounded-md text-xs text-slate-500 hover:text-white hover:bg-glass transition-colors"
                        >
                          No
                        </button>
                      </div>
                    ) : isDeleting === stmt.id ? (
                      <Loader2 className="w-4 h-4 text-slate-500 animate-spin" />
                    ) : (
                      <button
                        onClick={() => requestDelete(stmt.id)}
                        className="p-2 rounded-lg text-slate-600 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                        title="Delete statement"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}

                    {stmt.transactionCount > 0 && (
                      <button
                        onClick={() => toggleExpand(stmt.id)}
                        className="p-2 rounded-lg text-slate-500 hover:text-lime hover:bg-lime/10 transition-colors"
                        title={
                          expandedId === stmt.id
                            ? "Collapse"
                            : "View transactions"
                        }
                      >
                        {expandedId === stmt.id ? (
                          <ChevronUp className="w-4 h-4" />
                        ) : (
                          <ChevronDown className="w-4 h-4" />
                        )}
                      </button>
                    )}
                  </div>

                  {/* Expanded transaction preview */}
                  {expandedId === stmt.id && (
                    <div className="border-t border-glass-border">
                      {isLoadingTransactions ? (
                        <div className="flex items-center gap-3 justify-center py-8">
                          <Loader2 className="w-5 h-5 text-lime animate-spin" />
                          <span className="text-sm text-slate-500">
                            Loading transactions...
                          </span>
                        </div>
                      ) : expandedTransactions.length === 0 ? (
                        <div className="py-8 text-center text-sm text-slate-600">
                          No transactions found.
                        </div>
                      ) : (
                        <>
                          <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                              <thead>
                                <tr className="border-b border-glass-border text-slate-600 text-xs uppercase tracking-wider">
                                  <th
                                    className="text-left px-6 py-2.5 cursor-pointer hover:text-slate-400 transition-colors select-none"
                                    onClick={() => toggleSort("date")}
                                  >
                                    <span className="inline-flex items-center gap-1">
                                      Date <SortIcon field="date" />
                                    </span>
                                  </th>
                                  <th
                                    className="text-left px-6 py-2.5 cursor-pointer hover:text-slate-400 transition-colors select-none"
                                    onClick={() => toggleSort("description")}
                                  >
                                    <span className="inline-flex items-center gap-1">
                                      Description <SortIcon field="description" />
                                    </span>
                                  </th>
                                  <th
                                    className="text-left px-4 py-2.5 cursor-pointer hover:text-slate-400 transition-colors select-none"
                                    onClick={() => toggleSort("category")}
                                  >
                                    <span className="inline-flex items-center gap-1">
                                      Category <SortIcon field="category" />
                                    </span>
                                  </th>
                                  <th
                                    className="text-left px-4 py-2.5 cursor-pointer hover:text-slate-400 transition-colors select-none"
                                    onClick={() => toggleSort("subcategory")}
                                  >
                                    <span className="inline-flex items-center gap-1">
                                      Subcategory <SortIcon field="subcategory" />
                                    </span>
                                  </th>
                                  <th
                                    className="text-right px-6 py-2.5 cursor-pointer hover:text-slate-400 transition-colors select-none"
                                    onClick={() => toggleSort("amount")}
                                  >
                                    <span className="inline-flex items-center gap-1 justify-end">
                                      Amount <SortIcon field="amount" />
                                    </span>
                                  </th>
                                  <th className="w-10 px-2 py-2.5"></th>
                                </tr>
                              </thead>
                              {/* ── Filter row ── */}
                              <tbody>
                                <tr className="border-b border-glass-border bg-glass/30">
                                  <td className="px-6 py-1.5 min-w-[120px]">
                                    <div className="relative">
                                      <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-600" />
                                      <input
                                        type="text"
                                        placeholder="Date..."
                                        value={filterDate}
                                        onChange={(e) => {
                                          setFilterDate(e.target.value);
                                          setExpandedPage(0);
                                        }}
                                        className="w-full bg-transparent border border-glass-border rounded px-6 py-0.5 text-xs focus:border-lime/30 focus:outline-none placeholder:text-slate-700"
                                      />
                                      {filterDate && (
                                        <button
                                          onClick={() => { setFilterDate(""); setExpandedPage(0); }}
                                          className="absolute right-1.5 top-1/2 -translate-y-1/2 text-slate-600 hover:text-slate-400 cursor-pointer"
                                        >
                                          <X className="w-3 h-3" />
                                        </button>
                                      )}
                                    </div>
                                  </td>
                                  <td className="px-6 py-1.5">
                                    <div className="relative">
                                      <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-600" />
                                      <input
                                        type="text"
                                        placeholder="Filter..."
                                        value={filterDescription}
                                        onChange={(e) => {
                                          setFilterDescription(e.target.value);
                                          setExpandedPage(0);
                                        }}
                                        className="w-full bg-transparent border border-glass-border rounded px-6 py-0.5 text-xs focus:border-lime/30 focus:outline-none placeholder:text-slate-700"
                                      />
                                      {filterDescription && (
                                        <button
                                          onClick={() => { setFilterDescription(""); setExpandedPage(0); }}
                                          className="absolute right-1.5 top-1/2 -translate-y-1/2 text-slate-600 hover:text-slate-400 cursor-pointer"
                                        >
                                          <X className="w-3 h-3" />
                                        </button>
                                      )}
                                    </div>
                                  </td>
                                  <td className="px-4 py-1.5">
                                    <select
                                      value={filterCategory}
                                      onChange={(e) => {
                                        setFilterCategory(e.target.value);
                                        setExpandedPage(0);
                                      }}
                                      className="w-full bg-transparent border border-glass-border rounded px-1 py-0.5 text-xs focus:border-lime/30 focus:outline-none cursor-pointer"
                                    >
                                      <option value="">All</option>
                                      {uniqueCategories.sort().map((cat) => (
                                        <option key={cat} value={cat}>{cat}</option>
                                      ))}
                                    </select>
                                  </td>
                                  <td className="px-4 py-1.5">
                                    <select
                                      value={filterSubcategory}
                                      onChange={(e) => {
                                        setFilterSubcategory(e.target.value);
                                        setExpandedPage(0);
                                      }}
                                      className="w-full bg-transparent border border-glass-border rounded px-1 py-0.5 text-xs focus:border-lime/30 focus:outline-none cursor-pointer"
                                    >
                                      <option value="">All</option>
                                      {uniqueSubcategories.sort().map((sub) => (
                                        <option key={sub} value={sub}>{sub}</option>
                                      ))}
                                    </select>
                                  </td>
                                  <td className="px-6 py-1.5 text-right">
                                    {hasActiveFilters && (
                                      <button
                                        onClick={clearFilters}
                                        className="text-xs text-lime/70 hover:text-lime cursor-pointer"
                                      >
                                        Clear
                                      </button>
                                    )}
                                  </td>
                                  <td></td>
                                </tr>
                                {hasActiveFilters && sortedTransactions.length > 0 && (
                                  <tr className="border-b-2 border-lime/20 bg-glass/40">
                                    <td className="px-6 py-2.5 text-xs font-bold text-slate-400" colSpan={4}>
                                      Subtotal ({sortedTransactions.length} transaction{sortedTransactions.length !== 1 ? "s" : ""})
                                    </td>
                                    <td
                                      className={`px-6 py-2.5 text-right font-bold whitespace-nowrap ${
                                        sortedTransactions.reduce((sum, tx) => sum + tx.amount, 0) >= 0
                                          ? "text-emerald-400"
                                          : "text-red-400"
                                      }`}
                                    >
                                      {formatCurrency(
                                        sortedTransactions.reduce((sum, tx) => sum + tx.amount, 0),
                                        stmt.currency
                                      )}
                                    </td>
                                    <td></td>
                                  </tr>
                                )}
                                {filteredTransactions.length === 0 ? (
                                  <tr>
                                    <td colSpan={6} className="px-6 py-8 text-center text-sm text-slate-600">
                                      No transactions match your filters.
                                      {" "}
                                      <button onClick={clearFilters} className="text-lime/70 hover:text-lime underline cursor-pointer">
                                        Clear filters
                                      </button>
                                    </td>
                                  </tr>
                                ) : null}
                                {pagedTransactions.map((tx) => (
                                  <tr
                                    key={tx.id}
                                    className="group border-b border-glass-border last:border-0 hover:bg-glass/20 transition-colors"
                                  >
                                    <td className="px-6 py-2 text-slate-400 whitespace-nowrap">
                                      {formatDate(tx.date)}
                                    </td>
                                    <td className="px-6 py-2 truncate max-w-[240px]">
                                      {tx.description}
                                    </td>
                                    {/* ── Category (parent) ── */}
                                    <td className="px-4 py-2 whitespace-nowrap">
                                      <button
                                        onClick={() => setEditingCategoryId(tx.id)}
                                        className="group cursor-pointer"
                                        title="Click to change"
                                      >
                                        {tx.category ? (
                                          <span
                                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border group-hover:brightness-125 transition-all"
                                            style={{
                                              backgroundColor: `${getCategoryColour(tx.category)}15`,
                                              color: getCategoryColour(tx.category),
                                              borderColor: `${getCategoryColour(tx.category)}30`,
                                            }}
                                          >
                                            {tx.category}
                                          </span>
                                        ) : (
                                          <span className="text-xs text-slate-600 italic">—</span>
                                        )}
                                      </button>
                                    </td>
                                    {/* ── Subcategory (editable) ── */}
                                    <td className="px-4 py-2 whitespace-nowrap">
                                      {savingCategoryId === tx.id ? (
                                        <Loader2 className="w-3.5 h-3.5 text-lime animate-spin" />
                                      ) : pendingChange?.txId === tx.id ? (
                                        /* ── Apply-to-all confirmation ── */
                                        <div className="flex items-center gap-1.5">
                                          <span
                                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border"
                                            style={{
                                              backgroundColor: `${getCategoryColour(pendingChange.subcategory)}15`,
                                              color: getCategoryColour(pendingChange.subcategory),
                                              borderColor: `${getCategoryColour(pendingChange.subcategory)}30`,
                                            }}
                                          >
                                            {pendingChange.subcategory}
                                          </span>
                                          <button
                                            onClick={() => applyCategory(tx.id, pendingChange.subcategory, false)}
                                            className="px-2 py-0.5 rounded text-xs font-medium bg-glass border border-glass-border hover:border-lime/30 hover:text-lime transition-all cursor-pointer"
                                            title="Apply to this transaction only"
                                          >
                                            Just this
                                          </button>
                                          <button
                                            onClick={() => applyCategory(tx.id, pendingChange.subcategory, true)}
                                            className="px-2 py-0.5 rounded text-xs font-medium bg-lime/10 text-lime border border-lime/30 hover:bg-lime/20 transition-all cursor-pointer flex items-center gap-1"
                                            title={`Apply to all ${pendingChange.matchCount} matching transactions`}
                                          >
                                            <Copy className="w-3 h-3" />
                                            All {pendingChange.matchCount}
                                          </button>
                                          <button
                                            onClick={() => setPendingChange(null)}
                                            className="px-1.5 py-0.5 rounded text-xs text-slate-600 hover:text-slate-400 transition-colors cursor-pointer"
                                          >
                                            ✕
                                          </button>
                                        </div>
                                      ) : editingCategoryId === tx.id ? (
                                        <select
                                          autoFocus
                                          defaultValue={tx.subcategory ?? ""}
                                          onChange={(e) => {
                                            if (e.target.value) {
                                              handleSubcategoryPick(tx.id, e.target.value);
                                            }
                                          }}
                                          onBlur={() => {
                                            // Small delay to allow pendingChange to be set before blur clears editing
                                            setTimeout(() => setEditingCategoryId(null), 150);
                                          }}
                                          className="bg-glass border border-lime/30 rounded-md px-2 py-1 text-xs font-medium focus:border-lime focus:outline-none focus:ring-1 focus:ring-lime/30 cursor-pointer max-w-[200px]"
                                        >
                                          <option value="" className="bg-forest" disabled>
                                            Select…
                                          </option>
                                          {CATEGORY_TAXONOMY.map((parent) => (
                                            <optgroup key={parent.value} label={parent.label} className="bg-forest text-slate-400">
                                              {parent.subcategories.map((sub) => (
                                                <option key={sub.value} value={sub.value} className="bg-forest text-slate-200">
                                                  {sub.label}
                                                </option>
                                              ))}
                                            </optgroup>
                                          ))}
                                        </select>
                                      ) : (
                                        <button
                                          onClick={() => setEditingCategoryId(tx.id)}
                                          className="group inline-flex items-center gap-1.5 cursor-pointer"
                                          title="Click to change subcategory"
                                        >
                                          {tx.subcategory ? (
                                            <span
                                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border group-hover:brightness-125 transition-all"
                                              style={{
                                                backgroundColor: `${getCategoryColour(tx.subcategory)}15`,
                                                color: getCategoryColour(tx.subcategory),
                                                borderColor: `${getCategoryColour(tx.subcategory)}30`,
                                              }}
                                            >
                                              <Tag className="w-2.5 h-2.5" />
                                              {tx.subcategory}
                                            </span>
                                          ) : (
                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20 group-hover:border-amber-500/40 transition-colors">
                                              <Pencil className="w-2.5 h-2.5" />
                                              Categorise
                                            </span>
                                          )}
                                        </button>
                                      )}
                                    </td>
                                    <td
                                      className={`px-6 py-2 text-right font-medium whitespace-nowrap ${
                                        tx.amount >= 0
                                          ? "text-emerald-400"
                                          : "text-red-400"
                                      }`}
                                    >
                                      {formatCurrency(tx.amount, stmt.currency)}
                                    </td>
                                    {/* ── Delete transaction ── */}
                                    <td className="px-2 py-2 text-center">
                                      {deletingTxId === tx.id ? (
                                        <Loader2 className="w-3.5 h-3.5 text-red-400 animate-spin mx-auto" />
                                      ) : confirmingTxDeleteId === tx.id ? (
                                        <div className="flex items-center gap-1">
                                          <button
                                            onClick={() => deleteTransaction(tx.id)}
                                            className="cursor-pointer px-1.5 py-0.5 rounded text-xs font-medium bg-red-500/20 text-red-400 hover:bg-red-500/30 border border-red-500/30 transition-colors"
                                            title="Confirm delete"
                                          >
                                            Yes
                                          </button>
                                          <button
                                            onClick={() => setConfirmingTxDeleteId(null)}
                                            className="cursor-pointer px-1.5 py-0.5 rounded text-xs text-slate-500 hover:text-slate-300 transition-colors"
                                            title="Cancel"
                                          >
                                            No
                                          </button>
                                        </div>
                                      ) : (
                                        <button
                                          onClick={() => setConfirmingTxDeleteId(tx.id)}
                                          className="cursor-pointer opacity-0 group-hover:opacity-100 p-1 rounded text-slate-600 hover:text-red-400 hover:bg-red-500/10 transition-all"
                                          title="Delete transaction"
                                        >
                                          <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                      )}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>

                          {/* Pagination */}
                          {totalPages > 1 && (
                            <div className="flex items-center justify-between px-6 py-3 border-t border-glass-border">
                              <p className="text-xs text-slate-600">
                                Page {expandedPage + 1} of {totalPages} (
                                {hasActiveFilters
                                  ? `${sortedTransactions.length} of ${expandedTransactions.length} matching`
                                  : `${expandedTransactions.length} total`})
                              </p>
                              <div className="flex gap-2">
                                <button
                                  onClick={() =>
                                    setExpandedPage((p) => Math.max(0, p - 1))
                                  }
                                  disabled={expandedPage === 0}
                                  className="px-3 py-1 text-xs rounded-lg bg-glass border border-glass-border hover:border-lime/30 transition-colors disabled:opacity-30"
                                >
                                  Previous
                                </button>
                                <button
                                  onClick={() =>
                                    setExpandedPage((p) =>
                                      Math.min(totalPages - 1, p + 1)
                                    )
                                  }
                                  disabled={expandedPage >= totalPages - 1}
                                  className="px-3 py-1 text-xs rounded-lg bg-glass border border-glass-border hover:border-lime/30 transition-colors disabled:opacity-30"
                                >
                                  Next
                                </button>
                              </div>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  )}
                </GlassCard>
              </div>
            ))}
          </div>
        ) : (
          uploadPhase === "idle" && (
            <GlassCard className="flex items-center justify-center h-48 text-slate-500 border-dashed border-2 border-glass-border">
              <div className="text-center">
                <FileText className="w-10 h-10 mx-auto mb-3 opacity-20" />
                <p>No statements uploaded yet.</p>
                <p className="text-sm text-slate-600 mt-1">
                  Upload a CSV or PDF to get started.
                </p>
              </div>
            </GlassCard>
          )
        )}
      </main>
    </div>
  );
}
