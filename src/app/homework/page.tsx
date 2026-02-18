import { Sidebar } from "@/components/Sidebar";
import { GlassCard } from "@/components/GlassCard";
import { HelpCircle, Save, CheckCircle2 } from 'lucide-react';

export default function HomeworkPage() {
  return (
    <div className="flex bg-forest min-h-screen">
      <Sidebar />
      
      <main className="flex-1 ml-64 p-10">
        <header className="mb-10">
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-3xl font-bold">Homework</h1>
            <span className="bg-orange-500/20 text-orange-400 px-3 py-1 rounded-full text-xs font-bold border border-orange-500/20">
              2 Pending
            </span>
          </div>
          <p className="text-slate-400">Marcia needs more context on these transactions to finalize your report.</p>
        </header>

        <div className="max-w-4xl space-y-6">
          <GlassCard className="bg-orange-500/5 border-orange-500/20">
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-xl bg-orange-500/20 text-orange-400">
                <HelpCircle className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h2 className="text-xl font-bold">Amazon MKP</h2>
                    <p className="text-slate-400 text-sm">15 Jan 2026 • £12.99</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-slate-500 uppercase font-bold mb-1">Coach Note</p>
                    <p className="text-sm text-orange-400 italic">&quot;Is this a business office supply or personal?&quot;</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Category</label>
                    <select className="w-full bg-glass border border-glass-border rounded-lg px-4 py-2 text-sm focus:border-lime outline-none">
                      <option>Select category...</option>
                      <option>Business Expenses</option>
                      <option>Discretionary</option>
                      <option>Essential</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Your Feedback</label>
                    <input 
                      type="text" 
                      placeholder="e.g. Printer ink for home office"
                      className="w-full bg-glass border border-glass-border rounded-lg px-4 py-2 text-sm focus:border-lime outline-none placeholder:text-slate-600"
                    />
                  </div>
                </div>

                <button className="mt-6 flex items-center gap-2 px-6 py-2 bg-lime text-forest font-bold rounded-lg hover:bg-lime/90 transition-all">
                  <Save className="w-4 h-4" />
                  Save Update
                </button>
              </div>
            </div>
          </GlassCard>

          <GlassCard>
            <div className="flex items-start gap-4 opacity-100">
               <div className="p-3 rounded-xl bg-glass text-slate-400">
                <HelpCircle className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h2 className="text-xl font-bold">TSB Payment</h2>
                    <p className="text-slate-400 text-sm">12 Jan 2026 • £45.50</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-slate-500 uppercase font-bold mb-1">Coach Note</p>
                    <p className="text-sm text-slate-400 italic">&quot;Unrecognized merchant. What was this?&quot;</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Category</label>
                    <select className="w-full bg-glass border border-glass-border rounded-lg px-4 py-2 text-sm focus:border-lime outline-none">
                      <option>Select category...</option>
                      <option>Income</option>
                      <option>Debt Repayment</option>
                      <option>Savings</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Your Feedback</label>
                    <input 
                      type="text" 
                      placeholder="e.g. Lunch with client"
                      className="w-full bg-glass border border-glass-border rounded-lg px-4 py-2 text-sm focus:border-lime outline-none placeholder:text-slate-600"
                    />
                  </div>
                </div>

                <button className="mt-6 flex items-center gap-2 px-6 py-2 bg-glass border border-glass-border text-slate-300 font-bold rounded-lg hover:bg-glass/80 transition-all">
                  <Save className="w-4 h-4" />
                  Save Update
                </button>
              </div>
            </div>
          </GlassCard>

          <div className="pt-10">
            <h3 className="text-sm font-bold text-slate-500 uppercase mb-4">Recently Resolved</h3>
            <GlassCard className="opacity-50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="p-2 rounded-full bg-emerald-500/20 text-emerald-400">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="font-bold">Shell Petrol</p>
                    <p className="text-xs text-slate-400">Resolved as: Essential • &quot;Commute to site&quot;</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold">£65.00</p>
                </div>
              </div>
            </GlassCard>
          </div>
        </div>
      </main>
    </div>
  );
}
