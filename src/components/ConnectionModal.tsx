import React, { useState, useEffect } from 'react';
import { BusStatus, CanBackendType, CanConfig, SystemInfo } from '../types/can';
import {
  X,
  Cpu,
  AlertTriangle,
  Play,
  HelpCircle,
  Check,
  Apple,
  Terminal,
  Copy,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

interface ConnectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  status: BusStatus;
  systemInfo: SystemInfo | null;
  onConnect: (config: CanConfig) => Promise<boolean>;
}

export const ConnectionModal: React.FC<ConnectionModalProps> = ({
  isOpen,
  onClose,
  status,
  systemInfo,
  onConnect,
}) => {
  const [backend, setBackend] = useState<CanBackendType>(status.backend || 'mock');
  const [channel, setChannel] = useState<string>(status.channel || 'mock0');
  const [bitrate, setBitrate] = useState<number>(status.bitrate || 500000);
  const [fdEnabled, setFdEnabled] = useState<boolean>(status.fdEnabled || false);
  const [dataBitrate, setDataBitrate] = useState<number>(status.dataBitrate || 2000000);
  const [listenOnly, setListenOnly] = useState<boolean>(status.listenOnly || false);
  const [autoReconnect, setAutoReconnect] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showMacGuide, setShowMacGuide] = useState(false);
  const [copiedMacCommands, setCopiedMacCommands] = useState(false);

  const macOsInstallScript = [
    'python3 --version',
    'python3 -m venv ~/canscope-venv',
    'source ~/canscope-venv/bin/activate',
    'python3 -m pip install -U "python-can[pcan]"',
    'python3 -c "import can; print(can.__version__)"',
  ].join('\n');

  const handleCopyMacCommands = () => {
    navigator.clipboard.writeText(macOsInstallScript);
    setCopiedMacCommands(true);
    setTimeout(() => setCopiedMacCommands(false), 2500);
  };

  // Available channels based on selected backend
  const availableInterfaces = systemInfo?.detectedInterfaces || [];
  const filteredInterfaces = availableInterfaces.filter(
    (i) => backend === 'auto' || i.backend === backend
  );

  // Update default channel when backend changes
  useEffect(() => {
    if (backend === 'mock') {
      setChannel('mock0');
    } else if (backend === 'socketcan') {
      const match = availableInterfaces.find((i) => i.backend === 'socketcan');
      setChannel(match ? match.channel : 'can0');
    } else if (backend === 'pcan') {
      const match = availableInterfaces.find((i) => i.backend === 'pcan');
      setChannel(match ? match.channel : 'PCAN_USBBUS1');
    }
    setErrorMsg(null);
  }, [backend, availableInterfaces]);

  if (!isOpen) return null;

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMsg(null);

    const config: CanConfig = {
      backend,
      channel,
      bitrate,
      fdEnabled,
      dataBitrate: fdEnabled ? dataBitrate : undefined,
      listenOnly,
      autoReconnect,
    };

    const success = await onConnect(config);
    setIsSubmitting(false);
    if (success) {
      onClose();
    } else {
      setErrorMsg(
        backend === 'mock'
          ? 'Failed to initialize simulation engine.'
          : `Selected ${backend.toUpperCase()} interface '${channel}' could not be established. Ensure hardware driver is loaded.`
      );
    }
  };

  const handleStartSimulation = async () => {
    setIsSubmitting(true);
    setBackend('mock');
    setChannel('mock0');
    const success = await onConnect({
      backend: 'mock',
      channel: 'mock0',
      bitrate,
      fdEnabled,
      dataBitrate,
      listenOnly,
      autoReconnect: false,
    });
    setIsSubmitting(false);
    if (success) {
      onClose();
    }
  };

  // Hardware status checks
  const isPcanAvailable = Boolean(systemInfo?.driverStatus.pcan.available);
  const isSocketCanAvailable = Boolean(systemInfo?.driverStatus.socketcan.available);
  const showHardwareWarning =
    (backend === 'pcan' && !isPcanAvailable) || (backend === 'socketcan' && !isSocketCanAvailable);

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-zinc-900 border border-zinc-700/80 rounded-xl shadow-2xl max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-5 py-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-950/60">
          <div className="flex items-center space-x-2">
            <Cpu className="w-5 h-5 text-cyan-400" />
            <h3 className="font-bold text-zinc-100 text-sm">CAN Bus Interface Configuration</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleFormSubmit} className="p-5 space-y-4 text-xs">
          {/* Interface / Backend Selector */}
          <div>
            <label className="block font-semibold text-zinc-300 mb-1.5">CAN Backend Interface</label>
            <div className="grid grid-cols-4 gap-2">
              {(['auto', 'socketcan', 'pcan', 'mock'] as CanBackendType[]).map((type) => {
                const isSelected = backend === type;
                const isAvailable =
                  type === 'mock' ||
                  type === 'auto' ||
                  (type === 'socketcan' && isSocketCanAvailable) ||
                  (type === 'pcan' && isPcanAvailable);

                return (
                  <button
                    type="button"
                    key={type}
                    onClick={() => setBackend(type)}
                    className={`py-2 px-2.5 rounded-lg border text-center transition font-mono font-medium capitalize cursor-pointer ${
                      isSelected
                        ? 'bg-cyan-950/80 border-cyan-500 text-cyan-200 shadow-sm'
                        : 'bg-zinc-800/60 border-zinc-700 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
                    }`}
                  >
                    <div className="text-xs font-semibold">{type}</div>
                    <div className="text-[10px] text-zinc-500 mt-0.5">
                      {type === 'auto'
                        ? 'Auto Probe'
                        : type === 'mock'
                        ? 'Simulator'
                        : isAvailable
                        ? 'Ready'
                        : 'Not detected'}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Hardware Warning if missing */}
          {showHardwareWarning && (
            <div className="p-3 bg-amber-950/40 border border-amber-500/40 rounded-lg text-amber-300 space-y-2">
              <div className="flex items-center space-x-2 font-semibold">
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                <span>NO CAN HARDWARE DETECTED</span>
              </div>
              <p className="text-[11px] text-amber-200/80 leading-relaxed">
                {backend === 'pcan'
                  ? 'PCAN-USB backend is unavailable. Please verify: 1) PEAK PCAN driver/API installation, 2) PCAN-USB cable connection, 3) python-can PCAN support.'
                  : 'SocketCAN interface not detected. Please verify that a CAN device (e.g. can0 or vcan0) is configured in Linux.'}
              </p>
              <button
                type="button"
                onClick={handleStartSimulation}
                className="w-full mt-1 py-1.5 px-3 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 rounded font-semibold text-xs flex items-center justify-center space-x-1.5 transition cursor-pointer"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Start Simulation Mode</span>
              </button>
            </div>
          )}

          {/* macOS PCAN Install Detail Helper */}
          {backend === 'pcan' && (
            <div className="p-3 bg-zinc-950 border border-zinc-800 rounded-lg space-y-2">
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setShowMacGuide(!showMacGuide)}
                  className="flex items-center space-x-2 text-xs font-semibold text-zinc-200 hover:text-cyan-300 transition cursor-pointer"
                >
                  <Apple className="w-3.5 h-3.5 text-zinc-300" />
                  <span>macOS Install Instructions (`python-can[pcan]`)</span>
                  {showMacGuide ? (
                    <ChevronUp className="w-3 h-3 text-zinc-400" />
                  ) : (
                    <ChevronDown className="w-3 h-3 text-zinc-400" />
                  )}
                </button>

                <button
                  type="button"
                  onClick={handleCopyMacCommands}
                  className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 flex items-center space-x-1 transition cursor-pointer"
                >
                  {copiedMacCommands ? (
                    <>
                      <Check className="w-3 h-3 text-emerald-400" />
                      <span className="text-emerald-400">Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3 text-zinc-400" />
                      <span>Copy All</span>
                    </>
                  )}
                </button>
              </div>

              {(showMacGuide || !isPcanAvailable) && (
                <div className="p-2.5 bg-zinc-900 rounded border border-zinc-800 font-mono text-[10px] text-zinc-300 space-y-1 mt-1.5 overflow-x-auto">
                  <div className="text-zinc-500"># Verify Python 3:</div>
                  <div className="text-cyan-400">python3 --version</div>
                  <div className="text-zinc-500 mt-1"># Create & activate virtual environment:</div>
                  <div className="text-cyan-400">python3 -m venv ~/canscope-venv</div>
                  <div className="text-cyan-400">source ~/canscope-venv/bin/activate</div>
                  <div className="text-zinc-500 mt-1"># Install python-can with PCAN support:</div>
                  <div className="text-emerald-400 font-semibold">python3 -m pip install -U &quot;python-can[pcan]&quot;</div>
                  <div className="text-zinc-500 mt-1"># Verify version:</div>
                  <div className="text-cyan-400">python3 -c &quot;import can; print(can.__version__)&quot;</div>
                </div>
              )}
            </div>
          )}

          {/* Channel selection */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-zinc-300 mb-1">Channel / Node</label>
              {filteredInterfaces.length > 0 ? (
                <select
                  value={channel}
                  onChange={(e) => setChannel(e.target.value)}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded px-2.5 py-1.5 text-zinc-200 font-mono text-xs focus:outline-none focus:border-cyan-500"
                >
                  {filteredInterfaces.map((iface) => (
                    <option key={iface.channel} value={iface.channel}>
                      {iface.channel} ({iface.name})
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  value={channel}
                  onChange={(e) => setChannel(e.target.value)}
                  placeholder="e.g. can0 or PCAN_USBBUS1"
                  className="w-full bg-zinc-800 border border-zinc-700 rounded px-2.5 py-1.5 text-zinc-200 font-mono text-xs focus:outline-none focus:border-cyan-500"
                />
              )}
            </div>

            {/* Bitrate */}
            <div>
              <label className="block font-semibold text-zinc-300 mb-1">Nominal Bitrate</label>
              <select
                value={bitrate}
                onChange={(e) => setBitrate(Number(e.target.value))}
                className="w-full bg-zinc-800 border border-zinc-700 rounded px-2.5 py-1.5 text-zinc-200 font-mono text-xs focus:outline-none focus:border-cyan-500"
              >
                <option value={125000}>125 kbit/s</option>
                <option value={250000}>250 kbit/s</option>
                <option value={500000}>500 kbit/s (Standard)</option>
                <option value={1000000}>1 Mbit/s</option>
              </select>
            </div>
          </div>

          {/* CAN-FD Options */}
          <div className="p-3 bg-zinc-950/60 border border-zinc-800 rounded-lg space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="fdToggle"
                  checked={fdEnabled}
                  onChange={(e) => setFdEnabled(e.target.checked)}
                  className="rounded bg-zinc-800 border-zinc-700 text-cyan-500 focus:ring-0 w-4 h-4 cursor-pointer"
                />
                <label htmlFor="fdToggle" className="font-semibold text-zinc-200 cursor-pointer">
                  Enable CAN-FD (Flexible Data-Rate)
                </label>
              </div>
              <span className="text-[10px] text-zinc-500">Payload up to 64 bytes</span>
            </div>

            {fdEnabled && (
              <div className="pt-2 border-t border-zinc-800/80 flex items-center justify-between">
                <span className="text-zinc-400">Data Phase Bitrate:</span>
                <select
                  value={dataBitrate}
                  onChange={(e) => setDataBitrate(Number(e.target.value))}
                  className="bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-zinc-200 font-mono text-xs focus:outline-none"
                >
                  <option value={2000000}>2 Mbit/s</option>
                  <option value={4000000}>4 Mbit/s</option>
                  <option value={5000000}>5 Mbit/s</option>
                  <option value={8000000}>8 Mbit/s</option>
                </select>
              </div>
            )}
          </div>

          {/* Operational Modes */}
          <div className="grid grid-cols-2 gap-3 pt-1">
            <label className="flex items-center space-x-2 p-2 bg-zinc-800/40 border border-zinc-800 rounded cursor-pointer hover:bg-zinc-800/70 transition">
              <input
                type="checkbox"
                checked={listenOnly}
                onChange={(e) => setListenOnly(e.target.checked)}
                className="rounded bg-zinc-800 border-zinc-700 text-purple-500 focus:ring-0 w-3.5 h-3.5"
              />
              <div>
                <div className="font-semibold text-zinc-200 text-xs">Listen-Only Mode</div>
                <div className="text-[10px] text-zinc-500">Passive / Read-Only (Safe)</div>
              </div>
            </label>

            <label className="flex items-center space-x-2 p-2 bg-zinc-800/40 border border-zinc-800 rounded cursor-pointer hover:bg-zinc-800/70 transition">
              <input
                type="checkbox"
                checked={autoReconnect}
                onChange={(e) => setAutoReconnect(e.target.checked)}
                className="rounded bg-zinc-800 border-zinc-700 text-cyan-500 focus:ring-0 w-3.5 h-3.5"
              />
              <div>
                <div className="font-semibold text-zinc-200 text-xs">Auto Reconnect</div>
                <div className="text-[10px] text-zinc-500">Recover on bus glitch</div>
              </div>
            </label>
          </div>

          {errorMsg && (
            <div className="p-2.5 bg-rose-950/50 border border-rose-600/40 rounded text-rose-300 text-xs">
              {errorMsg}
            </div>
          )}

          {/* Footer Actions */}
          <div className="pt-3 border-t border-zinc-800 flex items-center justify-end space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 rounded text-zinc-400 hover:text-zinc-200 bg-zinc-800/80 hover:bg-zinc-800 transition font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-1.5 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-semibold transition flex items-center space-x-1.5 shadow-sm active:scale-95 cursor-pointer disabled:opacity-50"
            >
              <Check className="w-3.5 h-3.5" />
              <span>{status.connectionState === 'connected' ? 'Reconfigure & Connect' : 'Establish Connection'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
