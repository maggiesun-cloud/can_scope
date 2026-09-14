import React, { useState, useEffect } from 'react';
import { DbcDatabase, DbcMessage, DbcSignal } from '../types/can';
import { BitMatrixVisualizer, SIGNAL_COLORS } from './BitMatrixVisualizer';
import { exportDbcAsJson, exportDbcAsVectorDbc, parseJsonDbc } from '../utils/dbc';
import { SCHEMA_PRESETS } from '../utils/schemaPresets';
import {
  Database,
  Plus,
  Trash2,
  Copy,
  Download,
  Check,
  Code2,
  Sparkles,
  Layers,
  ArrowRight,
  AlertTriangle,
  FileCode,
  Sliders,
  ChevronRight,
  BookOpen,
  Info,
  RefreshCw,
} from 'lucide-react';

interface VisualSchemaEditorProps {
  initialDatabase: DbcDatabase | null;
  onApplySchema: (database: DbcDatabase) => Promise<boolean> | void;
  onNavigateToDocs?: () => void;
  onClose?: () => void;
}

const COMMON_UNITS = ['rpm', 'km/h', '°C', 'V', 'mV', 'A', 'mA', '%', 'bar', 'kPa', 'deg', 'Nm', 'kW', 'm/s', 'Hz'];

export const VisualSchemaEditor: React.FC<VisualSchemaEditorProps> = ({
  initialDatabase,
  onApplySchema,
  onNavigateToDocs,
  onClose,
}) => {
  // Initialize state from existing database or default preset
  const [databaseName, setDatabaseName] = useState<string>(
    initialDatabase?.filename || 'Custom_CAN_Network.json'
  );
  const [version, setVersion] = useState<string>(initialDatabase?.version || '1.0');
  const [messages, setMessages] = useState<DbcMessage[]>(() => {
    if (initialDatabase && initialDatabase.messages.length > 0) {
      return JSON.parse(JSON.stringify(initialDatabase.messages));
    }
    return JSON.parse(JSON.stringify(SCHEMA_PRESETS[0].database.messages));
  });

  const [selectedMessageIndex, setSelectedMessageIndex] = useState<number>(0);
  const [selectedSignalIndex, setSelectedSignalIndex] = useState<number | null>(0);
  const [hoveredSignalIndex, setHoveredSignalIndex] = useState<number | null>(null);

  // Raw code preview tab ('visual' | 'json' | 'dbc')
  const [activeTab, setActiveTab] = useState<'visual' | 'json' | 'dbc'>('visual');
  const [rawJsonText, setRawJsonText] = useState<string>('');
  const [jsonError, setJsonError] = useState<string | null>(null);

  // Status feedback
  const [appliedSuccess, setAppliedSuccess] = useState<boolean>(false);
  const [copiedSuccess, setCopiedSuccess] = useState<boolean>(false);

  // Test sandbox for active signal
  const [rawTestValue, setRawTestValue] = useState<number>(100);

  const activeMessage: DbcMessage | undefined = messages[selectedMessageIndex];
  const activeSignal: DbcSignal | undefined =
    activeMessage && selectedSignalIndex !== null ? activeMessage.signals[selectedSignalIndex] : undefined;

  // Sync raw JSON preview when switching tabs
  useEffect(() => {
    if (activeTab === 'json') {
      const currentDb: DbcDatabase = {
        filename: databaseName,
        version,
        messages,
      };
      setRawJsonText(exportDbcAsJson(currentDb));
    }
  }, [activeTab, databaseName, version, messages]);

  // Construct current database object
  const getCurrentDatabase = (): DbcDatabase => {
    return {
      filename: databaseName.endsWith('.json') || databaseName.endsWith('.dbc') ? databaseName : `${databaseName}.json`,
      version,
      messages,
    };
  };

  const handleApplyToDecoder = async () => {
    const currentDb = getCurrentDatabase();
    await onApplySchema(currentDb);
    setAppliedSuccess(true);
    setTimeout(() => setAppliedSuccess(false), 2500);
  };

  const handleDownloadJson = () => {
    const jsonStr = exportDbcAsJson(getCurrentDatabase());
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = databaseName.endsWith('.json') ? databaseName : `${databaseName.replace(/\.[^/.]+$/, '')}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleDownloadVectorDbc = () => {
    const dbcStr = exportDbcAsVectorDbc(getCurrentDatabase());
    const blob = new Blob([dbcStr], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${databaseName.replace(/\.[^/.]+$/, '')}.dbc`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleLoadPreset = (presetId: string) => {
    const preset = SCHEMA_PRESETS.find((p) => p.id === presetId);
    if (preset) {
      setDatabaseName(preset.database.filename);
      setVersion(preset.database.version || '1.0');
      setMessages(JSON.parse(JSON.stringify(preset.database.messages)));
      setSelectedMessageIndex(0);
      setSelectedSignalIndex(0);
    }
  };

  // Message Mutation Handlers
  const handleAddMessage = () => {
    const newId = (messages[messages.length - 1]?.id || 0x100) + 0x10;
    const newIdHex = `0x${newId.toString(16).toUpperCase()}`;
    const newMsg: DbcMessage = {
      id: newId,
      idHex: newIdHex,
      name: `Custom_Message_${messages.length + 1}`,
      dlc: 8,
      transmitter: 'ECU_NODE',
      comment: 'Custom CAN definition',
      signals: [
        {
          name: 'Signal_1',
          startBit: 0,
          length: 16,
          byteOrder: 'little_endian',
          isSigned: false,
          scale: 1,
          offset: 0,
          min: 0,
          max: 65535,
          unit: '',
          receivers: ['ECU'],
        },
      ],
    };
    const updated = [...messages, newMsg];
    setMessages(updated);
    setSelectedMessageIndex(updated.length - 1);
    setSelectedSignalIndex(0);
  };

  const handleDuplicateMessage = (index: number) => {
    const target = messages[index];
    if (!target) return;
    const cloned: DbcMessage = JSON.parse(JSON.stringify(target));
    cloned.id = cloned.id + 1;
    cloned.idHex = `0x${cloned.id.toString(16).toUpperCase()}`;
    cloned.name = `${cloned.name}_Copy`;
    const updated = [...messages];
    updated.splice(index + 1, 0, cloned);
    setMessages(updated);
    setSelectedMessageIndex(index + 1);
  };

  const handleDeleteMessage = (index: number) => {
    if (messages.length <= 1) return;
    const updated = messages.filter((_, i) => i !== index);
    setMessages(updated);
    setSelectedMessageIndex(Math.max(0, index - 1));
    setSelectedSignalIndex(0);
  };

  const handleUpdateMessageField = <K extends keyof DbcMessage>(field: K, value: DbcMessage[K]) => {
    if (!activeMessage) return;
    const updated = [...messages];
    const msg = { ...updated[selectedMessageIndex], [field]: value };

    // Auto sync id and idHex
    if (field === 'id') {
      const num = Number(value) || 0;
      msg.id = num;
      msg.idHex = `0x${num.toString(16).toUpperCase()}`;
    }
    if (field === 'idHex') {
      const hexStr = String(value);
      msg.idHex = hexStr;
      const num = hexStr.startsWith('0x') || hexStr.startsWith('0X') ? parseInt(hexStr, 16) : parseInt(hexStr, 10);
      if (!isNaN(num)) {
        msg.id = num;
      }
    }

    updated[selectedMessageIndex] = msg;
    setMessages(updated);
  };

  // Signal Mutation Handlers
  const handleAddSignal = () => {
    if (!activeMessage) return;
    // Find next available start bit
    const existingSignals = activeMessage.signals;
    const lastSig = existingSignals[existingSignals.length - 1];
    const nextStart = lastSig ? Math.min(63, lastSig.startBit + lastSig.length) : 0;

    const newSignal: DbcSignal = {
      name: `NewSignal_${existingSignals.length + 1}`,
      startBit: nextStart < 64 ? nextStart : 0,
      length: 8,
      byteOrder: 'little_endian',
      isSigned: false,
      scale: 1,
      offset: 0,
      min: 0,
      max: 255,
      unit: '',
      receivers: ['ECU'],
    };

    const updatedSignals = [...existingSignals, newSignal];
    handleUpdateMessageField('signals', updatedSignals);
    setSelectedSignalIndex(updatedSignals.length - 1);
  };

  const handleDuplicateSignal = (index: number) => {
    if (!activeMessage) return;
    const target = activeMessage.signals[index];
    if (!target) return;
    const cloned: DbcSignal = JSON.parse(JSON.stringify(target));
    cloned.name = `${cloned.name}_Copy`;
    const updatedSignals = [...activeMessage.signals];
    updatedSignals.splice(index + 1, 0, cloned);
    handleUpdateMessageField('signals', updatedSignals);
    setSelectedSignalIndex(index + 1);
  };

  const handleDeleteSignal = (index: number) => {
    if (!activeMessage || activeMessage.signals.length <= 1) return;
    const updatedSignals = activeMessage.signals.filter((_, i) => i !== index);
    handleUpdateMessageField('signals', updatedSignals);
    setSelectedSignalIndex(Math.max(0, index - 1));
  };

  const handleUpdateSignalField = <K extends keyof DbcSignal>(field: K, value: DbcSignal[K]) => {
    if (!activeMessage || selectedSignalIndex === null) return;
    const updatedSignals = [...activeMessage.signals];
    const currentSig = { ...updatedSignals[selectedSignalIndex], [field]: value };
    updatedSignals[selectedSignalIndex] = currentSig;
    handleUpdateMessageField('signals', updatedSignals);
  };

  // Apply raw JSON edits
  const handleApplyRawJson = () => {
    setJsonError(null);
    try {
      const parsed = parseJsonDbc(rawJsonText, databaseName);
      setMessages(parsed.messages);
      if (parsed.filename) setDatabaseName(parsed.filename);
      if (parsed.version) setVersion(parsed.version);
      setActiveTab('visual');
    } catch (err: any) {
      setJsonError(err.message || 'Invalid JSON syntax');
    }
  };

  // Calculate live physical value preview
  const calculatedPhysicalValue = activeSignal
    ? Number((rawTestValue * activeSignal.scale + activeSignal.offset).toFixed(4))
    : 0;

  return (
    <div className="flex flex-col h-full bg-zinc-950 text-zinc-200 overflow-hidden">
      {/* Top Header Bar */}
      <div className="p-4 border-b border-zinc-800 bg-zinc-900/90 flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-lg bg-emerald-950 border border-emerald-700/80 flex items-center justify-center">
            <Sliders className="w-4 h-4 text-emerald-400" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-sm font-bold text-zinc-100 font-sans">Visual Custom Schema Editor</h2>
              <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-950/70 border border-emerald-800 text-emerald-300 font-mono font-bold">
                GUI Designer
              </span>
            </div>
            <p className="text-[11px] text-zinc-400">
              Visually create, edit, and validate CAN IDs, signals, and bit layouts with instant auto-decoding
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Preset Selector */}
          <div className="relative">
            <select
              onChange={(e) => {
                if (e.target.value) handleLoadPreset(e.target.value);
              }}
              defaultValue=""
              className="bg-zinc-950 border border-zinc-700 rounded-lg px-2.5 py-1.5 text-xs text-zinc-300 focus:outline-none focus:border-cyan-600 cursor-pointer"
            >
              <option value="" disabled>
                Load Preset Template...
              </option>
              {SCHEMA_PRESETS.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.category})
                </option>
              ))}
            </select>
          </div>

          {/* View Mode Toggle */}
          <div className="bg-zinc-950 p-0.5 rounded-lg border border-zinc-800 flex items-center text-xs font-mono">
            <button
              onClick={() => setActiveTab('visual')}
              className={`px-2.5 py-1 rounded transition cursor-pointer ${
                activeTab === 'visual' ? 'bg-zinc-800 text-emerald-400 font-bold' : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Visual Designer
            </button>
            <button
              onClick={() => setActiveTab('json')}
              className={`px-2.5 py-1 rounded transition cursor-pointer ${
                activeTab === 'json' ? 'bg-zinc-800 text-cyan-400 font-bold' : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              JSON View
            </button>
            <button
              onClick={() => setActiveTab('dbc')}
              className={`px-2.5 py-1 rounded transition cursor-pointer ${
                activeTab === 'dbc' ? 'bg-zinc-800 text-purple-400 font-bold' : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Vector DBC
            </button>
          </div>

          {/* Export Actions */}
          <button
            onClick={handleDownloadJson}
            className="px-2.5 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition cursor-pointer"
            title="Download JSON format"
          >
            <Download className="w-3.5 h-3.5 text-emerald-400" />
            <span>.json</span>
          </button>

          <button
            onClick={handleDownloadVectorDbc}
            className="px-2.5 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition cursor-pointer"
            title="Export as Vector .dbc file"
          >
            <Download className="w-3.5 h-3.5 text-purple-400" />
            <span>.dbc</span>
          </button>

          {/* Primary Apply Button */}
          <button
            onClick={handleApplyToDecoder}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition cursor-pointer shadow-sm ${
              appliedSuccess
                ? 'bg-emerald-500 text-white'
                : 'bg-emerald-600 hover:bg-emerald-500 text-white'
            }`}
          >
            {appliedSuccess ? <Check className="w-3.5 h-3.5" /> : <Sparkles className="w-3.5 h-3.5" />}
            <span>{appliedSuccess ? 'Applied to Live Bus!' : 'Apply to Decoder'}</span>
          </button>

          {onNavigateToDocs && (
            <button
              onClick={onNavigateToDocs}
              className="p-1.5 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded-lg transition"
              title="View Documentation"
            >
              <BookOpen className="w-4 h-4" />
            </button>
          )}

          {onClose && (
            <button
              onClick={onClose}
              className="px-2.5 py-1 text-xs text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 rounded-lg transition"
            >
              Close
            </button>
          )}
        </div>
      </div>

      {/* Main Body Area */}
      {activeTab === 'visual' ? (
        <div className="flex-1 flex overflow-hidden">
          {/* Left Column: Messages Explorer */}
          <div className="w-72 border-r border-zinc-800/80 bg-zinc-950 flex flex-col shrink-0">
            {/* Database Name input */}
            <div className="p-3 border-b border-zinc-800/80 space-y-2">
              <label className="text-[10px] uppercase font-mono text-zinc-500 font-bold block">
                Database Name
              </label>
              <input
                type="text"
                value={databaseName}
                onChange={(e) => setDatabaseName(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-800 rounded px-2.5 py-1 text-xs font-mono text-zinc-200 focus:outline-none focus:border-emerald-600"
              />
            </div>

            {/* Message List Header */}
            <div className="p-3 border-b border-zinc-800/80 flex items-center justify-between">
              <span className="text-xs font-bold text-zinc-300 uppercase tracking-wider font-mono">
                Messages ({messages.length})
              </span>
              <button
                onClick={handleAddMessage}
                className="px-2 py-1 bg-emerald-950 hover:bg-emerald-900 border border-emerald-800 text-emerald-300 rounded text-[11px] font-semibold flex items-center space-x-1 cursor-pointer transition"
              >
                <Plus className="w-3 h-3" />
                <span>Add Message</span>
              </button>
            </div>

            {/* Messages Scroll List */}
            <div className="p-2 space-y-1 overflow-y-auto flex-1">
              {messages.map((msg, index) => {
                const isSelected = selectedMessageIndex === index;
                return (
                  <div
                    key={msg.id + '-' + index}
                    onClick={() => {
                      setSelectedMessageIndex(index);
                      setSelectedSignalIndex(0);
                    }}
                    className={`p-2.5 rounded-xl border transition cursor-pointer select-none ${
                      isSelected
                        ? 'bg-zinc-900 border-zinc-700 text-zinc-100 shadow-sm'
                        : 'bg-transparent border-transparent text-zinc-400 hover:bg-zinc-900/40 hover:text-zinc-200'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2 truncate">
                        <span className="font-mono text-cyan-400 text-xs font-bold shrink-0">
                          {msg.idHex}
                        </span>
                        <span className="font-semibold text-xs text-zinc-200 truncate">{msg.name}</span>
                      </div>
                      <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-zinc-800 text-zinc-400 shrink-0">
                        {msg.dlc}B
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[10px] text-zinc-500 font-mono mt-1">
                      <span>{msg.signals.length} signals</span>
                      <span>{msg.transmitter}</span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Left Column Footer Actions */}
            <div className="p-2 border-t border-zinc-800/80 bg-zinc-950/80 flex items-center justify-between">
              <button
                onClick={() => handleDuplicateMessage(selectedMessageIndex)}
                className="p-1.5 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900 rounded text-xs flex items-center space-x-1 cursor-pointer transition"
                title="Duplicate selected message"
              >
                <Copy className="w-3.5 h-3.5" />
                <span className="text-[11px]">Duplicate</span>
              </button>

              <button
                onClick={() => handleDeleteMessage(selectedMessageIndex)}
                disabled={messages.length <= 1}
                className={`p-1.5 rounded text-xs flex items-center space-x-1 transition cursor-pointer ${
                  messages.length <= 1
                    ? 'text-zinc-600 cursor-not-allowed'
                    : 'text-rose-400 hover:text-rose-300 hover:bg-rose-950/40'
                }`}
                title="Delete message"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span className="text-[11px]">Delete</span>
              </button>
            </div>
          </div>

          {/* Right Main Column: Active Message Inspector */}
          {activeMessage && (
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Message Settings Form Card */}
              <div className="p-4 bg-zinc-900/90 border border-zinc-800 rounded-2xl space-y-4">
                <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
                  <h3 className="font-bold text-xs uppercase tracking-wider text-zinc-300 font-mono flex items-center space-x-2">
                    <Database className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Message Configuration</span>
                  </h3>
                  <div className="text-[11px] font-mono text-zinc-500">
                    Decimal ID: <span className="text-zinc-300">{activeMessage.id}</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                  {/* Name */}
                  <div>
                    <label className="block text-[10px] uppercase font-mono text-zinc-500 mb-1">
                      Message Name
                    </label>
                    <input
                      type="text"
                      value={activeMessage.name}
                      onChange={(e) => handleUpdateMessageField('name', e.target.value)}
                      className="w-full bg-zinc-950 border border-zinc-700 rounded px-2.5 py-1.5 text-xs text-zinc-200 font-mono focus:outline-none focus:border-cyan-600"
                    />
                  </div>

                  {/* CAN ID (Hex) */}
                  <div>
                    <label className="block text-[10px] uppercase font-mono text-zinc-500 mb-1">
                      CAN ID (Hex or Dec)
                    </label>
                    <input
                      type="text"
                      value={activeMessage.idHex}
                      onChange={(e) => handleUpdateMessageField('idHex', e.target.value)}
                      className="w-full bg-zinc-950 border border-zinc-700 rounded px-2.5 py-1.5 text-xs font-mono text-cyan-300 font-bold focus:outline-none focus:border-cyan-600"
                    />
                  </div>

                  {/* DLC */}
                  <div>
                    <label className="block text-[10px] uppercase font-mono text-zinc-500 mb-1">
                      DLC (Payload Length)
                    </label>
                    <select
                      value={activeMessage.dlc}
                      onChange={(e) => handleUpdateMessageField('dlc', Number(e.target.value))}
                      className="w-full bg-zinc-950 border border-zinc-700 rounded px-2.5 py-1.5 text-xs text-zinc-200 font-mono focus:outline-none focus:border-cyan-600 cursor-pointer"
                    >
                      {[1, 2, 3, 4, 5, 6, 7, 8, 12, 16, 20, 24, 32, 48, 64].map((d) => (
                        <option key={d} value={d}>
                          {d} bytes ({d * 8} bits)
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Transmitter */}
                  <div>
                    <label className="block text-[10px] uppercase font-mono text-zinc-500 mb-1">
                      Transmitter ECU
                    </label>
                    <input
                      type="text"
                      value={activeMessage.transmitter || 'ECU'}
                      onChange={(e) => handleUpdateMessageField('transmitter', e.target.value)}
                      className="w-full bg-zinc-950 border border-zinc-700 rounded px-2.5 py-1.5 text-xs text-zinc-200 font-mono focus:outline-none focus:border-cyan-600"
                    />
                  </div>
                </div>

                {/* Comment / Description */}
                <div>
                  <label className="block text-[10px] uppercase font-mono text-zinc-500 mb-1">
                    Description / Comment
                  </label>
                  <input
                    type="text"
                    value={activeMessage.comment || ''}
                    onChange={(e) => handleUpdateMessageField('comment', e.target.value)}
                    placeholder="Optional message description or function..."
                    className="w-full bg-zinc-950 border border-zinc-800 rounded px-2.5 py-1.5 text-xs text-zinc-300 focus:outline-none focus:border-cyan-600"
                  />
                </div>
              </div>

              {/* 64-Bit Payload Matrix Visualizer */}
              <BitMatrixVisualizer
                dlc={activeMessage.dlc}
                signals={activeMessage.signals}
                selectedSignalIndex={selectedSignalIndex}
                onSelectSignal={(idx) => setSelectedSignalIndex(idx)}
                hoveredSignalIndex={hoveredSignalIndex}
                onHoverSignal={(idx) => setHoveredSignalIndex(idx)}
              />

              {/* Signals Management Section */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-xs uppercase tracking-wider text-zinc-300 font-mono flex items-center space-x-2">
                    <Layers className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Signals in Message ({activeMessage.signals.length})</span>
                  </h3>
                  <button
                    onClick={handleAddSignal}
                    className="px-3 py-1.5 bg-emerald-950 hover:bg-emerald-900 text-emerald-300 border border-emerald-800 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition cursor-pointer shadow-sm"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Signal</span>
                  </button>
                </div>

                {/* Active Signal Detailed Editor */}
                {activeSignal && selectedSignalIndex !== null && (
                  <div className="p-5 bg-zinc-900 border border-zinc-700/90 rounded-2xl space-y-4 shadow-lg">
                    <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                      <div className="flex items-center space-x-2">
                        <span
                          className={`w-3 h-3 rounded-full ${
                            SIGNAL_COLORS[selectedSignalIndex % SIGNAL_COLORS.length].dot
                          }`}
                        />
                        <span className="font-bold text-xs text-zinc-100 font-mono">
                          Editing Signal: {activeSignal.name}
                        </span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleDuplicateSignal(selectedSignalIndex)}
                          className="px-2 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded text-[11px] font-semibold flex items-center space-x-1 cursor-pointer"
                        >
                          <Copy className="w-3 h-3" />
                          <span>Clone</span>
                        </button>
                        <button
                          onClick={() => handleDeleteSignal(selectedSignalIndex)}
                          disabled={activeMessage.signals.length <= 1}
                          className="px-2 py-1 bg-rose-950/60 hover:bg-rose-900 text-rose-300 border border-rose-800 rounded text-[11px] font-semibold flex items-center space-x-1 cursor-pointer disabled:opacity-50"
                        >
                          <Trash2 className="w-3 h-3" />
                          <span>Delete</span>
                        </button>
                      </div>
                    </div>

                    {/* Signal Fields Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                      {/* Signal Name */}
                      <div>
                        <label className="block text-[10px] uppercase font-mono text-zinc-500 mb-1">
                          Signal Name
                        </label>
                        <input
                          type="text"
                          value={activeSignal.name}
                          onChange={(e) => handleUpdateSignalField('name', e.target.value)}
                          className="w-full bg-zinc-950 border border-zinc-700 rounded px-2.5 py-1.5 text-xs text-zinc-200 font-mono focus:outline-none focus:border-emerald-600"
                        />
                      </div>

                      {/* Start Bit */}
                      <div>
                        <label className="block text-[10px] uppercase font-mono text-zinc-500 mb-1">
                          Start Bit (0..{activeMessage.dlc * 8 - 1})
                        </label>
                        <input
                          type="number"
                          min={0}
                          max={activeMessage.dlc * 8 - 1}
                          value={activeSignal.startBit}
                          onChange={(e) => handleUpdateSignalField('startBit', Number(e.target.value))}
                          className="w-full bg-zinc-950 border border-zinc-700 rounded px-2.5 py-1.5 text-xs font-mono text-zinc-200 focus:outline-none focus:border-emerald-600"
                        />
                      </div>

                      {/* Length */}
                      <div>
                        <label className="block text-[10px] uppercase font-mono text-zinc-500 mb-1">
                          Length (Bits)
                        </label>
                        <input
                          type="number"
                          min={1}
                          max={64}
                          value={activeSignal.length}
                          onChange={(e) => handleUpdateSignalField('length', Number(e.target.value))}
                          className="w-full bg-zinc-950 border border-zinc-700 rounded px-2.5 py-1.5 text-xs font-mono text-zinc-200 focus:outline-none focus:border-emerald-600"
                        />
                      </div>

                      {/* Endianness */}
                      <div>
                        <label className="block text-[10px] uppercase font-mono text-zinc-500 mb-1">
                          Byte Order
                        </label>
                        <select
                          value={activeSignal.byteOrder}
                          onChange={(e) =>
                            handleUpdateSignalField(
                              'byteOrder',
                              e.target.value as 'little_endian' | 'big_endian'
                            )
                          }
                          className="w-full bg-zinc-950 border border-zinc-700 rounded px-2.5 py-1.5 text-xs text-zinc-200 font-mono focus:outline-none focus:border-emerald-600 cursor-pointer"
                        >
                          <option value="little_endian">Intel (Little-Endian)</option>
                          <option value="big_endian">Motorola (Big-Endian)</option>
                        </select>
                      </div>

                      {/* Scale */}
                      <div>
                        <label className="block text-[10px] uppercase font-mono text-zinc-500 mb-1">
                          Scale Factor
                        </label>
                        <input
                          type="number"
                          step="any"
                          value={activeSignal.scale}
                          onChange={(e) => handleUpdateSignalField('scale', Number(e.target.value))}
                          className="w-full bg-zinc-950 border border-zinc-700 rounded px-2.5 py-1.5 text-xs font-mono text-zinc-200 focus:outline-none focus:border-emerald-600"
                        />
                      </div>

                      {/* Offset */}
                      <div>
                        <label className="block text-[10px] uppercase font-mono text-zinc-500 mb-1">
                          Offset
                        </label>
                        <input
                          type="number"
                          step="any"
                          value={activeSignal.offset}
                          onChange={(e) => handleUpdateSignalField('offset', Number(e.target.value))}
                          className="w-full bg-zinc-950 border border-zinc-700 rounded px-2.5 py-1.5 text-xs font-mono text-zinc-200 focus:outline-none focus:border-emerald-600"
                        />
                      </div>

                      {/* Unit */}
                      <div>
                        <label className="block text-[10px] uppercase font-mono text-zinc-500 mb-1">
                          Unit
                        </label>
                        <input
                          type="text"
                          value={activeSignal.unit || ''}
                          onChange={(e) => handleUpdateSignalField('unit', e.target.value)}
                          placeholder="e.g. rpm, km/h, °C"
                          className="w-full bg-zinc-950 border border-zinc-700 rounded px-2.5 py-1.5 text-xs font-mono text-cyan-300 focus:outline-none focus:border-emerald-600"
                        />
                      </div>

                      {/* Sign */}
                      <div>
                        <label className="block text-[10px] uppercase font-mono text-zinc-500 mb-1">
                          Signed / Unsigned
                        </label>
                        <select
                          value={activeSignal.isSigned ? 'signed' : 'unsigned'}
                          onChange={(e) => handleUpdateSignalField('isSigned', e.target.value === 'signed')}
                          className="w-full bg-zinc-950 border border-zinc-700 rounded px-2.5 py-1.5 text-xs text-zinc-200 font-mono focus:outline-none focus:border-emerald-600 cursor-pointer"
                        >
                          <option value="unsigned">Unsigned (+)</option>
                          <option value="signed">Signed (-/+)</option>
                        </select>
                      </div>
                    </div>

                    {/* Common Unit Pills */}
                    <div className="flex flex-wrap items-center gap-1 pt-1">
                      <span className="text-[10px] text-zinc-500 font-mono mr-1">Quick Units:</span>
                      {COMMON_UNITS.map((u) => (
                        <button
                          key={u}
                          type="button"
                          onClick={() => handleUpdateSignalField('unit', u)}
                          className={`px-1.5 py-0.5 rounded text-[10px] font-mono transition cursor-pointer border ${
                            activeSignal.unit === u
                              ? 'bg-cyan-950 border-cyan-700 text-cyan-300 font-bold'
                              : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:border-zinc-700'
                          }`}
                        >
                          {u}
                        </button>
                      ))}
                    </div>

                    {/* Interactive Formula & Physical Preview Sandbox */}
                    <div className="p-3 bg-zinc-950 border border-zinc-800 rounded-xl space-y-2">
                      <div className="flex flex-wrap items-center justify-between text-xs font-mono">
                        <span className="text-zinc-400">
                          Formula: Physical = ({' '}
                          <span className="text-cyan-300">Raw</span> × {activeSignal.scale} ) + {activeSignal.offset}{' '}
                          <span className="text-emerald-400 font-bold">{activeSignal.unit}</span>
                        </span>
                        <div className="flex items-center space-x-2">
                          <span className="text-zinc-500 text-[11px]">Test Raw Value:</span>
                          <input
                            type="number"
                            value={rawTestValue}
                            onChange={(e) => setRawTestValue(Number(e.target.value) || 0)}
                            className="w-20 bg-zinc-900 border border-zinc-700 rounded px-2 py-0.5 text-xs text-zinc-200 font-mono text-right"
                          />
                          <span className="text-zinc-400">→</span>
                          <span className="px-2 py-0.5 bg-emerald-950 border border-emerald-800 rounded text-emerald-300 font-bold">
                            {calculatedPhysicalValue} {activeSignal.unit}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Signals Table Overview */}
                <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
                  <table className="w-full text-left font-mono text-xs">
                    <thead className="bg-zinc-950 text-zinc-400 border-b border-zinc-800 uppercase text-[10px]">
                      <tr>
                        <th className="p-3">Color</th>
                        <th className="p-3">Signal Name</th>
                        <th className="p-3">Start | Bits</th>
                        <th className="p-3">Endian</th>
                        <th className="p-3">Scale</th>
                        <th className="p-3">Offset</th>
                        <th className="p-3">Unit</th>
                        <th className="p-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800/60">
                      {activeMessage.signals.map((sig, idx) => {
                        const palette = SIGNAL_COLORS[idx % SIGNAL_COLORS.length];
                        const isSelected = selectedSignalIndex === idx;

                        return (
                          <tr
                            key={sig.name + idx}
                            onClick={() => setSelectedSignalIndex(idx)}
                            className={`cursor-pointer transition ${
                              isSelected ? 'bg-zinc-800/70' : 'hover:bg-zinc-850/40'
                            }`}
                          >
                            <td className="p-3">
                              <span className={`inline-block w-3 h-3 rounded-full ${palette.dot}`} />
                            </td>
                            <td className="p-3 font-bold text-zinc-200">{sig.name}</td>
                            <td className="p-3 text-zinc-300">
                              {sig.startBit} | {sig.length}b
                            </td>
                            <td className="p-3 text-zinc-400 uppercase text-[10px]">
                              {sig.byteOrder === 'little_endian' ? 'Intel' : 'Motorola'}
                            </td>
                            <td className="p-3 text-zinc-300">{sig.scale}</td>
                            <td className="p-3 text-zinc-300">{sig.offset}</td>
                            <td className="p-3 text-cyan-300 font-semibold">{sig.unit || '-'}</td>
                            <td className="p-3 text-right">
                              <div className="flex items-center justify-end space-x-1">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDuplicateSignal(idx);
                                  }}
                                  className="p-1 text-zinc-500 hover:text-zinc-300 transition"
                                  title="Clone signal"
                                >
                                  <Copy className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteSignal(idx);
                                  }}
                                  disabled={activeMessage.signals.length <= 1}
                                  className="p-1 text-zinc-500 hover:text-rose-400 transition disabled:opacity-30"
                                  title="Delete signal"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      ) : activeTab === 'json' ? (
        /* JSON Raw Code Editor View */
        <div className="flex-1 p-6 space-y-4 overflow-y-auto max-w-5xl mx-auto w-full">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-sm text-zinc-100 flex items-center space-x-2">
                <Code2 className="w-4 h-4 text-cyan-400" />
                <span>Raw JSON Schema Code</span>
              </h3>
              <p className="text-xs text-zinc-400">
                Directly edit the underlying JSON schema. Changes sync seamlessly back to the visual designer.
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => {
                  navigator.clipboard.writeText(rawJsonText);
                  setCopiedSuccess(true);
                  setTimeout(() => setCopiedSuccess(false), 2000);
                }}
                className="px-2.5 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded text-xs flex items-center space-x-1 cursor-pointer"
              >
                {copiedSuccess ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                <span>{copiedSuccess ? 'Copied' : 'Copy'}</span>
              </button>
              <button
                onClick={handleApplyRawJson}
                className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs rounded transition cursor-pointer"
              >
                Save &amp; Switch to Visual
              </button>
            </div>
          </div>

          {jsonError && (
            <div className="p-3 bg-rose-950/80 border border-rose-800 text-rose-300 rounded-xl text-xs font-mono">
              Syntax Error: {jsonError}
            </div>
          )}

          <textarea
            value={rawJsonText}
            onChange={(e) => {
              setRawJsonText(e.target.value);
              setJsonError(null);
            }}
            rows={22}
            className="w-full p-4 bg-zinc-900 border border-zinc-800 rounded-xl font-mono text-xs text-zinc-200 focus:outline-none focus:border-cyan-600 leading-relaxed resize-y"
          />
        </div>
      ) : (
        /* Vector DBC Raw View */
        <div className="flex-1 p-6 space-y-4 overflow-y-auto max-w-5xl mx-auto w-full">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-sm text-zinc-100 flex items-center space-x-2">
                <FileCode className="w-4 h-4 text-purple-400" />
                <span>Vector .dbc Representation</span>
              </h3>
              <p className="text-xs text-zinc-400">
                Auto-generated Vector DBC format ready to download and load into standard automotive toolchains.
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={handleDownloadVectorDbc}
                className="px-3 py-1 bg-purple-600 hover:bg-purple-500 text-white font-semibold text-xs rounded transition cursor-pointer flex items-center space-x-1"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download .dbc</span>
              </button>
            </div>
          </div>

          <div className="p-4 bg-zinc-900 border border-zinc-800 rounded-xl font-mono text-xs text-zinc-300 overflow-x-auto leading-relaxed whitespace-pre">
            {exportDbcAsVectorDbc(getCurrentDatabase())}
          </div>
        </div>
      )}
    </div>
  );
};
