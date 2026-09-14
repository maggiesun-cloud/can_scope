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
} from 'lucide-react';
import { SAMPLE_JSON_DBC } from '../utils/dbc';

interface DocsPageProps {
  onNavigateToDbc?: () => void;
}

type DocId = 'json-dbc' | 'macos-pcan' | 'linux-socketcan' | 'architecture';

interface DocItem {
  id: DocId;
  title: string;
  category: string;
  description: string;
  icon: React.ReactNode;
}

export const DocsPage: React.FC<DocsPageProps> = ({ onNavigateToDbc }) => {
  const [activeDocId, setActiveDocId] = useState<DocId>('json-dbc');
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
      id: 'json-dbc',
      title: 'Custom CAN ID JSON DBC Guide',
      category: 'Signal Decoding',
      description: 'How to edit, format, upload, and auto-decode custom CAN IDs in human-readable JSON.',
      icon: <FileCode className="w-4 h-4 text-emerald-400" />,
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
