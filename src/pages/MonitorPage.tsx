import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { CanFrame, FilterConfig } from '../types/can';
import { formatTimestamp, formatBytesHex, formatAscii } from '../utils/formatters';
import {
  CaptureTriggerModal,
  TriggerConfig,
  DEFAULT_TRIGGER_CONFIG,
} from '../components/CaptureTriggerModal';
import {
  Play,
  Pause,
  Trash2,
  Download,
  ArrowDown,
  Filter,
  Search,
  Eye,
  Settings2,
  SlidersHorizontal,
  Archive,
  Clock,
  Save,
  Crosshair,
  Zap,
  RotateCcw,
} from 'lucide-react';

interface MonitorPageProps {
  frames: CanFrame[];
  isPaused: boolean;
  onTogglePause: () => void;
  onClear: () => void;
  onSelectFrame: (frame: CanFrame) => void;
  maxLimit: number;
  onSetMaxLimit: (limit: number) => void;
  onSaveToIndexedDb?: () => void;
  onOpenHistory?: () => void;
}

export const MonitorPage: React.FC<MonitorPageProps> = ({
  frames,
  isPaused,
  onTogglePause,
  onClear,
  onSelectFrame,
  maxLimit,
  onSetMaxLimit,
  onSaveToIndexedDb,
  onOpenHistory,
}) => {
  const [autoScroll, setAutoScroll] = useState(true);
  const [timeMode, setTimeMode] = useState<'relative' | 'absolute'>('relative');
  const [directionFilter, setDirectionFilter] = useState<'all' | 'RX' | 'TX'>('all');
  const [protocolFilter, setProtocolFilter] = useState<'all' | 'classic' | 'fd'>('all');
  const [channelFilter, setChannelFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [idRangeMin, setIdRangeMin] = useState<string>('');
  const [idRangeMax, setIdRangeMax] = useState<string>('');

  // Conditional Capture Trigger State
  const [triggerConfig, setTriggerConfig] = useState<TriggerConfig>(DEFAULT_TRIGGER_CONFIG);
  const [isTriggerModalOpen, setIsTriggerModalOpen] = useState(false);
  const [triggerStatus, setTriggerStatus] = useState<'disarmed' | 'armed' | 'firing' | 'fired'>('disarmed');
  const [firedTriggerInfo, setFiredTriggerInfo] = useState<{
    idHex: string;
    timestamp: number;
    description: string;
  } | null>(null);

  const postFramesRemainingRef = useRef<number>(0);
  const lastEvaluatedIndexRef = useRef<number>(0);

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Trigger evaluation engine
  useEffect(() => {
    if (triggerStatus === 'disarmed' || triggerStatus === 'fired') {
      lastEvaluatedIndexRef.current = frames.length;
      return;
    }

    const newFrames = frames.slice(lastEvaluatedIndexRef.current);
    lastEvaluatedIndexRef.current = frames.length;
    if (newFrames.length === 0) return;

    if (triggerStatus === 'firing') {
      postFramesRemainingRef.current -= newFrames.length;
      if (postFramesRemainingRef.current <= 0) {
        setTriggerStatus('fired');
        if (triggerConfig.action === 'freeze_buffer' && !isPaused) {
          onTogglePause();
        }
        if (triggerConfig.action === 'snapshot_indexeddb') {
          onSaveToIndexedDb?.();
        }
      }
      return;
    }

    // Inspect each new frame for trigger criteria
    for (const frame of newFrames) {
      let matches = false;
      let desc = '';

      if (triggerConfig.conditionType === 'id_match') {
        const targetId = triggerConfig.targetIdHex.startsWith('0x')
          ? parseInt(triggerConfig.targetIdHex, 16)
          : parseInt(triggerConfig.targetIdHex, 10);
        if (!isNaN(targetId) && frame.id === targetId) {
          matches = true;
          desc = `Matched Target CAN ID ${frame.idHex}`;
        }
      } else if (triggerConfig.conditionType === 'byte_match') {
        let idMatches = true;
        if (triggerConfig.targetIdHex.trim()) {
          const targetId = triggerConfig.targetIdHex.startsWith('0x')
            ? parseInt(triggerConfig.targetIdHex, 16)
            : parseInt(triggerConfig.targetIdHex, 10);
          if (!isNaN(targetId) && frame.id !== targetId) {
            idMatches = false;
          }
        }

        if (idMatches && frame.data.length > triggerConfig.byteIndex) {
          const byteVal = frame.data[triggerConfig.byteIndex];
          const targetVal = triggerConfig.byteValueHex.startsWith('0x')
            ? parseInt(triggerConfig.byteValueHex, 16)
            : parseInt(triggerConfig.byteValueHex, 10);

          if (!isNaN(targetVal)) {
            if (triggerConfig.byteOperator === '==' && byteVal === targetVal) matches = true;
            else if (triggerConfig.byteOperator === '!=' && byteVal !== targetVal) matches = true;
            else if (triggerConfig.byteOperator === '>' && byteVal > targetVal) matches = true;
            else if (triggerConfig.byteOperator === '<' && byteVal < targetVal) matches = true;

            if (matches) {
              desc = `Byte[${triggerConfig.byteIndex}] (0x${byteVal
                .toString(16)
                .toUpperCase()
                .padStart(2, '0')}) ${triggerConfig.byteOperator} ${triggerConfig.byteValueHex}`;
            }
          }
        }
      } else if (triggerConfig.conditionType === 'dlc_condition') {
        if (triggerConfig.dlcOperator === '>' && frame.dlc > triggerConfig.dlcValue) matches = true;
        else if (triggerConfig.dlcOperator === '==' && frame.dlc === triggerConfig.dlcValue) matches = true;
        else if (triggerConfig.dlcOperator === '<' && frame.dlc < triggerConfig.dlcValue) matches = true;

        if (matches) desc = `DLC (${frame.dlc}) ${triggerConfig.dlcOperator} ${triggerConfig.dlcValue}`;
      } else if (triggerConfig.conditionType === 'fd_brs') {
        if (frame.brs || (frame.fd && frame.dlc > 8)) {
          matches = true;
          desc = `CAN-FD BRS Flag Active on ID ${frame.idHex}`;
        }
      } else if (triggerConfig.conditionType === 'id_range') {
        const minId = triggerConfig.idRangeMinHex.startsWith('0x')
          ? parseInt(triggerConfig.idRangeMinHex, 16)
          : parseInt(triggerConfig.idRangeMinHex, 10);
        const maxId = triggerConfig.idRangeMaxHex.startsWith('0x')
          ? parseInt(triggerConfig.idRangeMaxHex, 16)
          : parseInt(triggerConfig.idRangeMaxHex, 10);
        if (!isNaN(minId) && !isNaN(maxId) && frame.id >= minId && frame.id <= maxId) {
          matches = true;
          desc = `CAN ID ${frame.idHex} in range [${triggerConfig.idRangeMinHex}..${triggerConfig.idRangeMaxHex}]`;
        }
      }

      if (matches) {
        setFiredTriggerInfo({
          idHex: frame.idHex,
          timestamp: frame.timestamp,
          description: desc,
        });

        if (triggerConfig.action === 'highlight_only') {
          setTriggerStatus('fired');
        } else {
          setTriggerStatus('firing');
          postFramesRemainingRef.current = triggerConfig.postTriggerFrames;
        }
        break;
      }
    }
  }, [frames, triggerStatus, triggerConfig, isPaused, onTogglePause, onSaveToIndexedDb]);

  const handleArmTrigger = useCallback(() => {
    setTriggerStatus('armed');
    setFiredTriggerInfo(null);
    lastEvaluatedIndexRef.current = frames.length;
    if (isPaused) {
      onTogglePause(); // Resume capturing to await trigger event
    }
  }, [frames.length, isPaused, onTogglePause]);

  const handleDisarmTrigger = useCallback(() => {
    setTriggerStatus('disarmed');
  }, []);

  const handleReArmTrigger = useCallback(() => {
    setTriggerStatus('armed');
    setFiredTriggerInfo(null);
    lastEvaluatedIndexRef.current = frames.length;
    if (isPaused) {
      onTogglePause();
    }
  }, [frames.length, isPaused, onTogglePause]);

  // Auto-scroll when new frames arrive unless user scrolled up or paused
  useEffect(() => {
    if (autoScroll && !isPaused && scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
    }
  }, [frames, autoScroll, isPaused]);

  // Handle user manual scroll: if scrolled away from bottom, disable autoscroll
  const handleScroll = () => {
    if (!scrollContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
    const isAtBottom = scrollHeight - (scrollTop + clientHeight) < 40;
    if (!isAtBottom && autoScroll) {
      setAutoScroll(false);
    }
  };

  // Filter frames based on user criteria
  const filteredFrames = useMemo(() => {
    let result = frames;

    if (directionFilter !== 'all') {
      result = result.filter((f) => f.direction === directionFilter);
    }

    if (protocolFilter === 'classic') {
      result = result.filter((f) => !f.fd);
    } else if (protocolFilter === 'fd') {
      result = result.filter((f) => f.fd);
    }

    if (channelFilter !== 'all') {
      result = result.filter((f) => (f.channel || 'can0') === channelFilter);
    }

    // ID Range filter
    const minId = idRangeMin.trim()
      ? idRangeMin.startsWith('0x')
        ? parseInt(idRangeMin, 16)
        : parseInt(idRangeMin, 10)
      : null;
    const maxId = idRangeMax.trim()
      ? idRangeMax.startsWith('0x')
        ? parseInt(idRangeMax, 16)
        : parseInt(idRangeMax, 10)
      : null;

    if (minId !== null && !isNaN(minId)) {
      result = result.filter((f) => f.id >= minId);
    }
    if (maxId !== null && !isNaN(maxId)) {
      result = result.filter((f) => f.id <= maxId);
    }

    // Search query: check ID, Hex, or payload
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      result = result.filter((f) => {
        if (f.idHex.toLowerCase().includes(q)) return true;
        if (f.id.toString().includes(q)) return true;
        const hexStr = f.data.map((b) => b.toString(16).padStart(2, '0')).join('').toLowerCase();
        if (hexStr.includes(q.replace(/\s+/g, ''))) return true;
        if (f.decoded) {
          const matchDecoded = Object.keys(f.decoded).some(
            (k) => k.toLowerCase().includes(q) || String(f.decoded![k]).toLowerCase().includes(q)
          );
          if (matchDecoded) return true;
        }
        return false;
      });
    }

    return result;
  }, [frames, directionFilter, protocolFilter, channelFilter, searchQuery, idRangeMin, idRangeMax]);

  const handleExportCsv = () => {
    const header = 'timestamp,direction,id,type,dlc,data\n';
    const rows = filteredFrames.map((f) => {
      const ftype = f.extended && f.fd ? 'EXT_FD' : f.extended ? 'EXT' : f.fd ? 'STD_FD' : 'STD';
      const dataStr = f.data.map((b) => b.toString(16).toUpperCase().padStart(2, '0')).join(' ');
      return `${f.timestamp.toFixed(6)},${f.direction},${f.idHex},${ftype},${f.dlc},${dataStr}`;
    });
    const blob = new Blob([header + rows.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `canscope_capture_${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col h-full bg-zinc-950 text-zinc-200 select-none">
      {/* Top Filter & Sniffer Control Toolbar */}
      <div className="p-3 bg-zinc-900 border-b border-zinc-800/80 flex flex-wrap items-center justify-between gap-3 text-xs">
        {/* Left: Stream Control Buttons */}
        <div className="flex items-center space-x-2">
          <button
            onClick={onTogglePause}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded font-semibold transition active:scale-95 cursor-pointer ${
              isPaused
                ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                : 'bg-amber-600/90 hover:bg-amber-500 text-white'
            }`}
            title="Pause/Resume Sniffer (Space)"
          >
            {isPaused ? <Play className="w-3.5 h-3.5 fill-current" /> : <Pause className="w-3.5 h-3.5 fill-current" />}
            <span>{isPaused ? 'Resume' : 'Pause'}</span>
          </button>

          <button
            onClick={onClear}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded bg-zinc-800 hover:bg-rose-950/60 text-zinc-300 hover:text-rose-300 border border-zinc-700 hover:border-rose-600/40 transition active:scale-95 cursor-pointer"
            title="Clear Messages (C)"
          >
            <Trash2 className="w-3.5 h-3.5 text-rose-400" />
            <span>Clear</span>
          </button>

          <div className="h-4 w-px bg-zinc-700" />

          {/* Autoscroll Toggle */}
          <button
            onClick={() => setAutoScroll((a) => !a)}
            className={`flex items-center space-x-1.5 px-2.5 py-1.5 rounded border transition cursor-pointer ${
              autoScroll
                ? 'bg-cyan-950/80 border-cyan-600 text-cyan-300'
                : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:text-zinc-200'
            }`}
            title="Auto-scroll to newest frame"
          >
            <ArrowDown className={`w-3.5 h-3.5 ${autoScroll ? 'animate-bounce' : ''}`} />
            <span>Auto-Scroll</span>
          </button>

          {/* Time mode */}
          <button
            onClick={() => setTimeMode((m) => (m === 'relative' ? 'absolute' : 'relative'))}
            className="px-2.5 py-1.5 rounded bg-zinc-800 border border-zinc-700 text-zinc-300 hover:text-white transition cursor-pointer"
            title="Toggle time presentation"
          >
            Time: <span className="font-semibold text-cyan-400 capitalize">{timeMode}</span>
          </button>

          {/* Conditional Capture Trigger Button */}
          {triggerStatus === 'disarmed' && (
            <button
              onClick={() => setIsTriggerModalOpen(true)}
              className="flex items-center space-x-1.5 px-2.5 py-1.5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700 hover:border-amber-500/50 transition cursor-pointer"
              title="Configure conditional logic analyzer triggers (Stop on CAN ID, Byte Match, or Error)"
            >
              <Crosshair className="w-3.5 h-3.5 text-amber-400" />
              <span>Trigger: <strong className="text-zinc-400">Off</strong></span>
            </button>
          )}

          {triggerStatus === 'armed' && (
            <button
              onClick={() => setIsTriggerModalOpen(true)}
              className="flex items-center space-x-1.5 px-2.5 py-1.5 rounded bg-red-950/80 hover:bg-red-900 text-red-200 border border-red-700 animate-pulse transition cursor-pointer shadow-sm"
              title="Capture Trigger is Armed. Click to modify or disarm."
            >
              <Zap className="w-3.5 h-3.5 text-red-400 fill-current" />
              <span className="font-semibold text-xs">
                ARMED ({triggerConfig.conditionType === 'id_match' ? triggerConfig.targetIdHex : triggerConfig.conditionType})
              </span>
            </button>
          )}

          {triggerStatus === 'firing' && (
            <div className="flex items-center space-x-1.5 px-2.5 py-1.5 rounded bg-amber-950/90 border border-amber-600 text-amber-200 text-xs animate-pulse">
              <Crosshair className="w-3.5 h-3.5 text-amber-400" />
              <span>Recording Post-Trigger ({postFramesRemainingRef.current})...</span>
            </div>
          )}

          {triggerStatus === 'fired' && (
            <div className="flex items-center space-x-1.5 px-2 py-1 rounded bg-amber-950/80 border border-amber-500/80 text-amber-200 text-xs">
              <Crosshair className="w-3.5 h-3.5 text-amber-400" />
              <span className="font-mono font-semibold">
                TRIP: {firedTriggerInfo?.idHex}
              </span>
              <button
                onClick={handleReArmTrigger}
                className="px-1.5 py-0.5 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold rounded text-[10px] cursor-pointer flex items-center space-x-0.5"
                title="Re-Arm Trigger"
              >
                <RotateCcw className="w-2.5 h-2.5" />
                <span>Re-Arm</span>
              </button>
            </div>
          )}
        </div>

        {/* Center: Search & Filter Box */}
        <div className="flex items-center space-x-2 flex-1 max-w-md">
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-zinc-400" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter by ID (0x100), payload hex, or DBC signal... (F)"
              className="w-full pl-8 pr-3 py-1.5 bg-zinc-950 border border-zinc-700 rounded text-zinc-200 font-mono text-xs focus:outline-none focus:border-cyan-500"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-2 text-zinc-500 hover:text-zinc-300 text-xs"
              >
                ✕
              </button>
            )}
          </div>

          {/* Filter presets */}
          <select
            value={directionFilter}
            onChange={(e: any) => setDirectionFilter(e.target.value)}
            className="bg-zinc-950 border border-zinc-700 rounded px-2 py-1.5 text-zinc-300 text-xs focus:outline-none"
          >
            <option value="all">RX + TX</option>
            <option value="RX">RX Only</option>
            <option value="TX">TX Only</option>
          </select>

          <select
            value={channelFilter}
            onChange={(e: any) => setChannelFilter(e.target.value)}
            className="bg-zinc-950 border border-zinc-700 rounded px-2 py-1.5 text-zinc-300 text-xs focus:outline-none"
          >
            <option value="all">All 6 Channels</option>
            <option value="can0">CH1 (can0)</option>
            <option value="can1">CH2 (can1)</option>
            <option value="can2">CH3 (can2)</option>
            <option value="can3">CH4 (can3)</option>
            <option value="can4">CH5 (can4)</option>
            <option value="can5">CH6 (can5)</option>
          </select>

          <select
            value={protocolFilter}
            onChange={(e: any) => setProtocolFilter(e.target.value)}
            className="bg-zinc-950 border border-zinc-700 rounded px-2 py-1.5 text-zinc-300 text-xs focus:outline-none"
          >
            <option value="all">All Protocols</option>
            <option value="classic">Classic CAN</option>
            <option value="fd">CAN-FD Only</option>
          </select>
        </div>

        {/* Right: Limits & Export */}
        <div className="flex items-center space-x-2">
          {/* Buffer Capacity selector */}
          <div className="flex items-center space-x-1 text-zinc-400">
            <span className="text-[11px]">Buffer:</span>
            <select
              value={maxLimit}
              onChange={(e) => onSetMaxLimit(Number(e.target.value))}
              className="bg-zinc-950 border border-zinc-700 rounded px-2 py-1 text-zinc-300 text-xs focus:outline-none font-mono"
            >
              <option value={1000}>1,000</option>
              <option value={5000}>5,000</option>
              <option value={10000}>10,000</option>
              <option value={50000}>50,000</option>
            </select>
          </div>

          {onSaveToIndexedDb && (
            <button
              onClick={onSaveToIndexedDb}
              disabled={frames.length === 0}
              className="flex items-center space-x-1.5 px-2.5 py-1.5 rounded bg-cyan-950/80 hover:bg-cyan-900 disabled:opacity-40 text-cyan-300 border border-cyan-700/60 transition cursor-pointer"
              title="Save current sniffer cache to IndexedDB (6-Month Retention)"
            >
              <Archive className="w-3.5 h-3.5 text-cyan-400" />
              <span>Save Cache</span>
            </button>
          )}

          {onOpenHistory && (
            <button
              onClick={onOpenHistory}
              className="flex items-center space-x-1.5 px-2.5 py-1.5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700 transition cursor-pointer"
              title="Search & view historical CAN sniffer captures in IndexedDB"
            >
              <Clock className="w-3.5 h-3.5 text-zinc-400" />
              <span>History</span>
            </button>
          )}

          <button
            onClick={handleExportCsv}
            className="flex items-center space-x-1.5 px-2.5 py-1.5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 transition cursor-pointer"
            title="Export filtered frames as CSV"
          >
            <Download className="w-3.5 h-3.5 text-cyan-400" />
            <span>Export</span>
          </button>
        </div>
      </div>

      {/* Frame Table */}
      <div ref={scrollContainerRef} onScroll={handleScroll} className="flex-1 overflow-auto font-mono text-xs">
        <table className="w-full border-collapse text-left">
          <thead className="bg-zinc-900/90 text-zinc-400 sticky top-0 z-10 text-[11px] border-b border-zinc-800 shadow-sm">
            <tr>
              <th className="py-2 px-3 w-28">Timestamp</th>
              <th className="py-2 px-2 w-14 text-center">Dir</th>
              <th className="py-2 px-2 w-16 text-center">Ch</th>
              <th className="py-2 px-2 w-24">ID (Hex)</th>
              <th className="py-2 px-2 w-20">Type</th>
              <th className="py-2 px-2 w-12 text-center">DLC</th>
              <th className="py-2 px-3">Data Bytes (Hex)</th>
              <th className="py-2 px-2 w-24 text-zinc-500">ASCII</th>
              <th className="py-2 px-2 w-16 text-right">Period</th>
              <th className="py-2 px-2 w-16 text-right">Freq</th>
              <th className="py-2 px-3 w-48 text-zinc-400">Decoded DBC Signals</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-900">
            {filteredFrames.length === 0 ? (
              <tr>
                <td colSpan={11} className="py-20 text-center text-zinc-500 font-sans">
                  <div className="flex flex-col items-center space-y-2">
                    <Filter className="w-8 h-8 text-zinc-600" />
                    <span>No CAN frames match current filter or bus is silent.</span>
                    <span className="text-xs text-zinc-600">Connect to an interface or adjust filters.</span>
                  </div>
                </td>
              </tr>
            ) : (
              filteredFrames.map((frame, index) => {
                const isTx = frame.direction === 'TX';
                const isFd = frame.fd;
                const isTriggerEvent =
                  firedTriggerInfo &&
                  frame.timestamp === firedTriggerInfo.timestamp &&
                  frame.idHex === firedTriggerInfo.idHex;

                return (
                  <tr
                    key={`${frame.timestamp}-${frame.id}-${index}`}
                    onClick={() => onSelectFrame(frame)}
                    className={`cursor-pointer transition select-text ${
                      isTriggerEvent
                        ? 'bg-amber-950/50 border-y-2 border-amber-500 shadow-lg text-white'
                        : 'hover:bg-cyan-950/20 border-b border-zinc-900/60'
                    }`}
                  >
                    {/* Timestamp */}
                    <td className="py-1.5 px-3 text-zinc-400 whitespace-nowrap text-[11px]">
                      {timeMode === 'relative'
                        ? `${frame.timestamp.toFixed(4)}s`
                        : formatTimestamp(frame.timestamp)}
                    </td>

                    {/* Direction */}
                    <td className="py-1.5 px-2 text-center">
                      <span
                        className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                          isTx ? 'bg-amber-950/80 text-amber-300 border border-amber-800/60' : 'text-cyan-400'
                        }`}
                      >
                        {frame.direction}
                      </span>
                    </td>

                    {/* Channel */}
                    <td className="py-1.5 px-2 text-center whitespace-nowrap">
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-zinc-800 text-cyan-300 border border-zinc-700">
                        {frame.channel ? frame.channel.toUpperCase() : 'CAN0'}
                      </span>
                    </td>

                    {/* CAN ID */}
                    <td className="py-1.5 px-2 font-bold text-cyan-300">
                      <span className="flex items-center space-x-1">
                        <span>{frame.idHex}</span>
                        {isTriggerEvent && (
                          <span className="px-1.5 py-0.2 rounded bg-amber-500 text-zinc-950 font-bold text-[9px] uppercase tracking-wider inline-flex items-center">
                            <Crosshair className="w-2.5 h-2.5 mr-0.5" />
                            TRIGGER
                          </span>
                        )}
                      </span>
                    </td>

                    {/* Type */}
                    <td className="py-1.5 px-2 text-[10px] text-zinc-400">
                      {isFd ? (
                        <span className="text-indigo-300 bg-indigo-950/60 px-1 py-0.5 rounded border border-indigo-800/40">
                          FD{frame.brs ? '+BRS' : ''}
                        </span>
                      ) : frame.extended ? (
                        <span className="text-zinc-300">EXT</span>
                      ) : (
                        <span className="text-zinc-500">STD</span>
                      )}
                    </td>

                    {/* DLC */}
                    <td className="py-1.5 px-2 text-center text-zinc-300">{frame.dlc}</td>

                    {/* Data Bytes with Byte-Level Change Highlighting */}
                    <td className="py-1.5 px-3 font-mono font-medium">
                      <div className="flex flex-wrap gap-1 items-center">
                        {frame.data.map((byte, bIdx) => {
                          const hasChanged = frame.changedBytes && frame.changedBytes[bIdx];
                          return (
                            <span
                              key={bIdx}
                              className={`px-1 rounded transition-colors duration-200 ${
                                hasChanged
                                  ? 'bg-amber-400 text-zinc-950 font-bold shadow-sm animate-pulse'
                                  : 'text-zinc-200 hover:text-cyan-300'
                              }`}
                            >
                              {byte.toString(16).toUpperCase().padStart(2, '0')}
                            </span>
                          );
                        })}
                      </div>
                    </td>

                    {/* ASCII representation */}
                    <td className="py-1.5 px-2 text-zinc-500 truncate max-w-[80px]">
                      {formatAscii(frame.data)}
                    </td>

                    {/* Period (ms) */}
                    <td className="py-1.5 px-2 text-right text-zinc-400 text-[11px]">
                      {frame.periodMs ? `${frame.periodMs}ms` : '-'}
                    </td>

                    {/* Frequency (Hz) */}
                    <td className="py-1.5 px-2 text-right text-emerald-400 font-semibold text-[11px]">
                      {frame.freqHz ? `${frame.freqHz}Hz` : '-'}
                    </td>

                    {/* Decoded DBC Signals */}
                    <td className="py-1.5 px-3 text-zinc-400 truncate max-w-xs text-[11px]">
                      {frame.decoded && Object.keys(frame.decoded).length > 0 ? (
                        <span className="text-emerald-300/90 font-mono">
                          {Object.entries(frame.decoded)
                            .slice(0, 2)
                            .map(([k, v]) => `${k}: ${v}`)
                            .join(' | ')}
                          {Object.keys(frame.decoded).length > 2 ? ' ...' : ''}
                        </span>
                      ) : (
                        <span className="text-zinc-600">-</span>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Bottom Status / Summary Footer */}
      <div className="px-4 py-2 bg-zinc-900 border-t border-zinc-800 text-zinc-400 text-xs flex items-center justify-between font-mono">
        <div className="flex items-center space-x-4">
          <span>
            Displaying: <strong className="text-zinc-200">{filteredFrames.length.toLocaleString()}</strong> of{' '}
            <strong className="text-zinc-200">{frames.length.toLocaleString()}</strong> frames
          </span>
          {isPaused && (
            <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] font-bold">
              SNIFFER PAUSED
            </span>
          )}
        </div>
        <div className="text-[11px] text-zinc-500">
          Click any frame row for bit breakdown and DBC signal view
        </div>
      </div>

      {/* Capture Trigger Configuration Modal */}
      <CaptureTriggerModal
        isOpen={isTriggerModalOpen}
        onClose={() => setIsTriggerModalOpen(false)}
        config={triggerConfig}
        onSaveConfig={setTriggerConfig}
        triggerStatus={triggerStatus}
        onArmTrigger={handleArmTrigger}
        onDisarmTrigger={handleDisarmTrigger}
        onReArmTrigger={handleReArmTrigger}
        firedDetails={firedTriggerInfo}
      />
    </div>
  );
};
