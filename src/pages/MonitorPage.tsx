import React, { useState, useRef, useEffect, useMemo } from 'react';
import { CanFrame, FilterConfig } from '../types/can';
import { formatTimestamp, formatBytesHex, formatAscii } from '../utils/formatters';
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
} from 'lucide-react';

interface MonitorPageProps {
  frames: CanFrame[];
  isPaused: boolean;
  onTogglePause: () => void;
  onClear: () => void;
  onSelectFrame: (frame: CanFrame) => void;
  maxLimit: number;
  onSetMaxLimit: (limit: number) => void;
}

export const MonitorPage: React.FC<MonitorPageProps> = ({
  frames,
  isPaused,
  onTogglePause,
  onClear,
  onSelectFrame,
  maxLimit,
  onSetMaxLimit,
}) => {
  const [autoScroll, setAutoScroll] = useState(true);
  const [timeMode, setTimeMode] = useState<'relative' | 'absolute'>('relative');
  const [directionFilter, setDirectionFilter] = useState<'all' | 'RX' | 'TX'>('all');
  const [protocolFilter, setProtocolFilter] = useState<'all' | 'classic' | 'fd'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [idRangeMin, setIdRangeMin] = useState<string>('');
  const [idRangeMax, setIdRangeMax] = useState<string>('');

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

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
  }, [frames, directionFilter, protocolFilter, searchQuery, idRangeMin, idRangeMax]);

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
                <td colSpan={10} className="py-20 text-center text-zinc-500 font-sans">
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

                return (
                  <tr
                    key={`${frame.timestamp}-${frame.id}-${index}`}
                    onClick={() => onSelectFrame(frame)}
                    className="hover:bg-cyan-950/20 cursor-pointer transition border-b border-zinc-900/60 select-text"
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

                    {/* CAN ID */}
                    <td className="py-1.5 px-2 font-bold text-cyan-300">{frame.idHex}</td>

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
    </div>
  );
};
