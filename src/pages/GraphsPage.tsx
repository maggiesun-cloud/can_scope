import React, { useState, useEffect, useRef, useMemo } from 'react';
import { CanFrame, DbcDatabase } from '../types/can';
import { AggregatedIdStats } from '../store/canStore';
import { LineChart, Play, Pause, Trash2, Sliders, Activity } from 'lucide-react';

interface GraphsPageProps {
  frames: CanFrame[];
  aggregatedStats: Map<number, AggregatedIdStats>;
  activeDbc: DbcDatabase | null;
  initialCanId?: number;
}

interface DataPoint {
  time: number;
  value: number;
}

export const GraphsPage: React.FC<GraphsPageProps> = ({
  frames,
  aggregatedStats,
  activeDbc,
  initialCanId,
}) => {
  const activeIds: number[] = Array.from(aggregatedStats.keys());
  const [selectedId, setSelectedId] = useState<number>(initialCanId || activeIds[0] || 0x100);
  const [plotType, setPlotType] = useState<string>('dbc_signal');
  const [selectedSignalName, setSelectedSignalName] = useState<string>('');
  const [rawByteIndex, setRawByteIndex] = useState<number>(2); // e.g. Byte 2
  const [timeWindowSec, setTimeWindowSec] = useState<number>(15);
  const [isGraphPaused, setIsGraphPaused] = useState(false);

  const [plotData, setPlotData] = useState<DataPoint[]>([]);

  // Find DBC message and signals for selected ID
  const dbcMessage = useMemo(() => {
    return activeDbc?.messages.find((m) => m.id === selectedId);
  }, [activeDbc, selectedId]);

  // Set default signal name when selected ID changes
  useEffect(() => {
    if (dbcMessage && dbcMessage.signals.length > 0) {
      setSelectedSignalName(dbcMessage.signals[0].name);
      setPlotType('dbc_signal');
    } else {
      setPlotType('raw_byte');
    }
  }, [selectedId, dbcMessage]);

  // Process incoming frames for graph
  useEffect(() => {
    if (isGraphPaused) return;

    // Filter frames matching selected ID
    const relevantFrames = frames.filter((f) => f.id === selectedId);
    if (relevantFrames.length === 0) return;

    const now = Date.now() / 1000;
    const windowStart = now - timeWindowSec;

    const points: DataPoint[] = [];

    relevantFrames.forEach((frame) => {
      if (frame.timestamp < windowStart) return;

      let val: number = 0;
      if (plotType === 'dbc_signal') {
        if (frame.decoded && frame.decoded[selectedSignalName] !== undefined) {
          const rawStr = String(frame.decoded[selectedSignalName]);
          const numMatch = rawStr.match(/^-?\d+(\.\d+)?/);
          val = numMatch ? parseFloat(numMatch[0]) : 0;
        }
      } else if (plotType === 'raw_byte') {
        val = frame.data[rawByteIndex] !== undefined ? frame.data[rawByteIndex] : 0;
      } else if (plotType === 'frequency') {
        val = frame.freqHz || 0;
      } else if (plotType === 'period') {
        val = frame.periodMs || 0;
      }

      points.push({ time: frame.timestamp, value: val });
    });

    setPlotData(points.slice(-300));
  }, [frames, selectedId, plotType, selectedSignalName, rawByteIndex, timeWindowSec, isGraphPaused]);

  // Compute graph statistics
  const { minVal, maxVal, currentVal, avgVal } = useMemo(() => {
    if (plotData.length === 0) {
      return { minVal: 0, maxVal: 100, currentVal: 0, avgVal: 0 };
    }
    const values = plotData.map((p) => p.value);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const curr = values[values.length - 1];
    const avg = values.reduce((a, b) => a + b, 0) / values.length;
    return {
      minVal: min === max ? min - 1 : min,
      maxVal: min === max ? max + 1 : max,
      currentVal: curr,
      avgVal: Math.round(avg * 10) / 10,
    };
  }, [plotData]);

  // SVG Canvas Dimension & Path Rendering
  const svgWidth = 800;
  const svgHeight = 280;
  const padding = { top: 20, right: 30, bottom: 30, left: 60 };
  const graphW = svgWidth - padding.left - padding.right;
  const graphH = svgHeight - padding.top - padding.bottom;

  const pathString = useMemo(() => {
    if (plotData.length < 2) return '';
    const rangeY = maxVal - minVal || 1;
    const minTime = plotData[0].time;
    const maxTime = plotData[plotData.length - 1].time;
    const rangeX = maxTime - minTime || 1;

    return plotData.reduce((acc, pt, i) => {
      const x = padding.left + ((pt.time - minTime) / rangeX) * graphW;
      const y = padding.top + graphH - ((pt.value - minVal) / rangeY) * graphH;
      return `${acc} ${i === 0 ? 'M' : 'L'} ${x.toFixed(1)},${y.toFixed(1)}`;
    }, '');
  }, [plotData, minVal, maxVal, graphW, graphH, padding.left, padding.top]);

  return (
    <div className="flex flex-col h-full bg-zinc-950 text-zinc-200">
      {/* Top Controls Toolbar */}
      <div className="p-4 bg-zinc-900 border-b border-zinc-800 flex flex-wrap items-center justify-between gap-4 text-xs">
        {/* Signal Selection */}
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-1.5">
            <span className="text-zinc-400 font-medium">CAN ID:</span>
            <select
              value={selectedId}
              onChange={(e) => setSelectedId(Number(e.target.value))}
              className="bg-zinc-950 border border-zinc-700 rounded px-2.5 py-1.5 text-cyan-300 font-mono font-bold focus:outline-none focus:border-cyan-500"
            >
              {activeIds.map((id) => (
                <option key={id} value={id}>
                  0x{id.toString(16).toUpperCase()} ({id})
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center space-x-1.5">
            <span className="text-zinc-400 font-medium">Signal:</span>
            <select
              value={plotType === 'dbc_signal' ? selectedSignalName : plotType}
              onChange={(e) => {
                const val = e.target.value;
                if (val === 'raw_byte' || val === 'frequency' || val === 'period') {
                  setPlotType(val);
                } else {
                  setPlotType('dbc_signal');
                  setSelectedSignalName(val);
                }
              }}
              className="bg-zinc-950 border border-zinc-700 rounded px-2.5 py-1.5 text-zinc-200 focus:outline-none focus:border-cyan-500"
            >
              {dbcMessage && dbcMessage.signals.length > 0 && (
                <optgroup label="Decoded DBC Signals">
                  {dbcMessage.signals.map((sig) => (
                    <option key={sig.name} value={sig.name}>
                      {sig.name} ({sig.unit || 'val'})
                    </option>
                  ))}
                </optgroup>
              )}
              <optgroup label="Bus & Raw Metrics">
                <option value="raw_byte">Raw Payload Byte</option>
                <option value="frequency">Message Frequency (Hz)</option>
                <option value="period">Inter-Frame Period (ms)</option>
              </optgroup>
            </select>
          </div>

          {plotType === 'raw_byte' && (
            <div className="flex items-center space-x-1.5">
              <span className="text-zinc-400">Byte Index:</span>
              <select
                value={rawByteIndex}
                onChange={(e) => setRawByteIndex(Number(e.target.value))}
                className="bg-zinc-950 border border-zinc-700 rounded px-2 py-1.5 text-zinc-200 font-mono"
              >
                {[0, 1, 2, 3, 4, 5, 6, 7].map((b) => (
                  <option key={b} value={b}>
                    Byte [{b}]
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Time Window & Stream Controls */}
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-1.5">
            <span className="text-zinc-400">Window:</span>
            <select
              value={timeWindowSec}
              onChange={(e) => setTimeWindowSec(Number(e.target.value))}
              className="bg-zinc-950 border border-zinc-700 rounded px-2 py-1 text-zinc-200 font-mono"
            >
              <option value={5}>5s</option>
              <option value={10}>10s</option>
              <option value={15}>15s</option>
              <option value={30}>30s</option>
              <option value={60}>60s</option>
            </select>
          </div>

          <button
            onClick={() => setIsGraphPaused((p) => !p)}
            className={`flex items-center space-x-1 px-3 py-1.5 rounded font-semibold transition cursor-pointer ${
              isGraphPaused ? 'bg-emerald-600 hover:bg-emerald-500 text-white' : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200'
            }`}
          >
            {isGraphPaused ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
            <span>{isGraphPaused ? 'Resume' : 'Freeze'}</span>
          </button>

          <button
            onClick={() => setPlotData([])}
            className="p-1.5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-zinc-200 transition cursor-pointer"
            title="Clear Graph History"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Main Graph Viewport */}
      <div className="p-6 flex-1 flex flex-col justify-between overflow-hidden">
        {/* Signal Header & Live Telemetry */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-bold text-lg text-zinc-100 font-mono">
                0x{selectedId.toString(16).toUpperCase()}
              </span>
              <span className="text-sm font-semibold text-cyan-400">
                {plotType === 'dbc_signal' ? selectedSignalName : plotType.toUpperCase()}
              </span>
            </div>
            <p className="text-xs text-zinc-500 font-mono mt-0.5">
              Time-domain waveform • Sampled over {timeWindowSec}s window
            </p>
          </div>

          {/* Value Stats Pills */}
          <div className="flex items-center space-x-4 font-mono text-xs">
            <div className="p-2 bg-zinc-900 border border-zinc-800 rounded-lg text-center min-w-20">
              <span className="text-[10px] text-zinc-500 block uppercase font-sans">Min</span>
              <span className="font-semibold text-zinc-300">{minVal.toFixed(1)}</span>
            </div>
            <div className="p-2 bg-zinc-900 border border-zinc-800 rounded-lg text-center min-w-20">
              <span className="text-[10px] text-zinc-500 block uppercase font-sans">Avg</span>
              <span className="font-semibold text-zinc-300">{avgVal.toFixed(1)}</span>
            </div>
            <div className="p-2 bg-zinc-900 border border-zinc-800 rounded-lg text-center min-w-20">
              <span className="text-[10px] text-zinc-500 block uppercase font-sans">Max</span>
              <span className="font-semibold text-zinc-300">{maxVal.toFixed(1)}</span>
            </div>
            <div className="p-2 bg-cyan-950/80 border border-cyan-700/60 rounded-lg text-center min-w-24">
              <span className="text-[10px] text-cyan-400 block uppercase font-sans font-bold">Current</span>
              <span className="text-base font-bold text-cyan-300">{currentVal.toFixed(1)}</span>
            </div>
          </div>
        </div>

        {/* SVG Oscilloscope Display */}
        <div className="flex-1 bg-zinc-900/90 border border-zinc-800 rounded-xl p-4 flex items-center justify-center relative overflow-hidden shadow-inner">
          {plotData.length < 2 ? (
            <div className="text-center text-zinc-500 font-mono text-xs flex flex-col items-center space-y-2">
              <Activity className="w-8 h-8 text-zinc-600 animate-pulse" />
              <span>Awaiting CAN message frames for 0x{selectedId.toString(16).toUpperCase()}...</span>
            </div>
          ) : (
            <svg
              viewBox={`0 0 ${svgWidth} ${svgHeight}`}
              className="w-full h-full max-h-80 overflow-visible"
              preserveAspectRatio="none"
            >
              {/* Horizontal Gridlines */}
              {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
                const y = padding.top + graphH * ratio;
                const val = maxVal - ratio * (maxVal - minVal);
                return (
                  <g key={ratio}>
                    <line
                      x1={padding.left}
                      y1={y}
                      x2={svgWidth - padding.right}
                      y2={y}
                      stroke="#27272a"
                      strokeDasharray="4 4"
                      strokeWidth="1"
                    />
                    <text
                      x={padding.left - 8}
                      y={y + 4}
                      fill="#71717a"
                      fontSize="10"
                      textAnchor="end"
                      fontFamily="monospace"
                    >
                      {val.toFixed(1)}
                    </text>
                  </g>
                );
              })}

              {/* Gradient & Glow for Waveform */}
              <defs>
                <linearGradient id="lineGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.3" />
                  <stop offset="100%" stopColor="#22d3ee" stopOpacity="0.0" />
                </linearGradient>
              </defs>

              {/* Signal Path */}
              <path d={pathString} fill="none" stroke="#22d3ee" strokeWidth="2.5" strokeLinecap="round" />
            </svg>
          )}
        </div>
      </div>
    </div>
  );
};
