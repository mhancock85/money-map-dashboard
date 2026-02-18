import { Sidebar } from "@/components/Sidebar";
import { GlassCard } from "@/components/GlassCard";
import { Bell, Lock } from 'lucide-react';

export default function SettingsPage() {
  return (
    <div className="flex bg-forest min-h-screen">
      <Sidebar />
      
      <main className="flex-1 ml-64 p-10">
        <header className="mb-10">
          <h1 className="text-3xl font-bold mb-2">Settings</h1>
          <p className="text-slate-400">Configure your profile and preferences.</p>
        </header>

        <div className="max-w-3xl space-y-6">
          <GlassCard title="Profile Information">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-lime/20 flex items-center justify-center text-lime text-xl font-bold">
                CN
              </div>
              <div className="flex-1">
                <p className="font-bold text-lg">Client Name</p>
                <p className="text-sm text-slate-400">client.name@example.com</p>
              </div>
              <button className="px-4 py-2 border border-glass-border rounded-lg hover:bg-glass">Edit</button>
            </div>
          </GlassCard>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <GlassCard className="hover:bg-glass cursor-pointer transition-all">
              <div className="flex items-center gap-3">
                <Bell className="text-lime w-5 h-5" />
                <span className="font-medium">Notifications</span>
              </div>
            </GlassCard>
            <GlassCard className="hover:bg-glass cursor-pointer transition-all">
              <div className="flex items-center gap-3">
                <Lock className="text-lime w-5 h-5" />
                <span className="font-medium">Security</span>
              </div>
            </GlassCard>
          </div>
        </div>
      </main>
    </div>
  );
}
