'use client';

import { Sidebar } from "@/components/Sidebar";
import { GlassCard } from "@/components/GlassCard";
import { TrendingUp, ArrowUpRight, ArrowDownRight, Briefcase, Heart, AlertCircle } from 'lucide-react';
import { 
  ComposedChart, 
  Bar, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer 
} from 'recharts';

const chartData = [
  { month: 'Aug', cashflow: 1100, netWorth: 112000 },
  { month: 'Sep', cashflow: 1350, netWorth: 114500 },
  { month: 'Oct', cashflow: 900, netWorth: 116200 },
  { month: 'Nov', cashflow: 1600, netWorth: 119800 },
  { month: 'Dec', cashflow: 1200, netWorth: 122100 },
  { month: 'Jan', cashflow: 1420, netWorth: 124560 },
];

export default function Home() {
  return (
    <div className="flex bg-forest min-h-screen">
      <Sidebar />
      
      <main className="flex-1 ml-64 p-10">
        <header className="mb-10 flex justify-between items-end">
          <div>
            <h1 className="text-3xl font-bold mb-2">Portfolio Overview</h1>
            <p className="text-slate-400">Welcome back, Client Name. Here is your financial roadmap.</p>
          </div>
          <div className="bg-lime/10 text-lime px-4 py-2 rounded-full border border-lime/20 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-lime animate-pulse" />
            Live Strategy: <span className="font-bold whitespace-nowrap">Wedding Planning</span>
          </div>
        </header>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          {/* ... metrics ... */}
          <GlassCard title="Net Worth">
            <div className="flex items-end justify-between">
              <div>
                <p className="text-3xl font-bold">£124,560</p>
                <div className="flex items-center gap-1 text-emerald-400 text-sm mt-1">
                  <ArrowUpRight className="w-4 h-4" />
                  <span>+2.4% this month</span>
                </div>
              </div>
              <TrendingUp className="text-lime w-12 h-12 opacity-20" />
            </div>
          </GlassCard>

          <GlassCard title="Monthly Cashflow">
            <div className="flex items-end justify-between">
              <div>
                <p className="text-3xl font-bold text-lime">+£1,420</p>
                <div className="flex items-center gap-1 text-emerald-400 text-sm mt-1">
                  <ArrowUpRight className="w-4 h-4" />
                  <span>Above target</span>
                </div>
              </div>
              <div className="w-12 h-12 rounded-full bg-lime/10 flex items-center justify-center">
                <ArrowUpRight className="text-lime w-6 h-6" />
              </div>
            </div>
          </GlassCard>

          <GlassCard title="Savings Rate">
            <div className="flex items-end justify-between">
              <div>
                <p className="text-3xl font-bold">28%</p>
                <div className="flex items-center gap-1 text-slate-400 text-sm mt-1">
                  <span>Target: 30%</span>
                </div>
              </div>
              <div className="w-16 h-2 bg-glass rounded-full overflow-hidden">
                <div className="w-[85%] h-full bg-lime lime-glow" />
              </div>
            </div>
          </GlassCard>
        </div>

        {/* Wealth Trajectory Chart */}
        <div className="mb-10">
          <GlassCard title="Wealth Trajectory & Cashflow">
            <div className="h-[350px] w-full pt-4">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={chartData}>
                  <defs>
                    <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#D4F23E" stopOpacity={0.8}/>
                      <stop offset="100%" stopColor="#D4F23E" stopOpacity={0.1}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1A2E2A" vertical={false} />
                  <XAxis 
                    dataKey="month" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: '#94a3b8', fontSize: 12 }}
                    dy={10}
                  />
                  <YAxis 
                    yAxisId="left"
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: '#94a3b8', fontSize: 12 }}
                  />
                  <YAxis 
                    yAxisId="right" 
                    orientation="right" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: '#D4F23E', fontSize: 12 }}
                    domain={['dataMin - 5000', 'dataMax + 5000']}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#0A1F1C', 
                      borderColor: '#1A2E2A', 
                      borderRadius: '12px',
                      color: '#fff'
                    }}
                    itemStyle={{ color: '#D4F23E' }}
                  />
                  <Legend 
                    verticalAlign="top" 
                    height={36} 
                    iconType="circle"
                    formatter={(value) => <span className="text-slate-300 text-sm">{value}</span>}
                  />
                  <Bar 
                    yAxisId="left"
                    dataKey="cashflow" 
                    fill="url(#barGradient)" 
                    radius={[4, 4, 0, 0]} 
                    name="Monthly Cashflow"
                  />
                  <Line 
                    yAxisId="right"
                    type="monotone" 
                    dataKey="netWorth" 
                    stroke="#D4F23E" 
                    strokeWidth={3}
                    dot={{ fill: '#D4F23E', strokeWidth: 2, r: 4, stroke: '#081412' }}
                    activeDot={{ r: 6, strokeWidth: 0 }}
                    name="Net Worth Progression"
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </GlassCard>
        </div>

        {/* Insights & Actions */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pb-10">
          <GlassCard title="Bespoke Coach Insights" className="border-lime/20 bg-lime/5">
            <div className="space-y-4">
              <div className="flex gap-4 items-start">
                <div className="p-2 rounded-lg bg-lime/20 text-lime">
                  <Heart className="w-5 h-5" />
                </div>
                <div>
                  <p className="font-semibold text-lime">Wedding Fund Opportunity</p>
                  <p className="text-sm text-slate-300">"You've underspent on Discretionary items this month. I suggest moving the extra £400 into your High-Yield Wedding Pot."</p>
                </div>
              </div>
              <div className="flex gap-4 items-start pt-4 border-t border-glass-border">
                <div className="p-2 rounded-lg bg-orange-500/20 text-orange-400">
                  <AlertCircle className="w-5 h-5" />
                </div>
                <div>
                  <p className="font-semibold text-orange-400">Subscription Leakage</p>
                  <p className="text-sm text-slate-300">"We found a duplicate insurance payment for your phone. Check the Homework section to confirm the cancellation."</p>
                </div>
              </div>
            </div>
          </GlassCard>

          <GlassCard title="Homework Required" className="bg-orange-500/5 border-orange-500/20">
            <div className="flex flex-col h-full justify-between">
              <div className="space-y-3">
                <p className="text-sm text-slate-300 underline underline-offset-4 decoration-orange-500/50 decoration-2 mb-4 block">Gaps detected in your last statement:</p>
                <div className="flex justify-between items-center p-3 rounded-lg bg-glass border border-glass-border">
                  <div className="flex gap-3 items-center">
                    <Briefcase className="text-slate-400 w-4 h-4" />
                    <span className="text-sm">TSB Payment - £45.50</span>
                  </div>
                  <span className="text-xs px-2 py-1 rounded bg-orange-500/20 text-orange-400">Uncategorized</span>
                </div>
                <div className="flex justify-between items-center p-3 rounded-lg bg-glass border border-glass-border">
                  <div className="flex gap-3 items-center">
                    <Briefcase className="text-slate-400 w-4 h-4" />
                    <span className="text-sm">Amazon MKP - £12.99</span>
                  </div>
                  <span className="text-xs px-2 py-1 rounded bg-orange-500/20 text-orange-400">Business or Personal?</span>
                </div>
              </div>
              <button className="mt-6 w-full py-3 bg-orange-500 text-white font-bold rounded-xl hover:bg-orange-600 transition-colors shadow-lg shadow-orange-500/20">
                Complete Homework (2 items)
              </button>
            </div>
          </GlassCard>
        </div>
      </main>
    </div>
  );
}
