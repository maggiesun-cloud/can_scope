import React, { useState, useEffect, useRef } from 'react';
import { CanFrame } from '../types/can';
import { transmitCanFrame } from '../services/api';
import {
  Gauge,
  Activity,
  AlertCircle,
  RefreshCw,
  Play,
  Square,
  Send,
  Trash2,
  CheckCircle2,
  Zap,
  Flame,
  BatteryCharging,
  Wind,
  Droplets,
  Clock,
  Car,
  Check,
} from 'lucide-react';

interface ObdDiagnosticStationProps {
  isConnected: boolean;
  isListenOnly: boolean;
  frames?: CanFrame[];
  addToast: (title: string, message?: string, type?: any) => void;
}

interface PidDefinition {
  pid: number;
  name: string;
  description: string;
  unit: string;
  min: number;
  max: number;
  icon: any;
  color: string;
  decode: (a: number, b?: number) => { value: number; display: string };
}

const STANDARD_PIDS: PidDefinition[] = [
  {
    pid: 0x0c,
    name: 'Engine RPM',
    description: 'Engine rotational speed (Formula: ((A*256)+B)/4)',
    unit: 'RPM',
    min: 0,
    max: 7500,
    icon: Activity,
    color: 'text-amber-400',
    decode: (a, b = 0) => {
      const v = Math.round(((a * 256) + b) / 4);
      return { value: v, display: `${v.toLocaleString()} RPM` };
    },
  },
  {
    pid: 0x0d,
    name: 'Vehicle Speed',
    description: 'Current road speed (Formula: A)',
    unit: 'km/h',
    min: 0,
    max: 240,
    icon: Car,
    color: 'text-cyan-400',
    decode: (a) => {
      const mph = Math.round(a * 0.621371);
      return { value: a, display: `${a} km/h (${mph} mph)` };
    },
  },
  {
    pid: 0x05,
    name: 'Coolant Temperature',
    description: 'Engine cylinder head/coolant (Formula: A - 40)',
    unit: '°C',
    min: -40,
    max: 130,
    icon: Flame,
    color: 'text-rose-400',
    decode: (a) => {
      const tempC = a - 40;
      const tempF = Math.round((tempC * 9) / 5 + 32);
      return { value: tempC, display: `${tempC} °C (${tempF} °F)` };
    },
  },
  {
    pid: 0x11,
    name: 'Throttle Position',
    description: 'Pedal/Throttle body opening (Formula: (A*100)/255)',
    unit: '%',
    min: 0,
    max: 100,
    icon: Gauge,
    color: 'text-emerald-400',
    decode: (a) => {
      const pct = Math.round((a * 100) / 255);
      return { value: pct, display: `${pct}%` };
    },
  },
  {
    pid: 0x2f,
    name: 'Fuel Tank Level',
    description: 'Nominal fuel volume in tank (Formula: (A*100)/255)',
    unit: '%',
    min: 0,
    max: 100,
    icon: Droplets,
    color: 'text-indigo-400',
    decode: (a) => {
      const pct = Math.round((a * 100) / 255);
      return { value: pct, display: `${pct}%` };
    },
  },
  {
    pid: 0x04,
    name: 'Calculated Engine Load',
    description: 'ECU engine load percentage (Formula: (A*100)/255)',
    unit: '%',
    min: 0,
    max: 100,
    icon: Zap,
    color: 'text-yellow-400',
    decode: (a) => {
      const pct = Math.round((a * 100) / 255);
      return { value: pct, display: `${pct}%` };
    },
  },
  {
    pid: 0x42,
    name: 'Control Module Voltage',
    description: 'ECU terminal voltage (Formula: ((A*256)+B)/1000)',
    unit: 'V',
    min: 8,
    max: 18,
    icon: BatteryCharging,
    color: 'text-teal-400',
    decode: (a, b = 0) => {
      const v = Number((((a * 256) + b) / 1000).toFixed(2));
      return { value: v, display: `${v} V` };
    },
  },
  {
    pid: 0x0f,
    name: 'Intake Air Temp',
    description: 'MAF/MAP inlet temperature (Formula: A - 40)',
    unit: '°C',
    min: -40,
    max: 85,
    icon: Wind,
    color: 'text-sky-400',
    decode: (a) => {
      const tempC = a - 40;
      return { value: tempC, display: `${tempC} °C` };
    },
  },
  {
    pid: 0x1f,
    name: 'Engine Run Time',
    description: 'Time elapsed since ignition start (Formula: (A*256)+B)',
    unit: 'sec',
    min: 0,
    max: 10000,
    icon: Clock,
    color: 'text-purple-400',
    decode: (a, b = 0) => {
      const sec = (a * 256) + b;
      const m = Math.floor(sec / 60);
      const s = sec % 60;
      return { value: sec, display: `${m}m ${s}s` };
    },
  },
];

interface DecodedPidState {
  value: number;
  display: string;
  rawHex: string;
  lastUpdated: number;
}

export const ObdDiagnosticStation: React.FC<ObdDiagnosticStationProps> = ({
  isConnected,
  isListenOnly,
  frames = [],
  addToast,
}) => {
  const [targetIdHex, setTargetIdHex] = useState('0x7DF');
  const [responseIdHex, setResponseIdHex] = useState('0x7E8');
  const [pidStates, setPidStates] = useState<Record<number, DecodedPidState>>({});
  const [isPolling, setIsPolling] = useState(false);
  const [pollingPids, setPollingPids] = useState<number[]>([0x0c, 0x0d, 0x05, 0x11]);
  const [activeTab, setActiveTab] = useState<'pids' | 'dtc' | 'raw'>('pids');

  // DTC State
  const [dtcCodes, setDtcCodes] = useState<Array<{ code: string; desc: string }>>([]);
  const [dtcReading, setDtcReading] = useState(false);
  const [dtcCleared, setDtcCleared] = useState(false);

  // Raw transaction log
  const [txLog, setTxLog] = useState<Array<{ time: string; type: 'TX' | 'RX'; id: string; hex: string; note?: string }>>([]);

  const pollTimerRef = useRef<any>(null);
  const pollIndexRef = useRef(0);

  // Monitor incoming frames for 0x7E8 (or response ID)
  useEffect(() => {
    if (!frames.length) return;
    const lastFrame = frames[frames.length - 1];
    const respId = parseInt(responseIdHex, 16);

    if (lastFrame.id === respId && lastFrame.data && lastFrame.data.length >= 3) {
      const data = lastFrame.data;
      const length = data[0];
      const mode = data[1];

      // Mode 01 response is 0x41
      if (mode === 0x41 && data.length >= 4) {
        const pid = data[2];
        const def = STANDARD_PIDS.find((p) => p.pid === pid);
        if (def) {
          const a = data[3] || 0;
          const b = data[4] || 0;
          const decoded = def.decode(a, b);
          const rawHex = data.slice(0, Math.min(data.length, length + 1)).map((x) => x.toString(16).padStart(2, '0').toUpperCase()).join(' ');

          setPidStates((prev) => ({
            ...prev,
            [pid]: {
              value: decoded.value,
              display: decoded.display,
              rawHex,
              lastUpdated: Date.now(),
            },
          }));

          setTxLog((prev) => [
            {
              time: new Date().toLocaleTimeString(),
              type: 'RX',
              id: lastFrame.idHex,
              hex: rawHex,
              note: `${def.name} = ${decoded.display}`,
            },
            ...prev.slice(0, 24),
          ]);
        }
      } else if (mode === 0x43) {
        // Mode 03 response (DTCs)
        // Format: [len, 0x43, count, dtc1_high, dtc1_low, ...]
        const count = data[2] || 0;
        const rawHex = data.map((x) => x.toString(16).padStart(2, '0').toUpperCase()).join(' ');
        if (count > 0 && data.length >= 5) {
          const high = data[3];
          const low = data[4];
          const typePrefix = ['P', 'C', 'B', 'U'][(high >> 6) & 0x03];
          const secondDigit = (high >> 4) & 0x03;
          const codeHex = `${typePrefix}${secondDigit}${(high & 0x0f).toString(16)}${low.toString(16).padStart(2, '0')}`.toUpperCase();
          const descMap: Record<string, string> = {
            P0103: 'Mass or Volume Air Flow Circuit High Input',
            P0300: 'Random / Multiple Cylinder Misfire Detected',
            P0420: 'Catalyst System Efficiency Below Threshold (Bank 1)',
            P0171: 'System Too Lean (Bank 1)',
            P0500: 'Vehicle Speed Sensor Malfunction',
          };
          setDtcCodes([{ code: codeHex, desc: descMap[codeHex] || 'Powertrain Diagnostic Trouble Code' }]);
        } else {
          setDtcCodes([]);
        }
        setDtcReading(false);
        setTxLog((prev) => [
          {
            time: new Date().toLocaleTimeString(),
            type: 'RX',
            id: lastFrame.idHex,
            hex: rawHex,
            note: count === 0 ? 'No Stored DTCs' : `${count} DTC(s) Returned`,
          },
          ...prev.slice(0, 24),
        ]);
      } else if (mode === 0x44) {
        // Mode 04 response (Clear DTCs acknowledge)
        setDtcCodes([]);
        setDtcCleared(true);
        setTimeout(() => setDtcCleared(false), 4000);
      }
    }
  }, [frames, responseIdHex]);

  // Handle single PID query
  const handleQueryPid = async (pidDef: PidDefinition) => {
    if (!isConnected) {
      addToast('Cannot Query', 'CAN bus is disconnected.', 'error');
      return;
    }
    if (isListenOnly) {
      addToast('Prohibited', 'Bus is in LISTEN-ONLY mode.', 'warning');
      return;
    }

    const cleanId = parseInt(targetIdHex, 16) || 0x7df;
    // Standard ISO-TP single frame for OBD-II Mode 01: [0x02, 0x01, PID, 0x00, 0x00, 0x00, 0x00, 0x00]
    const data = [0x02, 0x01, pidDef.pid, 0x00, 0x00, 0x00, 0x00, 0x00];

    try {
      await transmitCanFrame({
        id: cleanId,
        extended: false,
        fd: false,
        dlc: 8,
        data,
      });
      setTxLog((prev) => [
        {
          time: new Date().toLocaleTimeString(),
          type: 'TX',
          id: targetIdHex,
          hex: '02 01 ' + pidDef.pid.toString(16).padStart(2, '0').toUpperCase() + ' 00 00 00 00 00',
          note: `Query: ${pidDef.name}`,
        },
        ...prev.slice(0, 24),
      ]);
    } catch (err: any) {
      addToast('Query Failed', err.message, 'error');
    }
  };

  // Continuous polling loop
  useEffect(() => {
    if (!isPolling || !isConnected || isListenOnly || pollingPids.length === 0) {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
      return;
    }

    pollTimerRef.current = setInterval(async () => {
      if (pollingPids.length === 0) return;
      const pidToQuery = pollingPids[pollIndexRef.current % pollingPids.length];
      pollIndexRef.current += 1;
      const def = STANDARD_PIDS.find((p) => p.pid === pidToQuery);
      if (def) {
        const cleanId = parseInt(targetIdHex, 16) || 0x7df;
        const data = [0x02, 0x01, def.pid, 0x00, 0x00, 0x00, 0x00, 0x00];
        try {
          await transmitCanFrame({
            id: cleanId,
            extended: false,
            fd: false,
            dlc: 8,
            data,
          });
        } catch {
          // Keep loop resilient
        }
      }
    }, 280);

    return () => {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    };
  }, [isPolling, isConnected, isListenOnly, pollingPids, targetIdHex]);

  // Request Mode 03 DTCs
  const handleReadDtcs = async () => {
    if (!isConnected || isListenOnly) return;
    setDtcReading(true);
    const cleanId = parseInt(targetIdHex, 16) || 0x7df;
    try {
      await transmitCanFrame({
        id: cleanId,
        extended: false,
        fd: false,
        dlc: 8,
        data: [0x01, 0x03, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00],
      });
      addToast('DTC Request Sent', 'Waiting for ECU response on Mode 03...', 'info');
    } catch (err: any) {
      setDtcReading(false);
      addToast('DTC Query Error', err.message, 'error');
    }
  };

  // Clear Mode 04 DTCs
  const handleClearDtcs = async () => {
    if (!isConnected || isListenOnly) return;
    const cleanId = parseInt(targetIdHex, 16) || 0x7df;
    try {
      await transmitCanFrame({
        id: cleanId,
        extended: false,
        fd: false,
        dlc: 8,
        data: [0x01, 0x04, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00],
      });
      addToast('Clear DTC Command Sent', 'Mode 04 reset issued to ECU.', 'warning');
    } catch (err: any) {
      addToast('Clear Failed', err.message, 'error');
    }
  };

  const togglePollingPid = (pid: number) => {
    setPollingPids((prev) =>
      prev.includes(pid) ? prev.filter((p) => p !== pid) : [...prev, pid]
    );
  };

  return (
    <div className="space-y-5">
      {/* Header Controls & Addressing */}
      <div className="p-4 bg-zinc-900 border border-zinc-800 rounded-xl flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center space-x-4">
          <div>
            <label className="block text-[11px] font-semibold text-zinc-400 mb-1">
              Functional Request ID
            </label>
            <input
              type="text"
              value={targetIdHex}
              onChange={(e) => setTargetIdHex(e.target.value)}
              className="w-24 bg-zinc-950 border border-zinc-700 rounded px-2 py-1 text-xs font-mono text-cyan-300 focus:outline-none focus:border-cyan-500"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-zinc-400 mb-1">
              ECU Response ID
            </label>
            <input
              type="text"
              value={responseIdHex}
              onChange={(e) => setResponseIdHex(e.target.value)}
              className="w-24 bg-zinc-950 border border-zinc-700 rounded px-2 py-1 text-xs font-mono text-emerald-400 focus:outline-none focus:border-cyan-500"
            />
          </div>

          <div className="border-l border-zinc-800 pl-4">
            <span className="block text-[11px] text-zinc-400 mb-1 font-semibold">
              Live Polling Engine
            </span>
            <button
              onClick={() => setIsPolling(!isPolling)}
              disabled={!isConnected || isListenOnly}
              className={`px-3 py-1 rounded text-xs font-semibold flex items-center space-x-1.5 transition cursor-pointer disabled:opacity-40 ${
                isPolling
                  ? 'bg-rose-600 hover:bg-rose-500 text-white animate-pulse'
                  : 'bg-emerald-600 hover:bg-emerald-500 text-white'
              }`}
            >
              {isPolling ? <Square className="w-3.5 h-3.5 fill-current" /> : <Play className="w-3.5 h-3.5 fill-current" />}
              <span>{isPolling ? 'Stop Polling' : 'Auto-Poll PIDs (250ms)'}</span>
            </button>
          </div>
        </div>

        {/* Section Tabs */}
        <div className="flex items-center space-x-1 bg-zinc-950 p-1 rounded-lg border border-zinc-800 text-xs">
          <button
            onClick={() => setActiveTab('pids')}
            className={`px-3 py-1 rounded transition font-medium cursor-pointer ${
              activeTab === 'pids' ? 'bg-zinc-800 text-white shadow' : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Live Sensor PIDs
          </button>
          <button
            onClick={() => setActiveTab('dtc')}
            className={`px-3 py-1 rounded transition font-medium cursor-pointer flex items-center space-x-1 ${
              activeTab === 'dtc' ? 'bg-zinc-800 text-white shadow' : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <AlertCircle className="w-3 h-3 text-amber-400" />
            <span>DTC Diagnostics</span>
          </button>
          <button
            onClick={() => setActiveTab('raw')}
            className={`px-3 py-1 rounded transition font-medium cursor-pointer ${
              activeTab === 'raw' ? 'bg-zinc-800 text-white shadow' : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Diagnostics Log ({txLog.length})
          </button>
        </div>
      </div>

      {/* Tab 1: Live Sensor PIDs */}
      {activeTab === 'pids' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {STANDARD_PIDS.map((pidDef) => {
            const Icon = pidDef.icon;
            const state = pidStates[pidDef.pid];
            const isSelectedForPoll = pollingPids.includes(pidDef.pid);
            const val = state ? state.value : pidDef.min;
            const pct = Math.min(100, Math.max(0, ((val - pidDef.min) / (pidDef.max - pidDef.min)) * 100));

            return (
              <div
                key={pidDef.pid}
                className="p-4 bg-zinc-900 border border-zinc-800 rounded-xl flex flex-col justify-between hover:border-zinc-700 transition"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div className={`p-1.5 rounded-lg bg-zinc-800 ${pidDef.color}`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div>
                        <h3 className="text-xs font-bold text-zinc-100">{pidDef.name}</h3>
                        <span className="text-[10px] font-mono text-zinc-500">
                          PID 0x{pidDef.pid.toString(16).padStart(2, '0').toUpperCase()}
                        </span>
                      </div>
                    </div>

                    <label className="flex items-center space-x-1 cursor-pointer" title="Include in continuous polling">
                      <input
                        type="checkbox"
                        checked={isSelectedForPoll}
                        onChange={() => togglePollingPid(pidDef.pid)}
                        className="rounded bg-zinc-800 border-zinc-700 text-cyan-500 focus:ring-0 w-3.5 h-3.5"
                      />
                      <span className="text-[10px] text-zinc-500">Poll</span>
                    </label>
                  </div>

                  {/* Value Display */}
                  <div className="mt-3">
                    <div className="flex items-baseline justify-between">
                      <span className="text-xl font-bold font-mono text-zinc-100">
                        {state ? state.display : '--'}
                      </span>
                      {state && (
                        <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/60 px-1.5 py-0.5 rounded border border-emerald-800/40">
                          {state.rawHex}
                        </span>
                      )}
                    </div>

                    {/* Progress Gauge */}
                    <div className="w-full bg-zinc-800 h-1.5 rounded-full overflow-hidden mt-2">
                      <div
                        className="h-full bg-gradient-to-r from-cyan-500 to-emerald-400 transition-all duration-300"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-zinc-800/60 flex items-center justify-between">
                  <span className="text-[10px] text-zinc-500 truncate max-w-[140px]" title={pidDef.description}>
                    {pidDef.description}
                  </span>

                  <button
                    onClick={() => handleQueryPid(pidDef)}
                    disabled={!isConnected || isListenOnly}
                    className="px-2.5 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded text-[11px] font-semibold flex items-center space-x-1 transition cursor-pointer disabled:opacity-40"
                  >
                    <Send className="w-3 h-3" />
                    <span>Query</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Tab 2: DTC Diagnostics */}
      {activeTab === 'dtc' && (
        <div className="p-6 bg-zinc-900 border border-zinc-800 rounded-xl space-y-6">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h3 className="text-sm font-bold text-zinc-100 flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 text-amber-400" />
                <span>Diagnostic Trouble Code (DTC) Engine (ISO 15031-5 / SAE J1979)</span>
              </h3>
              <p className="text-xs text-zinc-400 mt-0.5">
                Query active emissions-related diagnostic trouble codes stored in vehicle powertrain control module
              </p>
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={handleReadDtcs}
                disabled={!isConnected || isListenOnly || dtcReading}
                className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition cursor-pointer disabled:opacity-40"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${dtcReading ? 'animate-spin' : ''}`} />
                <span>Read Fault Codes (Mode 03)</span>
              </button>

              <button
                onClick={handleClearDtcs}
                disabled={!isConnected || isListenOnly}
                className="px-3 py-1.5 bg-rose-600/20 hover:bg-rose-600 text-rose-300 hover:text-white border border-rose-500/40 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition cursor-pointer disabled:opacity-40"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Clear DTCs & Reset MIL (Mode 04)</span>
              </button>
            </div>
          </div>

          {dtcCleared && (
            <div className="p-3 bg-emerald-950/40 border border-emerald-500/40 rounded-lg flex items-center space-x-2 text-emerald-300 text-xs">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Fault codes successfully cleared. Check Engine Light (MIL) reset command accepted.</span>
            </div>
          )}

          <div className="space-y-2">
            {dtcCodes.length === 0 ? (
              <div className="p-8 text-center bg-zinc-950 border border-zinc-800 rounded-lg">
                <Check className="w-8 h-8 text-emerald-400 mx-auto mb-2 opacity-80" />
                <h4 className="text-sm font-bold text-zinc-200">No Stored DTC Codes Detected</h4>
                <p className="text-xs text-zinc-500 mt-1 max-w-sm mx-auto">
                  Powertrain ECU reports zero active emissions diagnostic trouble codes. Click "Read Fault Codes" to refresh.
                </p>
              </div>
            ) : (
              dtcCodes.map((dtc) => (
                <div
                  key={dtc.code}
                  className="p-4 bg-zinc-950 border border-amber-500/40 rounded-lg flex items-center justify-between"
                >
                  <div className="flex items-center space-x-3">
                    <span className="font-mono text-sm font-bold text-amber-400 bg-amber-950/60 px-2.5 py-1 rounded border border-amber-800/40">
                      {dtc.code}
                    </span>
                    <div>
                      <h4 className="text-xs font-bold text-zinc-100">{dtc.desc}</h4>
                      <span className="text-[10px] text-zinc-500">Confirmed Stored DTC - Severity: Medium</span>
                    </div>
                  </div>
                  <span className="text-[11px] font-mono text-zinc-400">ECU Address 0x7E8</span>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Tab 3: Diagnostics Log */}
      {activeTab === 'raw' && (
        <div className="p-5 bg-zinc-900 border border-zinc-800 rounded-xl space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-zinc-200">Recent Diagnostic Requests & Responses</h3>
            <button
              onClick={() => setTxLog([])}
              className="text-[11px] text-zinc-500 hover:text-zinc-300 transition"
            >
              Clear Log
            </button>
          </div>

          <div className="space-y-1.5 max-h-72 overflow-y-auto font-mono text-xs">
            {txLog.length === 0 ? (
              <div className="p-4 text-center text-zinc-500 text-xs">No diagnostic traffic yet.</div>
            ) : (
              txLog.map((log, i) => (
                <div
                  key={i}
                  className="p-2 bg-zinc-950 border border-zinc-800 rounded flex items-center justify-between text-xs"
                >
                  <div className="flex items-center space-x-2">
                    <span className="text-[10px] text-zinc-500">{log.time}</span>
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${
                        log.type === 'TX'
                          ? 'bg-amber-950/80 text-amber-300 border border-amber-800/50'
                          : 'bg-emerald-950/80 text-emerald-300 border border-emerald-800/50'
                      }`}
                    >
                      {log.type}
                    </span>
                    <span className="font-bold text-zinc-200">{log.id}</span>
                    <span className="text-zinc-400 text-[11px]">{log.hex}</span>
                  </div>
                  {log.note && <span className="text-[11px] text-zinc-400 italic">{log.note}</span>}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
