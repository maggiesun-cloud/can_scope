import React from 'react';
import { WifiOff, HardDrive } from 'lucide-react';
import { useOnlineStatus } from '../hooks/useOnlineStatus';

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div className="fixed bottom-4 left-4 z-50 flex items-center gap-2 rounded-xl bg-amber-500/95 backdrop-blur-xs px-3.5 py-2 text-xs font-semibold text-zinc-950 shadow-xl border border-amber-400 animate-in fade-in slide-in-from-bottom-2">
      <span className="h-2 w-2 rounded-full bg-zinc-950 animate-pulse" />
      <WifiOff className="w-4 h-4 text-zinc-950" />
      <span>Offline Desktop Mode — Cached traces, DBC schemas & sniffer active</span>
    </div>
  );
};
