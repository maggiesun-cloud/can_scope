import React, { useState } from 'react';
import {
  BookOpen,
  FileCode,
  Check,
  Copy,
  Download,
  Search,
  Apple,
  Terminal,
  Cpu,
  Database,
  ArrowRight,
  Info,
  Sparkles,
  Sliders,
  Play,
  Pause,
  Trash2,
  HardDriveDownload,
  Radio,
  SlidersHorizontal,
  ShieldCheck,
  Send,
  LineChart,
  Archive,
  AlertOctagon,
  Layers,
  Activity,
  Zap,
  Clock,
} from 'lucide-react';
import { SAMPLE_JSON_DBC } from '../utils/dbc';

interface DocsPageProps {
  onNavigateToDbc?: () => void;
  onNavigateToMonitor?: () => void;
  onNavigateToLogging?: () => void;
  onOpenConnect?: () => void;
  onNavigateToTransmit?: () => void;
  onNavigateToGraphs?: () => void;
  onNavigateToHistory?: () => void;
  onNavigateToErrors?: () => void;
  onNavigateToMessages?: () => void;
}

type DocId =
  | 'sniffer-guide'
  | 'transmit-guide'
  | 'graphs-guide'
  | 'visual-schema-guide'
  | 'json-dbc'
  | 'history-guide'
  | 'errors-guide'
  | 'macos-pcan'
  | 'linux-socketcan'
  | 'architecture';

interface DocItem {
  id: DocId;
  title: string;
  category: string;
  description: string;
  icon: React.ReactNode;
}

export const DocsPage: React.FC<DocsPageProps> = ({
  onNavigateToDbc,
  onNavigateToMonitor,
  onNavigateToLogging,
  onOpenConnect,
  onNavigateToTransmit,
  onNavigateToGraphs,
  onNavigateToHistory,
  onNavigateToErrors,
  onNavigateToMessages,
}) => {
  const [activeDocId, setActiveDocId] = useState<DocId>('sniffer-guide');
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleDownloadTemplate = () => {
    const blob = new Blob([SAMPLE_JSON_DBC], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'custom_can_dbc.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const docsList: DocItem[] = [
    {
      id: 'sniffer-guide',
      title: 'Sniffer Operation & Controls',
      category: 'User Guide',
      description: 'How to start, pause, resume, clear, filter, and record live CAN traffic with shortcuts.',
      icon: <Play className="w-4 h-4 text-emerald-400" />,
    },
    {
      id: 'transmit-guide',
      title: 'Transmit & Periodic Simulation',
      category: 'User Guide',
      description: 'Single-shot injection, cyclic periodic tasks, CAN-FD BRS, and diagnostic requests.',
      icon: <Send className="w-4 h-4 text-cyan-400" />,
    },
    {
      id: 'graphs-guide',
      title: 'Signal Oscilloscope & Plotter',
      category: 'Telemetry & Graphs',
      description: 'Real-time multi-signal waveform plotting, time-window zoom, and physical units.',
      icon: <LineChart className="w-4 h-4 text-purple-400" />,
    },
    {
      id: 'visual-schema-guide',
      title: 'Visual Schema Editor & Matrix',
      category: 'Signal Decoding',
      description: 'Interactive 64-bit payload allocation grid, collision detection, and Vector DBC export.',
      icon: <Sliders className="w-4 h-4 text-amber-400" />,
    },
    {
      id: 'json-dbc',
      title: 'Custom CAN ID JSON DBC Guide',
      category: 'Signal Decoding',
      description: 'How to edit, format, upload, and auto-decode custom CAN IDs in human-readable JSON.',
      icon: <FileCode className="w-4 h-4 text-emerald-400" />,
    },
    {
      id: 'history-guide',
      title: 'Offline History Cache & Replay',
      category: 'Data & Storage',
      description: 'Browser-local IndexedDB trace storage, session tagging, export, and offline post-mortem replay.',
      icon: <Archive className="w-4 h-4 text-blue-400" />,
    },
    {
      id: 'errors-guide',
      title: 'CAN Bus Diagnostics & Errors',
      category: 'Hardware & Diagnostics',
      description: 'ISO 11898-1 fault states, TEC/REC counters, error frames, and physical termination checks.',
      icon: <AlertOctagon className="w-4 h-4 text-rose-400" />,
    },
    {
      id: 'macos-pcan',
      title: 'macOS & PCAN-USB Setup',
      category: 'Hardware & Drivers',
      description: 'Setup python-can[pcan], PEAK driver framework, verification, and hardware connection.',
      icon: <Apple className="w-4 h-4 text-cyan-400" />,
    },
    {
      id: 'linux-socketcan',
      title: 'Linux SocketCAN & vcan Setup',
      category: 'Hardware & Drivers',
      description: 'Configure Linux virtual CAN (vcan0) or physical CAN bus adapters via ip link and can-utils.',
      icon: <Terminal className="w-4 h-4 text-amber-400" />,
    },
    {
      id: 'architecture',
      title: 'CANScope Architecture & HAL',
      category: 'System Design',
      description: 'Overview of the dual-thread HAL, WebSocket frame streaming, and 60fps render buffer.',
      icon: <Cpu className="w-4 h-4 text-purple-400" />,
    },
  ];

  const filteredDocs = docsList.filter(
    (d) =>
      d.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex h-full overflow-hidden text-zinc-200">
      {/* Left Documents Navigation Sidebar */}
      <div className="w-72 border-r border-zinc-800/80 bg-zinc-950 flex flex-col shrink-0">
        <div className="p-4 border-b border-zinc-800/80 space-y-3">
          <div className="flex items-center space-x-2">
            <BookOpen className="w-4 h-4 text-cyan-400" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-300">
              Documentation Hub
            </h2>
          </div>
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-2.5 top-2.5" />
            <input
              type="text"
              placeholder="Search guides & specs..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-cyan-700"
            />
          </div>
        </div>

        <div className="p-2 space-y-1 overflow-y-auto flex-1">
          {filteredDocs.map((doc) => {
            const isActive = activeDocId === doc.id;
            return (
              <button
                key={doc.id}
                onClick={() => setActiveDocId(doc.id)}
                className={`w-full text-left p-2.5 rounded-xl transition flex flex-col space-y-1 cursor-pointer border ${
                  isActive
                    ? 'bg-zinc-900 border-zinc-700/80 text-zinc-100 shadow-sm'
                    : 'bg-transparent border-transparent text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/50'
                }`}
              >
                <div className="flex items-center space-x-2">
                  {doc.icon}
                  <span className="font-semibold text-xs text-zinc-200 truncate">{doc.title}</span>
                </div>
                <div className="text-[11px] text-zinc-500 line-clamp-2 pl-6">
                  {doc.description}
                </div>
              </button>
            );
          })}
        </div>

        {/* Quick Actions Footer */}
        <div className="p-3 border-t border-zinc-800/80 bg-zinc-950/80 space-y-2">
          <button
            onClick={handleDownloadTemplate}
            className="w-full py-2 px-3 bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-zinc-700/70 rounded-lg text-xs font-semibold flex items-center justify-center space-x-1.5 transition cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-emerald-400" />
            <span>Download JSON Template</span>
          </button>
          {onNavigateToDbc && (
            <button
              onClick={onNavigateToDbc}
              className="w-full py-2 px-3 bg-cyan-950/60 hover:bg-cyan-900 text-cyan-300 border border-cyan-800/60 rounded-lg text-xs font-semibold flex items-center justify-center space-x-1.5 transition cursor-pointer"
            >
              <Database className="w-3.5 h-3.5 text-cyan-400" />
              <span>Open DBC Decoder</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Main Document Reading Area */}
      <div className="flex-1 overflow-y-auto p-8 max-w-4xl space-y-8">
        {activeDocId === 'sniffer-guide' && (
          <div className="space-y-6">
            {/* Header Banner */}
            <div className="p-5 bg-zinc-900/80 border border-zinc-800 rounded-2xl space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center space-x-2 text-emerald-400 font-bold text-sm">
                  <Play className="w-5 h-5 fill-current" />
                  <span>CANScope Sniffer Operation & Control Guide</span>
                </div>
                <div className="flex items-center space-x-2">
                  {onNavigateToMonitor && (
                    <button
                      onClick={onNavigateToMonitor}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-1.5 bg-emerald-600 hover:bg-emerald-500 text-white transition cursor-pointer shadow-sm"
                    >
                      <Terminal className="w-3.5 h-3.5" />
                      <span>Open Live Monitor</span>
                    </button>
                  )}
                  {onOpenConnect && (
                    <button
                      onClick={onOpenConnect}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 transition cursor-pointer"
                    >
                      <Radio className="w-3.5 h-3.5 text-cyan-400" />
                      <span>Configure Hardware</span>
                    </button>
                  )}
                  {onNavigateToLogging && (
                    <button
                      onClick={onNavigateToLogging}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 transition cursor-pointer"
                    >
                      <HardDriveDownload className="w-3.5 h-3.5 text-purple-400" />
                      <span>Logging</span>
                    </button>
                  )}
                </div>
              </div>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Learn how to start, pause, resume, stop, filter, and record real-time CAN and CAN-FD traffic. The CANScope sniffer combines a 60fps render buffer with background microsecond timestamping for automotive diagnostics.
              </p>
            </div>

            {/* Quick Reference Keyboard Shortcuts Table */}
            <div className="p-4 bg-zinc-900/60 border border-zinc-800 rounded-xl space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs text-zinc-200 flex items-center space-x-2">
                  <Sparkles className="w-4 h-4 text-cyan-400" />
                  <span>Quick Sniffer Shortcuts & Hotkeys</span>
                </span>
                <span className="text-[10px] text-zinc-500 font-mono">Global Hotkeys</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
                <div className="p-3 bg-zinc-950 border border-zinc-800/90 rounded-lg flex items-center justify-between">
                  <div>
                    <div className="text-xs font-bold text-zinc-200">Pause / Resume</div>
                    <div className="text-[10px] text-zinc-500">Toggle live stream</div>
                  </div>
                  <kbd className="px-2 py-1 bg-zinc-800 border border-zinc-700 rounded text-xs font-mono text-cyan-300 font-bold shadow-sm">
                    Space
                  </kbd>
                </div>

                <div className="p-3 bg-zinc-950 border border-zinc-800/90 rounded-lg flex items-center justify-between">
                  <div>
                    <div className="text-xs font-bold text-zinc-200">Clear Buffer</div>
                    <div className="text-[10px] text-zinc-500">Wipe frame table</div>
                  </div>
                  <kbd className="px-2 py-1 bg-zinc-800 border border-zinc-700 rounded text-xs font-mono text-rose-300 font-bold shadow-sm">
                    C
                  </kbd>
                </div>

                <div className="p-3 bg-zinc-950 border border-zinc-800/90 rounded-lg flex items-center justify-between">
                  <div>
                    <div className="text-xs font-bold text-zinc-200">Record Session</div>
                    <div className="text-[10px] text-zinc-500">Start/stop log capture</div>
                  </div>
                  <kbd className="px-2 py-1 bg-zinc-800 border border-zinc-700 rounded text-xs font-mono text-amber-300 font-bold shadow-sm">
                    R
                  </kbd>
                </div>

                <div className="p-3 bg-zinc-950 border border-zinc-800/90 rounded-lg flex items-center justify-between">
                  <div>
                    <div className="text-xs font-bold text-zinc-200">Close / Dismiss</div>
                    <div className="text-[10px] text-zinc-500">Close dialogs & popups</div>
                  </div>
                  <kbd className="px-2 py-1 bg-zinc-800 border border-zinc-700 rounded text-xs font-mono text-zinc-400 font-bold shadow-sm">
                    Esc
                  </kbd>
                </div>
              </div>
            </div>

            {/* Section 1: Pause & Resume */}
            <div className="p-5 bg-zinc-900/60 border border-zinc-800 rounded-xl space-y-3">
              <div className="flex items-center space-x-2 text-cyan-400 font-bold text-sm">
                <Pause className="w-4 h-4 fill-current" />
                <span>1. Pause & Resume the Live View (Inspection Mode)</span>
              </div>
              <p className="text-xs text-zinc-300 leading-relaxed">
                When monitoring a high-traffic bus (e.g. 500 kbit/s or 2,000+ frames per second), incoming frames scroll past too rapidly to examine individual payloads. The sniffer provides an instantaneous view-freeze mechanism:
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                <div className="p-3.5 bg-zinc-950 border border-zinc-800 rounded-lg space-y-2">
                  <div className="font-semibold text-zinc-200 flex items-center space-x-2">
                    <span className="w-2 h-2 rounded-full bg-amber-400" />
                    <span>How to Pause:</span>
                  </div>
                  <ul className="list-disc list-inside text-zinc-400 space-y-1">
                    <li>Click the <strong className="text-amber-400">Pause</strong> button in the top-left toolbar of the <strong>Monitor</strong> tab.</li>
                    <li>Or press the <kbd className="px-1.5 py-0.5 bg-zinc-800 rounded text-[11px] font-mono text-zinc-200 border border-zinc-700">Space</kbd> key anywhere in the app.</li>
                    <li>Auto-scroll is paused and the display freezes at the current frame.</li>
                  </ul>
                </div>

                <div className="p-3.5 bg-zinc-950 border border-zinc-800 rounded-lg space-y-2">
                  <div className="font-semibold text-zinc-200 flex items-center space-x-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-400" />
                    <span>Zero Data Loss in Background:</span>
                  </div>
                  <p className="text-zinc-400 leading-relaxed">
                    Pausing the view does <strong className="text-zinc-200">not</strong> disconnect the bus or drop incoming frames. The HAL ring buffer continues receiving and counting all frames in the background. When you press <strong className="text-emerald-400">Resume</strong> (or <kbd className="px-1.5 py-0.5 bg-zinc-800 rounded text-[11px] font-mono text-zinc-200 border border-zinc-700">Space</kbd>), the display seamlessly updates with the newest traffic.
                  </p>
                </div>
              </div>
            </div>

            {/* Section 2: Hardware Bus Connection */}
            <div className="p-5 bg-zinc-900/60 border border-zinc-800 rounded-xl space-y-3">
              <div className="flex items-center space-x-2 text-emerald-400 font-bold text-sm">
                <Radio className="w-4 h-4" />
                <span>2. Starting & Stopping the CAN Bus Hardware Stream</span>
              </div>
              <p className="text-xs text-zinc-300 leading-relaxed">
                To capture live frames from a vehicle OBD-II port, ECU test bench, or simulation harness, establish a hardware connection:
              </p>
              <div className="space-y-3 text-xs text-zinc-300">
                <div className="p-3.5 bg-zinc-950 border border-zinc-800 rounded-lg space-y-2">
                  <div className="font-semibold text-zinc-200">Step-by-Step Connection Process:</div>
                  <ol className="list-decimal list-inside text-zinc-400 space-y-1.5">
                    <li>
                      Click <strong className="text-emerald-400">Connect</strong> in the Top Status Bar or on the Dashboard.
                    </li>
                    <li>
                      Select your driver backend:
                      <ul className="list-disc list-inside pl-4 text-zinc-400 mt-1 space-y-0.5">
                        <li><code className="text-cyan-300 font-mono">pcan</code>: PEAK-System USB adapters on Linux or macOS (<code className="text-zinc-300 font-mono">PCAN_USBBUS1</code>).</li>
                        <li><code className="text-cyan-300 font-mono">socketcan</code>: Linux native kernel CAN interfaces (<code className="text-zinc-300 font-mono">can0</code>, <code className="text-zinc-300 font-mono">vcan0</code>).</li>
                        <li><code className="text-cyan-300 font-mono">virtual</code>: Built-in simulated powertrain and sensor network (no hardware required).</li>
                      </ul>
                    </li>
                    <li>Set the bus nominal bitrate (e.g., <code className="text-zinc-300 font-mono">500,000</code> bps).</li>
                    <li>
                      <span className="text-zinc-300 font-semibold">Listen-Only Mode: </span>
                      Check this box for silent, passive monitoring. The controller will not acknowledge frames or transmit error frames, preventing unintended bus disruptions on production vehicle networks.
                    </li>
                    <li>Click <strong className="text-emerald-400">Connect Interface</strong>. The top status bar will illuminate green and frames will begin populating the sniffer.</li>
                  </ol>
                </div>

                <div className="p-3.5 bg-zinc-950 border border-zinc-800 rounded-lg space-y-1">
                  <div className="font-semibold text-rose-300">How to Stop the Hardware Stream:</div>
                  <p className="text-zinc-400">
                    Click the red <strong className="text-rose-400">Disconnect</strong> button in the Top Status Bar. The backend will flush any pending transmission queues, close the driver handle, and release the USB/SocketCAN device cleanly.
                  </p>
                </div>
              </div>
            </div>

            {/* Section 3: Session Recording */}
            <div className="p-5 bg-zinc-900/60 border border-zinc-800 rounded-xl space-y-3">
              <div className="flex items-center space-x-2 text-purple-400 font-bold text-sm">
                <HardDriveDownload className="w-4 h-4" />
                <span>3. Starting & Stopping Session Recording (Log Capture)</span>
              </div>
              <p className="text-xs text-zinc-300 leading-relaxed">
                When you need to export trace files for external analysis in Vector CANoe, PCAN-View, Wireshark, or Python scripts:
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                <div className="p-3.5 bg-zinc-950 border border-zinc-800 rounded-lg space-y-2">
                  <div className="font-semibold text-zinc-200">Starting a Log Capture:</div>
                  <ul className="list-disc list-inside text-zinc-400 space-y-1">
                    <li>Navigate to the <strong>Logging</strong> page or press the <kbd className="px-1.5 py-0.5 bg-zinc-800 rounded text-[11px] font-mono text-zinc-200 border border-zinc-700">R</kbd> key.</li>
                    <li>Select your target format: Vector BLF (<code className="text-zinc-300 font-mono">.blf</code>), Vector ASC (<code className="text-zinc-300 font-mono">.asc</code>), CSV (<code className="text-zinc-300 font-mono">.csv</code>), or PEAK TRC (<code className="text-zinc-300 font-mono">.trc</code>).</li>
                    <li>Click <strong className="text-purple-400">Start Recording</strong>. The timer tracks capture duration and frame totals.</li>
                  </ul>
                </div>

                <div className="p-3.5 bg-zinc-950 border border-zinc-800 rounded-lg space-y-2">
                  <div className="font-semibold text-zinc-200">Stopping & Saving:</div>
                  <ul className="list-disc list-inside text-zinc-400 space-y-1">
                    <li>Click <strong className="text-rose-400">Stop Recording</strong> or press <kbd className="px-1.5 py-0.5 bg-zinc-800 rounded text-[11px] font-mono text-zinc-200 border border-zinc-700">R</kbd>.</li>
                    <li>Click <strong className="text-emerald-400">Download Log</strong> to save the file locally.</li>
                    <li>Click <strong className="text-cyan-400">Save to History</strong> to store the capture in your browser's persistent IndexedDB storage for offline replay.</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Section 4: Sniffer Filtering & Search */}
            <div className="p-5 bg-zinc-900/60 border border-zinc-800 rounded-xl space-y-3">
              <div className="flex items-center space-x-2 text-amber-400 font-bold text-sm">
                <SlidersHorizontal className="w-4 h-4" />
                <span>4. Filtering & Search Controls</span>
              </div>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Use the Monitor toolbar filters to isolate signals without stopping traffic:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 text-xs">
                <div className="p-3 bg-zinc-950 border border-zinc-800 rounded-lg">
                  <div className="font-bold text-zinc-200 mb-1">Direction Filter</div>
                  <p className="text-zinc-500 text-[11px]">Filter between All, RX (received from bus), or TX (transmitted by CANScope).</p>
                </div>
                <div className="p-3 bg-zinc-950 border border-zinc-800 rounded-lg">
                  <div className="font-bold text-zinc-200 mb-1">Protocol Filter</div>
                  <p className="text-zinc-500 text-[11px]">Switch between Classic CAN (DLC ≤ 8) and CAN-FD (DLC up to 64 bytes).</p>
                </div>
                <div className="p-3 bg-zinc-950 border border-zinc-800 rounded-lg">
                  <div className="font-bold text-zinc-200 mb-1">CAN ID Range</div>
                  <p className="text-zinc-500 text-[11px]">Filter by numeric boundary (e.g. Min: <code className="text-cyan-300 font-mono">0x100</code>, Max: <code className="text-cyan-300 font-mono">0x200</code>).</p>
                </div>
                <div className="p-3 bg-zinc-950 border border-zinc-800 rounded-lg">
                  <div className="font-bold text-zinc-200 mb-1">Live Search</div>
                  <p className="text-zinc-500 text-[11px]">Instant text matching against CAN IDs, payload bytes (Hex), and DBC signal names.</p>
                </div>
              </div>
            </div>

            {/* Section 5: Bitrate & Multi-Channel Ports */}
            <div className="p-5 bg-zinc-900/60 border border-zinc-800 rounded-xl space-y-4">
              <div className="flex items-center space-x-2 text-cyan-400 font-bold text-sm">
                <Radio className="w-4 h-4" />
                <span>5. Configuring Bitrate (500 kbit/s vs. 1 Mbit/s) & Multi-Channel Ports</span>
              </div>
              <p className="text-xs text-zinc-300 leading-relaxed">
                CAN is a shared synchronous bus where every connected node must operate at the exact same nominal bitrate. Mismatched bitrates trigger transceiver form errors and cause the CAN controller to enter <em>Error Passive</em> or <em>Bus-Off</em> states.
              </p>

              {/* Bitrate Table */}
              <div className="space-y-2">
                <span className="font-semibold text-zinc-200 text-xs">Standard Bitrates & Use Cases:</span>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                  <div className="p-3 bg-zinc-950 border border-zinc-800/90 rounded-lg space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-cyan-300">500 kbit/s (Standard)</span>
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400">Automotive OBD-II</span>
                    </div>
                    <p className="text-zinc-400 text-[11px]">
                      Default standard for passenger vehicle high-speed CAN networks, OBD-II diagnostic ports, and powertrain telemetry. Maximum bus length ~100m.
                    </p>
                  </div>

                  <div className="p-3 bg-zinc-950 border border-zinc-800/90 rounded-lg space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-blue-300">1 Mbit/s (1 Million)</span>
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400">Robotics / Motorsport</span>
                    </div>
                    <p className="text-zinc-400 text-[11px]">
                      High-throughput applications, actuator buses, industrial robotics (CANopen), and motorsport ECUs. Maximum bus length ~25–40m with mandatory 120 Ω termination resistors.
                    </p>
                  </div>
                </div>
              </div>

              {/* Multi-Channel Guide */}
              <div className="p-3.5 bg-zinc-950 border border-zinc-800/90 rounded-xl space-y-2">
                <div className="font-semibold text-zinc-200 text-xs flex items-center justify-between">
                  <span>Connecting Multi-Channel CAN Adapters</span>
                  <span className="text-[10px] font-mono text-zinc-500">Dual/Quad Port Devices</span>
                </div>
                <p className="text-zinc-400 text-[11px] leading-relaxed">
                  If using a multi-channel hardware device (such as dual-channel PEAK PCAN-USB Pro, dual CANable, Kvaser, or multiple USB adapters):
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] font-mono">
                  <div className="p-2.5 bg-zinc-900 rounded border border-zinc-800 space-y-1">
                    <div className="text-cyan-400 font-bold">Linux (SocketCAN)</div>
                    <div className="text-zinc-300">Port 1: <code className="text-emerald-300">can0</code></div>
                    <div className="text-zinc-300">Port 2: <code className="text-emerald-300">can1</code></div>
                    <div className="text-zinc-300">Port 3: <code className="text-emerald-300">can2</code></div>
                  </div>
                  <div className="p-2.5 bg-zinc-900 rounded border border-zinc-800 space-y-1">
                    <div className="text-cyan-400 font-bold">macOS / Windows (PEAK PCAN)</div>
                    <div className="text-zinc-300">Port 1: <code className="text-emerald-300">PCAN_USBBUS1</code></div>
                    <div className="text-zinc-300">Port 2: <code className="text-emerald-300">PCAN_USBBUS2</code></div>
                    <div className="text-zinc-300">Port 3: <code className="text-emerald-300">PCAN_USBBUS3</code></div>
                  </div>
                </div>
                <p className="text-zinc-400 text-[11px] pt-1">
                  In CANScope, click <strong className="text-zinc-200">Connect</strong> in the top status bar, then pick the port from the <strong>Channel / Node</strong> dropdown (or type your channel name directly if not listed).
                </p>
              </div>
            </div>
          </div>
        )}

        {activeDocId === 'transmit-guide' && (
          <div className="space-y-6">
            {/* Header Banner */}
            <div className="p-5 bg-zinc-900/80 border border-zinc-800 rounded-2xl space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center space-x-2 text-cyan-400 font-bold text-sm">
                  <Send className="w-5 h-5" />
                  <span>Transmit Engine & Periodic Message Simulation Guide</span>
                </div>
                {onNavigateToTransmit && (
                  <button
                    onClick={onNavigateToTransmit}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-1.5 bg-cyan-600 hover:bg-cyan-500 text-white transition cursor-pointer shadow-sm"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Open Transmit Console</span>
                  </button>
                )}
              </div>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Inject custom single-shot diagnostic requests, cyclic vehicle telemetry, and high-speed CAN-FD frames directly into the physical or virtual bus.
              </p>
            </div>

            {/* Quick Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-4 bg-zinc-900/50 border border-zinc-800/80 rounded-xl space-y-1">
                <div className="text-cyan-400 font-mono text-[10px] uppercase font-bold">Mode 1</div>
                <div className="font-semibold text-xs text-zinc-200">Single-Shot Injection</div>
                <div className="text-[11px] text-zinc-400">
                  Send one frame on demand for diagnostic querying, PID polling, or calibration handshakes.
                </div>
              </div>
              <div className="p-4 bg-zinc-900/50 border border-zinc-800/80 rounded-xl space-y-1">
                <div className="text-emerald-400 font-mono text-[10px] uppercase font-bold">Mode 2</div>
                <div className="font-semibold text-xs text-zinc-200">Cyclic Periodic Tasks</div>
                <div className="text-[11px] text-zinc-400">
                  Broadcast continuous frames at precise intervals (10ms, 50ms, 100ms, 2000ms) to emulate vehicle ECUs.
                </div>
              </div>
              <div className="p-4 bg-zinc-900/50 border border-zinc-800/80 rounded-xl space-y-1">
                <div className="text-amber-400 font-mono text-[10px] uppercase font-bold">Mode 3</div>
                <div className="font-semibold text-xs text-zinc-200">CAN-FD & BRS</div>
                <div className="text-[11px] text-zinc-400">
                  Flexible Data-Rate payloads up to 64 bytes with high-speed Bit Rate Switching (up to 5 Mbps).
                </div>
              </div>
            </div>

            {/* Section 1: Single Shot Parameters */}
            <div className="p-5 bg-zinc-900/60 border border-zinc-800 rounded-xl space-y-3">
              <div className="flex items-center space-x-2 text-cyan-400 font-bold text-sm">
                <Zap className="w-4 h-4" />
                <span>1. Single-Shot Message Formulation</span>
              </div>
              <p className="text-xs text-zinc-300 leading-relaxed">
                Configure every bit and byte of your transmitted frame:
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                <div className="p-3.5 bg-zinc-950 border border-zinc-800 rounded-lg space-y-1.5">
                  <div className="font-semibold text-zinc-200">CAN ID & Identifier Type:</div>
                  <ul className="list-disc list-inside text-zinc-400 space-y-1">
                    <li><strong className="text-zinc-200">Standard 11-bit</strong>: Range <code className="text-cyan-300 font-mono">0x000</code> to <code className="text-cyan-300 font-mono">0x7FF</code> (e.g. OBD-II functional request <code className="text-cyan-300 font-mono">0x7DF</code>).</li>
                    <li><strong className="text-zinc-200">Extended 29-bit</strong>: Range <code className="text-cyan-300 font-mono">0x00000000</code> to <code className="text-cyan-300 font-mono">0x1FFFFFFF</code> for J1939 heavy duty or UDS physical addressing.</li>
                  </ul>
                </div>

                <div className="p-3.5 bg-zinc-950 border border-zinc-800 rounded-lg space-y-1.5">
                  <div className="font-semibold text-zinc-200">Hexadecimal Payload Input:</div>
                  <p className="text-zinc-400">
                    Input space-separated hexadecimal bytes. For example, standard OBD-II Service 01, PID 0C (Engine RPM):
                  </p>
                  <code className="block p-2 bg-zinc-900 rounded font-mono text-cyan-300 text-xs">
                    02 01 0C 00 00 00 00 00
                  </code>
                </div>
              </div>
            </div>

            {/* Section 2: Periodic Scheduler */}
            <div className="p-5 bg-zinc-900/60 border border-zinc-800 rounded-xl space-y-3">
              <div className="flex items-center space-x-2 text-emerald-400 font-bold text-sm">
                <Clock className="w-4 h-4" />
                <span>2. Multi-Task Periodic Transmission Scheduler</span>
              </div>
              <p className="text-xs text-zinc-300 leading-relaxed">
                Automotive networks operate on deterministic cyclic timing. In the Transmit page, create multiple independent transmission tasks:
              </p>
              <div className="p-3.5 bg-zinc-950 border border-zinc-800 rounded-lg space-y-2 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-zinc-400">
                  <div>
                    <span className="text-zinc-200 font-semibold">10 ms – 20 ms</span>: Fast powertrain / motor torque loops.
                  </div>
                  <div>
                    <span className="text-zinc-200 font-semibold">50 ms – 100 ms</span>: Chassis sensors, wheel speeds, battery state.
                  </div>
                  <div>
                    <span className="text-zinc-200 font-semibold">500 ms – 1000 ms</span>: Environmental sensors, HVAC, ambient lights.
                  </div>
                  <div>
                    <span className="text-zinc-200 font-semibold">2000 ms</span>: Diagnostic Tester Present keep-alive (<code className="font-mono text-zinc-300">02 3E 80 ...</code>).
                  </div>
                </div>
              </div>
            </div>

            {/* Section 3: Safety Listen-Only Alert */}
            <div className="p-4 bg-amber-950/40 border border-amber-800/80 rounded-xl space-y-2">
              <div className="flex items-center space-x-2 text-amber-300 font-bold text-xs">
                <ShieldCheck className="w-4 h-4" />
                <span>Safety Interlock: Listen-Only Mode</span>
              </div>
              <p className="text-xs text-amber-200/80 leading-relaxed">
                If your interface is connected with <strong>Listen-Only Mode</strong> enabled, transmission is intentionally blocked to protect production vehicle networks from unintended message collisions or ACK interference. To transmit, disconnect, uncheck Listen-Only, and reconnect.
              </p>
            </div>
          </div>
        )}

        {activeDocId === 'graphs-guide' && (
          <div className="space-y-6">
            {/* Header Banner */}
            <div className="p-5 bg-zinc-900/80 border border-zinc-800 rounded-2xl space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center space-x-2 text-purple-400 font-bold text-sm">
                  <LineChart className="w-5 h-5" />
                  <span>Real-Time Signal Oscilloscope & Plotter Guide</span>
                </div>
                {onNavigateToGraphs && (
                  <button
                    onClick={onNavigateToGraphs}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-1.5 bg-purple-600 hover:bg-purple-500 text-white transition cursor-pointer shadow-sm"
                  >
                    <LineChart className="w-3.5 h-3.5" />
                    <span>Open Oscilloscope</span>
                  </button>
                )}
              </div>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Plot decoded physical telemetry values (such as RPM, coolant temperature, steering angle, or cell voltage) continuously across dynamic rolling time windows.
              </p>
            </div>

            {/* Dual Plotting Modes */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="p-4 bg-zinc-900/60 border border-zinc-800 rounded-xl space-y-2">
                <div className="flex items-center space-x-2 text-emerald-400 font-bold">
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  <span>Mode A: DBC Physical Signal Plotting</span>
                </div>
                <p className="text-zinc-400 leading-relaxed">
                  When a DBC or Custom JSON Schema is active:
                </p>
                <ol className="list-decimal list-inside text-zinc-400 space-y-1">
                  <li>Select the target CAN ID from the dropdown list.</li>
                  <li>Choose the decoded signal name (e.g. <code className="text-zinc-300 font-mono">Engine_RPM</code>).</li>
                  <li>CANScope scales the signal using your formula <code className="text-emerald-300 font-mono">(Raw × Scale) + Offset</code>.</li>
                  <li>The Y-axis automatically formats with engineering units (<code className="text-zinc-300 font-mono">rpm, km/h, °C, V</code>).</li>
                </ol>
              </div>

              <div className="p-4 bg-zinc-900/60 border border-zinc-800 rounded-xl space-y-2">
                <div className="flex items-center space-x-2 text-cyan-400 font-bold">
                  <span className="w-2 h-2 rounded-full bg-cyan-400" />
                  <span>Mode B: Raw Byte Inspection</span>
                </div>
                <p className="text-zinc-400 leading-relaxed">
                  When reverse-engineering unknown or proprietary ECU protocols:
                </p>
                <ol className="list-decimal list-inside text-zinc-400 space-y-1">
                  <li>Select the target CAN ID.</li>
                  <li>Switch plot source to <strong>Raw Byte</strong>.</li>
                  <li>Pick Byte 0 through Byte 7 (or up to Byte 63 for CAN-FD).</li>
                  <li>Observe live byte transitions to isolate sensor counters, checksums, and states.</li>
                </ol>
              </div>
            </div>

            {/* Oscilloscope Controls */}
            <div className="p-5 bg-zinc-900/60 border border-zinc-800 rounded-xl space-y-3">
              <div className="flex items-center space-x-2 text-purple-400 font-bold text-sm">
                <SlidersHorizontal className="w-4 h-4" />
                <span>Scope Controls & Features</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div className="p-3 bg-zinc-950 border border-zinc-800 rounded-lg space-y-1">
                  <div className="font-bold text-zinc-200">Rolling Time Horizon</div>
                  <p className="text-zinc-400 text-[11px]">
                    Switch between 5s, 15s, 30s, or 60s windows to zoom in on microsecond transients or monitor slow thermal drift.
                  </p>
                </div>
                <div className="p-3 bg-zinc-950 border border-zinc-800 rounded-lg space-y-1">
                  <div className="font-bold text-zinc-200">Waveform Pause</div>
                  <p className="text-zinc-400 text-[11px]">
                    Freeze the oscilloscope screen at any moment to analyze transient spikes or voltage drops.
                  </p>
                </div>
                <div className="p-3 bg-zinc-950 border border-zinc-800 rounded-lg space-y-1">
                  <div className="font-bold text-zinc-200">1-Click Jump from Catalog</div>
                  <p className="text-zinc-400 text-[11px]">
                    Click the line chart icon next to any message in the <strong>Messages</strong> catalog to jump directly to its live graph.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeDocId === 'visual-schema-guide' && (
          <div className="space-y-6">
            {/* Header Banner */}
            <div className="p-5 bg-zinc-900/80 border border-zinc-800 rounded-2xl space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center space-x-2 text-amber-400 font-bold text-sm">
                  <Sliders className="w-5 h-5" />
                  <span>Visual Custom Schema Editor & 64-Bit Matrix Guide</span>
                </div>
                {onNavigateToDbc && (
                  <button
                    onClick={onNavigateToDbc}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-1.5 bg-amber-600 hover:bg-amber-500 text-white transition cursor-pointer shadow-sm"
                  >
                    <Sliders className="w-3.5 h-3.5" />
                    <span>Launch Visual Designer</span>
                  </button>
                )}
              </div>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Design custom CAN messages, map signals across 64-bit payload matrices, verify bit collisions, and export to JSON or Vector DBC.
              </p>
            </div>

            {/* Matrix & Bit Layout Guide */}
            <div className="p-5 bg-zinc-900/60 border border-zinc-800 rounded-xl space-y-3">
              <div className="flex items-center space-x-2 text-amber-400 font-bold text-sm">
                <Layers className="w-4 h-4" />
                <span>Interactive 64-Bit Payload Allocation Grid</span>
              </div>
              <p className="text-xs text-zinc-300 leading-relaxed">
                The visual bit matrix represents a standard 8-byte (64-bit) CAN payload arranged in automotive standard order (Byte 0 to Byte 7, Bit 7 down to Bit 0):
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                <div className="p-3.5 bg-zinc-950 border border-zinc-800 rounded-lg space-y-2">
                  <div className="font-semibold text-zinc-200">Matrix Visual Features:</div>
                  <ul className="list-disc list-inside text-zinc-400 space-y-1">
                    <li><strong className="text-zinc-200">Color Tagging</strong>: Each signal receives a distinct hue spanning its allocated bits.</li>
                    <li><strong className="text-zinc-200">Start Bit Indicators</strong>: Marked with an anchor badge at the LSB (Intel) or MSB (Motorola).</li>
                    <li><strong className="text-rose-400 font-bold">Collision Warning</strong>: If two signals accidentally share bit positions, conflicting cells turn bright red with an alert icon.</li>
                    <li><strong className="text-zinc-200">Click to Select</strong>: Clicking any bit cell selects and focuses that signal in the inspector.</li>
                  </ul>
                </div>

                <div className="p-3.5 bg-zinc-950 border border-zinc-800 rounded-lg space-y-2">
                  <div className="font-semibold text-zinc-200">Byte Ordering: Intel vs Motorola</div>
                  <ul className="list-disc list-inside text-zinc-400 space-y-1">
                    <li><strong className="text-cyan-300">Little-Endian (Intel)</strong>: Least significant byte stored first. Start bit corresponds to the signal's LSB.</li>
                    <li><strong className="text-amber-300">Big-Endian (Motorola)</strong>: Most significant byte stored first. Start bit corresponds to the signal's MSB.</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Live Math Sandbox */}
            <div className="p-5 bg-zinc-900/60 border border-zinc-800 rounded-xl space-y-3">
              <div className="flex items-center space-x-2 text-emerald-400 font-bold text-sm">
                <Sparkles className="w-4 h-4" />
                <span>Live Math Formula Preview & Test Sandbox</span>
              </div>
              <p className="text-xs text-zinc-300 leading-relaxed">
                Never guess scaling factors again. Every signal features an interactive live sandbox implementing:
              </p>
              <div className="p-3.5 bg-zinc-950 border border-zinc-800 rounded-lg text-center font-mono text-cyan-300 text-sm">
                Physical Value = (Raw Integer × Scale) + Offset
              </div>
              <p className="text-xs text-zinc-400">
                Type test integer values into the sandbox field to preview the computed floating-point value and verify unit boundaries before applying to the bus.
              </p>
            </div>
          </div>
        )}

        {activeDocId === 'history-guide' && (
          <div className="space-y-6">
            {/* Header Banner */}
            <div className="p-5 bg-zinc-900/80 border border-zinc-800 rounded-2xl space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center space-x-2 text-blue-400 font-bold text-sm">
                  <Archive className="w-5 h-5" />
                  <span>Offline History Cache & Trace Replay Guide</span>
                </div>
                {onNavigateToHistory && (
                  <button
                    onClick={onNavigateToHistory}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-1.5 bg-blue-600 hover:bg-blue-500 text-white transition cursor-pointer shadow-sm"
                  >
                    <Archive className="w-3.5 h-3.5" />
                    <span>Open History Cache</span>
                  </button>
                )}
              </div>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Learn how CANScope securely persists recorded CAN sessions in your browser using IndexedDB for zero-cloud privacy and offline post-mortem replay.
              </p>
            </div>

            {/* 100% Privacy Card */}
            <div className="p-4 bg-zinc-900/60 border border-zinc-800 rounded-xl space-y-2">
              <div className="flex items-center space-x-2 text-emerald-400 font-bold text-xs">
                <ShieldCheck className="w-4 h-4" />
                <span>100% Client-Side Private Storage (Zero Cloud Leakage)</span>
              </div>
              <p className="text-xs text-zinc-300 leading-relaxed">
                Automotive vehicle bus logs contain sensitive telemetry and proprietary ECU IDs. All trace sessions stored via CANScope's <strong>History Cache</strong> reside strictly inside your browser's private IndexedDB sandbox on your local machine. No frames are ever uploaded to external servers.
              </p>
            </div>

            {/* Workflow Steps */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="p-4 bg-zinc-900/50 border border-zinc-800 rounded-xl space-y-1">
                <div className="text-blue-400 font-mono text-[10px] uppercase font-bold">Step 1</div>
                <div className="font-semibold text-zinc-200">Capture & Tag</div>
                <div className="text-[11px] text-zinc-400">
                  Save traces with session names, tags (e.g. <code className="text-zinc-300 font-mono">#dyno</code>, <code className="text-zinc-300 font-mono">#cold-start</code>), and notes.
                </div>
              </div>
              <div className="p-4 bg-zinc-900/50 border border-zinc-800 rounded-xl space-y-1">
                <div className="text-cyan-400 font-mono text-[10px] uppercase font-bold">Step 2</div>
                <div className="font-semibold text-zinc-200">Manage & Search</div>
                <div className="text-[11px] text-zinc-400">
                  Filter by date, frame count, or tags. Inspect frame statistics and payload distributions.
                </div>
              </div>
              <div className="p-4 bg-zinc-900/50 border border-zinc-800 rounded-xl space-y-1">
                <div className="text-emerald-400 font-mono text-[10px] uppercase font-bold">Step 3</div>
                <div className="font-semibold text-zinc-200">Replay & Export</div>
                <div className="text-[11px] text-zinc-400">
                  Load any historical trace into the live Sniffer and Oscilloscope for offline debugging, or export to BLF, ASC, or CSV.
                </div>
              </div>
            </div>
          </div>
        )}

        {activeDocId === 'errors-guide' && (
          <div className="space-y-6">
            {/* Header Banner */}
            <div className="p-5 bg-zinc-900/80 border border-zinc-800 rounded-2xl space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center space-x-2 text-rose-400 font-bold text-sm">
                  <AlertOctagon className="w-5 h-5" />
                  <span>CAN Bus Diagnostics, Error Frames & Bus State Guide</span>
                </div>
                {onNavigateToErrors && (
                  <button
                    onClick={onNavigateToErrors}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-1.5 bg-rose-600 hover:bg-rose-500 text-white transition cursor-pointer shadow-sm"
                  >
                    <AlertOctagon className="w-3.5 h-3.5" />
                    <span>Open Error Diagnostics</span>
                  </button>
                )}
              </div>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Understand ISO 11898-1 fault confinement, Transmit/Receive Error Counters (TEC/REC), and physical layer troubleshooting.
              </p>
            </div>

            {/* Error States Matrix */}
            <div className="p-5 bg-zinc-900/60 border border-zinc-800 rounded-xl space-y-3">
              <div className="text-xs font-bold text-zinc-200">ISO 11898-1 Fault Confinement States</div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                <div className="p-3.5 bg-zinc-950 border border-zinc-800 rounded-lg space-y-1.5">
                  <div className="flex items-center space-x-2 text-emerald-400 font-bold">
                    <span className="w-2 h-2 rounded-full bg-emerald-400" />
                    <span>Error Active</span>
                  </div>
                  <div className="text-[11px] text-zinc-400">
                    <strong className="text-zinc-200">TEC &lt; 128, REC &lt; 128</strong>. Normal state. The node participates fully in bus communication and sends active error flags upon error detection.
                  </div>
                </div>

                <div className="p-3.5 bg-zinc-950 border border-zinc-800 rounded-lg space-y-1.5">
                  <div className="flex items-center space-x-2 text-amber-400 font-bold">
                    <span className="w-2 h-2 rounded-full bg-amber-400" />
                    <span>Error Passive</span>
                  </div>
                  <div className="text-[11px] text-zinc-400">
                    <strong className="text-zinc-200">TEC or REC ≥ 128</strong>. Node can only send passive error flags (6 recessive bits) and must wait extra suspend transmission time between frames.
                  </div>
                </div>

                <div className="p-3.5 bg-zinc-950 border border-zinc-800 rounded-lg space-y-1.5">
                  <div className="flex items-center space-x-2 text-rose-500 font-bold">
                    <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                    <span>Bus Off</span>
                  </div>
                  <div className="text-[11px] text-zinc-400">
                    <strong className="text-zinc-200">TEC &gt; 255</strong>. Severe error threshold. The controller completely isolates itself from the physical bus until hardware reset to protect other nodes.
                  </div>
                </div>
              </div>
            </div>

            {/* Common Error Types */}
            <div className="p-5 bg-zinc-900/60 border border-zinc-800 rounded-xl space-y-3">
              <div className="text-xs font-bold text-zinc-200">Common CAN Error Frame Types & Causes</div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="p-3 bg-zinc-950 border border-zinc-800 rounded-lg space-y-1">
                  <div className="font-bold text-zinc-200">Bit Stuffing Error</div>
                  <p className="text-zinc-400 text-[11px]">
                    More than 5 consecutive identical bits detected. Commonly caused by noise spikes, baud rate mismatch, or incorrect sample point.
                  </p>
                </div>
                <div className="p-3 bg-zinc-950 border border-zinc-800 rounded-lg space-y-1">
                  <div className="font-bold text-zinc-200">CRC Checksum Error</div>
                  <p className="text-zinc-400 text-[11px]">
                    Receiver computed CRC does not match transmitted CRC. Caused by electromagnetic interference (EMI) or missing ground reference.
                  </p>
                </div>
                <div className="p-3 bg-zinc-950 border border-zinc-800 rounded-lg space-y-1">
                  <div className="font-bold text-zinc-200">ACK Delimiter / Missing ACK</div>
                  <p className="text-zinc-400 text-[11px]">
                    No other node acknowledged the frame. Occurs when transmitting on an empty bus or when all other nodes are in Listen-Only mode.
                  </p>
                </div>
                <div className="p-3 bg-zinc-950 border border-zinc-800 rounded-lg space-y-1">
                  <div className="font-bold text-zinc-200">Physical Termination (120 Ω)</div>
                  <p className="text-zinc-400 text-[11px]">
                    High-speed CAN requires two 120 Ω resistors at the physical ends of the line (measuring ~60 Ω total). Missing resistors cause signal reflection form errors.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeDocId === 'json-dbc' && (
          <div className="space-y-6">
            {/* Header Banner */}
            <div className="p-5 bg-zinc-900/80 border border-zinc-800 rounded-2xl space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2 text-emerald-400 font-bold text-sm">
                  <FileCode className="w-5 h-5" />
                  <span>Custom CAN ID JSON DBC Specification</span>
                </div>
                <div className="flex items-center space-x-2">
                  {onNavigateToDbc && (
                    <button
                      onClick={onNavigateToDbc}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-1.5 bg-cyan-600 hover:bg-cyan-500 text-white transition cursor-pointer shadow-sm"
                    >
                      <Sliders className="w-3.5 h-3.5" />
                      <span>Launch Visual Editor</span>
                    </button>
                  )}
                  <button
                    onClick={handleDownloadTemplate}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-1.5 bg-emerald-950/60 hover:bg-emerald-900 text-emerald-300 border border-emerald-800 transition cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download .json</span>
                  </button>
                </div>
              </div>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Learn how to write a simple, human-readable <code className="text-zinc-200 font-mono">.json</code> file to define your custom CAN IDs and signals. Once uploaded into CANScope, incoming raw frames are automatically decoded into engineering physical units across the sniffer, messages table, and oscilloscope graphs.
              </p>
            </div>

            {/* Quick 3-Step Overview */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-4 bg-zinc-900/50 border border-zinc-800/80 rounded-xl space-y-1">
                <div className="text-emerald-400 font-mono text-[10px] uppercase font-bold">Step 1</div>
                <div className="font-semibold text-xs text-zinc-200">Define Your Format</div>
                <div className="text-[11px] text-zinc-400">
                  Write messages and signals with start bit, length, scale, offset, and unit.
                </div>
              </div>
              <div className="p-4 bg-zinc-900/50 border border-zinc-800/80 rounded-xl space-y-1">
                <div className="text-cyan-400 font-mono text-[10px] uppercase font-bold">Step 2</div>
                <div className="font-semibold text-xs text-zinc-200">Upload to CANScope</div>
                <div className="text-[11px] text-zinc-400">
                  Drag & drop your <code className="text-zinc-300">.json</code> file into the DBC Decoder tab or paste it in the editor.
                </div>
              </div>
              <div className="p-4 bg-zinc-900/50 border border-zinc-800/80 rounded-xl space-y-1">
                <div className="text-purple-400 font-mono text-[10px] uppercase font-bold">Step 3</div>
                <div className="font-semibold text-xs text-zinc-200">Auto-Decode & Plot</div>
                <div className="text-[11px] text-zinc-400">
                  View instant physical signal values in real time and plot them in multi-channel graphs!
                </div>
              </div>
            </div>

            {/* Complete JSON Example */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-sm text-zinc-100 flex items-center space-x-2">
                  <span className="w-5 h-5 rounded-full bg-emerald-950 border border-emerald-700 text-emerald-300 flex items-center justify-center text-[10px] font-mono">1</span>
                  <span>Complete JSON Schema Format</span>
                </h3>
                <button
                  onClick={() => handleCopy(SAMPLE_JSON_DBC, 'schema')}
                  className="px-2.5 py-1 rounded text-xs font-semibold bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 flex items-center space-x-1 cursor-pointer"
                >
                  {copiedKey === 'schema' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3 text-zinc-400" />}
                  <span>{copiedKey === 'schema' ? 'Copied!' : 'Copy Schema'}</span>
                </button>
              </div>

              <div className="p-4 bg-zinc-950 border border-zinc-800 rounded-xl font-mono text-[11px] overflow-x-auto text-zinc-300 leading-relaxed">
                <pre>{SAMPLE_JSON_DBC}</pre>
              </div>
            </div>

            {/* Field Specification Table */}
            <div className="space-y-3">
              <h3 className="font-bold text-sm text-zinc-100 flex items-center space-x-2">
                <span className="w-5 h-5 rounded-full bg-cyan-950 border border-cyan-700 text-cyan-300 flex items-center justify-center text-[10px] font-mono">2</span>
                <span>Signal Field Parameters Reference</span>
              </h3>

              <div className="border border-zinc-800 rounded-xl overflow-hidden text-xs">
                <table className="w-full text-left">
                  <thead className="bg-zinc-900 text-zinc-400 font-mono text-[10px] uppercase border-b border-zinc-800">
                    <tr>
                      <th className="p-2.5">Field</th>
                      <th className="p-2.5">Type</th>
                      <th className="p-2.5">Description</th>
                      <th className="p-2.5">Example</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/60 font-sans text-zinc-300">
                    <tr className="hover:bg-zinc-900/30">
                      <td className="p-2.5 font-mono text-cyan-300">name</td>
                      <td className="p-2.5 text-zinc-500 font-mono text-[11px]">string</td>
                      <td className="p-2.5">Identifier name of the signal</td>
                      <td className="p-2.5 font-mono text-zinc-400">&quot;VehicleSpeed&quot;</td>
                    </tr>
                    <tr className="hover:bg-zinc-900/30">
                      <td className="p-2.5 font-mono text-cyan-300">startBit</td>
                      <td className="p-2.5 text-zinc-500 font-mono text-[11px]">number</td>
                      <td className="p-2.5">Bit position where signal starts (0 to 63 for 8 bytes)</td>
                      <td className="p-2.5 font-mono text-zinc-400">0 (Byte 0, Bit 0)</td>
                    </tr>
                    <tr className="hover:bg-zinc-900/30">
                      <td className="p-2.5 font-mono text-cyan-300">length</td>
                      <td className="p-2.5 text-zinc-500 font-mono text-[11px]">number</td>
                      <td className="p-2.5">Number of bits (1 for flag, 8 for byte, 16 for word)</td>
                      <td className="p-2.5 font-mono text-zinc-400">16</td>
                    </tr>
                    <tr className="hover:bg-zinc-900/30">
                      <td className="p-2.5 font-mono text-cyan-300">byteOrder</td>
                      <td className="p-2.5 text-zinc-500 font-mono text-[11px]">string</td>
                      <td className="p-2.5">&quot;little_endian&quot; (Intel / LSB first) or &quot;big_endian&quot; (Motorola)</td>
                      <td className="p-2.5 font-mono text-zinc-400">&quot;little_endian&quot;</td>
                    </tr>
                    <tr className="hover:bg-zinc-900/30">
                      <td className="p-2.5 font-mono text-cyan-300">isSigned</td>
                      <td className="p-2.5 text-zinc-500 font-mono text-[11px]">boolean</td>
                      <td className="p-2.5">true for two&apos;s complement signed integers (allowing negative numbers)</td>
                      <td className="p-2.5 font-mono text-zinc-400">true</td>
                    </tr>
                    <tr className="hover:bg-zinc-900/30">
                      <td className="p-2.5 font-mono text-cyan-300">scale</td>
                      <td className="p-2.5 text-zinc-500 font-mono text-[11px]">number</td>
                      <td className="p-2.5">Multiplier applied to raw integer bits</td>
                      <td className="p-2.5 font-mono text-zinc-400">0.01</td>
                    </tr>
                    <tr className="hover:bg-zinc-900/30">
                      <td className="p-2.5 font-mono text-cyan-300">offset</td>
                      <td className="p-2.5 text-zinc-500 font-mono text-[11px]">number</td>
                      <td className="p-2.5">Value added after scaling (e.g. -40 for temperatures)</td>
                      <td className="p-2.5 font-mono text-zinc-400">-40</td>
                    </tr>
                    <tr className="hover:bg-zinc-900/30">
                      <td className="p-2.5 font-mono text-cyan-300">unit</td>
                      <td className="p-2.5 text-zinc-500 font-mono text-[11px]">string</td>
                      <td className="p-2.5">Engineering display unit shown in UI</td>
                      <td className="p-2.5 font-mono text-zinc-400">&quot;km/h&quot;, &quot;V&quot;, &quot;°C&quot;</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Physical Formula Calculation */}
            <div className="space-y-2">
              <h3 className="font-bold text-sm text-zinc-100 flex items-center space-x-2">
                <span className="w-5 h-5 rounded-full bg-purple-950 border border-purple-700 text-purple-300 flex items-center justify-center text-[10px] font-mono">3</span>
                <span>Physical Value Calculation Formula</span>
              </h3>
              <div className="p-4 bg-zinc-900 border border-zinc-800 rounded-xl space-y-2 text-xs">
                <div className="p-2.5 bg-zinc-950 rounded border border-zinc-800/80 font-mono text-emerald-400 text-center text-xs font-bold">
                  Physical Value = (Raw Integer Bits × Scale) + Offset
                </div>
                <div className="text-zinc-400 space-y-1">
                  <p>
                    <strong className="text-zinc-200">Example 1 (Vehicle Speed)</strong>: 16-bit unsigned, scale = 0.01, offset = 0. If raw payload word is <code className="font-mono text-cyan-300">0x2710</code> (10,000 decimal), physical speed = <code className="font-mono text-emerald-400">10000 × 0.01 = 100.00 km/h</code>.
                  </p>
                  <p>
                    <strong className="text-zinc-200">Example 2 (Coolant Temperature)</strong>: 8-bit unsigned, scale = 1, offset = -40. If raw byte is <code className="font-mono text-cyan-300">0x55</code> (85 decimal), physical temp = <code className="font-mono text-emerald-400">85 - 40 = 45 °C</code>.
                  </p>
                </div>
              </div>
            </div>

            {/* Upload Instructions */}
            <div className="space-y-2">
              <h3 className="font-bold text-sm text-zinc-100 flex items-center space-x-2">
                <span className="w-5 h-5 rounded-full bg-emerald-950 border border-emerald-700 text-emerald-300 flex items-center justify-center text-[10px] font-mono">4</span>
                <span>How to Upload & Decode in CANScope</span>
              </h3>
              <ol className="list-decimal list-inside space-y-2 text-xs text-zinc-300 pl-2 leading-relaxed">
                <li>
                  Save your JSON file as <code className="bg-zinc-900 px-1.5 py-0.5 rounded font-mono text-zinc-200">custom.json</code>.
                </li>
                <li>
                  Go to the <strong>DBC Decoder</strong> tab from the sidebar.
                </li>
                <li>
                  Click <strong>Upload Custom DBC / JSON</strong> (or drag & drop your file into the dashed box).
                </li>
                <li>
                  Verify your signals in the <strong>Interactive Signal Decoder Sandbox</strong>: type your CAN ID and sample hex bytes to confirm the decoded output.
                </li>
                <li>
                  Switch to <strong>Monitor</strong> or <strong>Graphs</strong>: your custom signals will automatically appear decoded in real-time as frames arrive!
                </li>
              </ol>
            </div>
          </div>
        )}

        {activeDocId === 'macos-pcan' && (
          <div className="space-y-6">
            <div className="p-5 bg-zinc-900/80 border border-zinc-800 rounded-2xl space-y-2">
              <div className="flex items-center space-x-2 text-cyan-400 font-bold text-sm">
                <Apple className="w-5 h-5" />
                <span>macOS & PEAK PCAN-USB Setup Guide</span>
              </div>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Complete instructions for configuring your local Mac (M1/M2/M3/M4 or Intel) with <code className="text-zinc-200 font-mono">python-can[pcan]</code> and interfacing with PEAK-System CAN adapters.
              </p>
            </div>

            {/* Steps */}
            <div className="space-y-4 text-xs">
              <div className="space-y-2">
                <h4 className="font-bold text-zinc-100 text-sm">1. Virtual Environment & Package Installation</h4>
                <div className="p-3 bg-zinc-950 border border-zinc-800 rounded-lg font-mono text-[11px] text-zinc-300 space-y-1">
                  <div className="text-zinc-500"># 1. Create dedicated virtual environment</div>
                  <div className="text-cyan-400">python3 -m venv ~/canscope-venv</div>
                  <div className="text-zinc-500 mt-1"># 2. Activate environment</div>
                  <div className="text-cyan-400">source ~/canscope-venv/bin/activate</div>
                  <div className="text-zinc-500 mt-1"># 3. Install python-can with PCAN support</div>
                  <div className="text-emerald-400 font-semibold">python3 -m pip install -U &quot;python-can[pcan]&quot;</div>
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="font-bold text-zinc-100 text-sm">2. Verification Commands</h4>
                <div className="space-y-2 font-mono text-[11px]">
                  <div className="p-2.5 bg-zinc-950 rounded border border-zinc-800 text-zinc-300">
                    <span className="text-zinc-500">Check version: </span>
                    <span className="text-cyan-400">python3 -c &quot;import can; print(can.__version__)&quot;</span>
                    <div className="text-emerald-400 mt-1"># Verified: 4.6.1</div>
                  </div>
                  <div className="p-2.5 bg-zinc-950 rounded border border-zinc-800 text-zinc-300">
                    <span className="text-zinc-500">Check backend: </span>
                    <span className="text-cyan-400">python3 -c &quot;import can; print(&apos;PCAN backend registered:&apos;, &apos;pcan&apos; in can.interfaces.BACKENDS)&quot;</span>
                    <div className="text-emerald-400 mt-1"># Verified: PCAN backend registered: True</div>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="font-bold text-zinc-100 text-sm">3. PEAK Driver Framework</h4>
                <p className="text-zinc-400">
                  Ensure <code className="text-zinc-200 font-mono">/Library/Frameworks/PCBUSB.framework</code> is present on your system. If macOS Gatekeeper alerts you, open <strong>System Settings &gt; Privacy &amp; Security</strong> and click <strong>Allow</strong>.
                </p>
              </div>

              <div className="space-y-2">
                <h4 className="font-bold text-zinc-100 text-sm">4. Hardware Detection & Connect</h4>
                <div className="p-2.5 bg-zinc-950 rounded border border-zinc-800 font-mono text-[11px] text-zinc-300">
                  system_profiler SPUSBDataType | grep -E -i &quot;peak|pcan&quot;
                </div>
                <p className="text-zinc-400 mt-1">
                  In CANScope, open the <strong>Connect</strong> dialog, select <strong>PCAN</strong>, set channel <code className="text-cyan-300 font-mono">PCAN_USBBUS1</code>, configure your bitrate, and click <strong>Connect</strong>!
                </p>
              </div>
            </div>
          </div>
        )}

        {activeDocId === 'linux-socketcan' && (
          <div className="space-y-6">
            <div className="p-5 bg-zinc-900/80 border border-zinc-800 rounded-2xl space-y-2">
              <div className="flex items-center space-x-2 text-amber-400 font-bold text-sm">
                <Terminal className="w-5 h-5" />
                <span>Linux SocketCAN & Virtual CAN (vcan) Setup</span>
              </div>
              <p className="text-xs text-zinc-400 leading-relaxed">
                SocketCAN is the standard Linux kernel network stack for CAN controllers. Learn how to instantiate virtual CAN interfaces (<code className="text-zinc-200 font-mono">vcan0</code>) for simulated offline development or configure physical adapters.
              </p>
            </div>

            <div className="space-y-4 text-xs">
              <div className="space-y-2">
                <h4 className="font-bold text-zinc-100 text-sm">1. Setting Up Virtual CAN (vcan0)</h4>
                <div className="p-3 bg-zinc-950 border border-zinc-800 rounded-lg font-mono text-[11px] text-zinc-300 space-y-1">
                  <div className="text-zinc-500"># Load vcan kernel module</div>
                  <div className="text-amber-400">sudo modprobe vcan</div>
                  <div className="text-zinc-500 mt-1"># Create virtual link</div>
                  <div className="text-amber-400">sudo ip link add dev vcan0 type vcan</div>
                  <div className="text-zinc-500 mt-1"># Bring interface UP</div>
                  <div className="text-emerald-400">sudo ip link set up vcan0</div>
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="font-bold text-zinc-100 text-sm">2. Configuring Physical CAN (can0) with Bitrate</h4>
                <div className="p-3 bg-zinc-950 border border-zinc-800 rounded-lg font-mono text-[11px] text-zinc-300 space-y-1">
                  <div className="text-zinc-500"># Set 500 kbit/s nominal bitrate and bring UP</div>
                  <div className="text-amber-400">sudo ip link set can0 type can bitrate 500000</div>
                  <div className="text-emerald-400">sudo ip link set up can0</div>
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="font-bold text-zinc-100 text-sm">3. Testing with can-utils</h4>
                <div className="p-3 bg-zinc-950 border border-zinc-800 rounded-lg font-mono text-[11px] text-zinc-300 space-y-1">
                  <div className="text-zinc-500"># Sniff frames in real-time</div>
                  <div className="text-cyan-400">candump vcan0</div>
                  <div className="text-zinc-500 mt-1"># Transmit a single CAN frame</div>
                  <div className="text-cyan-400">cansend vcan0 123#DEADBEEF01020304</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeDocId === 'architecture' && (
          <div className="space-y-6">
            <div className="p-5 bg-zinc-900/80 border border-zinc-800 rounded-2xl space-y-2">
              <div className="flex items-center space-x-2 text-purple-400 font-bold text-sm">
                <Cpu className="w-5 h-5" />
                <span>CANScope Architecture & HAL Pipeline</span>
              </div>
              <p className="text-xs text-zinc-400 leading-relaxed">
                CANScope is engineered for automotive diagnostics and laboratory instrumentation, decoupling high-throughput hardware frame acquisition from browser rendering.
              </p>
            </div>

            <div className="space-y-4 text-xs text-zinc-300 leading-relaxed">
              <div className="p-4 bg-zinc-900/60 border border-zinc-800 rounded-xl space-y-2">
                <h4 className="font-bold text-zinc-100 text-sm flex items-center space-x-2">
                  <Sparkles className="w-4 h-4 text-purple-400" />
                  <span>Key Architectural Components</span>
                </h4>
                <ul className="list-disc list-inside space-y-1.5 text-zinc-400 pl-2">
                  <li>
                    <strong className="text-zinc-200">Hardware Abstraction Layer (HAL)</strong>: Unified backend interface connecting SocketCAN, PCANBasic, SLCAN, and simulated buses.
                  </li>
                  <li>
                    <strong className="text-zinc-200">Worker Streaming & Buffering</strong>: Frames are captured in a ring buffer with microsecond timestamps and streamed over low-latency WebSockets.
                  </li>
                  <li>
                    <strong className="text-zinc-200">60 FPS Render Throttling</strong>: Client-side animation frame batching ensures the DOM never stalls even during 10,000+ fps bus saturations.
                  </li>
                  <li>
                    <strong className="text-zinc-200">Dynamic Signal Engine</strong>: Bit-level field extraction supporting Intel and Motorola byte orders with scale and offset transformation.
                  </li>
                </ul>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
