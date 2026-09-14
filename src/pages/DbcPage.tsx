import React, { useState, useEffect } from 'react';
import { DbcDatabase, DbcMessage } from '../types/can';
import { decodeFrameWithDbc, exportDbcAsJson, SAMPLE_JSON_DBC } from '../utils/dbc';
import { VisualSchemaEditor } from '../components/VisualSchemaEditor';
import {
  Database,
  Upload,
  FileCode,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Calculator,
  Search,
  BookOpen,
  Download,
  Code2,
  Check,
  Copy,
  Sparkles,
  ArrowRight,
  Sliders,
} from 'lucide-react';

interface DbcPageProps {
  activeDbc: DbcDatabase | null;
  onLoadDbc: (content: string, filename: string) => Promise<boolean>;
  onNavigateToDocs?: () => void;
}

export const DbcPage: React.FC<DbcPageProps> = ({ activeDbc, onLoadDbc, onNavigateToDocs }) => {
  const [viewTab, setViewTab] = useState<'visual_editor' | 'catalog'>('visual_editor');
  const [expandedMessageId, setExpandedMessageId] = useState<number | null>(0x100);
  const [search, setSearch] = useState('');
  const [isDragging, setIsDragging] = useState(false);

  // Test decoder sandbox
  const [testCanId, setTestCanId] = useState('0x100');
  const [testHexData, setTestHexData] = useState('0F 00 40 1F 78 80 00 00');
  const [decodedTestResults, setDecodedTestResults] = useState<Record<string, string | number> | null>(null);

  // In-app JSON Editor state
  const [showJsonEditor, setShowJsonEditor] = useState(false);
  const [jsonContent, setJsonContent] = useState<string>(SAMPLE_JSON_DBC);
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [copiedJson, setCopiedJson] = useState(false);

  // Sync active DBC to JSON editor if available
  useEffect(() => {
    if (activeDbc && !showJsonEditor) {
      try {
        setJsonContent(exportDbcAsJson(activeDbc));
      } catch {
        // keep fallback
      }
    }
  }, [activeDbc, showJsonEditor]);

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
    const cleanId = testCanId.startsWith('0x') || testCanId.startsWith('0X')
      ? parseInt(testCanId, 16)
      : parseInt(testCanId, 10);
    const bytes = testHexData
      .trim()
      .split(/[\s,]+/)
      .map((b) => parseInt(b, 16))
      .filter((n) => !isNaN(n));

    const result = decodeFrameWithDbc(cleanId, bytes, activeDbc);
    setDecodedTestResults(result);
  };

  const handleApplyJson = async () => {
    setJsonError(null);
    try {
      JSON.parse(jsonContent); // syntax validation check
      const success = await onLoadDbc(jsonContent, 'custom_can_schema.json');
      if (success) {
        setShowJsonEditor(false);
      }
    } catch (err: any) {
      setJsonError(err.message || 'Invalid JSON syntax');
    }
  };

  const handleDownloadCurrentJson = () => {
    const content = activeDbc ? exportDbcAsJson(activeDbc) : jsonContent;
    const blob = new Blob([content], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = activeDbc ? `${activeDbc.filename.replace(/\.[^/.]+$/, '')}.json` : 'custom_can_dbc.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleCopyJson = () => {
    navigator.clipboard.writeText(jsonContent);
    setCopiedJson(true);
    setTimeout(() => setCopiedJson(false), 2000);
  };

  const filteredMessages = (activeDbc?.messages || []).filter(
    (m) =>
      m.name.toLowerCase().includes(search.toLowerCase()) ||
      m.idHex.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex flex-col h-full overflow-hidden text-zinc-200">
      {/* Top Main Navigation Bar */}
      <div className="p-4 border-b border-zinc-800 bg-zinc-950 flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-lg bg-emerald-950 border border-emerald-700/80 flex items-center justify-center">
            <Database className="w-4 h-4 text-emerald-400" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-sm font-bold text-zinc-100">CAN DBC & Custom Schema Decoder</h2>
              {activeDbc && (
                <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-950/70 border border-emerald-800 text-emerald-300 font-mono">
                  {activeDbc.messages.length} messages loaded
                </span>
              )}
            </div>
            <p className="text-[11px] text-zinc-400">
              Create, visually edit, or upload Vector <code className="text-zinc-300 font-mono text-[10px]">.dbc</code> & custom <code className="text-zinc-300 font-mono text-[10px]">.json</code> schemas for real-time decoding
            </p>
          </div>
        </div>

        {/* View Mode Tabs & Actions */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="bg-zinc-900 p-0.5 rounded-lg border border-zinc-800 flex items-center text-xs font-mono">
            <button
              onClick={() => setViewTab('visual_editor')}
              className={`px-3 py-1.5 rounded-md flex items-center space-x-1.5 transition cursor-pointer ${
                viewTab === 'visual_editor'
                  ? 'bg-emerald-600 text-white font-bold shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>Visual Schema Editor</span>
            </button>
            <button
              onClick={() => setViewTab('catalog')}
              className={`px-3 py-1.5 rounded-md flex items-center space-x-1.5 transition cursor-pointer ${
                viewTab === 'catalog'
                  ? 'bg-zinc-800 text-cyan-400 font-bold shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Database className="w-3.5 h-3.5" />
              <span>Catalog &amp; Sandbox</span>
            </button>
          </div>

          {onNavigateToDocs && (
            <button
              onClick={onNavigateToDocs}
              className="px-2.5 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-800 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition cursor-pointer"
              title="Open documentation guide"
            >
              <BookOpen className="w-3.5 h-3.5 text-cyan-400" />
              <span>Guides</span>
            </button>
          )}

          <label className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition cursor-pointer shadow-sm">
            <Upload className="w-3.5 h-3.5" />
            <span>Upload DBC / JSON</span>
            <input
              type="file"
              accept=".dbc,.json,application/json"
              className="hidden"
              onChange={(e) => e.target.files && e.target.files[0] && handleFileUpload(e.target.files[0])}
            />
          </label>
        </div>
      </div>

      {/* Main Content Area */}
      {viewTab === 'visual_editor' ? (
        <div className="flex-1 overflow-hidden">
          <VisualSchemaEditor
            initialDatabase={activeDbc}
            onApplySchema={async (db) => {
              const jsonStr = exportDbcAsJson(db);
              await onLoadDbc(jsonStr, db.filename);
            }}
            onNavigateToDocs={onNavigateToDocs}
          />
        </div>
      ) : (
        <div className="p-6 space-y-6 overflow-y-auto flex-1 text-zinc-200">
          {/* Action Row for Catalog view */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-zinc-900/60 p-3 rounded-xl border border-zinc-800">
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setViewTab('visual_editor')}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition cursor-pointer shadow-sm"
              >
                <Sliders className="w-3.5 h-3.5" />
                <span>Open Visual Schema Designer</span>
              </button>
              <button
                onClick={() => setShowJsonEditor(!showJsonEditor)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition cursor-pointer border ${
                  showJsonEditor
                    ? 'bg-emerald-950 text-emerald-300 border-emerald-700'
                    : 'bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border-zinc-700/80'
                }`}
              >
                <Code2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>{showJsonEditor ? 'Hide JSON Editor' : 'Edit / View Raw JSON'}</span>
              </button>
            </div>

            {activeDbc && (
              <button
                onClick={handleDownloadCurrentJson}
                className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition cursor-pointer"
              >
                <Download className="w-3.5 h-3.5 text-emerald-400" />
                <span>Export Active as JSON</span>
              </button>
            )}
          </div>

      {/* In-App JSON Editor Panel */}
      {showJsonEditor && (
        <div className="p-5 bg-zinc-900 border border-zinc-700 rounded-2xl space-y-3 shadow-xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-zinc-800 pb-3">
            <div className="flex items-center space-x-2">
              <Code2 className="w-4 h-4 text-emerald-400" />
              <span className="font-bold text-xs text-zinc-100">Live JSON Schema Editor</span>
              <span className="text-[10px] text-zinc-500 font-mono bg-zinc-950 px-2 py-0.5 rounded border border-zinc-800">
                Direct Schema Ingestion
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setJsonContent(SAMPLE_JSON_DBC)}
                className="px-2.5 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-[11px] rounded font-semibold transition cursor-pointer flex items-center space-x-1"
                title="Reset to sample vehicle & BMS schema"
              >
                <Sparkles className="w-3 h-3 text-cyan-400" />
                <span>Load Sample</span>
              </button>
              <button
                onClick={handleCopyJson}
                className="px-2.5 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-[11px] rounded font-semibold transition cursor-pointer flex items-center space-x-1"
              >
                {copiedJson ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3 text-zinc-400" />}
                <span>{copiedJson ? 'Copied' : 'Copy'}</span>
              </button>
              <button
                onClick={handleDownloadCurrentJson}
                className="px-2.5 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-[11px] rounded font-semibold transition cursor-pointer flex items-center space-x-1"
              >
                <Download className="w-3 h-3 text-emerald-400" />
                <span>Export .json</span>
              </button>
              <button
                onClick={handleApplyJson}
                className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded transition cursor-pointer shadow-sm"
              >
                Apply to Decoder
              </button>
            </div>
          </div>

          <p className="text-[11px] text-zinc-400 leading-relaxed">
            Paste or edit your custom CAN message definitions below. Support hex IDs like <code className="text-cyan-300 font-mono">&quot;0x123&quot;</code> and signal properties like <code className="text-zinc-300 font-mono">startBit</code>, <code className="text-zinc-300 font-mono">length</code>, <code className="text-zinc-300 font-mono">scale</code>, <code className="text-zinc-300 font-mono">offset</code>, and <code className="text-zinc-300 font-mono">unit</code>.
          </p>

          {jsonError && (
            <div className="p-2.5 bg-rose-950/60 border border-rose-800 text-rose-300 rounded text-xs font-mono">
              Syntax Error: {jsonError}
            </div>
          )}

          <textarea
            value={jsonContent}
            onChange={(e) => {
              setJsonContent(e.target.value);
              setJsonError(null);
            }}
            rows={14}
            className="w-full p-3.5 bg-zinc-950 border border-zinc-800 rounded-xl font-mono text-xs text-zinc-200 focus:outline-none focus:border-emerald-700 leading-relaxed resize-y"
            placeholder="Paste custom JSON DBC structure here..."
          />
        </div>
      )}

      {/* Drag and Drop Banner */}
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
          Drop your Vector .dbc or custom .json file here, or click Upload above
        </div>
        <div className="text-[11px] text-zinc-500 mt-1 flex items-center justify-center space-x-2">
          <span>Supports Vector DBC (.dbc)</span>
          <span>•</span>
          <span>Supports Custom JSON (.json)</span>
          <span>•</span>
          <span>Intel &amp; Motorola Byte Orders</span>
        </div>
      </div>

      {/* Active Database Summary */}
      {activeDbc && (
        <div className="p-4 bg-zinc-900 border border-zinc-800 rounded-xl flex flex-wrap items-center justify-between gap-4 font-mono text-xs">
          <div className="flex items-center space-x-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-bold text-zinc-100 font-sans">{activeDbc.filename}</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 font-mono uppercase">
                  {activeDbc.filename.toLowerCase().endsWith('.json') ? 'JSON Schema' : 'Vector DBC'}
                </span>
              </div>
              <div className="text-zinc-500 text-[11px]">Active CAN Database & Signal Decoder</div>
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
            <button
              onClick={handleDownloadCurrentJson}
              className="px-2.5 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded text-[11px] flex items-center space-x-1 cursor-pointer transition"
              title="Download active database in clean JSON format"
            >
              <Download className="w-3 h-3 text-emerald-400" />
              <span>Export JSON</span>
            </button>
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
          Enter a CAN ID and payload to verify signal formula decoding against the loaded database
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
                No signals found for ID {testCanId} in the active database.
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
          <h3 className="font-bold text-zinc-100 text-sm">Active Message & Signal Catalog</h3>
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
                        {msg.comment && <span className="text-zinc-400 ml-2 font-sans italic">— {msg.comment}</span>}
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
      )}
    </div>
  );
};

