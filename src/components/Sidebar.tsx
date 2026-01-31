'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, ClipboardList, TrendingUp, Settings, LogOut, Wallet } from 'lucide-react';

const navItems = [
  { icon: Home, label: 'Overview', href: '/' },
  { icon: ClipboardList, label: 'Homework', href: '/homework' },
  { icon: TrendingUp, label: 'Insights', href: '/insights' },
  { icon: Wallet, label: 'Statements', href: '/statements' },
  { icon: Settings, label: 'Settings', href: '/settings' },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 h-screen fixed left-0 top-0 border-r border-glass-border bg-forest flex flex-col p-6">
      <div className="flex items-center gap-3 mb-10 px-2">
        <div className="w-8 h-8 rounded-lg bg-lime flex items-center justify-center">
          <TrendingUp className="text-forest w-5 h-5" />
        </div>
        <span className="font-bold text-xl tracking-tight">Money Map</span>
      </div>

      <nav className="flex-1 flex flex-col gap-2">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.label}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group ${
                isActive 
                  ? 'bg-lime text-forest font-semibold lime-glow' 
                  : 'hover:bg-glass hover:text-lime'
              }`}
            >
              <item.icon className={`w-5 h-5 ${isActive ? 'text-forest' : 'text-slate-400 group-hover:text-lime'}`} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="pt-6 border-t border-glass-border">
        <button className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-slate-400 hover:bg-glass hover:text-red-400 transition-all duration-200">
          <LogOut className="w-5 h-5" />
          Logout
        </button>
      </div>
    </aside>
  );
}
