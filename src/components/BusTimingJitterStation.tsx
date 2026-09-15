import React, { useState, useMemo } from 'react';
import { AggregatedIdStats } from '../store/canStore';
import { CanFrame, DbcDatabase, BusStatus } from '../types/can';
import {
  Activity,
  AlertTriangle,
  Clock,
  Gauge,
  Sliders,
  TrendingUp,
  ArrowUpDown,
  CheckCircle2,
  LineChart,
  Search,
  Zap,
} from 'lucide-react';

interface BusTimingJitterStationProps {
  frames: CanFrame[];
  aggregatedStats: Map<number, AggregatedIdStats>;
  busStatus: BusStatus;
  activeDbc: DbcDatabase | null;
  onSelectFrame?: (frame: CanFrame) => void;
  onNavigateToGraph?: (canId: number) => void;
}

export interface IdTimingMetrics {
  id: number;
  idHex: string;
  name: string;
  count: number;
  fps: number;
  lastTimestamp: number;
  currentPeriodMs: number;
  avgPeriodMs: number;
  minPeriodMs: number;
  maxPeriodMs: number;
  jitterMs: number;
  jitterPct: number;
  recentDeltas: number[]; // last 12-16 intervals
  dlc: number;
  busLoadPct: number; // estimated percentage of total bus load
  status: 'precise' | 'moderate' | 'critical';
}

export const BusTimingJitterStation: React.FC<BusTimingJitterStationProps> = ({
  frames,
  aggregatedStats,
  busStatus,
  activeDbc,
  onSelectFrame,
  onNavigateToGraph,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<'jitter' | 'busLoad' | 'period' | 'fps' | 'id'>('jitter');
  const [sortAsc, setSortAsc] = useState(false);
  const [selectedMetricId, setSelectedMetricId] = useState<number | null>(null);

  // Compute timing deltas and jitter from recent frame buffer
  const timingMetricsMap = useMemo(() => {
    const map = new Map<number, IdTimingMetrics>();
    const bitrate = busStatus.bitrate || 500000;

    // Group recent frames by ID (up to last 100 frames per ID for fast statistical calculation)
    const framesById = new Map<number, number[]>();
    for (let i = frames.length - 1; i >= 0 && i >= frames.length - 1500; i--) {
      const f = frames[i];
      const list = framesById.get(f.id);
      if (!list) {
        framesById.set(f.id, [f.timestamp]);
      } else if (list.length < 30) {
        list.push(f.timestamp);
      }
    }

    aggregatedStats.forEach((stat, id) => {
      const timestamps = framesById.get(id) || [];
      const deltasMs: number[] = [];

      // Sort chronological
      const sortedTs = [...timestamps].reverse();
      for (let i = 1; i < sortedTs.length; i++) {
        const delta = (sortedTs[i] - sortedTs[i - 1]) * 1000;
        if (delta > 0 && delta < 5000) {
          deltasMs.push(delta);
        }
      }

      let minPeriod = stat.periodMs || 0;
      let maxPeriod = stat.periodMs || 0;
      let avgPeriod = stat.periodMs || 0;
      let jitterMs = 0;
      let jitterPct = 0;

      if (deltasMs.length >= 2) {
        minPeriod = Math.min(...deltasMs);
        maxPeriod = Math.max(...deltasMs);
        const sum = deltasMs.reduce((a, b) => a + b, 0);
        avgPeriod = sum / deltasMs.length;

        // Standard deviation of cycle time deltas
        const variance =
          deltasMs.reduce((acc, val) => acc + Math.pow(val - avgPeriod, 2), 0) / deltasMs.length;
        jitterMs = Math.sqrt(variance);
        jitterPct = avgPeriod > 0 ? (jitterMs / avgPeriod) * 100 : 0;
      }

      // Calculate approximate bus load percentage consumed by this ID:
      // CAN 2.0B Frame bits = ~47 overhead + 8*DLC + stuff bits (~1.15 multiplier)
      // CAN-FD adds 64B payload + fast bit rate switch bits
      const overheadBits = stat.fd ? 65 : 47;
      const totalBitsPerFrame = Math.round((overheadBits + stat.lastDlc * 8) * 1.15);
      const bitsPerSec = stat.freqHz * totalBitsPerFrame;
      const busLoadPct = Math.min(100, Math.max(0, (bitsPerSec / bitrate) * 100));

      let status: 'precise' | 'moderate' | 'critical' = 'precise';
      if (jitterPct > 25 || (maxPeriod - minPeriod > 40 && avgPeriod < 100)) {
        status = 'critical';
      } else if (jitterPct > 10 || maxPeriod - minPeriod > 15) {
        status = 'moderate';
      }

      // Lookup DBC message name
      let name = '';
      if (activeDbc) {
        const dbcMsg = activeDbc.messages.find((m) => m.id === id);
        if (dbcMsg) name = dbcMsg.name;
      }

      map.set(id, {
        id,
        idHex: stat.idHex,
        name: name || `MSG_0x${id.toString(16).toUpperCase()}`,
        count: stat.count,
        fps: stat.freqHz,
        lastTimestamp: stat.lastTimestamp,
        currentPeriodMs: stat.periodMs,
        avgPeriodMs: Math.round(avgPeriod * 10) / 10,
        minPeriodMs: Math.round(minPeriod * 10) / 10,
        maxPeriodMs: Math.round(maxPeriod * 10) / 10,
        jitterMs: Math.round(jitterMs * 10) / 10,
        jitterPct: Math.round(jitterPct * 10) / 10,
        recentDeltas: deltasMs.slice(-14),
        dlc: stat.lastDlc,
        busLoadPct: Math.round(busLoadPct * 10) / 10,
        status,
      });
    });

    return map;
  }, [frames, aggregatedStats, busStatus.bitrate, activeDbc]);

  // Filter & Sort list
  const metricsList = useMemo(() => {
    let list = Array.from(timingMetricsMap.values()) as IdTimingMetrics[];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (m) =>
          m.idHex.toLowerCase().includes(q) ||
          m.id.toString().includes(q) ||
          m.name.toLowerCase().includes(q)
      );
    }

    return list.sort((a, b) => {
      let valA = 0;
      let valB = 0;
      if (sortField === 'jitter') {
        valA = a.jitterMs;
        valB = b.jitterMs;
      } else if (sortField === 'busLoad') {
        valA = a.busLoadPct;
        valB = b.busLoadPct;
      } else if (sortField === 'period') {
        valA = a.avgPeriodMs;
        valB = b.avgPeriodMs;
      } else if (sortField === 'fps') {
        valA = a.fps;
        valB = b.fps;
      } else if (sortField === 'id') {
        valA = a.id;
        valB = b.id;
      }

      return sortAsc ? valA - valB : valB - valA;
    });
  }, [timingMetricsMap, searchQuery, sortField, sortAsc]);

  const handleSort = (field: typeof sortField) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(false);
    }
  };

  // Top Bus Load Consumers (for Bandwidth Spectrum)
  const topLoadConsumers = useMemo(() => {
    return (Array.from(timingMetricsMap.values()) as IdTimingMetrics[])
      .sort((a, b) => b.busLoadPct - a.busLoadPct)
      .slice(0, 5);
  }, [timingMetricsMap]);

  const totalCalculatedLoad = useMemo(() => {
    return (Array.from(timingMetricsMap.values()) as IdTimingMetrics[]).reduce((sum, m) => sum + m.busLoadPct, 0);
  }, [timingMetricsMap]);

  // High jitter anomaly count
  const criticalCount = useMemo(() => {
    return (Array.from(timingMetricsMap.values()) as IdTimingMetrics[]).filter((m) => m.status === 'critical').length;
  }, [timingMetricsMap]);

  return (
    <div className="space-y-5">
      {/* Top Banner & Bandwidth Spectrum */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Bus Bandwidth Breakdown */}
        <div className="lg:col-span-2 bg-zinc-900 border border-zinc-800 rounded-xl p-4 shadow-sm space-y-3">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-zinc-200 flex items-center space-x-1.5">
              <Gauge className="w-4 h-4 text-cyan-400" />
              <span>Bandwidth Distribution by CAN ID (% of Bus Capacity)</span>
            </span>
            <span className="font-mono text-zinc-400">
              Total Load: <strong className="text-cyan-400">{busStatus.busLoad.toFixed(1)}%</strong>
            </span>
          </div>

          {/* Segmented Bandwidth Bar */}
          <div className="w-full h-4 bg-zinc-950 rounded-full overflow-hidden flex border border-zinc-800">
            {topLoadConsumers.map((consumer, idx) => {
              const colors = [
                'bg-cyan-500',
                'bg-emerald-500',
                'bg-amber-500',
                'bg-purple-500',
                'bg-rose-500',
              ];
              const color = colors[idx % colors.length];
              return (
                <div
                  key={consumer.id}
                  style={{ width: `${Math.max(2, (consumer.busLoadPct / Math.max(1, totalCalculatedLoad)) * 100)}%` }}
                  className={`h-full ${color} transition-all duration-300 relative group cursor-pointer`}
                  title={`${consumer.idHex} (${consumer.name}): ${consumer.busLoadPct.toFixed(1)}% bus load`}
                  onClick={() => setSelectedMetricId(consumer.id)}
                />
              );
            })}
          </div>

          {/* Legend */}
          <div className="flex flex-wrap items-center gap-3 pt-1 text-[11px] font-mono">
            {topLoadConsumers.map((consumer, idx) => {
              const colors = [
                'text-cyan-400 border-cyan-700/60 bg-cyan-950/40',
                'text-emerald-400 border-emerald-700/60 bg-emerald-950/40',
                'text-amber-400 border-amber-700/60 bg-amber-950/40',
                'text-purple-400 border-purple-700/60 bg-purple-950/40',
                'text-rose-400 border-rose-700/60 bg-rose-950/40',
              ];
              const color = colors[idx % colors.length];
              return (
                <span
                  key={consumer.id}
                  onClick={() => setSelectedMetricId(consumer.id)}
                  className={`px-2 py-0.5 rounded border ${color} cursor-pointer hover:opacity-80 transition flex items-center space-x-1`}
                >
                  <span className="font-bold">{consumer.idHex}</span>
                  <span className="text-zinc-400 font-sans truncate max-w-[100px]">{consumer.name}</span>
                  <span className="font-bold">({consumer.busLoadPct}%)</span>
                </span>
              );
            })}
          </div>
        </div>

        {/* Jitter Overview Card */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-zinc-200 flex items-center space-x-1.5">
              <TrendingUp className="w-4 h-4 text-amber-400" />
              <span>Timing Jitter Analysis</span>
            </span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-zinc-800 text-zinc-300">
              {metricsList.length} Active IDs
            </span>
          </div>

          <div className="space-y-2 my-2">
            <div className="flex items-baseline justify-between">
              <span className="text-xs text-zinc-400">Contention / Starved IDs:</span>
              <span
                className={`font-mono font-bold text-base ${
                  criticalCount > 0 ? 'text-rose-400' : 'text-emerald-400'
                }`}
              >
                {criticalCount > 0 ? `${criticalCount} Anomalous` : 'All Cycles Nominal'}
              </span>
            </div>
            <p className="text-[11px] text-zinc-500 leading-relaxed">
              Jitter tracks variance in periodic message intervals ($\Delta t$). High jitter points to bus arbitration delays or ECU scheduling contention.
            </p>
          </div>

          <div className="pt-2 border-t border-zinc-800/80 flex items-center justify-between text-[11px] text-zinc-400">
            <span>Bitrate: <strong className="text-zinc-200 font-mono">{(busStatus.bitrate / 1000).toFixed(0)} kbps</strong></span>
            <span>Tolerance: <strong className="text-emerald-400 font-mono">±5%</strong></span>
          </div>
        </div>
      </div>

      {/* Filter and Search Toolbar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3 bg-zinc-900 border border-zinc-800 rounded-lg">
        <div className="relative w-full sm:w-80">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search CAN ID, hex, or DBC name..."
            className="w-full pl-8 pr-3 py-1.5 bg-zinc-950 border border-zinc-800 rounded text-xs text-zinc-200 font-mono placeholder-zinc-500 focus:outline-none focus:border-cyan-500"
          />
        </div>

        <div className="flex items-center space-x-2 text-xs text-zinc-400">
          <span>Sort By:</span>
          <button
            onClick={() => handleSort('jitter')}
            className={`px-2.5 py-1 rounded cursor-pointer transition font-mono ${
              sortField === 'jitter' ? 'bg-amber-950 text-amber-300 border border-amber-700' : 'bg-zinc-800 text-zinc-300'
            }`}
          >
            Jitter (σ)
          </button>
          <button
            onClick={() => handleSort('busLoad')}
            className={`px-2.5 py-1 rounded cursor-pointer transition font-mono ${
              sortField === 'busLoad' ? 'bg-cyan-950 text-cyan-300 border border-cyan-700' : 'bg-zinc-800 text-zinc-300'
            }`}
          >
            Bus Load %
          </button>
          <button
            onClick={() => handleSort('period')}
            className={`px-2.5 py-1 rounded cursor-pointer transition font-mono ${
              sortField === 'period' ? 'bg-purple-950 text-purple-300 border border-purple-700' : 'bg-zinc-800 text-zinc-300'
            }`}
          >
            Cycle Period
          </button>
        </div>
      </div>

      {/* Timing Jitter Table */}
      <div className="border border-zinc-800 rounded-xl overflow-hidden bg-zinc-900 shadow-sm">
        <table className="w-full text-left border-collapse text-xs">
          <thead className="bg-zinc-950 text-zinc-400 font-mono text-[11px] border-b border-zinc-800">
            <tr>
              <th className="py-2.5 px-3">CAN ID</th>
              <th className="py-2.5 px-3">Message Name</th>
              <th className="py-2.5 px-3">Freq</th>
              <th className="py-2.5 px-3">Nominal Cycle</th>
              <th className="py-2.5 px-3">Min / Max Delta</th>
              <th className="py-2.5 px-3">Jitter (Std Dev σ)</th>
              <th className="py-2.5 px-3">Recent Cycles (Sparkline)</th>
              <th className="py-2.5 px-3">Bus Load %</th>
              <th className="py-2.5 px-3">Status</th>
              <th className="py-2.5 px-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800/80 font-mono">
            {metricsList.map((m) => {
              const isSelected = selectedMetricId === m.id;
              const rangeY = m.maxPeriodMs - m.minPeriodMs || 1;

              return (
                <tr
                  key={m.id}
                  onClick={() => setSelectedMetricId(isSelected ? null : m.id)}
                  className={`hover:bg-zinc-800/50 transition cursor-pointer select-none ${
                    isSelected ? 'bg-cyan-950/30' : ''
                  }`}
                >
                  {/* CAN ID */}
                  <td className="py-2.5 px-3 font-bold text-cyan-400">{m.idHex}</td>

                  {/* Message Name */}
                  <td className="py-2.5 px-3 font-sans text-zinc-200">
                    <span className="font-semibold block truncate max-w-[160px]">{m.name}</span>
                    <span className="text-[10px] text-zinc-500 font-mono">{m.count.toLocaleString()} frames</span>
                  </td>

                  {/* Frequency */}
                  <td className="py-2.5 px-3 text-zinc-300">{m.fps} Hz</td>

                  {/* Nominal Cycle Period */}
                  <td className="py-2.5 px-3 text-zinc-200 font-semibold">{m.avgPeriodMs} ms</td>

                  {/* Min / Max Delta */}
                  <td className="py-2.5 px-3 text-zinc-400 text-[11px]">
                    <span className="text-emerald-400">{m.minPeriodMs}</span>
                    <span className="mx-1 text-zinc-600">/</span>
                    <span className="text-amber-400">{m.maxPeriodMs} ms</span>
                  </td>

                  {/* Jitter (Std Dev) */}
                  <td className="py-2.5 px-3 font-semibold">
                    <span
                      className={
                        m.status === 'critical'
                          ? 'text-rose-400 font-bold'
                          : m.status === 'moderate'
                          ? 'text-amber-400'
                          : 'text-emerald-400'
                      }
                    >
                      ±{m.jitterMs} ms ({m.jitterPct}%)
                    </span>
                  </td>

                  {/* Sparkline */}
                  <td className="py-2.5 px-3">
                    <div className="w-24 h-6 flex items-end space-x-0.5 bg-zinc-950/80 p-0.5 rounded border border-zinc-800">
                      {m.recentDeltas.map((d, idx) => {
                        const heightPct = Math.min(
                          100,
                          Math.max(15, ((d - m.minPeriodMs) / rangeY) * 100)
                        );
                        return (
                          <div
                            key={idx}
                            style={{ height: `${heightPct}%` }}
                            className={`flex-1 rounded-xs transition-all ${
                              m.status === 'critical' ? 'bg-rose-500' : 'bg-cyan-500'
                            }`}
                            title={`Delta: ${d.toFixed(1)}ms`}
                          />
                        );
                      })}
                    </div>
                  </td>

                  {/* Bus Load % */}
                  <td className="py-2.5 px-3">
                    <div className="flex items-center space-x-1.5">
                      <span className="text-zinc-200 font-bold">{m.busLoadPct}%</span>
                      <div className="w-12 bg-zinc-800 rounded-full h-1 overflow-hidden">
                        <div
                          className="bg-cyan-400 h-full"
                          style={{ width: `${Math.min(100, m.busLoadPct * 4)}%` }}
                        />
                      </div>
                    </div>
                  </td>

                  {/* Status Badge */}
                  <td className="py-2.5 px-3">
                    {m.status === 'precise' && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] bg-emerald-950 text-emerald-300 border border-emerald-800 flex items-center space-x-1 w-fit">
                        <CheckCircle2 className="w-2.5 h-2.5" />
                        <span>Nominal</span>
                      </span>
                    )}
                    {m.status === 'moderate' && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] bg-amber-950 text-amber-300 border border-amber-800 flex items-center space-x-1 w-fit">
                        <Clock className="w-2.5 h-2.5" />
                        <span>Moderate</span>
                      </span>
                    )}
                    {m.status === 'critical' && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] bg-rose-950 text-rose-300 border border-rose-800 flex items-center space-x-1 w-fit">
                        <AlertTriangle className="w-2.5 h-2.5" />
                        <span>Contention</span>
                      </span>
                    )}
                  </td>

                  {/* Action */}
                  <td className="py-2.5 px-3 text-right">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (onNavigateToGraph) {
                          onNavigateToGraph(m.id);
                        }
                      }}
                      className="px-2 py-1 bg-zinc-800 hover:bg-cyan-950 hover:text-cyan-300 text-zinc-300 rounded text-[11px] font-sans transition cursor-pointer flex items-center space-x-1 ml-auto"
                      title="Plot Signal Waveform"
                    >
                      <LineChart className="w-3 h-3" />
                      <span>Graph</span>
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
