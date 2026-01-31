import { Sidebar } from "@/components/Sidebar";
import { GlassCard } from "@/components/GlassCard";
import { Sparkles, TrendingDown, ShieldCheck, Zap, PieChart, AlertCircle } from 'lucide-react';

export default function InsightsPage() {
  return (
    <div className="flex bg-forest min-h-screen">
      <Sidebar />
      
      <main className="flex-1 ml-64 p-10">
        <header className="mb-10">
          <h1 className="text-3xl font-bold mb-2 flex items-center gap-3">
            <Sparkles className="text-lime w-8 h-8" />
            Bespoke Intelligence
          </h1>
          <p className="text-slate-400">Deep-dive insights from your statements and Marcia's expertise.</p>
        </header>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mb-8">
          {/* Top 3 Wins */}
          <GlassCard title="Top Wins" className="border-emerald-500/20 bg-emerald-500/5">
            <div className="space-y-4">
              <div className="flex gap-4 items-start">
                <ShieldCheck className="text-emerald-400 w-5 h-5 mt-1" />
                <div>
                  <p className="font-bold text-emerald-400 underline underline-offset-4 decoration-emerald-500/30">Essential Efficiency</p>
                  <p className="text-sm text-slate-300">Your grocery spending is 15% lower than last month without sacrificing quality. Great work on the meal planning!</p>
                </div>
              </div>
              <div className="flex gap-4 items-start pt-4 border-t border-glass-border">
                <Zap className="text-emerald-400 w-5 h-5 mt-1" />
                <div>
                  <p className="font-bold text-emerald-400 underline underline-offset-4 decoration-emerald-500/30">Savings Streak</p>
                  <p className="text-sm text-slate-300">"Emergency Fund" milestone reached! You've successfully hit your 3-month buffer target.</p>
                </div>
              </div>
            </div>
          </GlassCard>

          {/* Top 3 Leakages */}
          <GlassCard title="Attention Needed" className="border-red-500/20 bg-red-500/5">
             <div className="space-y-4">
              <div className="flex gap-4 items-start">
                <TrendingDown className="text-red-400 w-5 h-5 mt-1" />
                <div>
                  <p className="font-bold text-red-400 underline underline-offset-4 decoration-red-500/30">Dining Inflation</p>
                  <p className="text-sm text-slate-300">Takeout expenses rose by £230 this month. This is currently slowing your wedding pot growth.</p>
                </div>
              </div>
              <div className="flex gap-4 items-start pt-4 border-t border-glass-border">
                <AlertCircle className="text-red-400 w-5 h-5 mt-1" />
                <div>
                  <p className="font-bold text-red-400 underline underline-offset-4 decoration-red-500/30">Forgotten Sub</p>
                  <p className="text-sm text-slate-300">A £15.99 charge from "CloudStore" appeared. It looks unused in the last 6 months.</p>
                </div>
              </div>
            </div>
          </GlassCard>

          {/* Category Mix */}
          <GlassCard title="Category Mix" className="md:col-span-1">
            <div className="flex flex-col items-center justify-center h-full gap-4">
              <PieChart className="w-24 h-24 text-lime opacity-30" />
              <div className="w-full space-y-2">
                <div className="flex justify-between text-xs font-bold uppercase text-slate-500">
                  <span>Essential</span>
                  <span className="text-slate-300">55%</span>
                </div>
                <div className="w-full h-1.5 bg-glass rounded-full overflow-hidden">
                  <div className="w-[55%] h-full bg-emerald-400" />
                </div>
                <div className="flex justify-between text-xs font-bold uppercase text-slate-500 pt-2">
                  <span>Discretionary</span>
                  <span className="text-slate-300">25%</span>
                </div>
                <div className="w-full h-1.5 bg-glass rounded-full overflow-hidden">
                  <div className="w-[25%] h-full bg-orange-400" />
                </div>
                <div className="flex justify-between text-xs font-bold uppercase text-slate-500 pt-2">
                  <span>Savings</span>
                  <span className="text-slate-300">20%</span>
                </div>
                <div className="w-full h-1.5 bg-glass rounded-full overflow-hidden">
                  <div className="w-[20%] h-full bg-lime" />
                </div>
              </div>
            </div>
          </GlassCard>
        </div>

        {/* Coach's Long-form Advice */}
        <GlassCard title="Marcia's Strategy Note" className="bg-lime/5 border-lime/20 border-l-4">
          <div className="prose prose-invert max-w-none">
            <p className="text-lg text-slate-200 leading-relaxed italic">
              "Looking at your progress for the wedding fund, you're currently 85% on track. If we can tighten up the 'dining out' category just by £100/month over the next quarter, we'll actually hit the honeymoon goal two months early. Let's discuss this pivot in our next session on Tuesday."
            </p>
            <div className="mt-6 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-lime/20 flex items-center justify-center text-lime font-bold">
                MP
              </div>
              <div>
                <p className="text-sm font-bold">Marcia Pregal</p>
                <p className="text-xs text-slate-500 uppercase">Head Coach • Money Map</p>
              </div>
            </div>
          </div>
        </GlassCard>
      </main>
    </div>
  );
}
