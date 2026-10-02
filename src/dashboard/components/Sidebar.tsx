import { LayoutDashboard, Database, Activity, Settings, ShieldCheck } from 'lucide-react';
import type { ViewState } from '../types';

interface SidebarProps {
  currentView: ViewState;
  onNavigate: (view: ViewState) => void;
}

export function Sidebar({ currentView, onNavigate }: SidebarProps) {
  const navItems: { id: ViewState; label: string; icon: React.ReactNode }[] = [
    { id: 'overview', label: 'Overview', icon: <LayoutDashboard size={20} /> },
    { id: 'my-data', label: 'My Data', icon: <Database size={20} /> },
    { id: 'activity', label: 'Activity', icon: <Activity size={20} /> },
    { id: 'settings', label: 'Settings', icon: <Settings size={20} /> },
  ];

  return (
    <aside className="w-64 bg-white border-r border-gray-200 flex flex-col h-screen fixed left-0 top-0">
      <div className="p-6 flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-gray-900 flex items-center justify-center">
          <ShieldCheck className="text-white" size={20} />
        </div>
        <span className="font-bold text-xl text-gray-900 tracking-tight">FormPilot</span>
      </div>

      <nav className="flex-1 px-4 py-2 space-y-1">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => onNavigate(item.id)}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              currentView === item.id || (item.id === 'my-data' && currentView.startsWith('vault-'))
                ? 'bg-gray-100 text-gray-900'
                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
            }`}
          >
            {item.icon}
            {item.label}
          </button>
        ))}
      </nav>

      <div className="p-4 border-t border-gray-200">
        <div className="flex items-center gap-2 text-xs font-medium text-gray-500 px-3 py-2 bg-gray-50 rounded-lg">
          <ShieldCheck size={14} className="text-green-600" />
          <span>Local-first by design</span>
        </div>
      </div>
    </aside>
  );
}
