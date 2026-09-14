import React from 'react';
import { BusStatus } from '../types/can';
import { AlertOctagon, ShieldCheck, AlertTriangle, XCircle, Info, RefreshCw } from 'lucide-react';

interface ErrorsPageProps {
  status: BusStatus;
  onClearErrors?: () => void;
}

export const ErrorsPage: React.FC<ErrorsPageProps> = ({ status, onClearErrors }) => {
  const tec = status.tec || 0;
  const rec = status.rec || 0;
  const errorFrames = status.errorFrames || 0;

  // Determine standard CAN error state according to ISO 11898-1
  let stateTitle = 'Error Active';
  let stateColor = 'text-emerald-400';
  let stateBadge = 'bg-emerald-950/80 text-emerald-300 border-emerald-800';
  let stateDesc =
    'Node is fully operational, participates normally in bus traffic, and actively sends error flags upon anomaly detection.';

  if (tec > 255) {
    stateTitle = 'Bus Off';
    stateColor = 'text-rose-500';
    stateBadge = 'bg-rose-950 text-rose-300 border-rose-700 animate-pulse';
    stateDesc =
      'Node has disconnected from the bus due to excessive transmission faults (TEC > 255). CAN controller is inhibited from sending any messages until hardware reset.';
  } else if (tec >= 128 || rec >= 128) {
    stateTitle = 'Error Passive';
    stateColor = 'text-rose-400';
    stateBadge = 'bg-rose-950/80 text-rose-300 border-rose-800';
    stateDesc =
      'Node is in Error Passive state (TEC or REC >= 128). Node may only transmit passive error flags (6 recessive bits) and must wait an extra suspend transmission time.';
  } else if (tec >= 96 || rec >= 96) {
    stateTitle = 'Error Warning';
    stateColor = 'text-amber-400';
    stateBadge = 'bg-amber-950/80 text-amber-300 border-amber-800';
    stateDesc =
      'Error counter warning threshold exceeded (TEC or REC >= 96). Indicating physical layer degradation, termination mismatch, or bitrate mismatch.';
  }

  return (
    <div className="p-6 space-y-6 overflow-y-auto h-full text-zinc-200">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-zinc-100 flex items-center space-x-2">
            <AlertOctagon className="w-5 h-5 text-rose-400" />
            <span>CAN Controller Errors & Physical Bus Health</span>
          </h2>
          <p className="text-xs text-zinc-400 mt-0.5">
            ISO 11898-1 Bus State Management, Transmit (TEC) and Receive (REC) error counters
          </p>
        </div>

        {onClearErrors && (
          <button
            onClick={onClearErrors}
            className="px-3 py-1.5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-semibold flex items-center space-x-1.5 transition cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Clear Counters</span>
          </button>
        )}
      </div>

      {/* Main Bus State Card */}
      <div className="p-6 bg-zinc-900 border border-zinc-800 rounded-xl">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-zinc-800">
          <div>
            <div className="flex items-center space-x-3">
              <span className={`text-xl font-bold font-mono tracking-wide ${stateColor}`}>
                {stateTitle.toUpperCase()}
              </span>
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${stateBadge}`}>
                {status.controllerState}
              </span>
            </div>
            <p className="text-xs text-zinc-400 mt-2 max-w-2xl leading-relaxed">{stateDesc}</p>
          </div>
        </div>

        {/* Counter Gauges */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-6 font-mono text-center">
          {/* TEC */}
          <div className="p-4 bg-zinc-950 border border-zinc-800 rounded-xl">
            <span className="text-xs text-zinc-500 font-sans uppercase block">
              Transmit Error Counter (TEC)
            </span>
            <div className="text-3xl font-bold text-zinc-100 mt-2">{tec}</div>
            <div className="w-full bg-zinc-800 rounded-full h-2 mt-3 overflow-hidden">
              <div
                className={`h-full transition-all ${
                  tec >= 128 ? 'bg-rose-500' : tec >= 96 ? 'bg-amber-400' : 'bg-emerald-400'
                }`}
                style={{ width: `${Math.min(100, (tec / 256) * 100)}%` }}
              />
            </div>
            <div className="flex justify-between text-[10px] text-zinc-500 mt-1">
              <span>0 (OK)</span>
              <span>96 (Warn)</span>
              <span>128 (Passive)</span>
              <span>256 (Off)</span>
            </div>
          </div>

          {/* REC */}
          <div className="p-4 bg-zinc-950 border border-zinc-800 rounded-xl">
            <span className="text-xs text-zinc-500 font-sans uppercase block">
              Receive Error Counter (REC)
            </span>
            <div className="text-3xl font-bold text-zinc-100 mt-2">{rec}</div>
            <div className="w-full bg-zinc-800 rounded-full h-2 mt-3 overflow-hidden">
              <div
                className={`h-full transition-all ${
                  rec >= 128 ? 'bg-rose-500' : rec >= 96 ? 'bg-amber-400' : 'bg-emerald-400'
                }`}
                style={{ width: `${Math.min(100, (rec / 128) * 100)}%` }}
              />
            </div>
            <div className="flex justify-between text-[10px] text-zinc-500 mt-1">
              <span>0 (OK)</span>
              <span>96 (Warn)</span>
              <span>128 (Passive)</span>
            </div>
          </div>

          {/* Total Error Frames */}
          <div className="p-4 bg-zinc-950 border border-zinc-800 rounded-xl">
            <span className="text-xs text-zinc-500 font-sans uppercase block">
              Total Error Frames
            </span>
            <div
              className={`text-3xl font-bold mt-2 ${
                errorFrames > 0 ? 'text-rose-400' : 'text-zinc-300'
              }`}
            >
              {errorFrames}
            </div>
            <div className="text-xs text-zinc-500 mt-4 font-sans">
              Bit, Stuff, CRC, Form, and ACK Errors
            </div>
          </div>
        </div>
      </div>

      {/* ISO State Machine Reference */}
      <div className="p-5 bg-zinc-900 border border-zinc-800 rounded-xl space-y-3 text-xs">
        <div className="flex items-center space-x-2 text-zinc-100 font-bold">
          <Info className="w-4 h-4 text-cyan-400" />
          <span>CAN Protocol Error Handling Theory</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-zinc-400 leading-relaxed font-sans">
          <div className="p-3 bg-zinc-950 rounded-lg border border-zinc-800">
            <span className="font-bold text-emerald-400 block mb-1">1. Error Active</span>
            TEC &lt; 96 and REC &lt; 96. Node responds immediately to detected transmission errors by
            broadcasting an active error flag (6 consecutive dominant bits), destroying the corrupted
            frame across all nodes.
          </div>
          <div className="p-3 bg-zinc-950 rounded-lg border border-zinc-800">
            <span className="font-bold text-amber-400 block mb-1">2. Error Warning</span>
            TEC &ge; 96 or REC &ge; 96. Early warning indicator signaling heavy packet loss or physical
            layer bus anomalies (e.g. missing 120-ohm split termination resistors).
          </div>
          <div className="p-3 bg-zinc-950 rounded-lg border border-zinc-800">
            <span className="font-bold text-rose-400 block mb-1">3. Error Passive & Bus Off</span>
            TEC or REC &ge; 128. Node is degraded to passive error flags. If TEC exceeds 255, node enters
            Bus Off, completely isolating itself to protect other healthy ECUs.
          </div>
        </div>
      </div>
    </div>
  );
};
