import React from 'react';
import {
  LayoutDashboard,
  Terminal,
  ListOrdered,
  LineChart,
  HardDriveDownload,
  Archive,
  Database,
  Send,
  AlertOctagon,
  Cpu,
  BookOpen,
  Network,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

export type NavPage =
  | 'dashboard'
  | 'monitor'
  | 'messages'
  | 'router'
  | 'graphs'
  | 'logging'
  | 'history'
  | 'dbc'
  | 'transmit'
  | 'errors'
  | 'settings'
  | 'docs';

interface SidebarProps {
  currentPage: NavPage;
  onSelectPage: (page: NavPage) => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
  unreadErrorsCount?: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentPage,
  onSelectPage,
  collapsed,
  onToggleCollapse,
  unreadErrorsCount = 0,
}) => {
  const navItems: Array<{ id: NavPage; label: string; icon: React.ReactNode; badge?: number }> = [
    { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard className="w-4 h-4 shrink-0" /> },
    { id: 'monitor', label: 'Monitor', icon: <Terminal className="w-4 h-4 shrink-0" /> },
    { id: 'messages', label: 'Messages', icon: <ListOrdered className="w-4 h-4 shrink-0" /> },
    { id: 'router', label: 'CAN Router (6CH)', icon: <Network className="w-4 h-4 shrink-0 text-cyan-400" /> },
    { id: 'graphs', label: 'Graphs', icon: <LineChart className="w-4 h-4 shrink-0" /> },
    { id: 'logging', label: 'Logging', icon: <HardDriveDownload className="w-4 h-4 shrink-0" /> },
    { id: 'history', label: 'History Cache', icon: <Archive className="w-4 h-4 shrink-0" /> },
    { id: 'dbc', label: 'DBC & Schema', icon: <Database className="w-4 h-4 shrink-0" /> },
    { id: 'transmit', label: 'Transmit', icon: <Send className="w-4 h-4 shrink-0" /> },
    {
      id: 'errors',
      label: 'Errors',
      icon: <AlertOctagon className="w-4 h-4 shrink-0" />,
      badge: unreadErrorsCount > 0 ? unreadErrorsCount : undefined,
    },
    { id: 'settings', label: 'System & HW', icon: <Cpu className="w-4 h-4 shrink-0" /> },
    { id: 'docs', label: 'Documents', icon: <BookOpen className="w-4 h-4 shrink-0" /> },
  ];

  return (
    <aside
      className={`bg-zinc-950 border-r border-zinc-800/80 flex flex-col justify-between transition-all duration-200 shrink-0 z-20 ${
        collapsed ? 'w-14' : 'w-52'
      }`}
    >
      <div className="p-2 flex flex-col space-y-1">
        {navItems.map((item) => {
          const isActive = currentPage === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelectPage(item.id)}
              className={`flex items-center space-x-3 px-3 py-2.5 rounded text-xs font-medium transition cursor-pointer ${
                isActive
                  ? 'bg-cyan-950/60 text-cyan-300 border border-cyan-800/50 shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/80 border border-transparent'
              }`}
              title={collapsed ? item.label : undefined}
            >
              <div className={`${isActive ? 'text-cyan-400' : 'text-zinc-400'}`}>{item.icon}</div>
              {!collapsed && (
                <div className="flex-1 flex items-center justify-between min-w-0">
                  <span className="truncate">{item.label}</span>
                  {item.badge && (
                    <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-rose-500/20 text-rose-400 border border-rose-500/30">
                      {item.badge}
                    </span>
                  )}
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Collapse Toggle Button */}
      <div className="p-2 border-t border-zinc-800/60">
        <button
          onClick={onToggleCollapse}
          className="w-full flex items-center justify-center p-2 rounded text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900 transition cursor-pointer"
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>
    </aside>
  );
};
