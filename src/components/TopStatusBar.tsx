import React from 'react';
import { BusStatus } from '../types/can';
import { formatBitrate } from '../utils/formatters';
import {
  Activity,
  Cpu,
  Settings as SettingsIcon,
  Play,
  Square,
  Radio,
  Gauge,
  SlidersHorizontal,
} from 'lucide-react';
import { DesktopInstallButton } from './DesktopInstallButton';

interface TopStatusBarProps {
  status: BusStatus;
  onOpenConfig: () => void;
  onConnect: () => void;
  onDisconnect: () => void;
}

export const TopStatusBar: React.FC<TopStatusBarProps> = ({
  status,
  onOpenConfig,
  onConnect,
  onDisconnect,
}) => {
  const isConnected = status.connectionState === 'connected';
  const isConnecting = status.connectionState === 'connecting';
  const isError = status.connectionState === 'error';
  const isMock = status.backend === 'mock';

  return (
    <header className="h-14 bg-zinc-950 border-b border-zinc-800/80 px-4 flex items-center justify-between select-none shrink-0 z-30">
      {/* Left: Brand & Mode */}
      <div className="flex items-center space-x-3">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 rounded bg-gradient-to-br from-cyan-600 to-blue-700 flex items-center justify-center font-bold text-white shadow-md border border-cyan-400/30">
            <Radio className="w-4 h-4 text-cyan-100" />
          </div>
          <div className="flex flex-col">
            <div className="flex items-center space-x-2">
              <span className="font-bold text-base text-zinc-100 tracking-wider">CANScope</span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 border border-zinc-700/50">
                v2.4-PRO
              </span>
            </div>
            <span className="text-[10px] text-zinc-500 font-mono tracking-tight">CAN & CAN-FD ANALYZER</span>
          </div>
        </div>

        {/* Hardware / Simulation Mode Pill */}
        {isConnected && (
          <div className="flex items-center space-x-1.5 ml-2">
            {isMock ? (
              <span className="px-2 py-0.5 text-[11px] font-bold tracking-wider rounded bg-amber-500/10 text-amber-400 border border-amber-500/30 flex items-center space-x-1.5 animate-pulse">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                <span>SIMULATION MODE</span>
              </span>
            ) : (
              <span className="px-2 py-0.5 text-[11px] font-medium rounded bg-cyan-950/60 text-cyan-300 border border-cyan-700/50 flex items-center space-x-1">
                <Cpu className="w-3 h-3 text-cyan-400" />
                <span>{status.interfaceName}</span>
              </span>
            )}

            {/* Read-Only / Listen-Only Indicator */}
            {status.listenOnly && (
              <span className="px-2 py-0.5 text-[11px] font-bold rounded bg-purple-950/80 text-purple-300 border border-purple-600/40">
                LISTEN ONLY
              </span>
            )}
          </div>
        )}
      </div>

      {/* Middle: Bus Telemetry Strip */}
      <div className="hidden lg:flex items-center space-x-6 text-xs font-mono">
        {/* Connection Indicator */}
        <div className="flex items-center space-x-2">
          <div
            className={`w-2.5 h-2.5 rounded-full ${
              isConnected
                ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.7)]'
                : isConnecting
                ? 'bg-amber-400 animate-ping'
                : isError
                ? 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.7)]'
                : 'bg-zinc-600'
            }`}
          />
          <span
            className={`font-semibold capitalize ${
              isConnected
                ? 'text-emerald-400'
                : isConnecting
                ? 'text-amber-400'
                : isError
                ? 'text-rose-400'
                : 'text-zinc-400'
            }`}
          >
            {status.connectionState}
          </span>
        </div>

        <div className="h-4 w-px bg-zinc-800" />

        {/* Channel & Protocol */}
        <div className="flex items-center space-x-1.5">
          <span className="text-zinc-500">CH:</span>
          <span className="text-zinc-200 font-semibold">{status.channel}</span>
          <span
            className={`ml-1 px-1 py-0.2 rounded text-[10px] ${
              status.fdEnabled ? 'bg-indigo-950 text-indigo-300 border border-indigo-700/40' : 'text-zinc-400'
            }`}
          >
            {status.fdEnabled ? 'CAN-FD' : 'CLASSIC CAN'}
          </span>
        </div>

        <div className="h-4 w-px bg-zinc-800" />

        {/* Bitrate */}
        <div className="flex items-center space-x-1.5">
          <span className="text-zinc-500">BITRATE:</span>
          <span className="text-zinc-200">{formatBitrate(status.bitrate)}</span>
          {status.fdEnabled && status.dataBitrate && (
            <span className="text-indigo-400 text-[11px]">/ {formatBitrate(status.dataBitrate)}</span>
          )}
        </div>

        <div className="h-4 w-px bg-zinc-800" />

        {/* Bus Load Meter */}
        <div className="flex items-center space-x-2">
          <Gauge className="w-3.5 h-3.5 text-zinc-400" />
          <span className="text-zinc-500">LOAD:</span>
          <div className="flex items-center space-x-1.5">
            <div className="w-14 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-300 ${
                  status.busLoad > 80
                    ? 'bg-rose-500'
                    : status.busLoad > 50
                    ? 'bg-amber-400'
                    : 'bg-cyan-400'
                }`}
                style={{ width: `${Math.min(100, Math.max(2, status.busLoad))}%` }}
              />
            </div>
            <span
              className={`font-semibold ${
                status.busLoad > 80 ? 'text-rose-400' : status.busLoad > 50 ? 'text-amber-400' : 'text-zinc-200'
              }`}
            >
              {status.busLoad.toFixed(1)}%
            </span>
          </div>
        </div>

        <div className="h-4 w-px bg-zinc-800" />

        {/* Frames / sec */}
        <div className="flex items-center space-x-1.5">
          <Activity className="w-3.5 h-3.5 text-cyan-400" />
          <span className="text-zinc-500">RATE:</span>
          <span className="text-cyan-300 font-semibold">{status.fps.toLocaleString()} fps</span>
        </div>
      </div>

      {/* Right: Quick Action Controls */}
      <div className="flex items-center space-x-2">
        <DesktopInstallButton />

        {isConnected ? (
          <button
            onClick={onDisconnect}
            className="flex items-center space-x-1.5 px-3 py-1.5 text-xs font-semibold rounded bg-zinc-900 hover:bg-rose-950/60 text-zinc-300 hover:text-rose-300 border border-zinc-700 hover:border-rose-600/40 transition active:scale-95 cursor-pointer"
            title="Disconnect CAN interface"
          >
            <Square className="w-3.5 h-3.5 text-rose-400" />
            <span>Disconnect</span>
          </button>
        ) : (
          <button
            onClick={onConnect}
            className="flex items-center space-x-1.5 px-3 py-1.5 text-xs font-semibold rounded bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm transition active:scale-95 cursor-pointer"
            title="Connect to CAN interface or simulator"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>Connect</span>
          </button>
        )}

        <button
          onClick={onOpenConfig}
          className="flex items-center space-x-1.5 px-3 py-1.5 text-xs font-medium rounded bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-700 transition active:scale-95 cursor-pointer"
          title="Configure CAN interface, bitrate, and CAN-FD"
        >
          <SlidersHorizontal className="w-3.5 h-3.5 text-zinc-400" />
          <span className="hidden sm:inline">Configure</span>
        </button>
      </div>
    </header>
  );
};
