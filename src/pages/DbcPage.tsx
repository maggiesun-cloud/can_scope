import React, { useState } from 'react';
import { DbcDatabase, DbcMessage } from '../types/can';
import { decodeFrameWithDbc } from '../utils/dbc';
import {
  Database,
  Upload,
  FileCode,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Calculator,
  Search,
} from 'lucide-react';

interface DbcPageProps {
  activeDbc: DbcDatabase | null;
  onLoadDbc: (content: string, filename: string) => Promise<boolean>;
}

export const DbcPage: React.FC<DbcPageProps> = ({ activeDbc, onLoadDbc }) => {
  const [expandedMessageId, setExpandedMessageId] = useState<number | null>(0x100);
  const [search, setSearch] = useState('');
  const [isDragging, setIsDragging] = useState(false);

  // Test decoder sandbox
  const [testCanId, setTestCanId] = useState('0x100');
  const [testHexData, setTestHexData] = useState('0F 00 40 1F 78 80 00 00');
  const [decodedTestResults, setDecodedTestResults] = useState<Record<string, string | number> | null>(null);

  const handleFileUpload = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      if (content) {
        onLoadDbc(content, file.name);
      }
    };
    reader.readAsText(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  const handleTestDecode = () => {
    const cleanId = testCanId.startsWith('0x') ? parseInt(testCanId, 16) : parseInt(testCanId, 10);
    const bytes = testHexData
      .trim()
      .split(/[\s,]+/)
      .map((b) => parseInt(b, 16))
      .filter((n) => !isNaN(n));

    const result = decodeFrameWithDbc(cleanId, bytes, activeDbc);
    setDecodedTestResults(result);
  };

  const filteredMessages = (activeDbc?.messages || []).filter(
    (m) =>
      m.name.toLowerCase().includes(search.toLowerCase()) ||
      m.idHex.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-6 space-y-6 overflow-y-auto h-full text-zinc-200">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-zinc-100 flex items-center space-x-2">
            <Database className="w-5 h-5 text-emerald-400" />
            <span>CAN DBC Database & Signal Decoder</span>
          </h2>
          <p className="text-xs text-zinc-400 mt-0.5">
            Load Vector .dbc definitions to translate raw hexadecimal frames into engineering physical values
          </p>
        </div>

        {/* Upload Button */}
        <label className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 rounded-lg text-xs font-semibold flex items-center space-x-2 transition cursor-pointer shrink-0">
          <Upload className="w-4 h-4 text-emerald-400" />
          <span>Upload Custom DBC</span>
          <input
            type="file"
            accept=".dbc"
            className="hidden"
            onChange={(e) => e.target.files && e.target.files[0] && handleFileUpload(e.target.files[0])}
          />
        </label>
      </div>

      {/* Drag and drop banner */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        className={`p-6 border-2 border-dashed rounded-xl text-center transition ${
          isDragging
            ? 'border-emerald-500 bg-emerald-950/20'
            : 'border-zinc-800 bg-zinc-900/60 hover:border-zinc-700'
        }`}
      >
        <FileCode className="w-8 h-8 text-emerald-400 mx-auto mb-2 opacity-80" />
        <div className="text-xs font-semibold text-zinc-200">
          Drop your Vector .dbc file here or click Upload above
        </div>
        <div className="text-[11px] text-zinc-500 mt-1">
          Supports Intel (little-endian) and Motorola (big-endian) signed/unsigned signals
        </div>
      </div>

      {/* Active Database Summary */}
      {activeDbc && (
        <div className="p-4 bg-zinc-900 border border-zinc-800 rounded-xl flex flex-wrap items-center justify-between gap-4 font-mono text-xs">
          <div className="flex items-center space-x-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            <div>
              <span className="font-bold text-zinc-100 font-sans">{activeDbc.filename}</span>
              <div className="text-zinc-500 text-[11px]">Active CAN Database</div>
            </div>
          </div>

          <div className="flex items-center space-x-6 text-zinc-400">
            <div>
              Messages: <strong className="text-zinc-200">{activeDbc.messages.length}</strong>
            </div>
            <div>
              Total Signals:{' '}
              <strong className="text-emerald-400">
                {activeDbc.messages.reduce((acc, m) => acc + m.signals.length, 0)}
              </strong>
            </div>
          </div>
        </div>
      )}

      {/* Decoder Sandbox Tester */}
      <div className="p-5 bg-zinc-900 border border-zinc-800 rounded-xl space-y-3">
        <div className="flex items-center space-x-2 text-zinc-100 font-bold text-xs">
          <Calculator className="w-4 h-4 text-cyan-400" />
          <span>Interactive Signal Decoder Sandbox</span>
        </div>
        <p className="text-[11px] text-zinc-400">
          Enter a CAN ID and payload to verify signal formula decoding against the loaded DBC
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-[10px] text-zinc-500 uppercase font-mono mb-1">CAN ID</label>
            <input
              type="text"
              value={testCanId}
              onChange={(e) => setTestCanId(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-700 rounded px-2.5 py-1.5 text-xs font-mono text-cyan-300 focus:outline-none"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="block text-[10px] text-zinc-500 uppercase font-mono mb-1">
              Data Bytes (Hex)
            </label>
            <div className="flex space-x-2">
              <input
                type="text"
                value={testHexData}
                onChange={(e) => setTestHexData(e.target.value)}
                className="flex-1 bg-zinc-950 border border-zinc-700 rounded px-2.5 py-1.5 text-xs font-mono text-zinc-200 focus:outline-none"
              />
              <button
                onClick={handleTestDecode}
                className="px-4 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded font-semibold text-xs transition cursor-pointer"
              >
                Decode
              </button>
            </div>
          </div>
        </div>

        {decodedTestResults && (
          <div className="mt-3 p-3 bg-zinc-950 border border-zinc-800 rounded-lg">
            <div className="text-[11px] font-semibold text-zinc-400 mb-2">Decoded Results:</div>
            {Object.keys(decodedTestResults).length === 0 ? (
              <span className="text-zinc-500 text-xs italic">
                No signals found for ID {testCanId} in the active DBC.
              </span>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                {Object.entries(decodedTestResults).map(([sig, val]) => (
                  <div key={sig} className="p-2 bg-zinc-900 border border-zinc-800 rounded text-xs">
                    <span className="text-zinc-400 block text-[10px] truncate">{sig}</span>
                    <span className="text-emerald-400 font-bold font-mono">{String(val)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Message & Signal Catalog */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
        <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
          <h3 className="font-bold text-zinc-100 text-sm">DBC Message Catalog</h3>
          <div className="relative w-64">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-zinc-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search messages..."
              className="w-full pl-9 pr-3 py-1.5 bg-zinc-950 border border-zinc-700 rounded text-xs text-zinc-200 focus:outline-none"
            />
          </div>
        </div>

        <div className="divide-y divide-zinc-800/80">
          {filteredMessages.map((msg) => {
            const isExpanded = expandedMessageId === msg.id;

            return (
              <div key={msg.id} className="text-xs">
                {/* Message Row */}
                <div
                  onClick={() => setExpandedMessageId(isExpanded ? null : msg.id)}
                  className="p-3.5 flex items-center justify-between hover:bg-zinc-850/60 cursor-pointer transition select-none"
                >
                  <div className="flex items-center space-x-3">
                    {isExpanded ? (
                      <ChevronDown className="w-4 h-4 text-cyan-400" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-zinc-500" />
                    )}
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-bold text-zinc-100">{msg.name}</span>
                        <span className="font-mono text-cyan-400 text-[11px] font-bold">
                          {msg.idHex}
                        </span>
                      </div>
                      <div className="text-[10px] text-zinc-500 font-mono mt-0.5">
                        Transmitter: {msg.transmitter} • DLC: {msg.dlc} bytes
                      </div>
                    </div>
                  </div>

                  <span className="px-2 py-0.5 rounded bg-zinc-800 text-zinc-400 font-mono text-[11px]">
                    {msg.signals.length} signals
                  </span>
                </div>

                {/* Signal Breakdown when expanded */}
                {isExpanded && (
                  <div className="bg-zinc-950 p-4 border-t border-zinc-800/80">
                    <table className="w-full text-left font-mono text-[11px] border-collapse">
                      <thead>
                        <tr className="text-zinc-500 border-b border-zinc-800 pb-1">
                          <th className="pb-1.5">Signal Name</th>
                          <th className="pb-1.5">Start | Length</th>
                          <th className="pb-1.5">Endian</th>
                          <th className="pb-1.5">Formula (Scale, Offset)</th>
                          <th className="pb-1.5">Range [Min, Max]</th>
                          <th className="pb-1.5">Unit</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-900">
                        {msg.signals.map((sig) => (
                          <tr key={sig.name} className="hover:bg-zinc-900/40">
                            <td className="py-2 font-bold text-emerald-400">{sig.name}</td>
                            <td className="py-2 text-zinc-300">
                              {sig.startBit} | {sig.length} bits
                            </td>
                            <td className="py-2 text-zinc-400 uppercase text-[10px]">
                              {sig.byteOrder === 'little_endian' ? 'Intel' : 'Motorola'}
                            </td>
                            <td className="py-2 text-zinc-300">
                              val * {sig.scale} + {sig.offset}
                            </td>
                            <td className="py-2 text-zinc-400">
                              [{sig.min}, {sig.max}]
                            </td>
                            <td className="py-2 text-cyan-300 font-semibold">{sig.unit || '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
