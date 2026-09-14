import React, { useState } from 'react';
import { SystemInfo, BusStatus } from '../types/can';
import {
  Cpu,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Terminal,
  HardDrive,
  Info,
  Copy,
  Check,
  Apple,
} from 'lucide-react';

interface SettingsPageProps {
  systemInfo: SystemInfo | null;
  status: BusStatus;
}

export const SettingsPage: React.FC<SettingsPageProps> = ({ systemInfo, status }) => {
  const [copiedAll, setCopiedAll] = useState(false);
  const [copiedLine, setCopiedLine] = useState<string | null>(null);

  const macOsCommands = [
    'python3 --version',
    'python3 -m venv ~/canscope-venv',
    'source ~/canscope-venv/bin/activate',
    'python3 -m pip install -U "python-can[pcan]"',
    'python3 -c "import can; print(can.__version__)"',
  ];

  const handleCopyAll = () => {
    const script = macOsCommands.join('\n');
    navigator.clipboard.writeText(script);
    setCopiedAll(true);
    setTimeout(() => setCopiedAll(false), 2500);
  };

  const handleCopyLine = (cmd: string) => {
    navigator.clipboard.writeText(cmd);
    setCopiedLine(cmd);
    setTimeout(() => setCopiedLine(null), 2000);
  };
  return (
    <div className="p-6 space-y-6 overflow-y-auto h-full text-zinc-200">
      <div>
        <h2 className="text-base font-bold text-zinc-100 flex items-center space-x-2">
          <Cpu className="w-5 h-5 text-cyan-400" />
          <span>System Environment & Hardware Diagnostics</span>
        </h2>
        <p className="text-xs text-zinc-400 mt-0.5">
          Runtime host inspection, dynamic driver discovery, and hardware configuration instructions
        </p>
      </div>

      {/* Host Environment Summary */}
      <div className="p-5 bg-zinc-900 border border-zinc-800 rounded-xl space-y-4">
        <h3 className="font-bold text-zinc-100 text-sm">Host System Architecture</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs font-mono">
          <div className="p-3 bg-zinc-950 border border-zinc-800 rounded-lg">
            <span className="text-[10px] text-zinc-500 uppercase block font-sans">Operating System</span>
            <span className="font-bold text-zinc-200 capitalize mt-0.5 block">
              {systemInfo?.platform || 'Linux'}
            </span>
          </div>

          <div className="p-3 bg-zinc-950 border border-zinc-800 rounded-lg">
            <span className="text-[10px] text-zinc-500 uppercase block font-sans">Architecture</span>
            <span className="font-bold text-zinc-200 mt-0.5 block">
              {systemInfo?.architecture || 'x86_64'}
            </span>
          </div>

          <div className="p-3 bg-zinc-950 border border-zinc-800 rounded-lg">
            <span className="text-[10px] text-zinc-500 uppercase block font-sans">python-can Version</span>
            <span className="font-bold text-cyan-300 mt-0.5 block">
              {systemInfo?.pythonCanVersion || '4.4.0'}
            </span>
          </div>

          <div className="p-3 bg-zinc-950 border border-zinc-800 rounded-lg">
            <span className="text-[10px] text-zinc-500 uppercase block font-sans">API Backend</span>
            <span className="font-bold text-emerald-400 mt-0.5 block">
              FastAPI / Node HAL
            </span>
          </div>
        </div>
      </div>

      {/* Driver Status Checklist */}
      <div className="p-5 bg-zinc-900 border border-zinc-800 rounded-xl space-y-3">
        <h3 className="font-bold text-zinc-100 text-sm">Hardware Driver Discovery Status</h3>
        <div className="space-y-2.5 text-xs">
          {/* Mock Engine */}
          <div className="p-3.5 bg-zinc-950 border border-zinc-800/80 rounded-lg flex items-start justify-between gap-3">
            <div className="flex items-start space-x-3">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-zinc-200">Mock CAN Engine (Simulation)</span>
                <p className="text-zinc-400 text-[11px] mt-0.5">
                  Virtual bus simulator producing multi-ECU powertrain, ADAS, and BMS traffic without hardware.
                </p>
              </div>
            </div>
            <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800 font-mono text-[10px] font-bold">
              READY
            </span>
          </div>

          {/* SocketCAN */}
          <div className="p-3.5 bg-zinc-950 border border-zinc-800/80 rounded-lg flex items-start justify-between gap-3">
            <div className="flex items-start space-x-3">
              {systemInfo?.driverStatus.socketcan.available ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              )}
              <div>
                <span className="font-bold text-zinc-200">Linux SocketCAN Subsystem</span>
                <p className="text-zinc-400 text-[11px] mt-0.5">
                  {systemInfo?.driverStatus.socketcan.message ||
                    'Native kernel network CAN stack for Linux (can0, vcan0).'}
                </p>
              </div>
            </div>
            <span
              className={`px-2 py-0.5 rounded font-mono text-[10px] font-bold border ${
                systemInfo?.driverStatus.socketcan.available
                  ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
                  : 'bg-zinc-800 text-zinc-400 border-zinc-700'
              }`}
            >
              {systemInfo?.driverStatus.socketcan.available ? 'AVAILABLE' : 'NOT DETECTED'}
            </span>
          </div>

          {/* PCAN */}
          <div className="p-3.5 bg-zinc-950 border border-zinc-800/80 rounded-lg flex items-start justify-between gap-3">
            <div className="flex items-start space-x-3">
              {systemInfo?.driverStatus.pcan.available ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              )}
              <div>
                <span className="font-bold text-zinc-200">PEAK-System PCAN-USB Adapter</span>
                <p className="text-zinc-400 text-[11px] mt-0.5">
                  {systemInfo?.driverStatus.pcan.message ||
                    'Cross-platform PCANBasic dynamic library driver (Linux & macOS).'}
                </p>
              </div>
            </div>
            <span
              className={`px-2 py-0.5 rounded font-mono text-[10px] font-bold border ${
                systemInfo?.driverStatus.pcan.available
                  ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
                  : 'bg-zinc-800 text-zinc-400 border-zinc-700'
              }`}
            >
              {systemInfo?.driverStatus.pcan.available ? 'AVAILABLE' : 'NOT DETECTED'}
            </span>
          </div>
        </div>
      </div>

      {/* Hardware Setup Guides */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
        <div className="p-5 bg-zinc-900 border border-zinc-800 rounded-xl space-y-2">
          <div className="flex items-center space-x-2 font-bold text-zinc-100">
            <Terminal className="w-4 h-4 text-cyan-400" />
            <span>Linux SocketCAN Configuration</span>
          </div>
          <p className="text-zinc-400 leading-relaxed">
            To initialize a physical CAN interface or create a virtual CAN bus:
          </p>
          <div className="p-2.5 bg-zinc-950 rounded border border-zinc-800 font-mono text-[11px] text-zinc-300 space-y-1">
            <div># 1. Load vcan kernel module (if testing virtually):</div>
            <div className="text-cyan-400">sudo modprobe vcan</div>
            <div className="text-cyan-400">sudo ip link add dev vcan0 type vcan</div>
            <div className="text-cyan-400">sudo ip link set up vcan0</div>
            <div className="mt-2"># 2. Or configure a real hardware adapter:</div>
            <div className="text-cyan-400">sudo ip link set can0 up type can bitrate 500000</div>
          </div>
        </div>

        <div className="p-5 bg-zinc-900 border border-zinc-800 rounded-xl space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 font-bold text-zinc-100">
              <Apple className="w-4 h-4 text-zinc-200" />
              <span>macOS Installation & PCAN-USB Setup</span>
            </div>
            <button
              onClick={handleCopyAll}
              className={`px-2.5 py-1 rounded text-xs font-semibold flex items-center space-x-1.5 transition cursor-pointer border ${
                copiedAll
                  ? 'bg-emerald-950 text-emerald-300 border-emerald-700'
                  : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border-zinc-700'
              }`}
              title="Copy all commands to clipboard"
            >
              {copiedAll ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Copied All!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-zinc-400" />
                  <span>Copy Commands</span>
                </>
              )}
            </button>
          </div>

          <p className="text-zinc-400 leading-relaxed text-xs">
            macOS does not have kernel-native SocketCAN. Run these commands in Terminal to configure a Python virtual environment with full PCAN hardware driver support:
          </p>

          <div className="p-3 bg-zinc-950 rounded-lg border border-zinc-800 font-mono text-[11px] text-zinc-300 space-y-2">
            <div className="flex items-center justify-between group py-0.5">
              <div>
                <span className="text-zinc-500 select-none mr-2"># 1. Check Python version</span>
                <div className="text-cyan-400">python3 --version</div>
              </div>
              <button
                onClick={() => handleCopyLine('python3 --version')}
                className="opacity-0 group-hover:opacity-100 text-zinc-400 hover:text-cyan-300 p-1 rounded transition cursor-pointer"
                title="Copy command"
              >
                {copiedLine === 'python3 --version' ? (
                  <Check className="w-3 h-3 text-emerald-400" />
                ) : (
                  <Copy className="w-3 h-3" />
                )}
              </button>
            </div>

            <div className="flex items-center justify-between group py-0.5">
              <div>
                <span className="text-zinc-500 select-none mr-2"># 2. Create dedicated virtual environment</span>
                <div className="text-cyan-400">python3 -m venv ~/canscope-venv</div>
              </div>
              <button
                onClick={() => handleCopyLine('python3 -m venv ~/canscope-venv')}
                className="opacity-0 group-hover:opacity-100 text-zinc-400 hover:text-cyan-300 p-1 rounded transition cursor-pointer"
                title="Copy command"
              >
                {copiedLine === 'python3 -m venv ~/canscope-venv' ? (
                  <Check className="w-3 h-3 text-emerald-400" />
                ) : (
                  <Copy className="w-3 h-3" />
                )}
              </button>
            </div>

            <div className="flex items-center justify-between group py-0.5">
              <div>
                <span className="text-zinc-500 select-none mr-2"># 3. Activate virtual environment</span>
                <div className="text-cyan-400">source ~/canscope-venv/bin/activate</div>
              </div>
              <button
                onClick={() => handleCopyLine('source ~/canscope-venv/bin/activate')}
                className="opacity-0 group-hover:opacity-100 text-zinc-400 hover:text-cyan-300 p-1 rounded transition cursor-pointer"
                title="Copy command"
              >
                {copiedLine === 'source ~/canscope-venv/bin/activate' ? (
                  <Check className="w-3 h-3 text-emerald-400" />
                ) : (
                  <Copy className="w-3 h-3" />
                )}
              </button>
            </div>

            <div className="flex items-center justify-between group py-0.5">
              <div>
                <span className="text-zinc-500 select-none mr-2"># 4. Install python-can with PCAN-USB extras</span>
                <div className="text-emerald-400 font-semibold">python3 -m pip install -U &quot;python-can[pcan]&quot;</div>
              </div>
              <button
                onClick={() => handleCopyLine('python3 -m pip install -U "python-can[pcan]"')}
                className="opacity-0 group-hover:opacity-100 text-zinc-400 hover:text-cyan-300 p-1 rounded transition cursor-pointer"
                title="Copy command"
              >
                {copiedLine === 'python3 -m pip install -U "python-can[pcan]"' ? (
                  <Check className="w-3 h-3 text-emerald-400" />
                ) : (
                  <Copy className="w-3 h-3" />
                )}
              </button>
            </div>

            <div className="flex items-center justify-between group py-0.5">
              <div>
                <span className="text-zinc-500 select-none mr-2"># 5. Verify import & library version</span>
                <div className="text-cyan-400">python3 -c &quot;import can; print(can.__version__)&quot;</div>
              </div>
              <button
                onClick={() => handleCopyLine('python3 -c "import can; print(can.__version__)"')}
                className="opacity-0 group-hover:opacity-100 text-zinc-400 hover:text-cyan-300 p-1 rounded transition cursor-pointer"
                title="Copy command"
              >
                {copiedLine === 'python3 -c "import can; print(can.__version__)"' ? (
                  <Check className="w-3 h-3 text-emerald-400" />
                ) : (
                  <Copy className="w-3 h-3" />
                )}
              </button>
            </div>
          </div>

          <div className="text-[11px] text-zinc-400 space-y-1 pt-1 border-t border-zinc-800/80">
            <div className="flex items-center space-x-1.5 text-zinc-300">
              <Info className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
              <span>Hardware Driver Requirement:</span>
            </div>
            <ul className="list-disc list-inside space-y-0.5 text-zinc-400 pl-1">
              <li>
                Install MacCAN or PEAK PCANBasic library (<code className="text-cyan-300 font-mono text-[10px]">/Library/Frameworks/PCBUSB.framework</code> or <code className="text-cyan-300 font-mono text-[10px]">libpcanbasic.dylib</code>).
              </li>
              <li>Connect your PEAK PCAN-USB or PCAN-USB Pro adapter.</li>
              <li>
                CANScope auto-binds to channel <code className="text-cyan-300 font-mono text-[10px]">PCAN_USBBUS1</code> with dynamic device discovery.
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};
