import React, { useState, useRef, useEffect } from 'react';
import { CanFrame } from '../types/can';
import { parseTraceFile, ParseTraceResult } from '../utils/traceParser';
import { formatTimestamp, formatBytesHex } from '../utils/formatters';
import {
  Play,
  Pause,
  RotateCcw,
  FastForward,
  Upload,
  FileText,
  CheckCircle2,
  AlertCircle,
  Database,
  Radio,
  Sliders,
  Sparkles,
  Repeat,
  FileCode,
} from 'lucide-react';

interface TraceReplayStationProps {
  onStreamFrameToMonitor?: (frame: CanFrame) => void;
  onSaveTraceToHistory?: (frames: CanFrame[], sessionName: string, notes?: string) => Promise<void>;
  onLoadSessionIntoMonitor?: (frames: CanFrame[], name: string) => void;
  onNavigateToMonitor?: () => void;
  addToast?: (title: string, message?: string, type?: any) => void;
}

const SAMPLE_VECTOR_ASC = `date Mon Sep 14 10:15:30.000 2026
base hex timestamps absolute
internal events logged
// Vector CANoe 14.0 trace log
   0.000000 1  7DF             Tx   d 8 02 01 0C 00 00 00 00 00 Length = 8 BitCount = 111 ID = 2015
   0.012500 1  7E8             Rx   d 8 04 41 0C 1A F8 00 00 00 Length = 8 BitCount = 111 ID = 2024
   0.025000 1  120             Rx   d 8 10 24 3A 00 45 88 12 00
   0.050000 1  7DF             Tx   d 8 02 01 0D 00 00 00 00 00
   0.063200 1  7E8             Rx   d 8 03 41 0D 4B 00 00 00 00
   0.080000 1  280             Rx   d 8 AA BB CC DD EE FF 00 11
   0.100000 CANFD 1 Rx 320 1 0 16 00 11 22 33 44 55 66 77 88 99 AA BB CC DD EE FF
   0.120000 1  7DF             Tx   d 8 02 01 05 00 00 00 00 00
   0.134000 1  7E8             Rx   d 8 03 41 05 78 00 00 00 00
   0.160000 1  18DAF110x       Tx   d 8 02 10 03 00 00 00 00 00
   0.178000 1  18DA10F1x       Rx   d 8 06 50 03 00 32 01 F4 00
   0.200000 CANFD 1 Rx 320 1 0 32 01 02 03 04 05 06 07 08 09 0A 0B 0C 0D 0E 0F 10 11 12 13 14 15 16 17 18 19 1A 1B 1C 1D 1E 1F 20`;

export const TraceReplayStation: React.FC<TraceReplayStationProps> = ({
  onStreamFrameToMonitor,
  onSaveTraceToHistory,
  onLoadSessionIntoMonitor,
  onNavigateToMonitor,
  addToast,
}) => {
  const [loadedFrames, setLoadedFrames] = useState<CanFrame[]>([]);
  const [traceMetadata, setTraceMetadata] = useState<{
    filename: string;
    format: string;
    errorsCount: number;
    totalLines: number;
  } | null>(null);

  // Playback state
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speedMultiplier, setSpeedMultiplier] = useState<number>(1.0);
  const [loopPlayback, setLoopPlayback] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [saveStatus, setSaveStatus] = useState<string | null>(null);

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Handle file reading
  const processFileContent = (content: string, name: string) => {
    const result: ParseTraceResult = parseTraceFile(content, name);
    if (result.frames.length === 0) {
      if (addToast) addToast('Replay File Error', 'No valid CAN frames detected in the file.', 'error');
      return;
    }

    setLoadedFrames(result.frames);
    setTraceMetadata({
      filename: name,
      format: result.format,
      errorsCount: result.errorsCount,
      totalLines: result.totalLines,
    });
    setCurrentIndex(0);
    setIsPlaying(false);

    if (addToast) {
      addToast(
        'Trace Loaded',
        `Parsed ${result.frames.length} frames from ${name} (Format: ${result.format.toUpperCase()})`,
        'success'
      );
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      processFileContent(text, file.name);
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      processFileContent(text, file.name);
    };
    reader.readAsText(file);
  };

  // Load built-in sample
  const handleLoadSample = () => {
    processFileContent(SAMPLE_VECTOR_ASC, 'sample_vector_diagnostic_trace.asc');
  };

  // Playback execution loop
  useEffect(() => {
    if (!isPlaying || loadedFrames.length === 0) {
      if (timerRef.current) clearTimeout(timerRef.current);
      return;
    }

    if (currentIndex >= loadedFrames.length) {
      if (loopPlayback) {
        setCurrentIndex(0);
      } else {
        setIsPlaying(false);
        return;
      }
    }

    const currentFrame = loadedFrames[currentIndex];
    const nextIndex = currentIndex + 1;
    const nextFrame = loadedFrames[nextIndex];

    // Stream to sniffer monitor if callback provided
    if (onStreamFrameToMonitor) {
      onStreamFrameToMonitor({
        ...currentFrame,
        timestamp: Date.now() / 1000, // broadcast with current live time
      });
    }

    // Calculate time delta to next frame
    let delayMs = 50; // default interval
    if (nextFrame) {
      const deltaSec = Math.max(0.001, Math.min(2.0, nextFrame.timestamp - currentFrame.timestamp));
      delayMs = (deltaSec * 1000) / speedMultiplier;
    }

    timerRef.current = setTimeout(() => {
      setCurrentIndex((prev) => prev + 1);
    }, Math.max(5, delayMs));

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [isPlaying, currentIndex, loadedFrames, speedMultiplier, loopPlayback, onStreamFrameToMonitor]);

  // Load all frames directly into sniffer buffer
  const handleLoadAllIntoMonitor = () => {
    if (loadedFrames.length === 0) return;
    if (onLoadSessionIntoMonitor) {
      onLoadSessionIntoMonitor(
        loadedFrames,
        traceMetadata?.filename ? `Replay: ${traceMetadata.filename}` : 'Trace Replay'
      );
      if (addToast) addToast('Loaded into Monitor', `${loadedFrames.length} frames ready in live sniffer`, 'success');
      if (onNavigateToMonitor) onNavigateToMonitor();
    }
  };

  // Save trace into IndexedDB
  const handleSaveToHistory = async () => {
    if (!onSaveTraceToHistory || loadedFrames.length === 0) return;
    try {
      setSaveStatus('Saving...');
      await onSaveTraceToHistory(
        loadedFrames,
        traceMetadata?.filename ? `Import: ${traceMetadata.filename}` : 'Imported Trace File',
        `Imported from ${traceMetadata?.format?.toUpperCase()} log (${loadedFrames.length} frames)`
      );
      setSaveStatus('Saved to History!');
      if (addToast) addToast('Saved to History', `Session persisted in IndexedDB`, 'success');
      setTimeout(() => setSaveStatus(null), 2500);
    } catch (err: any) {
      setSaveStatus(`Save failed: ${err.message}`);
    }
  };

  const progressPercent =
    loadedFrames.length > 0 ? Math.min(100, (currentIndex / loadedFrames.length) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Hidden file input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept=".asc,.csv,.tsv,.log,.txt,.json"
        className="hidden"
      />

      {/* Drag & Drop Upload Zone */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragOver(true);
        }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition flex flex-col items-center justify-center space-y-3 ${
          isDragOver
            ? 'border-cyan-400 bg-cyan-950/20'
            : 'border-zinc-700 bg-zinc-900/50 hover:bg-zinc-900 hover:border-zinc-600'
        }`}
      >
        <div className="w-12 h-12 rounded-full bg-zinc-800 flex items-center justify-center text-cyan-400 shadow-md">
          <Upload className="w-6 h-6" />
        </div>
        <div>
          <p className="text-sm font-semibold text-zinc-100">
            Click to upload or drag & drop CAN trace file
          </p>
          <p className="text-xs text-zinc-400 mt-1">
            Supports <strong className="text-zinc-300">Vector ASCII (.asc)</strong>,{' '}
            <strong className="text-zinc-300">SocketCAN candump (.log/.txt)</strong>,{' '}
            <strong className="text-zinc-300">CSV</strong>, and{' '}
            <strong className="text-zinc-300">JSON</strong> files
          </p>
        </div>

        <div className="pt-2 flex items-center space-x-3">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleLoadSample();
            }}
            className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-cyan-300 text-xs rounded-lg font-medium flex items-center space-x-1.5 transition border border-zinc-700 shadow"
          >
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            <span>Load Sample Vector .asc Trace (with CAN-FD & OBD)</span>
          </button>
        </div>
      </div>

      {/* Replay Control Bar & Metadata */}
      {loadedFrames.length > 0 && traceMetadata && (
        <div className="p-5 bg-zinc-900 border border-zinc-800 rounded-xl space-y-5">
          {/* File Metadata Overview */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-800 pb-4">
            <div className="flex items-center space-x-3">
              <FileCode className="w-5 h-5 text-cyan-400" />
              <div>
                <span className="font-bold text-zinc-100 text-sm block">{traceMetadata.filename}</span>
                <div className="flex items-center space-x-2 text-xs text-zinc-400 mt-0.5">
                  <span className="px-2 py-0.5 bg-zinc-800 rounded text-[10px] uppercase font-bold text-cyan-300">
                    {traceMetadata.format}
                  </span>
                  <span>•</span>
                  <span>{loadedFrames.length} Frames Parsed</span>
                  {traceMetadata.errorsCount > 0 && (
                    <>
                      <span>•</span>
                      <span className="text-amber-400">
                        {traceMetadata.errorsCount} skipped/header lines
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={handleSaveToHistory}
                className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition border border-zinc-700 cursor-pointer"
              >
                <Database className="w-3.5 h-3.5 text-amber-400" />
                <span>{saveStatus || 'Save to Capture History'}</span>
              </button>

              <button
                onClick={handleLoadAllIntoMonitor}
                className="px-3.5 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-xs font-bold flex items-center space-x-1.5 transition shadow cursor-pointer"
              >
                <Radio className="w-3.5 h-3.5" />
                <span>Load All into Live Sniffer</span>
              </button>
            </div>
          </div>

          {/* Interactive Replay Engine Controls */}
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs text-zinc-400">
              <div className="flex items-center space-x-2">
                <span className="font-mono text-zinc-200 font-bold">
                  Frame {currentIndex} / {loadedFrames.length}
                </span>
                <span>•</span>
                <span>{progressPercent.toFixed(1)}%</span>
              </div>
              <div className="flex items-center space-x-3">
                <label className="flex items-center space-x-1 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={loopPlayback}
                    onChange={(e) => setLoopPlayback(e.target.checked)}
                    className="rounded bg-zinc-950 border-zinc-700 text-cyan-500"
                  />
                  <Repeat className="w-3 h-3 text-zinc-400" />
                  <span className="text-xs text-zinc-300">Loop</span>
                </label>
              </div>
            </div>

            {/* Progress Bar / Scrubber */}
            <div className="relative w-full h-2.5 bg-zinc-950 rounded-full overflow-hidden border border-zinc-800">
              <div
                className="h-full bg-cyan-500 transition-all duration-75"
                style={{ width: `${progressPercent}%` }}
              />
            </div>

            {/* Buttons Bar */}
            <div className="flex flex-wrap items-center justify-between gap-4 pt-1">
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => {
                    setCurrentIndex(0);
                    setIsPlaying(false);
                  }}
                  className="p-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg transition cursor-pointer"
                  title="Reset to start"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>

                <button
                  onClick={() => setIsPlaying(!isPlaying)}
                  className={`px-4 py-2 rounded-lg text-xs font-bold flex items-center space-x-2 transition cursor-pointer shadow ${
                    isPlaying
                      ? 'bg-amber-600 hover:bg-amber-500 text-white'
                      : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                  }`}
                >
                  {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                  <span>{isPlaying ? 'Pause Replay' : 'Play Live Stream'}</span>
                </button>

                <button
                  onClick={() => {
                    setIsPlaying(false);
                    setCurrentIndex((prev) => Math.min(loadedFrames.length - 1, prev + 1));
                    if (onStreamFrameToMonitor && loadedFrames[currentIndex]) {
                      onStreamFrameToMonitor({
                        ...loadedFrames[currentIndex],
                        timestamp: Date.now() / 1000,
                      });
                    }
                  }}
                  disabled={currentIndex >= loadedFrames.length - 1}
                  className="px-3 py-2 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-40 text-zinc-300 rounded-lg text-xs font-semibold transition cursor-pointer"
                >
                  Step Next &gt;
                </button>
              </div>

              {/* Speed Multipliers */}
              <div className="flex items-center space-x-1.5 text-xs">
                <span className="text-zinc-400 mr-1 flex items-center space-x-1">
                  <FastForward className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Speed:</span>
                </span>
                {[0.5, 1.0, 2.0, 5.0, 10.0].map((rate) => (
                  <button
                    key={rate}
                    onClick={() => setSpeedMultiplier(rate)}
                    className={`px-2 py-1 rounded text-xs font-mono transition cursor-pointer ${
                      speedMultiplier === rate
                        ? 'bg-cyan-600 text-white font-bold'
                        : 'bg-zinc-800 text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    {rate}x
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Frame List Preview */}
          <div className="border border-zinc-800 rounded-lg overflow-hidden">
            <div className="px-3 py-2 bg-zinc-950 text-xs font-semibold text-zinc-300 border-b border-zinc-800 flex items-center justify-between">
              <span>Parsed Frames Preview ({loadedFrames.length} items)</span>
              <span className="text-[11px] text-zinc-500 font-mono">
                Current Position: #{currentIndex}
              </span>
            </div>
            <div className="max-h-64 overflow-y-auto divide-y divide-zinc-800/60 font-mono text-xs">
              {loadedFrames.slice(0, 50).map((frame, idx) => {
                const isCurrent = idx === currentIndex;
                return (
                  <div
                    key={idx}
                    onClick={() => setCurrentIndex(idx)}
                    className={`px-3 py-1.5 flex items-center justify-between transition cursor-pointer ${
                      isCurrent
                        ? 'bg-cyan-950/70 border-l-4 border-cyan-400 text-cyan-200 font-bold'
                        : 'hover:bg-zinc-800/40 text-zinc-300'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <span className="text-[10px] text-zinc-500 w-8">#{idx + 1}</span>
                      <span className="font-bold text-cyan-400 w-16">{frame.idHex}</span>
                      <span
                        className={`text-[10px] px-1.5 py-0.2 rounded font-sans font-bold ${
                          frame.direction === 'TX'
                            ? 'bg-amber-950 text-amber-300'
                            : 'bg-cyan-950 text-cyan-300'
                        }`}
                      >
                        {frame.direction}
                      </span>
                      {frame.fd && (
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-indigo-950 text-indigo-300 font-sans font-bold">
                          FD
                        </span>
                      )}
                      <span className="text-zinc-400 text-[11px] truncate max-w-sm">
                        {formatBytesHex(frame.data)}
                      </span>
                    </div>

                    <span className="text-[10px] text-zinc-500">
                      {frame.timestamp.toFixed(4)}s
                    </span>
                  </div>
                );
              })}
              {loadedFrames.length > 50 && (
                <div className="px-3 py-2 text-center text-xs text-zinc-500 bg-zinc-950/50">
                  ... and {loadedFrames.length - 50} more frames
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
