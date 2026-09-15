import React, { useState } from 'react';
import { RecordingSession, CanFrame } from '../types/can';
import { exportToVectorAsc, exportToSocketCanDump, downloadFile } from '../utils/traceExporter';
import {
  Play,
  Square,
  Download,
  HardDrive,
  FileText,
  CheckCircle2,
  Clock,
  Layers,
  Archive,
  ArrowRight,
  ShieldCheck,
  Save,
  FileCode,
  Terminal,
} from 'lucide-react';

interface LoggingPageProps {
  recording: RecordingSession;
  onToggleRecording: () => void;
  frames: CanFrame[];
  onClear: () => void;
  onSaveToIndexedDb?: (name?: string, notes?: string) => Promise<any>;
  onNavigateToHistory?: () => void;
}

export const LoggingPage: React.FC<LoggingPageProps> = ({
  recording,
  onToggleRecording,
  frames,
  onClear,
  onSaveToIndexedDb,
  onNavigateToHistory,
}) => {
  const isRecording = recording.isRecording;
  const [isSavingDb, setIsSavingDb] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleSaveToDb = async () => {
    if (!onSaveToIndexedDb || frames.length === 0) return;
    setIsSavingDb(true);
    try {
      await onSaveToIndexedDb(
        `Recording Session Snapshot (${frames.length} frames)`,
        'Captured from Logging & Trace recorder'
      );
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    } catch {
      // Handled in store
    } finally {
      setIsSavingDb(false);
    }
  };

  const handleDownloadCsv = () => {
    const header = 'timestamp,direction,id,type,dlc,data\n';
    const rows = frames.map((f) => {
      const ftype = f.extended && f.fd ? 'EXT_FD' : f.extended ? 'EXT' : f.fd ? 'STD_FD' : 'STD';
      const dataStr = f.data.map((b) => b.toString(16).toUpperCase().padStart(2, '0')).join(' ');
      return `${f.timestamp.toFixed(6)},${f.direction},${f.idHex},${ftype},${f.dlc},${dataStr}`;
    });
    const blob = new Blob([header + rows.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `canscope_log_${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadJson = () => {
    const blob = new Blob([JSON.stringify(frames, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `canscope_log_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadAsc = () => {
    const content = exportToVectorAsc(frames);
    downloadFile(content, `canscope_trace_${Date.now()}.asc`, 'text/plain');
  };

  const handleDownloadCandump = () => {
    const content = exportToSocketCanDump(frames, 'can0');
    downloadFile(content, `candump_${Date.now()}.log`, 'text/plain');
  };

  const estimatedSizeMb = ((frames.length * 48) / (1024 * 1024)).toFixed(2);

  return (
    <div className="p-6 space-y-6 overflow-y-auto h-full text-zinc-200">
      <div>
        <h2 className="text-base font-bold text-zinc-100 flex items-center space-x-2">
          <HardDrive className="w-5 h-5 text-cyan-400" />
          <span>CAN Bus Traffic Recording & Log Export</span>
        </h2>
        <p className="text-xs text-zinc-400 mt-1">
          High-throughput capture buffer with export to standard CSV, JSON, and raw timestamped traces
        </p>
      </div>

      {/* Primary Session Card */}
      <div className="p-6 bg-zinc-900 border border-zinc-800 rounded-xl shadow-md">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-zinc-800">
          <div>
            <div className="flex items-center space-x-3">
              <span
                className={`w-3 h-3 rounded-full ${
                  isRecording ? 'bg-rose-500 animate-ping' : 'bg-zinc-600'
                }`}
              />
              <span className="font-bold text-sm text-zinc-100">
                {isRecording ? 'ACTIVE RECORDING SESSION' : 'RECORDING STANDBY'}
              </span>
            </div>
            <p className="text-xs text-zinc-400 mt-1 font-mono">
              Capturing all bus frames (Standard, Extended, CAN-FD) with sub-millisecond timestamps
            </p>
          </div>

          <button
            onClick={onToggleRecording}
            className={`px-5 py-2.5 rounded-lg font-bold text-xs flex items-center space-x-2 shadow-md transition active:scale-95 cursor-pointer ${
              isRecording
                ? 'bg-rose-600 hover:bg-rose-500 text-white'
                : 'bg-emerald-600 hover:bg-emerald-500 text-white'
            }`}
          >
            {isRecording ? <Square className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current" />}
            <span>{isRecording ? 'Stop & Finalize' : 'Start Recording (R)'}</span>
          </button>
        </div>

        {/* Live Capture Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-6 text-center font-mono">
          <div className="p-4 bg-zinc-950/60 border border-zinc-800 rounded-lg">
            <span className="text-xs text-zinc-500 block uppercase font-sans">Captured Frames</span>
            <span className="text-2xl font-bold text-zinc-100 mt-1 block">
              {frames.length.toLocaleString()}
            </span>
          </div>

          <div className="p-4 bg-zinc-950/60 border border-zinc-800 rounded-lg">
            <span className="text-xs text-zinc-500 block uppercase font-sans">Buffer Memory</span>
            <span className="text-2xl font-bold text-cyan-300 mt-1 block">
              {estimatedSizeMb} MB
            </span>
          </div>

          <div className="p-4 bg-zinc-950/60 border border-zinc-800 rounded-lg">
            <span className="text-xs text-zinc-500 block uppercase font-sans">Trace Formats</span>
            <span className="text-base font-bold text-emerald-400 mt-2 block">
              CSV • JSON • ASC
            </span>
          </div>
        </div>
      </div>

      {/* Export Options */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {/* CSV Exporter */}
        <div className="p-5 bg-zinc-900 border border-zinc-800 rounded-xl space-y-3 flex flex-col justify-between">
          <div>
            <div className="flex items-center space-x-2 text-zinc-100 font-bold text-sm">
              <FileText className="w-4 h-4 text-emerald-400" />
              <span>Standard CSV</span>
            </div>
            <p className="text-xs text-zinc-400 leading-relaxed font-mono mt-1">
              timestamp, direction, id, type, dlc, data (hex)
            </p>
            <div className="p-2 bg-zinc-950 border border-zinc-800 rounded text-[10px] font-mono text-zinc-400 truncate mt-2">
              175780123.456,RX,0x100,STD,8,0F 00 40 1F...
            </div>
          </div>
          <button
            onClick={handleDownloadCsv}
            disabled={frames.length === 0}
            className="w-full py-2 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-40 text-zinc-200 rounded-lg text-xs font-semibold flex items-center justify-center space-x-2 transition cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-emerald-400" />
            <span>Export CSV</span>
          </button>
        </div>

        {/* JSON Exporter */}
        <div className="p-5 bg-zinc-900 border border-zinc-800 rounded-xl space-y-3 flex flex-col justify-between">
          <div>
            <div className="flex items-center space-x-2 text-zinc-100 font-bold text-sm">
              <FileCode className="w-4 h-4 text-cyan-400" />
              <span>Structured JSON</span>
            </div>
            <p className="text-xs text-zinc-400 leading-relaxed mt-1">
              Full fidelity JSON with timestamps and decoded signal maps
            </p>
            <div className="p-2 bg-zinc-950 border border-zinc-800 rounded text-[10px] font-mono text-zinc-400 truncate mt-2">
              {`[ { "id": 256, "idHex": "0x100", "dlc": 8 } ]`}
            </div>
          </div>
          <button
            onClick={handleDownloadJson}
            disabled={frames.length === 0}
            className="w-full py-2 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-40 text-zinc-200 rounded-lg text-xs font-semibold flex items-center justify-center space-x-2 transition cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-cyan-400" />
            <span>Export JSON</span>
          </button>
        </div>

        {/* Vector .asc Exporter */}
        <div className="p-5 bg-zinc-900 border border-zinc-800 rounded-xl space-y-3 flex flex-col justify-between">
          <div>
            <div className="flex items-center space-x-2 text-zinc-100 font-bold text-sm">
              <FileText className="w-4 h-4 text-amber-400" />
              <span>Vector .asc Trace</span>
            </div>
            <p className="text-xs text-zinc-400 leading-relaxed mt-1">
              Compatible with Vector CANoe, CANalyzer, and PCAN-View
            </p>
            <div className="p-2 bg-zinc-950 border border-zinc-800 rounded text-[10px] font-mono text-amber-300/80 truncate mt-2">
              0.001200 1 100 Rx d 8 0F 00 40 1F...
            </div>
          </div>
          <button
            onClick={handleDownloadAsc}
            disabled={frames.length === 0}
            className="w-full py-2 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-40 text-zinc-200 rounded-lg text-xs font-semibold flex items-center justify-center space-x-2 transition cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-amber-400" />
            <span>Export Vector .ASC</span>
          </button>
        </div>

        {/* SocketCAN candump Exporter */}
        <div className="p-5 bg-zinc-900 border border-zinc-800 rounded-xl space-y-3 flex flex-col justify-between">
          <div>
            <div className="flex items-center space-x-2 text-zinc-100 font-bold text-sm">
              <Terminal className="w-4 h-4 text-indigo-400" />
              <span>SocketCAN Log</span>
            </div>
            <p className="text-xs text-zinc-400 leading-relaxed mt-1">
              Native Linux can-utils format for <code>canplayer -I file.log</code>
            </p>
            <div className="p-2 bg-zinc-950 border border-zinc-800 rounded text-[10px] font-mono text-indigo-300/80 truncate mt-2">
              (175780123.456) can0 100#0F00401F...
            </div>
          </div>
          <button
            onClick={handleDownloadCandump}
            disabled={frames.length === 0}
            className="w-full py-2 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-40 text-zinc-200 rounded-lg text-xs font-semibold flex items-center justify-center space-x-2 transition cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-indigo-400" />
            <span>Export candump .LOG</span>
          </button>
        </div>
      </div>

      {/* IndexedDB 6-Month Sniffer Persistence Banner */}
      <div className="p-5 bg-zinc-900/90 border border-zinc-800 rounded-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-start space-x-3">
          <div className="p-2 bg-cyan-950/80 border border-cyan-800/60 text-cyan-400 rounded-lg shrink-0 mt-0.5">
            <Archive className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-bold text-sm text-zinc-100">
                IndexedDB Local Browser Cache (6-Month Storage)
              </span>
              <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-emerald-950 text-emerald-300 border border-emerald-800/60">
                100+ Captures/Day Ready
              </span>
            </div>
            <p className="text-xs text-zinc-400 mt-1 max-w-2xl leading-relaxed">
              Persist sniffer captures directly inside your browser&apos;s client database with automatic 6-month retention, instant CAN ID search indexing, and offline replay capabilities.
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2 shrink-0">
          <button
            onClick={handleSaveToDb}
            disabled={frames.length === 0 || isSavingDb}
            className={`px-3.5 py-2 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition cursor-pointer ${
              savedSuccess
                ? 'bg-emerald-600 text-zinc-950'
                : frames.length > 0
                ? 'bg-cyan-600 hover:bg-cyan-500 text-zinc-950 shadow-sm'
                : 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
            }`}
          >
            {savedSuccess ? (
              <>
                <CheckCircle2 className="w-4 h-4" />
                <span>Saved to Cache!</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>Save to IndexedDB ({frames.length})</span>
              </>
            )}
          </button>

          {onNavigateToHistory && (
            <button
              onClick={onNavigateToHistory}
              className="px-3 py-2 rounded-lg text-xs font-medium bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 transition cursor-pointer flex items-center space-x-1"
            >
              <span>View History Cache</span>
              <ArrowRight className="w-3.5 h-3.5 text-zinc-400" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
