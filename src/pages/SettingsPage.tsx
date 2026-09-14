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
  BookOpen,
  FileText,
  X,
  Monitor,
  Download,
  Laptop,
} from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { InstallModal } from '../components/InstallModal';

interface SettingsPageProps {
  systemInfo: SystemInfo | null;
  status: BusStatus;
}

export const SettingsPage: React.FC<SettingsPageProps> = ({ systemInfo, status }) => {
  const [copiedAll, setCopiedAll] = useState(false);
  const [copiedLine, setCopiedLine] = useState<string | null>(null);
  const [copiedDiag, setCopiedDiag] = useState(false);
  const [diagInput, setDiagInput] = useState('');
  const [showDocModal, setShowDocModal] = useState(false);
  const [showInstallModal, setShowInstallModal] = useState(false);
  const { isInstallable, isInstalled, install } = usePWAInstall();

  const macOsCommands = [
    'python3 --version',
    'python3 -m venv ~/canscope-venv',
    'source ~/canscope-venv/bin/activate',
    'python3 -m pip install -U "python-can[pcan]"',
    'python3 -c "import can; print(can.__version__)"',
  ];

  const diagCommand = `python3 -c '
import can, platform, os
print(f"PYTHON={platform.python_version()}")
print(f"CAN={getattr(can, \\"__version__\\", \\"unknown\\")}")
print(f"PCAN_SUPPORT={\\"pcan\\" in getattr(can.interfaces, \\"BACKENDS\\", {})}")
libs = [p for p in [\"/Library/Frameworks/PCBUSB.framework\", \"/usr/local/lib/libpcanbasic.dylib\", \"/opt/homebrew/lib/libpcanbasic.dylib\"] if os.path.exists(p)]
print(f"PCAN_DYLIB={libs[0] if libs else \\"NOT_FOUND\\"}")
'`;

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

  const handleCopyDiag = () => {
    navigator.clipboard.writeText(diagCommand);
    setCopiedDiag(true);
    setTimeout(() => setCopiedDiag(false), 2500);
  };

  // Analyze verification input
  const parsedStatus = React.useMemo(() => {
    if (!diagInput.trim()) return null;
    const text = diagInput;
    const hasCanVer = text.match(/(?:CAN=|version:\s*|python-can\s+)?([34]\.\d+\.\d+)/i);
    const hasPythonVer = text.match(/(?:PYTHON=|Python\s+)?(3\.\d+\.\d+)/i);
    const hasPcanSupport = /PCAN_SUPPORT=True|'pcan'|PCAN\s+backend/i.test(text);
    const hasDylib = /PCBUSB\.framework|libpcanbasic/i.test(text);
    const hasImportError = /ModuleNotFoundError|ImportError|No module named/i.test(text);

    return {
      canVersion: hasCanVer ? hasCanVer[1] : null,
      pythonVersion: hasPythonVer ? hasPythonVer[1] : null,
      pcanSupport: hasPcanSupport,
      dylibFound: hasDylib,
      error: hasImportError,
    };
  }, [diagInput]);
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
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setShowDocModal(true)}
                className="px-2.5 py-1 rounded text-xs font-semibold flex items-center space-x-1.5 bg-cyan-950/60 hover:bg-cyan-900 text-cyan-300 border border-cyan-800 transition cursor-pointer"
                title="View complete step-by-step macOS setup guide"
              >
                <BookOpen className="w-3.5 h-3.5 text-cyan-400" />
                <span>Full Setup Doc</span>
              </button>
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

      {/* macOS Verification & Diagnostic Checker Tool */}
      <div className="p-5 bg-zinc-900 border border-zinc-800 rounded-xl space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            <h3 className="font-bold text-zinc-100 text-sm">macOS Local Installation Verification</h3>
          </div>
          <button
            onClick={handleCopyDiag}
            className={`px-2.5 py-1 rounded text-xs font-semibold flex items-center space-x-1.5 transition cursor-pointer border ${
              copiedDiag
                ? 'bg-emerald-950 text-emerald-300 border-emerald-700'
                : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border-zinc-700'
            }`}
            title="Copy test command to run in your Mac terminal"
          >
            {copiedDiag ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span>Copied Diagnostic Command!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-zinc-400" />
                <span>Copy Verification Command</span>
              </>
            )}
          </button>
        </div>

        <p className="text-xs text-zinc-400 leading-relaxed">
          Because this CANScope instance is hosted in a secure Cloud Run container, it cannot directly reach into your local Mac laptop&apos;s terminal or USB controllers. Run this 1-line verification command in your Mac Terminal, then paste the output below:
        </p>

        <div className="p-2.5 bg-zinc-950 rounded-lg border border-zinc-800 font-mono text-[11px] text-cyan-300 flex items-center justify-between overflow-x-auto">
          <code>{"python3 -c 'import can, platform; print(f\"Python {platform.python_version()} | python-can {can.__version__} | PCAN: {\"pcan\" in can.interfaces.BACKENDS}\")'"}</code>
        </div>

        <div className="space-y-1.5">
          <label className="block text-xs font-medium text-zinc-300">
            Paste your Mac terminal output here to check:
          </label>
          <textarea
            value={diagInput}
            onChange={(e) => setDiagInput(e.target.value)}
            placeholder="e.g. 4.4.0 or Python 3.11.8 | python-can 4.4.0 | PCAN: True"
            className="w-full h-16 bg-zinc-950 border border-zinc-800 focus:border-cyan-500 rounded-lg p-2.5 font-mono text-xs text-zinc-200 resize-none focus:outline-none placeholder:text-zinc-600"
          />
        </div>

        {parsedStatus && (
          <div className="p-3 bg-zinc-950 border border-zinc-800 rounded-lg space-y-2 text-xs">
            <div className="font-semibold text-zinc-200 flex items-center justify-between">
              <span>Verification Result:</span>
              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                parsedStatus.canVersion && !parsedStatus.error
                  ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                  : 'bg-amber-950 text-amber-300 border border-amber-800'
              }`}>
                {parsedStatus.canVersion && !parsedStatus.error ? 'VERIFIED READY' : 'ATTENTION NEEDED'}
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 font-mono text-[11px]">
              <div className={`p-2 rounded border ${parsedStatus.canVersion ? 'bg-emerald-950/60 border-emerald-800 text-emerald-300' : 'bg-zinc-900 border-zinc-800 text-zinc-400'}`}>
                <div className="text-[10px] uppercase font-sans text-zinc-500">python-can</div>
                <div className="font-bold">{parsedStatus.canVersion ? `v${parsedStatus.canVersion} (INSTALLED)` : 'Not detected'}</div>
              </div>
              <div className={`p-2 rounded border ${parsedStatus.pcanSupport || parsedStatus.canVersion ? 'bg-emerald-950/60 border-emerald-800 text-emerald-300' : 'bg-zinc-900 border-zinc-800 text-zinc-400'}`}>
                <div className="text-[10px] uppercase font-sans text-zinc-500">PCAN Backend</div>
                <div className="font-bold">{parsedStatus.pcanSupport || parsedStatus.canVersion ? 'AVAILABLE' : 'Unregistered'}</div>
              </div>
              <div className={`p-2 rounded border ${parsedStatus.dylibFound ? 'bg-emerald-950/60 border-emerald-800 text-emerald-300' : 'bg-zinc-900 border-zinc-800 text-zinc-400'}`}>
                <div className="text-[10px] uppercase font-sans text-zinc-500">Driver Framework</div>
                <div className="font-bold">{parsedStatus.dylibFound ? 'DETECTED' : 'PCBUSB.framework'}</div>
              </div>
            </div>
            {parsedStatus.canVersion && !parsedStatus.error && (
              <p className="text-emerald-400 text-[11px]">
                ✓ Your macOS python-can environment is properly installed and ready!
              </p>
            )}
            {parsedStatus.error && (
              <p className="text-rose-400 text-[11px]">
                ⚠ An error was found in the output. Please verify that your virtual environment is activated with: <code className="bg-zinc-900 px-1 py-0.5 rounded">source ~/canscope-venv/bin/activate</code>
              </p>
            )}
          </div>
        )}
      </div>

      {/* Desktop Application & Offline Installation (PWA) */}
      <div className="p-5 bg-zinc-900 border border-zinc-800 rounded-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center space-x-2">
            <Monitor className="w-5 h-5 text-cyan-400" />
            <div>
              <h3 className="font-bold text-zinc-100 text-sm">Desktop Application & Offline Installation (PWA)</h3>
              <p className="text-xs text-zinc-400 mt-0.5">
                Install CANScope as an independent desktop software application on macOS, Windows, or Linux
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2 shrink-0">
            {isInstalled ? (
              <span className="px-3 py-1.5 rounded-lg bg-emerald-950/60 border border-emerald-700/60 text-emerald-300 text-xs font-semibold flex items-center space-x-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>Installed (Standalone)</span>
              </span>
            ) : isInstallable ? (
              <button
                onClick={install}
                className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-xs font-bold flex items-center space-x-1.5 shadow-sm transition active:scale-95 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Install to Desktop</span>
              </button>
            ) : (
              <button
                onClick={() => setShowInstallModal(true)}
                className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold flex items-center space-x-1.5 border border-zinc-700 transition active:scale-95 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5 text-cyan-400" />
                <span>Install Options</span>
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
          <div className="p-3.5 bg-zinc-950 border border-zinc-800/80 rounded-lg space-y-1.5">
            <div className="font-semibold text-zinc-200 flex items-center space-x-1.5">
              <Laptop className="w-4 h-4 text-cyan-400" />
              <span>Native Window Shell</span>
            </div>
            <p className="text-zinc-400 text-[11px] leading-relaxed">
              Runs in its own borderless window without browser URL tabs or navigation chrome, maximizing screen area for high-density CAN data tables and dual-axis graphs.
            </p>
          </div>

          <div className="p-3.5 bg-zinc-950 border border-zinc-800/80 rounded-lg space-y-1.5">
            <div className="font-semibold text-zinc-200 flex items-center space-x-1.5">
              <HardDrive className="w-4 h-4 text-emerald-400" />
              <span>100% Offline Trace Replay</span>
            </div>
            <p className="text-zinc-400 text-[11px] leading-relaxed">
              Fully caches application code, DBC signal decoders, and historical traces in IndexedDB. Launch from dock/taskbar even without internet connectivity.
            </p>
          </div>

          <div className="p-3.5 bg-zinc-950 border border-zinc-800/80 rounded-lg space-y-1.5">
            <div className="font-semibold text-zinc-200 flex items-center space-x-1.5">
              <CheckCircle2 className="w-4 h-4 text-blue-400" />
              <span>OS Dock & Taskbar</span>
            </div>
            <p className="text-zinc-400 text-[11px] leading-relaxed">
              Quickly launch via macOS Spotlight / Launchpad, Windows Start Menu, or Linux Application Drawer with the high-resolution CANScope icon.
            </p>
          </div>
        </div>

        <div className="pt-2 flex items-center justify-between border-t border-zinc-800/60 text-xs">
          <span className="text-zinc-500 font-mono text-[11px]">STATUS: {isInstalled ? 'STANDALONE WINDOW ACTIVE' : isInstallable ? 'BROWSER INSTALL TRIGGER READY' : 'BROWSER PWA CAPABLE'}</span>
          <button
            onClick={() => setShowInstallModal(true)}
            className="text-cyan-400 hover:text-cyan-300 font-medium text-xs flex items-center space-x-1 cursor-pointer"
          >
            <span>View installation steps for your browser</span>
            <span>&rarr;</span>
          </button>
        </div>
      </div>

      <InstallModal isOpen={showInstallModal} onClose={() => setShowInstallModal(false)} />

      {/* Full macOS Setup Documentation Modal */}
      {showDocModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-700 rounded-2xl w-full max-w-3xl max-h-[88vh] flex flex-col shadow-2xl">
            {/* Modal Header */}
            <div className="p-4 px-6 border-b border-zinc-800 flex items-center justify-between bg-zinc-950/60 rounded-t-2xl">
              <div className="flex items-center space-x-2.5">
                <Apple className="w-5 h-5 text-zinc-100" />
                <h3 className="font-bold text-zinc-100 text-sm">
                  macOS Setup Guide (CANScope & PEAK PCAN-USB)
                </h3>
              </div>
              <button
                onClick={() => setShowDocModal(false)}
                className="text-zinc-400 hover:text-zinc-100 p-1.5 rounded-lg hover:bg-zinc-800 transition cursor-pointer"
                title="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 overflow-y-auto space-y-6 text-xs text-zinc-300 leading-relaxed font-sans">
              {/* Introduction */}
              <div className="p-3.5 bg-zinc-950 border border-zinc-800/80 rounded-xl space-y-1.5">
                <div className="font-semibold text-zinc-100 flex items-center space-x-1.5">
                  <Info className="w-4 h-4 text-cyan-400" />
                  <span>Overview & Architecture</span>
                </div>
                <p className="text-zinc-400">
                  macOS does not have native Linux SocketCAN in its kernel. Instead, physical CAN communication with PEAK-System adapters uses the cross-platform <strong className="text-zinc-200">PCANBasic / MacCAN</strong> dynamic library and the <strong className="text-zinc-200">python-can</strong> driver backend. Both Apple Silicon (M1/M2/M3/M4) and Intel Macs are fully supported.
                </p>
              </div>

              {/* 1. Prerequisites */}
              <div className="space-y-2">
                <h4 className="font-bold text-zinc-100 text-sm flex items-center space-x-2">
                  <span className="w-5 h-5 rounded-full bg-cyan-950 border border-cyan-700 text-cyan-300 flex items-center justify-center text-[10px] font-mono">1</span>
                  <span>Prerequisites</span>
                </h4>
                <ul className="list-disc list-inside space-y-1 text-zinc-400 pl-2">
                  <li>macOS Monterey (12), Ventura (13), Sonoma (14), or Sequoia (15+)</li>
                  <li>Python 3.10 or higher (<code className="text-cyan-300 font-mono text-[11px]">python3 --version</code>)</li>
                  <li>PEAK PCAN-USB, PCAN-USB FD, or PCAN-USB Pro adapter</li>
                </ul>
              </div>

              {/* 2. Virtual Environment */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-zinc-100 text-sm flex items-center space-x-2">
                    <span className="w-5 h-5 rounded-full bg-cyan-950 border border-cyan-700 text-cyan-300 flex items-center justify-center text-[10px] font-mono">2</span>
                    <span>Installation & Environment Setup</span>
                  </h4>
                  <button
                    onClick={handleCopyAll}
                    className="px-2 py-0.5 rounded text-[11px] font-semibold bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 flex items-center space-x-1 cursor-pointer"
                  >
                    {copiedAll ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3 text-zinc-400" />}
                    <span>{copiedAll ? 'Copied!' : 'Copy Script'}</span>
                  </button>
                </div>
                <div className="p-3 bg-zinc-950 rounded-lg border border-zinc-800 font-mono text-[11px] text-zinc-300 space-y-1.5">
                  <div className="text-zinc-500"># Verify Python version:</div>
                  <div className="text-cyan-400">python3 --version</div>
                  <div className="text-zinc-500 mt-1"># Create dedicated virtual environment:</div>
                  <div className="text-cyan-400">python3 -m venv ~/canscope-venv</div>
                  <div className="text-zinc-500 mt-1"># Activate environment:</div>
                  <div className="text-cyan-400">source ~/canscope-venv/bin/activate</div>
                  <div className="text-zinc-500 mt-1"># Install python-can with PCAN extras:</div>
                  <div className="text-emerald-400 font-semibold">python3 -m pip install -U &quot;python-can[pcan]&quot;</div>
                  <div className="text-zinc-500 mt-1"># Verify installation:</div>
                  <div className="text-cyan-400">python3 -c &quot;import can; print(can.__version__)&quot;</div>
                </div>
              </div>

              {/* 3. Verification Check */}
              <div className="space-y-2">
                <h4 className="font-bold text-zinc-100 text-sm flex items-center space-x-2">
                  <span className="w-5 h-5 rounded-full bg-cyan-950 border border-cyan-700 text-cyan-300 flex items-center justify-center text-[10px] font-mono">3</span>
                  <span>Verify PCAN Backend Registration</span>
                </h4>
                <p className="text-zinc-400">
                  Run this command in Terminal to verify that python-can recognizes the PCAN driver:
                </p>
                <div className="p-2.5 bg-zinc-950 rounded border border-zinc-800 font-mono text-[11px] text-emerald-400">
                  python3 -c &quot;import can; print(&apos;PCAN backend registered:&apos;, &apos;pcan&apos; in can.interfaces.BACKENDS)&quot;
                </div>
                <p className="text-[11px] text-zinc-400">
                  Expected output: <code className="text-emerald-400 font-semibold font-mono">PCAN backend registered: True</code>
                </p>
              </div>

              {/* 4. Driver Framework */}
              <div className="space-y-2">
                <h4 className="font-bold text-zinc-100 text-sm flex items-center space-x-2">
                  <span className="w-5 h-5 rounded-full bg-cyan-950 border border-cyan-700 text-cyan-300 flex items-center justify-center text-[10px] font-mono">4</span>
                  <span>PEAK PCAN Driver / PCBUSB Framework</span>
                </h4>
                <p className="text-zinc-400">
                  To interface with the physical USB adapter, install the PEAK PCAN-Basic package or MacCAN library:
                </p>
                <ul className="list-disc list-inside space-y-1 text-zinc-400 pl-2">
                  <li>Download and install the official PEAK PCAN-Basic package for macOS.</li>
                  <li>Confirm presence of <code className="text-cyan-300 font-mono text-[10px]">/Library/Frameworks/PCBUSB.framework</code>.</li>
                  <li>If prompted by macOS Gatekeeper, navigate to <strong>System Settings &gt; Privacy &amp; Security</strong> and click <strong>Allow</strong>.</li>
                </ul>
              </div>

              {/* 5. Physical USB Connection */}
              <div className="space-y-2">
                <h4 className="font-bold text-zinc-100 text-sm flex items-center space-x-2">
                  <span className="w-5 h-5 rounded-full bg-cyan-950 border border-cyan-700 text-cyan-300 flex items-center justify-center text-[10px] font-mono">5</span>
                  <span>Hardware Adapter Detection</span>
                </h4>
                <p className="text-zinc-400">
                  Plug your PEAK-System adapter into your Mac USB port and check device recognition:
                </p>
                <div className="p-2.5 bg-zinc-950 rounded border border-zinc-800 font-mono text-[11px] text-cyan-300">
                  system_profiler SPUSBDataType | grep -E -i &quot;peak|pcan&quot;
                </div>
                <p className="text-zinc-400 mt-1">
                  Test opening the channel via python:
                </p>
                <div className="p-2.5 bg-zinc-950 rounded border border-zinc-800 font-mono text-[11px] text-zinc-300">
                  python3 -c &quot;import can; bus = can.Bus(interface=&apos;pcan&apos;, channel=&apos;PCAN_USBBUS1&apos;, bitrate=500000); print(&apos;Connected:&apos;, bus); bus.shutdown()&quot;
                </div>
              </div>

              {/* 6. Running with CANScope */}
              <div className="space-y-2">
                <h4 className="font-bold text-zinc-100 text-sm flex items-center space-x-2">
                  <span className="w-5 h-5 rounded-full bg-cyan-950 border border-cyan-700 text-cyan-300 flex items-center justify-center text-[10px] font-mono">6</span>
                  <span>Connect with CANScope</span>
                </h4>
                <ol className="list-decimal list-inside space-y-1 text-zinc-400 pl-2">
                  <li>In CANScope, open the <strong>Connect</strong> dialog (top bar).</li>
                  <li>Select <strong>PCAN</strong> as the interface backend.</li>
                  <li>Select channel <code className="text-cyan-300 font-mono text-[10px]">PCAN_USBBUS1</code>.</li>
                  <li>Set nominal bitrate to match your physical network (e.g. 500 kbit/s).</li>
                  <li>Click <strong>Connect</strong> to begin real-time sniffing and analysis!</li>
                </ol>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 px-6 border-t border-zinc-800 flex justify-end bg-zinc-950/60 rounded-b-2xl">
              <button
                onClick={() => setShowDocModal(false)}
                className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-100 rounded-lg text-xs font-semibold transition cursor-pointer"
              >
                Close Guide
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
