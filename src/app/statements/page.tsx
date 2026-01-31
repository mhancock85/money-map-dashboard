import { Sidebar } from "@/components/Sidebar";
import { GlassCard } from "@/components/GlassCard";
import { Wallet, Upload } from 'lucide-react';

export default function StatementsPage() {
  return (
    <div className="flex bg-forest min-h-screen">
      <Sidebar />
      
      <main className="flex-1 ml-64 p-10">
        <header className="mb-10 flex justify-between items-end">
          <div>
            <h1 className="text-3xl font-bold mb-2">Statements</h1>
            <p className="text-slate-400">Manage your financial data sources.</p>
          </div>
          <button className="flex items-center gap-2 px-6 py-2 bg-lime text-forest font-bold rounded-lg hover:bg-lime/90 transition-all">
            <Upload className="w-4 h-4" />
            Upload New
          </button>
        </header>

        <GlassCard className="flex items-center justify-center h-64 text-slate-500 border-dashed border-2">
          <div className="text-center">
            <Wallet className="w-12 h-12 mx-auto mb-4 opacity-20" />
            <p>No processed statements found.</p>
            <p className="text-sm">Upload a PDF or CSV to get started.</p>
          </div>
        </GlassCard>
      </main>
    </div>
  );
}
