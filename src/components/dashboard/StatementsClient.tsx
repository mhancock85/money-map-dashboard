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
} from "lucide-react";
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
] as const;

const ACCEPTED_TYPES = [".csv", ".pdf"];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
const PREVIEW_ROWS = 5;
const TRANSACTIONS_PAGE_SIZE = 20;

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
    Array<{ date: string; description: string; amount: number }>
  >([]);
  const [expandedPage, setExpandedPage] = useState(0);
  const [isLoadingTransactions, setIsLoadingTransactions] = useState(false);

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

      // 3. For CSV: batch-insert transactions
      let txCount = 0;
      let totalIn = 0;
      let totalOut = 0;

      if (!isPdf && parsedResult) {
        const rows = parsedResult.transactions.map((tx) => ({
          statement_id: stmt.id,
          client_id: userId,
          transaction_date: tx.date,
          description: tx.description,
          amount: tx.amount,
          needs_homework: true, // Flag all for initial review
        }));

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
        .select("transaction_date, description, amount")
        .eq("statement_id", statementId)
        .order("transaction_date", { ascending: false });

      if (error) {
        setExpandedTransactions([]);
      } else {
        setExpandedTransactions(
          (data ?? []).map((tx) => ({
            date: tx.transaction_date,
            description: tx.description,
            amount: Number(tx.amount),
          }))
        );
      }
    } catch {
      setExpandedTransactions([]);
    } finally {
      setIsLoadingTransactions(false);
    }
  }

  // ── Delete statement ──────────────────────────────────────────────────

  async function handleDelete(statementId: string, storagePath?: string) {
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

  // ── Pagination helpers ────────────────────────────────────────────────

  const totalPages = Math.ceil(
    expandedTransactions.length / TRANSACTIONS_PAGE_SIZE
  );
  const pagedTransactions = expandedTransactions.slice(
    expandedPage * TRANSACTIONS_PAGE_SIZE,
    (expandedPage + 1) * TRANSACTIONS_PAGE_SIZE
  );

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
              className="flex items-center gap-2 px-6 py-2 bg-lime text-forest font-bold rounded-lg hover:bg-lime/90 transition-all"
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
                      <p className="font-medium truncate">{stmt.filename}</p>
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

                    <button
                      onClick={() =>
                        handleDelete(stmt.id, stmt.storagePath)
                      }
                      disabled={isDeleting === stmt.id}
                      className="p-2 rounded-lg text-slate-600 hover:text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-50"
                      title="Delete statement"
                    >
                      {isDeleting === stmt.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Trash2 className="w-4 h-4" />
                      )}
                    </button>

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
                                  <th className="text-left px-6 py-2.5">
                                    Date
                                  </th>
                                  <th className="text-left px-6 py-2.5">
                                    Description
                                  </th>
                                  <th className="text-right px-6 py-2.5">
                                    Amount
                                  </th>
                                </tr>
                              </thead>
                              <tbody>
                                {pagedTransactions.map((tx, i) => (
                                  <tr
                                    key={i}
                                    className="border-b border-glass-border last:border-0"
                                  >
                                    <td className="px-6 py-2 text-slate-400 whitespace-nowrap">
                                      {formatDate(tx.date)}
                                    </td>
                                    <td className="px-6 py-2 truncate max-w-[350px]">
                                      {tx.description}
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
                                {expandedTransactions.length} total)
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
