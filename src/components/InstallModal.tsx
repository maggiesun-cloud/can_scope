import React, { useState } from 'react';
import {
  Monitor,
  Download,
  X,
  CheckCircle2,
  ExternalLink,
  Laptop,
  Apple,
  Share2,
  PlusSquare,
  ShieldCheck,
  Sparkles,
  Copy,
  Check,
} from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

interface InstallModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const InstallModal: React.FC<InstallModalProps> = ({ isOpen, onClose }) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [installStatus, setInstallStatus] = useState<'idle' | 'installing' | 'success'>('idle');

  if (!isOpen) return null;

  const handleInstallClick = async () => {
    setInstallStatus('installing');
    const success = await install();
    if (success) {
      setInstallStatus('success');
      setTimeout(() => {
        onClose();
      }, 1500);
    } else {
      setInstallStatus('idle');
    }
  };

  const handleCopyUrl = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2000);
  };

  const handleOpenNewTab = () => {
    window.open(window.location.href, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-lg bg-zinc-900 border border-zinc-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-950/60">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-600 to-blue-700 flex items-center justify-center font-bold text-white shadow-md border border-cyan-400/30">
              <Monitor className="w-5 h-5 text-cyan-100" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-zinc-100">Install CANScope to Desktop</h2>
              <p className="text-xs text-zinc-400 font-mono">STANDALONE PWA APPLICATION</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-zinc-200 p-1.5 rounded-lg hover:bg-zinc-800 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-5 overflow-y-auto text-xs text-zinc-300">
          {/* Status Banner */}
          {isInstalled ? (
            <div className="p-4 bg-emerald-950/40 border border-emerald-800/80 rounded-xl flex items-start space-x-3 text-emerald-300">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-sm">App Already Installed</p>
                <p className="text-[11px] text-emerald-200/80 mt-0.5">
                  CANScope is currently running in standalone desktop mode with native window chrome and hardware acceleration.
                </p>
              </div>
            </div>
          ) : (
            <div className="p-4 bg-zinc-950 border border-zinc-800 rounded-xl space-y-3">
              <div className="flex items-center space-x-2 text-cyan-400 font-bold">
                <Sparkles className="w-4 h-4" />
                <span>Why install to desktop?</span>
              </div>
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] text-zinc-300">
                <li className="flex items-center space-x-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                  <span>Runs in a clean dedicated window</span>
                </li>
                <li className="flex items-center space-x-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                  <span>Instant launch from Dock / Start Menu</span>
                </li>
                <li className="flex items-center space-x-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                  <span>Full offline trace replay & DBC caching</span>
                </li>
                <li className="flex items-center space-x-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                  <span>Zero cloud telemetry leakage</span>
                </li>
              </ul>
            </div>
          )}

          {/* Primary Action Button if Browser Trigger is Ready */}
          {isInstallable && !isInstalled && (
            <div className="p-4 bg-cyan-950/40 border border-cyan-700/60 rounded-xl space-y-3 text-center">
              <p className="text-zinc-200 font-medium text-xs">
                Your browser supports one-click desktop installation:
              </p>
              <button
                onClick={handleInstallClick}
                disabled={installStatus === 'installing'}
                className="w-full py-2.5 px-4 rounded-xl text-xs font-bold flex items-center justify-center space-x-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white shadow-lg shadow-cyan-950 transition cursor-pointer active:scale-98"
              >
                <Download className="w-4 h-4" />
                <span>
                  {installStatus === 'installing'
                    ? 'Prompting Browser...'
                    : installStatus === 'success'
                    ? 'Installed Successfully!'
                    : 'Install CANScope to Desktop Now'}
                </span>
              </button>
            </div>
          )}

          {/* Manual Instructions for All Browsers */}
          <div className="space-y-3">
            <h3 className="text-zinc-200 font-bold text-xs uppercase tracking-wider flex items-center space-x-1.5">
              <Laptop className="w-3.5 h-3.5 text-zinc-400" />
              <span>Manual Browser Installation Instructions</span>
            </h3>

            <div className="grid grid-cols-1 gap-2.5">
              {/* Chrome / Edge on Desktop */}
              <div className="p-3.5 bg-zinc-950 border border-zinc-800/90 rounded-xl space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-zinc-200 text-xs">Google Chrome / Microsoft Edge</span>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400">
                    macOS • Windows • Linux
                  </span>
                </div>
                <p className="text-[11px] text-zinc-400 leading-relaxed">
                  1. Look for the <strong className="text-cyan-300">Install icon (⊕ or computer monitor)</strong> on the right side of the address bar.
                  <br />
                  2. Or click the <strong>Three Dots Menu (⋮)</strong> in the top-right corner → select <strong>"Save and share"</strong> or <strong>"Apps"</strong> → <strong>"Install CANScope"</strong>.
                </p>
              </div>

              {/* macOS Safari */}
              <div className="p-3.5 bg-zinc-950 border border-zinc-800/90 rounded-xl space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-zinc-200 text-xs flex items-center space-x-1.5">
                    <Apple className="w-3.5 h-3.5" />
                    <span>macOS Safari (Sonoma / Sequoia)</span>
                  </span>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400">
                    macOS
                  </span>
                </div>
                <p className="text-[11px] text-zinc-400 leading-relaxed">
                  In Safari, click the <strong>File</strong> menu in the menu bar → click <strong className="text-cyan-300">"Add to Dock..."</strong> → click <strong>Add</strong> to place CANScope as an independent desktop app in your macOS Dock.
                </p>
              </div>

              {/* Mobile / iPadOS */}
              {isIOS && (
                <div className="p-3.5 bg-zinc-950 border border-zinc-800/90 rounded-xl space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-zinc-200 text-xs">iPad / iPhone (Safari)</span>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400">iOS</span>
                  </div>
                  <p className="text-[11px] text-zinc-400 leading-relaxed">
                    Tap the <strong>Share</strong> button (<Share2 className="w-3 h-3 inline" />) in the Safari toolbar → scroll down and tap <strong className="text-cyan-300">"Add to Home Screen"</strong> (<PlusSquare className="w-3 h-3 inline" />).
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* New Tab Helper if inside an iframe */}
          <div className="p-3.5 bg-zinc-950/80 border border-zinc-800/80 rounded-xl flex items-center justify-between gap-3">
            <div className="space-y-0.5">
              <span className="font-semibold text-zinc-200 text-xs">Open in Direct Browser Tab</span>
              <p className="text-[10px] text-zinc-400">
                If viewing inside an embedded preview iframe, open in a full tab to access your browser's native install prompt.
              </p>
            </div>
            <div className="flex items-center space-x-2 shrink-0">
              <button
                onClick={handleCopyUrl}
                className="p-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition cursor-pointer"
                title="Copy current app URL"
              >
                {copiedUrl ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
              <button
                onClick={handleOpenNewTab}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-zinc-800 hover:bg-zinc-700 text-zinc-200 flex items-center space-x-1.5 transition cursor-pointer"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Open Tab</span>
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-zinc-800 bg-zinc-950/60 flex items-center justify-between">
          <span className="text-[11px] text-zinc-500 font-mono">PWA STANDALONE READY</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-semibold rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 transition cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
