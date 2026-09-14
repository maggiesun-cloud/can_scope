import React, { useState } from 'react';
import { Monitor, Download, CheckCircle2 } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { InstallModal } from './InstallModal';

interface DesktopInstallButtonProps {
  className?: string;
  variant?: 'compact' | 'full';
}

export const DesktopInstallButton: React.FC<DesktopInstallButtonProps> = ({
  className = '',
  variant = 'compact',
}) => {
  const { isInstallable, isInstalled, install } = usePWAInstall();
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleClick = async () => {
    if (isInstallable) {
      const installed = await install();
      if (!installed) {
        setIsModalOpen(true);
      }
    } else {
      setIsModalOpen(true);
    }
  };

  if (isInstalled) {
    if (variant === 'compact') {
      return (
        <span
          className={`inline-flex items-center space-x-1.5 px-2 py-1 rounded bg-zinc-900 border border-emerald-500/40 text-[11px] font-medium text-emerald-400 select-none ${className}`}
          title="CANScope is installed as a standalone desktop app"
        >
          <CheckCircle2 className="w-3 h-3 text-emerald-400" />
          <span className="hidden sm:inline">Desktop App</span>
        </span>
      );
    }

    return (
      <div className={`p-3 bg-emerald-950/30 border border-emerald-700/40 rounded-xl flex items-center space-x-2 text-emerald-300 text-xs ${className}`}>
        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
        <span>Currently running in standalone Desktop App mode.</span>
      </div>
    );
  }

  return (
    <>
      <button
        onClick={handleClick}
        className={`flex items-center space-x-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-gradient-to-r from-cyan-600/90 to-blue-600/90 hover:from-cyan-500 hover:to-blue-500 text-white shadow-xs border border-cyan-400/30 transition active:scale-95 cursor-pointer ${className}`}
        title="Install CANScope as a standalone desktop application"
      >
        <Monitor className="w-3.5 h-3.5" />
        <span>Install to Desktop</span>
      </button>

      <InstallModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </>
  );
};
