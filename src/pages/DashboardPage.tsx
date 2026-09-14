import React from 'react';
import { BusStatus, SystemInfo } from '../types/can';
import { AggregatedIdStats } from '../store/canStore';
import { formatBitrate, formatUptime } from '../utils/formatters';
import {
  Activity,
  Cpu,
  Gauge,
  Layers,
  ArrowDownLeft,
  ArrowUpRight,
  AlertTriangle,
  Clock,
  Terminal,
  Database,
  Send,
  Radio,
  CheckCircle2,
} from 'lucide-react';

interface DashboardPageProps {
  status: BusStatus;
  systemInfo: SystemInfo | null;
  aggregatedStats: Map<number, AggregatedIdStats>;
  onNavigate: (page: any) => void;
  onOpenConnect: () => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({
  status,
  systemInfo,
  aggregatedStats,
  onNavigate,
  onOpenConnect,
}) => {
  const isConnected = status.connectionState === 'connected';
  const topIds: AggregatedIdStats[] = (Array.from(aggregatedStats.values()) as AggregatedIdStats[])
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);

  return (
    <div className="p-6 space-y-6 overflow-y-auto h-full text-zinc-200">
      {/* Top Banner / Hardware Detection Alert if disconnected */}
      {!isConnected && (
        <div className="p-4 bg-zinc-900/90 border border-zinc-700/80 rounded-xl flex items-center justify-between shadow-lg">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-lg bg-cyan-950/80 border border-cyan-700/50 flex items-center justify-center">
              <Radio className="w-5 h-5 text-cyan-400 animate-pulse" />
            </div>
            <div>
              <h2 className="font-bold text-sm text-zinc-100">CAN Interface Disconnected</h2>
              <p className="text-xs text-zinc-400 mt-0.5">
                Connect your PCAN-USB device, bind SocketCAN, or run Simulation Mode without hardware.
              </p>
            </div>
          </div>
          <button
            onClick={onOpenConnect}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-semibold text-xs transition shadow-sm cursor-pointer"
          >
            Connect Interface
          </button>
        </div>
      )}

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Bus Load */}
        <div className="bg-zinc-900 border border-zinc-800/80 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-zinc-400 mb-2 text-xs">
            <span className="font-medium">Bus Utilization</span>
            <Gauge className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="flex items-baseline space-x-2">
            <span
              className={`text-2xl font-bold font-mono ${
                status.busLoad > 80 ? 'text-rose-400' : status.busLoad > 50 ? 'text-amber-400' : 'text-zinc-100'
              }`}
            >
              {status.busLoad.toFixed(1)}%
            </span>
            <span className="text-xs text-zinc-500 font-mono">of {formatBitrate(status.bitrate)}</span>
          </div>
          <div className="w-full bg-zinc-800 rounded-full h-1.5 mt-3 overflow-hidden">
            <div
              className={`h-full transition-all duration-300 ${
                status.busLoad > 80 ? 'bg-rose-500' : status.busLoad > 50 ? 'bg-amber-400' : 'bg-cyan-500'
              }`}
              style={{ width: `${Math.min(100, Math.max(2, status.busLoad))}%` }}
            />
          </div>
        </div>

        {/* Frame Rate */}
        <div className="bg-zinc-900 border border-zinc-800/80 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-zinc-400 mb-2 text-xs">
            <span className="font-medium">Message Throughput</span>
            <Activity className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-2xl font-bold font-mono text-zinc-100">{status.fps.toLocaleString()}</span>
            <span className="text-xs text-zinc-500 font-mono">frames / sec</span>
          </div>
          <div className="text-[11px] text-zinc-500 mt-3 flex items-center space-x-2">
            <span>Total:</span>
            <span className="font-mono text-zinc-300 font-semibold">{status.totalFrames.toLocaleString()}</span>
          </div>
        </div>

        {/* Traffic Balance: RX vs TX */}
        <div className="bg-zinc-900 border border-zinc-800/80 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-zinc-400 mb-2 text-xs">
            <span className="font-medium">Traffic Distribution</span>
            <Layers className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="grid grid-cols-2 gap-2 mt-1">
            <div className="flex items-center space-x-1.5">
              <ArrowDownLeft className="w-4 h-4 text-cyan-400 shrink-0" />
              <div>
                <span className="text-[10px] text-zinc-500 uppercase block">RX</span>
                <span className="font-mono text-xs font-bold text-zinc-200">{status.rxFrames.toLocaleString()}</span>
              </div>
            </div>
            <div className="flex items-center space-x-1.5">
              <ArrowUpRight className="w-4 h-4 text-amber-400 shrink-0" />
              <div>
                <span className="text-[10px] text-zinc-500 uppercase block">TX</span>
                <span className="font-mono text-xs font-bold text-zinc-200">{status.txFrames.toLocaleString()}</span>
              </div>
            </div>
          </div>
          <div className="text-[11px] text-zinc-500 mt-2.5">
            Protocol: <span className="text-zinc-300 font-mono">{status.fdEnabled ? 'CAN-FD' : 'Classic CAN'}</span>
          </div>
        </div>

        {/* Errors & State */}
        <div className="bg-zinc-900 border border-zinc-800/80 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-zinc-400 mb-2 text-xs">
            <span className="font-medium">Bus Health</span>
            <AlertTriangle
              className={`w-4 h-4 ${status.errorFrames > 0 ? 'text-rose-400' : 'text-zinc-500'}`}
            />
          </div>
          <div className="flex items-baseline space-x-2">
            <span
              className={`text-xl font-bold font-mono uppercase ${
                status.busState === 'active'
                  ? 'text-emerald-400'
                  : status.busState === 'warning'
                  ? 'text-amber-400'
                  : 'text-rose-400'
              }`}
            >
              {status.busState}
            </span>
            <span className="text-xs text-zinc-500 font-mono">state</span>
          </div>
          <div className="text-[11px] text-zinc-400 mt-3 font-mono flex items-center space-x-3">
            <span>
              TEC: <strong className="text-zinc-200">{status.tec}</strong>
            </span>
            <span>
              REC: <strong className="text-zinc-200">{status.rec}</strong>
            </span>
            <span>
              Errors: <strong className={status.errorFrames > 0 ? 'text-rose-400' : 'text-zinc-200'}>{status.errorFrames}</strong>
            </span>
          </div>
        </div>
      </div>

      {/* Main Split: Active CAN IDs & Hardware Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Top CAN IDs Table */}
        <div className="lg:col-span-2 bg-zinc-900 border border-zinc-800 rounded-xl p-5 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-zinc-100">Active Bus Transmitters (Top IDs)</h3>
              <p className="text-xs text-zinc-400 mt-0.5">Aggregated periodic message rates and frequencies</p>
            </div>
            <button
              onClick={() => onNavigate('monitor')}
              className="text-xs font-semibold text-cyan-400 hover:text-cyan-300 transition flex items-center space-x-1 cursor-pointer"
            >
              <span>Open Sniffer</span>
              <Terminal className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left font-mono text-xs border-collapse">
              <thead>
                <tr className="border-b border-zinc-800 text-zinc-500 text-[11px]">
                  <th className="pb-2">CAN ID</th>
                  <th className="pb-2">Type</th>
                  <th className="pb-2">Count</th>
                  <th className="pb-2">Period</th>
                  <th className="pb-2">Freq</th>
                  <th className="pb-2">Last Payload</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60">
                {topIds.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-zinc-500">
                      No CAN frames observed on bus. Connect interface or start simulation.
                    </td>
                  </tr>
                ) : (
                  topIds.map((item) => (
                    <tr key={item.id} className="hover:bg-zinc-800/40 transition">
                      <td className="py-2.5 font-bold text-cyan-400">{item.idHex}</td>
                      <td className="py-2.5 text-zinc-400 text-[11px]">
                        {item.fd ? 'FD' : item.extended ? 'EXT' : 'STD'}
                      </td>
                      <td className="py-2.5 text-zinc-200">{item.count.toLocaleString()}</td>
                      <td className="py-2.5 text-zinc-300">{item.periodMs ? `${item.periodMs} ms` : '-'}</td>
                      <td className="py-2.5 text-emerald-400 font-semibold">
                        {item.freqHz ? `${item.freqHz} Hz` : '-'}
                      </td>
                      <td className="py-2.5 text-zinc-400 font-mono text-[11px]">
                        {item.lastData.slice(0, 8).map((b) => b.toString(16).toUpperCase().padStart(2, '0')).join(' ')}
                        {item.lastData.length > 8 ? ' ...' : ''}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Runtime Diagnostics & Quick Actions */}
        <div className="space-y-6">
          {/* Hardware & Runtime Card */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
            <div className="flex items-center space-x-2 text-zinc-100 font-bold text-sm mb-3">
              <Cpu className="w-4 h-4 text-cyan-400" />
              <span>Runtime & Discovery</span>
            </div>

            <div className="space-y-2.5 text-xs">
              <div className="flex justify-between py-1 border-b border-zinc-800/80">
                <span className="text-zinc-500">Platform OS:</span>
                <span className="text-zinc-200 font-mono font-medium">
                  {systemInfo?.platform || 'Unknown'} ({systemInfo?.architecture || 'x86_64'})
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-zinc-800/80">
                <span className="text-zinc-500">Selected Adapter:</span>
                <span className="text-zinc-200 font-mono">{status.interfaceName}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-zinc-800/80">
                <span className="text-zinc-500">Channel / Port:</span>
                <span className="text-zinc-200 font-mono font-bold text-cyan-300">{status.channel}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-zinc-800/80">
                <span className="text-zinc-500">Bitrate:</span>
                <span className="text-zinc-200 font-mono">{formatBitrate(status.bitrate)}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-zinc-800/80">
                <span className="text-zinc-500">Uptime:</span>
                <span className="text-zinc-200 font-mono flex items-center space-x-1">
                  <Clock className="w-3 h-3 text-zinc-500" />
                  <span>{formatUptime(status.uptimeSeconds)}</span>
                </span>
              </div>
            </div>
          </div>

          {/* Quick Nav Cards */}
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => onNavigate('dbc')}
              className="p-3.5 bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 hover:border-zinc-700 rounded-xl text-left transition group cursor-pointer"
            >
              <Database className="w-4 h-4 text-emerald-400 mb-2 group-hover:scale-110 transition" />
              <div className="font-semibold text-zinc-200 text-xs">DBC Decoder</div>
              <div className="text-[10px] text-zinc-500 mt-0.5">Decode signals & units</div>
            </button>

            <button
              onClick={() => onNavigate('transmit')}
              className="p-3.5 bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 hover:border-zinc-700 rounded-xl text-left transition group cursor-pointer"
            >
              <Send className="w-4 h-4 text-amber-400 mb-2 group-hover:scale-110 transition" />
              <div className="font-semibold text-zinc-200 text-xs">Transmit</div>
              <div className="text-[10px] text-zinc-500 mt-0.5">Send periodic frames</div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
