import React, { useState } from 'react';
import { BusStatus, CanFrame } from '../types/can';
import { transmitCanFrame } from '../services/api';
import { ObdDiagnosticStation } from '../components/ObdDiagnosticStation';
import {
  Send,
  AlertTriangle,
  Play,
  Square,
  Clock,
  ShieldAlert,
  Check,
  Plus,
  Trash2,
  Activity,
  Layers,
  Sparkles,
} from 'lucide-react';

interface TransmitPageProps {
  status: BusStatus;
  addToast: (title: string, message?: string, type?: any) => void;
  frames?: CanFrame[];
}

interface PeriodicTask {
  id: string;
  name: string;
  canIdHex: string;
  extended: boolean;
  fd: boolean;
  brs: boolean;
  dlc: number;
  dataHex: string;
  periodMs: number;
  running: boolean;
}

export const TransmitPage: React.FC<TransmitPageProps> = ({ status, addToast, frames = [] }) => {
  const isConnected = status.connectionState === 'connected';
  const isListenOnly = status.listenOnly;

  const [activeMode, setActiveMode] = useState<'manual' | 'obd'>('manual');

  // Single Frame Form State
  const [canIdInput, setCanIdInput] = useState('0x7DF'); // Standard OBD-II functional request
  const [isExtended, setIsExtended] = useState(false);
  const [isFd, setIsFd] = useState(false);
  const [brs, setBrs] = useState(false);
  const [dlc, setDlc] = useState(8);
  const [payloadInput, setPayloadInput] = useState('02 01 0C 00 00 00 00 00'); // RPM PID request
  const [isSending, setIsSending] = useState(false);

  const applyPreset = (idHex: string, payload: string, ext = false, fd = false) => {
    setCanIdInput(idHex);
    setPayloadInput(payload);
    setIsExtended(ext);
    setIsFd(fd);
  };

  // Periodic Transmit Task List
  const [periodicTasks, setPeriodicTasks] = useState<PeriodicTask[]>([
    {
      id: 'task-1',
      name: 'Simulated Diagnostic Tester Present',
      canIdHex: '0x7E0',
      extended: false,
      fd: false,
      brs: false,
      dlc: 8,
      dataHex: '02 3E 80 00 00 00 00 00',
      periodMs: 2000,
      running: false,
    },
    {
      id: 'task-2',
      name: 'Heartbeat Broadcast',
      canIdHex: '0x300',
      extended: false,
      fd: false,
      brs: false,
      dlc: 8,
      dataHex: '01 AA 00 00 00 00 00 00',
      periodMs: 100,
      running: false,
    },
  ]);

  const parseBytes = (hexStr: string): number[] => {
    return hexStr
      .trim()
      .split(/[\s,]+/)
      .map((b) => parseInt(b, 16))
      .filter((n) => !isNaN(n));
  };

  const handleSendSingle = async () => {
    if (!isConnected) {
      addToast('Cannot Transmit', 'CAN bus interface is not connected.', 'error');
      return;
    }
    if (isListenOnly) {
      addToast('Transmission Blocked', 'Bus is in LISTEN-ONLY mode.', 'warning');
      return;
    }

    const cleanId = canIdInput.startsWith('0x') ? parseInt(canIdInput, 16) : parseInt(canIdInput, 10);
    if (isNaN(cleanId)) {
      addToast('Invalid CAN ID', 'Please enter a valid hexadecimal (e.g. 0x123) or integer ID.', 'error');
      return;
    }
    if (!isExtended && cleanId > 0x7FF) {
      addToast('ID Range Error', 'Standard 11-bit CAN ID cannot exceed 0x7FF.', 'error');
      return;
    }
    if (isExtended && cleanId > 0x1FFFFFFF) {
      addToast('ID Range Error', 'Extended 29-bit CAN ID cannot exceed 0x1FFFFFFF.', 'error');
      return;
    }

    const dataBytes = parseBytes(payloadInput);

    setIsSending(true);
    try {
      await transmitCanFrame({
        id: cleanId,
        extended: isExtended,
        fd: isFd,
        brs: isFd && brs,
        dlc,
        data: dataBytes,
      });
      addToast('Frame Transmitted', `Sent ${canIdInput} (${dataBytes.length} bytes)`, 'success');
    } catch (err: any) {
      addToast('Transmission Failed', err.message, 'error');
    } finally {
      setIsSending(false);
    }
  };

  const handleToggleTask = async (task: PeriodicTask) => {
    if (!isConnected) {
      addToast('Cannot Transmit', 'Interface disconnected.', 'error');
      return;
    }
    if (isListenOnly) {
      addToast('Transmission Prohibited', 'Bus is in Listen-Only mode.', 'warning');
      return;
    }

    const cleanId = task.canIdHex.startsWith('0x')
      ? parseInt(task.canIdHex, 16)
      : parseInt(task.canIdHex, 10);
    const dataBytes = parseBytes(task.dataHex);

    if (!task.running) {
      // Start periodic transmit
      try {
        await transmitCanFrame({
          id: cleanId,
          extended: task.extended,
          fd: task.fd,
          brs: task.brs,
          dlc: task.dlc,
          data: dataBytes,
          periodMs: task.periodMs,
          taskId: task.id,
        });
        setPeriodicTasks((prev) =>
          prev.map((t) => (t.id === task.id ? { ...t, running: true } : t))
        );
        addToast('Periodic TX Started', `${task.name} @ ${task.periodMs}ms`, 'success');
      } catch (err: any) {
        addToast('Periodic TX Error', err.message, 'error');
      }
    } else {
      // Stop periodic transmit
      try {
        await transmitCanFrame({
          id: cleanId,
          extended: task.extended,
          fd: task.fd,
          dlc: task.dlc,
          data: dataBytes,
          taskId: task.id,
          stopPeriodic: true,
        });
        setPeriodicTasks((prev) =>
          prev.map((t) => (t.id === task.id ? { ...t, running: false } : t))
        );
        addToast('Periodic TX Halted', task.name, 'info');
      } catch (err: any) {
        addToast('Stop Error', err.message, 'error');
      }
    }
  };

  return (
    <div className="p-6 space-y-6 overflow-y-auto h-full text-zinc-200">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-base font-bold text-zinc-100 flex items-center space-x-2">
            <Send className="w-5 h-5 text-amber-400" />
            <span>CAN / CAN-FD Transmission & Diagnostics</span>
          </h2>
          <p className="text-xs text-zinc-400 mt-0.5">
            Explicit frame injection, periodic simulators, and pre-configured OBD-II / UDS diagnostic engines
          </p>
        </div>

        {/* Primary View Switcher */}
        <div className="flex items-center space-x-1 bg-zinc-900 p-1 rounded-lg border border-zinc-800 text-xs">
          <button
            onClick={() => setActiveMode('manual')}
            className={`px-3 py-1.5 rounded transition font-semibold cursor-pointer flex items-center space-x-1.5 ${
              activeMode === 'manual'
                ? 'bg-zinc-800 text-white shadow'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Layers className="w-3.5 h-3.5 text-amber-400" />
            <span>Frame Injector & Periodic Tasks</span>
          </button>
          <button
            onClick={() => setActiveMode('obd')}
            className={`px-3 py-1.5 rounded transition font-semibold cursor-pointer flex items-center space-x-1.5 ${
              activeMode === 'obd'
                ? 'bg-zinc-800 text-white shadow'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Activity className="w-3.5 h-3.5 text-cyan-400" />
            <span>OBD-II Diagnostic Station (Live PIDs)</span>
          </button>
        </div>
      </div>

      {/* Safety Alert Banner */}
      <div className="p-4 bg-amber-950/30 border border-amber-500/40 rounded-xl flex items-start space-x-3 text-xs">
        <ShieldAlert className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
        <div>
          <span className="font-bold text-amber-200 block">SAFETY WARNING: ACTIVE BUS INJECTION</span>
          <span className="text-amber-200/80 leading-relaxed mt-0.5 block">
            Injecting arbitrary arbitration IDs or corrupted frames onto a physical vehicle bus can cause
            unexpected ECU resets, limp-home modes, or unintended actuator behaviors.
          </span>
          {isListenOnly && (
            <div className="mt-2 font-bold text-purple-400">
              * Transmission is currently disabled because the bus was opened in LISTEN-ONLY mode.
            </div>
          )}
        </div>
      </div>

      {activeMode === 'obd' ? (
        <ObdDiagnosticStation
          isConnected={isConnected}
          isListenOnly={isListenOnly}
          frames={frames}
          addToast={addToast}
        />
      ) : (
        <div className="space-y-6">
          {/* Quick Presets Bar */}
          <div className="flex items-center space-x-2 text-xs overflow-x-auto pb-1">
            <span className="text-zinc-500 shrink-0 font-semibold flex items-center space-x-1">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Quick Presets:</span>
            </span>
            <button
              onClick={() => applyPreset('0x7DF', '02 01 0C 00 00 00 00 00')}
              className="px-2.5 py-1 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 rounded font-mono text-[11px] transition cursor-pointer"
            >
              OBD-II RPM (0x7DF)
            </button>
            <button
              onClick={() => applyPreset('0x7DF', '02 01 0D 00 00 00 00 00')}
              className="px-2.5 py-1 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 rounded font-mono text-[11px] transition cursor-pointer"
            >
              OBD-II Speed (0x7DF)
            </button>
            <button
              onClick={() => applyPreset('0x7DF', '02 01 05 00 00 00 00 00')}
              className="px-2.5 py-1 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 rounded font-mono text-[11px] transition cursor-pointer"
            >
              OBD-II Temp (0x7DF)
            </button>
            <button
              onClick={() => applyPreset('0x7E0', '02 10 03 00 00 00 00 00')}
              className="px-2.5 py-1 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 rounded font-mono text-[11px] transition cursor-pointer"
            >
              UDS DiagSession (0x7E0)
            </button>
            <button
              onClick={() => applyPreset('0x7E0', '02 3E 80 00 00 00 00 00')}
              className="px-2.5 py-1 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 rounded font-mono text-[11px] transition cursor-pointer"
            >
              UDS Tester Present (0x7E0)
            </button>
            <button
              onClick={() =>
                applyPreset(
                  '0x320',
                  '00 11 22 33 44 55 66 77 88 99 AA BB CC DD EE FF 01 02 03 04 05 06 07 08 09 0A 0B 0C 0D 0E 0F 10 20 21 22 23 24 25 26 27 28 29 2A 2B 2C 2D 2E 2F 30 31 32 33 34 35 36 37 38 39 3A 3B 3C 3D 3E 3F',
                  false,
                  true
                )
              }
              className="px-2.5 py-1 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-cyan-300 rounded font-mono text-[11px] transition cursor-pointer"
            >
              CAN-FD 64B Demo (0x320)
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Single-Shot Transmit Builder */}
            <div className="p-5 bg-zinc-900 border border-zinc-800 rounded-xl space-y-4">
          <div className="flex items-center space-x-2 text-zinc-100 font-bold text-sm">
            <Send className="w-4 h-4 text-cyan-400" />
            <span>Single-Shot Transmission Builder</span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1">CAN ID</label>
              <input
                type="text"
                value={canIdInput}
                onChange={(e) => setCanIdInput(e.target.value)}
                placeholder="e.g. 0x123 or 0x7DF"
                className="w-full bg-zinc-950 border border-zinc-700 rounded px-2.5 py-1.5 text-xs font-mono text-cyan-300 focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1">Data Length (DLC)</label>
              <input
                type="number"
                min={0}
                max={isFd ? 64 : 8}
                value={dlc}
                onChange={(e) => setDlc(Number(e.target.value))}
                className="w-full bg-zinc-950 border border-zinc-700 rounded px-2.5 py-1.5 text-xs font-mono text-zinc-200 focus:outline-none"
              />
            </div>
          </div>

          {/* Protocols & Flags */}
          <div className="flex flex-wrap gap-4 pt-1 text-xs">
            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={isExtended}
                onChange={(e) => setIsExtended(e.target.checked)}
                className="rounded bg-zinc-800 border-zinc-700 text-cyan-500"
              />
              <span className="text-zinc-300">Extended 29-bit ID</span>
            </label>

            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={isFd}
                onChange={(e) => setIsFd(e.target.checked)}
                className="rounded bg-zinc-800 border-zinc-700 text-indigo-500"
              />
              <span className="text-zinc-300">CAN-FD Frame</span>
            </label>

            {isFd && (
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={brs}
                  onChange={(e) => setBrs(e.target.checked)}
                  className="rounded bg-zinc-800 border-zinc-700 text-indigo-500"
                />
                <span className="text-indigo-300">Bit Rate Switch (BRS)</span>
              </label>
            )}
          </div>

          {/* Payload Data Bytes */}
          <div>
            <label className="block text-xs font-semibold text-zinc-300 mb-1">
              Data Bytes (Hex space-separated)
            </label>
            <input
              type="text"
              value={payloadInput}
              onChange={(e) => setPayloadInput(e.target.value)}
              placeholder="e.g. 01 02 03 04 05 06 07 08"
              className="w-full bg-zinc-950 border border-zinc-700 rounded px-2.5 py-2 text-xs font-mono text-zinc-100 focus:outline-none focus:border-cyan-500"
            />
            <span className="text-[10px] text-zinc-500 mt-1 block">
              Parsed length: {parseBytes(payloadInput).length} bytes
            </span>
          </div>

          <button
            onClick={handleSendSingle}
            disabled={isSending || isListenOnly || !isConnected}
            className="w-full py-2.5 bg-amber-600 hover:bg-amber-500 disabled:opacity-40 text-white rounded-lg font-bold text-xs flex items-center justify-center space-x-2 transition shadow-md active:scale-95 cursor-pointer"
          >
            <Send className="w-4 h-4" />
            <span>Transmit Single CAN Frame</span>
          </button>
        </div>

        {/* Periodic Transmit Queue */}
        <div className="p-5 bg-zinc-900 border border-zinc-800 rounded-xl space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 text-zinc-100 font-bold text-sm">
              <Clock className="w-4 h-4 text-emerald-400" />
              <span>Periodic Message Transmitters</span>
            </div>
          </div>

          <div className="space-y-2.5">
            {periodicTasks.map((task) => (
              <div
                key={task.id}
                className="p-3.5 bg-zinc-950 border border-zinc-800 rounded-lg flex items-center justify-between gap-3 text-xs"
              >
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="font-bold text-zinc-100">{task.name}</span>
                    <span className="font-mono text-cyan-400 font-semibold">{task.canIdHex}</span>
                    <span className="text-[10px] text-zinc-500 font-mono">@{task.periodMs}ms</span>
                  </div>
                  <div className="text-[11px] font-mono text-zinc-400 mt-1 truncate max-w-xs">
                    {task.dataHex}
                  </div>
                </div>

                <button
                  onClick={() => handleToggleTask(task)}
                  disabled={isListenOnly || !isConnected}
                  className={`px-3 py-1.5 rounded text-xs font-semibold flex items-center space-x-1.5 transition cursor-pointer disabled:opacity-40 ${
                    task.running
                      ? 'bg-rose-600 hover:bg-rose-500 text-white animate-pulse'
                      : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                  }`}
                >
                  {task.running ? <Square className="w-3.5 h-3.5 fill-current" /> : <Play className="w-3.5 h-3.5 fill-current" />}
                  <span>{task.running ? 'Stop' : 'Start'}</span>
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
      </div>
      )}
    </div>
  );
};
