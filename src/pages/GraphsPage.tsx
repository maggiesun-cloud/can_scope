import React, { useState, useEffect, useMemo, useRef } from 'react';
import { CanFrame, DbcDatabase } from '../types/can';
import { AggregatedIdStats } from '../store/canStore';
import {
  LineChart,
  Play,
  Pause,
  Trash2,
  Sliders,
  Activity,
  Download,
  Layers,
  CheckSquare,
  Square,
  Maximize2,
  Minimize2,
  Eye,
  Info,
} from 'lucide-react';

interface GraphsPageProps {
  frames: CanFrame[];
  aggregatedStats: Map<number, AggregatedIdStats>;
  activeDbc: DbcDatabase | null;
  initialCanId?: number;
}

export interface ScopeChannelConfig {
  id: string; // 'ch1' | 'ch2' | 'ch3' | 'ch4'
  name: string;
  color: string;
  enabled: boolean;
  canId: number;
  plotType: 'dbc_signal' | 'raw_byte' | 'frequency' | 'period';
  signalName: string;
  byteIndex: number;
  unit: string;
}

interface ScopePoint {
  time: number;
  value: number;
}

const DEFAULT_CHANNELS: ScopeChannelConfig[] = [
  {
    id: 'ch1',
    name: 'Channel 1 (Primary)',
    color: '#22d3ee', // cyan
    enabled: true,
    canId: 0x100,
    plotType: 'dbc_signal',
    signalName: 'EngineSpeed',
    byteIndex: 0,
    unit: 'rpm',
  },
  {
    id: 'ch2',
    name: 'Channel 2 (Secondary)',
    color: '#f59e0b', // amber
    enabled: true,
    canId: 0x100,
    plotType: 'dbc_signal',
    signalName: 'ThrottlePos',
    byteIndex: 2,
    unit: '%',
  },
  {
    id: 'ch3',
    name: 'Channel 3',
    color: '#10b981', // emerald
    enabled: false,
    canId: 0x200,
    plotType: 'dbc_signal',
    signalName: 'WheelSpeed_FL',
    byteIndex: 0,
    unit: 'km/h',
  },
  {
    id: 'ch4',
    name: 'Channel 4',
    color: '#a855f7', // purple
    enabled: false,
    canId: 0x300,
    plotType: 'raw_byte',
    signalName: '',
    byteIndex: 1,
    unit: 'raw',
  },
];

export const GraphsPage: React.FC<GraphsPageProps> = ({
  frames,
  aggregatedStats,
  activeDbc,
  initialCanId,
}) => {
  const activeIds = useMemo(() => Array.from(aggregatedStats.keys()), [aggregatedStats]);
  const defaultId = initialCanId || activeIds[0] || 0x100;

  // Multi-channel setup
  const [channels, setChannels] = useState<ScopeChannelConfig[]>(() => {
    return DEFAULT_CHANNELS.map((ch, idx) => {
      const assignedId = activeIds[idx] !== undefined ? activeIds[idx] : defaultId;
      return {
        ...ch,
        canId: idx === 0 && initialCanId ? initialCanId : assignedId,
      };
    });
  });

  const [timeWindowSec, setTimeWindowSec] = useState<number>(15);
  const [isGraphPaused, setIsGraphPaused] = useState(false);
  const [scaleMode, setScaleMode] = useState<'normalized' | 'stacked' | 'shared'>('normalized');
  const [hoverData, setHoverData] = useState<{ x: number; y: number; timeSec: number } | null>(null);

  // Buffer of data points per channel
  const [channelData, setChannelData] = useState<{ [chId: string]: ScopePoint[] }>({
    ch1: [],
    ch2: [],
    ch3: [],
    ch4: [],
  });

  // Automatically update channel signal names if DBC is present
  useEffect(() => {
    if (!activeDbc) return;

    setChannels((prev) =>
      prev.map((ch) => {
        const msg = activeDbc.messages.find((m) => m.id === ch.canId);
        if (msg && msg.signals.length > 0) {
          const hasExisting = msg.signals.some((s) => s.name === ch.signalName);
          const sig = hasExisting
            ? msg.signals.find((s) => s.name === ch.signalName)!
            : msg.signals[0];
          return {
            ...ch,
            plotType: 'dbc_signal',
            signalName: sig.name,
            unit: sig.unit || '',
          };
        }
        return ch;
      })
    );
  }, [activeDbc]);

  // Handle incoming frames and append to channel series
  useEffect(() => {
    if (isGraphPaused) return;

    const now = Date.now() / 1000;
    const windowStart = now - timeWindowSec;

    setChannelData((prev) => {
      const next: { [chId: string]: ScopePoint[] } = {};

      channels.forEach((ch) => {
        if (!ch.enabled) {
          next[ch.id] = [];
          return;
        }

        const relevant = frames.filter((f) => f.id === ch.canId && f.timestamp >= windowStart);
        const points: ScopePoint[] = [];

        relevant.forEach((frame) => {
          let val = 0;
          if (ch.plotType === 'dbc_signal') {
            if (frame.decoded && frame.decoded[ch.signalName] !== undefined) {
              const rawStr = String(frame.decoded[ch.signalName]);
              const match = rawStr.match(/^-?\d+(\.\d+)?/);
              val = match ? parseFloat(match[0]) : 0;
            }
          } else if (ch.plotType === 'raw_byte') {
            val = frame.data[ch.byteIndex] !== undefined ? frame.data[ch.byteIndex] : 0;
          } else if (ch.plotType === 'frequency') {
            val = frame.freqHz || 0;
          } else if (ch.plotType === 'period') {
            val = frame.deltaMs || 0;
          }

          points.push({ time: frame.timestamp, value: val });
        });

        next[ch.id] = points.slice(-300);
      });

      return next;
    });
  }, [frames, channels, timeWindowSec, isGraphPaused]);

  // Compute telemetry metrics per channel
  const channelStats = useMemo(() => {
    const stats: {
      [chId: string]: {
        min: number;
        max: number;
        curr: number;
        avg: number;
        vpp: number;
      };
    } = {};

    channels.forEach((ch) => {
      const pts = channelData[ch.id] || [];
      if (pts.length === 0) {
        stats[ch.id] = { min: 0, max: 0, curr: 0, avg: 0, vpp: 0 };
        return;
      }
      const vals = pts.map((p) => p.value);
      const min = Math.min(...vals);
      const max = Math.max(...vals);
      const curr = vals[vals.length - 1];
      const avg = vals.reduce((a, b) => a + b, 0) / vals.length;
      stats[ch.id] = {
        min: Math.round(min * 10) / 10,
        max: Math.round(max * 10) / 10,
        curr: Math.round(curr * 10) / 10,
        avg: Math.round(avg * 10) / 10,
        vpp: Math.round((max - min) * 10) / 10,
      };
    });

    return stats;
  }, [channels, channelData]);

  // Dimensions
  const svgWidth = 960;
  const svgHeight = 360;
  const padding = { top: 25, right: 30, bottom: 40, left: 65 };
  const graphW = svgWidth - padding.left - padding.right;
  const graphH = svgHeight - padding.top - padding.bottom;

  // Time boundaries across all active channels
  const { minTime, maxTime } = useMemo(() => {
    let min = Infinity;
    let max = -Infinity;
    channels.forEach((ch) => {
      if (!ch.enabled) return;
      const pts = channelData[ch.id] || [];
      pts.forEach((p) => {
        if (p.time < min) min = p.time;
        if (p.time > max) max = p.time;
      });
    });

    if (!isFinite(min)) min = Date.now() / 1000 - timeWindowSec;
    if (!isFinite(max)) max = Date.now() / 1000;
    if (max - min < 0.1) max = min + 1;

    return { minTime: min, maxTime: max };
  }, [channels, channelData, timeWindowSec]);

  // Generate SVG Paths for all active channels
  const channelPaths = useMemo(() => {
    const paths: { [chId: string]: string } = {};
    const rangeX = maxTime - minTime || 1;

    channels.forEach((ch) => {
      if (!ch.enabled) return;
      const pts = channelData[ch.id] || [];
      if (pts.length < 2) {
        paths[ch.id] = '';
        return;
      }

      const st = channelStats[ch.id];
      const minVal = st.min === st.max ? st.min - 1 : st.min;
      const maxVal = st.min === st.max ? st.max + 1 : st.max;
      const rangeY = maxVal - minVal || 1;

      paths[ch.id] = pts.reduce((acc, pt, i) => {
        const x = padding.left + ((pt.time - minTime) / rangeX) * graphW;
        let yNorm = (pt.value - minVal) / rangeY;
        if (scaleMode === 'stacked') {
          // If stacked, divide height by number of active channels
          yNorm = Math.min(1, Math.max(0, yNorm));
        }
        const y = padding.top + graphH - yNorm * graphH;
        return `${acc} ${i === 0 ? 'M' : 'L'} ${x.toFixed(1)},${y.toFixed(1)}`;
      }, '');
    });

    return paths;
  }, [channels, channelData, channelStats, minTime, maxTime, graphW, graphH, padding.left, padding.top, scaleMode]);

  // Channel modification handler
  const updateChannel = (chId: string, patch: Partial<ScopeChannelConfig>) => {
    setChannels((prev) => prev.map((c) => (c.id === chId ? { ...c, ...patch } : c)));
  };

  // Export plotted multi-channel points to CSV
  const handleExportPlottedCsv = () => {
    const enabledChs = channels.filter((c) => c.enabled);
    if (enabledChs.length === 0) return;

    let header = 'timestamp_sec';
    enabledChs.forEach((ch) => {
      header += `,${ch.name}_${ch.signalName || ch.plotType}_[${ch.unit || 'val'}]`;
    });
    header += '\n';

    // Collect timestamps
    const timeSet = new Set<number>();
    enabledChs.forEach((ch) => {
      (channelData[ch.id] || []).forEach((p) => timeSet.add(p.time));
    });
    const sortedTimes = Array.from(timeSet).sort((a, b) => a - b);

    const rows = sortedTimes.map((t) => {
      let rowStr = t.toFixed(6);
      enabledChs.forEach((ch) => {
        const pts = channelData[ch.id] || [];
        const closest = pts.find((p) => Math.abs(p.time - t) < 0.05);
        rowStr += `,${closest ? closest.value.toFixed(2) : ''}`;
      });
      return rowStr;
    });

    const blob = new Blob([header + rows.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `canscope_oscilloscope_${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col h-full bg-zinc-950 text-zinc-200">
      {/* Top Scope Controls Toolbar */}
      <div className="p-4 bg-zinc-900 border-b border-zinc-800 flex flex-wrap items-center justify-between gap-4 text-xs">
        {/* Title and Scale Mode */}
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2">
            <LineChart className="w-5 h-5 text-cyan-400" />
            <span className="font-bold text-zinc-100 text-sm">DBC Signal Live Plotter & Oscilloscope</span>
          </div>

          <div className="flex items-center bg-zinc-950 p-0.5 rounded-lg border border-zinc-800 text-[11px]">
            <button
              onClick={() => setScaleMode('normalized')}
              className={`px-2.5 py-1 rounded font-medium transition cursor-pointer ${
                scaleMode === 'normalized' ? 'bg-cyan-600 text-zinc-950 font-bold' : 'text-zinc-400 hover:text-zinc-200'
              }`}
              title="Autoscale each channel independently to 0-100% full scale overlay"
            >
              Overlay (Autoscale)
            </button>
            <button
              onClick={() => setScaleMode('shared')}
              className={`px-2.5 py-1 rounded font-medium transition cursor-pointer ${
                scaleMode === 'shared' ? 'bg-cyan-600 text-zinc-950 font-bold' : 'text-zinc-400 hover:text-zinc-200'
              }`}
              title="Shared unified scale"
            >
              Unified Scale
            </button>
          </div>
        </div>

        {/* Timebase and Freeze Controls */}
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-1.5">
            <span className="text-zinc-400 font-mono">Timebase:</span>
            <select
              value={timeWindowSec}
              onChange={(e) => setTimeWindowSec(Number(e.target.value))}
              className="bg-zinc-950 border border-zinc-700 rounded px-2 py-1 text-zinc-200 font-mono"
            >
              <option value={5}>5 sec</option>
              <option value={10}>10 sec</option>
              <option value={15}>15 sec</option>
              <option value={30}>30 sec</option>
              <option value={60}>60 sec</option>
              <option value={120}>2 min</option>
            </select>
          </div>

          <button
            onClick={() => setIsGraphPaused((p) => !p)}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded font-semibold transition cursor-pointer ${
              isGraphPaused
                ? 'bg-emerald-600 hover:bg-emerald-500 text-zinc-950'
                : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200'
            }`}
          >
            {isGraphPaused ? <Play className="w-3.5 h-3.5 fill-current" /> : <Pause className="w-3.5 h-3.5" />}
            <span>{isGraphPaused ? 'RUN' : 'FREEZE'}</span>
          </button>

          <button
            onClick={() => {
              setChannelData({ ch1: [], ch2: [], ch3: [], ch4: [] });
            }}
            className="p-1.5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-zinc-200 transition cursor-pointer"
            title="Clear Channel Traces"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={handleExportPlottedCsv}
            className="px-2.5 py-1.5 rounded bg-zinc-800 hover:bg-zinc-700 text-cyan-400 font-medium transition cursor-pointer flex items-center space-x-1"
            title="Export Plotted Multi-Signal CSV"
          >
            <Download className="w-3.5 h-3.5" />
            <span>CSV Trace</span>
          </button>
        </div>
      </div>

      {/* Channel Strip Configuration Matrix */}
      <div className="bg-zinc-900/60 border-b border-zinc-800 p-3 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3 text-xs">
        {channels.map((ch, idx) => {
          const msg = activeDbc?.messages.find((m) => m.id === ch.canId);
          const stat = channelStats[ch.id];

          return (
            <div
              key={ch.id}
              className={`p-2.5 rounded-lg border transition ${
                ch.enabled
                  ? 'bg-zinc-900 border-zinc-700/80 shadow-xs'
                  : 'bg-zinc-950/40 border-zinc-800/60 opacity-60'
              }`}
            >
              {/* Channel Header Toggle */}
              <div className="flex items-center justify-between pb-1.5 border-b border-zinc-800/80 mb-2">
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={ch.enabled}
                    onChange={(e) => updateChannel(ch.id, { enabled: e.target.checked })}
                    className="rounded accent-cyan-500 cursor-pointer"
                    id={`check_${ch.id}`}
                  />
                  <label
                    htmlFor={`check_${ch.id}`}
                    className="font-bold cursor-pointer flex items-center space-x-1.5"
                    style={{ color: ch.color }}
                  >
                    <span>CH {idx + 1}</span>
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: ch.color }} />
                  </label>
                </div>

                <span className="text-[11px] font-mono text-zinc-400">
                  {stat.curr.toFixed(1)} <strong className="text-zinc-200">{ch.unit}</strong>
                </span>
              </div>

              {/* CAN ID & Signal Selector */}
              <div className="space-y-1.5 font-mono">
                <div className="flex items-center space-x-1">
                  <span className="text-zinc-500 text-[10px] w-12 shrink-0">ID:</span>
                  <select
                    value={ch.canId}
                    onChange={(e) => {
                      const newId = Number(e.target.value);
                      const newMsg = activeDbc?.messages.find((m) => m.id === newId);
                      const firstSig = newMsg?.signals[0]?.name || '';
                      const unit = newMsg?.signals[0]?.unit || '';
                      updateChannel(ch.id, {
                        canId: newId,
                        signalName: firstSig,
                        unit,
                        plotType: firstSig ? 'dbc_signal' : 'raw_byte',
                      });
                    }}
                    className="bg-zinc-950 border border-zinc-700 rounded px-1.5 py-0.5 text-zinc-200 text-[11px] w-full"
                  >
                    {activeIds.map((id) => (
                      <option key={id} value={id}>
                        0x{id.toString(16).toUpperCase()}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center space-x-1">
                  <span className="text-zinc-500 text-[10px] w-12 shrink-0">Sig:</span>
                  <select
                    value={ch.plotType === 'dbc_signal' ? ch.signalName : ch.plotType}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === 'raw_byte' || val === 'frequency' || val === 'period') {
                        updateChannel(ch.id, { plotType: val, unit: val === 'frequency' ? 'Hz' : 'ms' });
                      } else {
                        const sig = msg?.signals.find((s) => s.name === val);
                        updateChannel(ch.id, {
                          plotType: 'dbc_signal',
                          signalName: val,
                          unit: sig?.unit || '',
                        });
                      }
                    }}
                    className="bg-zinc-950 border border-zinc-700 rounded px-1.5 py-0.5 text-zinc-200 text-[11px] w-full truncate"
                  >
                    {msg && msg.signals.length > 0 && (
                      <optgroup label="Decoded DBC Signals">
                        {msg.signals.map((sig) => (
                          <option key={sig.name} value={sig.name}>
                            {sig.name} ({sig.unit || 'val'})
                          </option>
                        ))}
                      </optgroup>
                    )}
                    <optgroup label="Raw Metrics">
                      <option value="raw_byte">Raw Byte [0]</option>
                      <option value="frequency">Bus Freq (Hz)</option>
                      <option value="period">Delta (ms)</option>
                    </optgroup>
                  </select>
                </div>
              </div>

              {/* Instantaneous Min / Max Telemetry */}
              <div className="grid grid-cols-3 gap-1 pt-2 mt-2 border-t border-zinc-800/80 text-[10px] font-mono text-center">
                <div className="bg-zinc-950/60 p-1 rounded">
                  <span className="text-zinc-500 block">MIN</span>
                  <span className="text-zinc-300 font-semibold">{stat.min}</span>
                </div>
                <div className="bg-zinc-950/60 p-1 rounded">
                  <span className="text-zinc-500 block">MAX</span>
                  <span className="text-zinc-300 font-semibold">{stat.max}</span>
                </div>
                <div className="bg-zinc-950/60 p-1 rounded">
                  <span className="text-zinc-500 block">Vpp</span>
                  <span className="text-zinc-300 font-semibold">{stat.vpp}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Main Oscilloscope SVG Viewport */}
      <div className="flex-1 p-4 flex flex-col justify-between overflow-hidden">
        <div className="flex-1 bg-zinc-950 border border-zinc-800 rounded-xl p-3 flex items-center justify-center relative overflow-hidden shadow-inner select-none">
          {/* Channel Legend in Top Right */}
          <div className="absolute top-4 right-5 z-20 flex items-center space-x-3 bg-zinc-900/90 border border-zinc-800 px-3 py-1.5 rounded-lg text-xs font-mono backdrop-blur-xs">
            {channels
              .filter((c) => c.enabled)
              .map((c) => (
                <div key={c.id} className="flex items-center space-x-1.5">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: c.color }} />
                  <span style={{ color: c.color }} className="font-semibold">
                    {c.signalName || c.plotType}
                  </span>
                  <span className="text-zinc-500 text-[10px]">({channelStats[c.id].curr})</span>
                </div>
              ))}
          </div>

          <svg
            viewBox={`0 0 ${svgWidth} ${svgHeight}`}
            className="w-full h-full max-h-96 overflow-visible cursor-crosshair"
            preserveAspectRatio="none"
            onMouseMove={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              const relX = ((e.clientX - rect.left) / rect.width) * svgWidth;
              const relY = ((e.clientY - rect.top) / rect.height) * svgHeight;
              const timeOffset = minTime + ((relX - padding.left) / graphW) * (maxTime - minTime);
              setHoverData({ x: relX, y: relY, timeSec: timeOffset });
            }}
            onMouseLeave={() => setHoverData(null)}
          >
            {/* Dark Grid Background */}
            <rect
              x={padding.left}
              y={padding.top}
              width={graphW}
              height={graphH}
              fill="#09090b"
              stroke="#27272a"
              strokeWidth="1"
            />

            {/* Horizontal Division Gridlines */}
            {[0, 0.2, 0.4, 0.6, 0.8, 1].map((ratio) => {
              const y = padding.top + graphH * ratio;
              return (
                <line
                  key={ratio}
                  x1={padding.left}
                  y1={y}
                  x2={padding.left + graphW}
                  y2={y}
                  stroke="#18181b"
                  strokeDasharray="4 4"
                  strokeWidth="1"
                />
              );
            })}

            {/* Vertical Time Division Gridlines */}
            {[0, 0.2, 0.4, 0.6, 0.8, 1].map((ratio) => {
              const x = padding.left + graphW * ratio;
              const timeVal = minTime + ratio * (maxTime - minTime);
              return (
                <g key={ratio}>
                  <line
                    x1={x}
                    y1={padding.top}
                    x2={x}
                    y2={padding.top + graphH}
                    stroke="#18181b"
                    strokeDasharray="4 4"
                    strokeWidth="1"
                  />
                  <text
                    x={x}
                    y={padding.top + graphH + 18}
                    fill="#71717a"
                    fontSize="10"
                    textAnchor="middle"
                    fontFamily="monospace"
                  >
                    -{(maxTime - timeVal).toFixed(1)}s
                  </text>
                </g>
              );
            })}

            {/* Active Channel Waveforms */}
            {channels.map((ch) => {
              if (!ch.enabled) return null;
              const path = channelPaths[ch.id];
              if (!path) return null;

              return (
                <g key={ch.id}>
                  <path
                    d={path}
                    fill="none"
                    stroke={ch.color}
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </g>
              );
            })}

            {/* Crosshair Cursor on Mouse Hover */}
            {hoverData && hoverData.x >= padding.left && hoverData.x <= padding.left + graphW && (
              <g>
                <line
                  x1={hoverData.x}
                  y1={padding.top}
                  x2={hoverData.x}
                  y2={padding.top + graphH}
                  stroke="#52525b"
                  strokeWidth="1"
                  strokeDasharray="2 2"
                />
                <circle cx={hoverData.x} cy={hoverData.y} r="3" fill="#22d3ee" />
              </g>
            )}
          </svg>
        </div>

        {/* Hover Readout Bar */}
        <div className="p-2.5 mt-2 bg-zinc-900 border border-zinc-800 rounded-lg flex items-center justify-between text-xs font-mono text-zinc-400">
          <div className="flex items-center space-x-2">
            <Info className="w-3.5 h-3.5 text-cyan-400" />
            <span>
              {hoverData
                ? `Cursor: ${hoverData.timeSec.toFixed(3)}s (Offset -${(maxTime - hoverData.timeSec).toFixed(2)}s)`
                : 'Hover cursor over scope display to inspect instantaneous channel amplitude'}
            </span>
          </div>

          <div className="flex items-center space-x-4">
            {channels
              .filter((c) => c.enabled)
              .map((c) => (
                <span key={c.id} style={{ color: c.color }}>
                  {c.signalName || c.name}: <strong>{channelStats[c.id].curr} {c.unit}</strong>
                </span>
              ))}
          </div>
        </div>
      </div>
    </div>
  );
};
