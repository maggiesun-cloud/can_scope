import React, { useState } from 'react';
import {
  Crosshair,
  Zap,
  CheckCircle2,
  AlertTriangle,
  Sliders,
  Play,
  Pause,
  Save,
  RotateCcw,
  X,
  Radio,
  FileCheck,
  ShieldAlert,
} from 'lucide-react';

export type TriggerConditionType = 'id_match' | 'byte_match' | 'dlc_condition' | 'fd_brs' | 'id_range';
export type TriggerActionType = 'freeze_buffer' | 'snapshot_indexeddb' | 'highlight_only';

export interface TriggerConfig {
  enabled: boolean;
  conditionType: TriggerConditionType;
  targetIdHex: string; // e.g. "0x7E8"
  byteIndex: number; // 0 to 63
  byteValueHex: string; // e.g. "0x7F"
  byteOperator: '==' | '!=' | '>' | '<';
  dlcOperator: '>' | '==' | '<';
  dlcValue: number;
  idRangeMinHex: string;
  idRangeMaxHex: string;
  action: TriggerActionType;
  postTriggerFrames: number; // e.g. 50 frames
}

export const DEFAULT_TRIGGER_CONFIG: TriggerConfig = {
  enabled: false,
  conditionType: 'id_match',
  targetIdHex: '0x7E8',
  byteIndex: 1,
  byteValueHex: '0x7F',
  byteOperator: '==',
  dlcOperator: '>',
  dlcValue: 8,
  idRangeMinHex: '0x700',
  idRangeMaxHex: '0x7FF',
  action: 'freeze_buffer',
  postTriggerFrames: 50,
};

interface CaptureTriggerModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: TriggerConfig;
  onSaveConfig: (config: TriggerConfig) => void;
  triggerStatus: 'disarmed' | 'armed' | 'firing' | 'fired';
  onArmTrigger: () => void;
  onDisarmTrigger: () => void;
  onReArmTrigger: () => void;
  firedDetails?: {
    idHex: string;
    timestamp: number;
    description: string;
  } | null;
}

export const CaptureTriggerModal: React.FC<CaptureTriggerModalProps> = ({
  isOpen,
  onClose,
  config,
  onSaveConfig,
  triggerStatus,
  onArmTrigger,
  onDisarmTrigger,
  onReArmTrigger,
  firedDetails,
}) => {
  const [localConfig, setLocalConfig] = useState<TriggerConfig>(config);

  if (!isOpen) return null;

  // Preset quick configurations
  const applyPreset = (preset: Partial<TriggerConfig>) => {
    setLocalConfig((prev) => ({
      ...prev,
      ...preset,
    }));
  };

  const handleArmAndClose = () => {
    onSaveConfig({ ...localConfig, enabled: true });
    onArmTrigger();
    onClose();
  };

  const handleSaveOnly = () => {
    onSaveConfig(localConfig);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in duration-150">
      <div className="bg-zinc-900 border border-zinc-700/80 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-zinc-800 bg-zinc-950 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Crosshair className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-sm font-bold text-zinc-100">Conditional Capture Trigger Station</h3>
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase tracking-wider ${
                    triggerStatus === 'armed'
                      ? 'bg-red-950 text-red-400 border border-red-800 animate-pulse'
                      : triggerStatus === 'fired'
                      ? 'bg-amber-950 text-amber-300 border border-amber-800'
                      : 'bg-zinc-800 text-zinc-400'
                  }`}
                >
                  {triggerStatus}
                </span>
              </div>
              <p className="text-xs text-zinc-400 mt-0.5">
                Hardware logic analyzer trigger: freeze bus or snapshot upon detecting specific CAN ID or payload pattern
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-zinc-500 hover:text-zinc-300 transition cursor-pointer p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-xs">
          {/* Fired Banner if currently triggered */}
          {triggerStatus === 'fired' && firedDetails && (
            <div className="p-3.5 bg-amber-950/40 border border-amber-800/60 rounded-xl flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <Zap className="w-5 h-5 text-amber-400 shrink-0" />
                <div>
                  <div className="text-xs font-bold text-amber-200">
                    Trigger Fired at CAN ID {firedDetails.idHex}
                  </div>
                  <div className="text-[11px] text-amber-400/80 font-mono">
                    {firedDetails.description} • Bus capture buffer frozen
                  </div>
                </div>
              </div>
              <button
                onClick={() => {
                  onReArmTrigger();
                }}
                className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold rounded text-xs transition cursor-pointer flex items-center space-x-1"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Re-Arm Trigger</span>
              </button>
            </div>
          )}

          {/* Quick Automotive Presets */}
          <div>
            <label className="block text-zinc-400 font-semibold mb-2">Automotive Engineering Quick Presets</label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <button
                type="button"
                onClick={() =>
                  applyPreset({
                    conditionType: 'byte_match',
                    targetIdHex: '0x7E8',
                    byteIndex: 1,
                    byteValueHex: '0x7F',
                    byteOperator: '==',
                    action: 'freeze_buffer',
                    postTriggerFrames: 40,
                  })
                }
                className="p-2.5 bg-zinc-950/80 hover:bg-zinc-800 border border-zinc-800 rounded-lg text-left transition cursor-pointer"
              >
                <div className="font-semibold text-zinc-200">UDS NRC (0x7F)</div>
                <div className="text-[10px] text-zinc-400 mt-0.5">Negative response from ECU</div>
              </button>

              <button
                type="button"
                onClick={() =>
                  applyPreset({
                    conditionType: 'id_match',
                    targetIdHex: '0x7E8',
                    action: 'freeze_buffer',
                    postTriggerFrames: 50,
                  })
                }
                className="p-2.5 bg-zinc-950/80 hover:bg-zinc-800 border border-zinc-800 rounded-lg text-left transition cursor-pointer"
              >
                <div className="font-semibold text-zinc-200">OBD-II Reply (0x7E8)</div>
                <div className="text-[10px] text-zinc-400 mt-0.5">Capture diagnostic response</div>
              </button>

              <button
                type="button"
                onClick={() =>
                  applyPreset({
                    conditionType: 'dlc_condition',
                    dlcOperator: '>',
                    dlcValue: 8,
                    action: 'freeze_buffer',
                    postTriggerFrames: 60,
                  })
                }
                className="p-2.5 bg-zinc-950/80 hover:bg-zinc-800 border border-zinc-800 rounded-lg text-left transition cursor-pointer"
              >
                <div className="font-semibold text-zinc-200">CAN-FD Burst (DLC &gt; 8)</div>
                <div className="text-[10px] text-zinc-400 mt-0.5">Trigger on flexible data</div>
              </button>

              <button
                type="button"
                onClick={() =>
                  applyPreset({
                    conditionType: 'fd_brs',
                    action: 'freeze_buffer',
                    postTriggerFrames: 30,
                  })
                }
                className="p-2.5 bg-zinc-950/80 hover:bg-zinc-800 border border-zinc-800 rounded-lg text-left transition cursor-pointer"
              >
                <div className="font-semibold text-zinc-200">Bit Rate Switch (BRS)</div>
                <div className="text-[10px] text-zinc-400 mt-0.5">Baudrate acceleration flag</div>
              </button>
            </div>
          </div>

          {/* Condition Type Selector */}
          <div className="space-y-3">
            <label className="block text-zinc-300 font-semibold">1. Trigger Condition</label>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {[
                { type: 'id_match', label: 'CAN ID Match' },
                { type: 'byte_match', label: 'Payload Byte' },
                { type: 'dlc_condition', label: 'DLC Threshold' },
                { type: 'fd_brs', label: 'CAN-FD BRS' },
                { type: 'id_range', label: 'ID Range' },
              ].map((item) => (
                <button
                  key={item.type}
                  type="button"
                  onClick={() =>
                    setLocalConfig((prev) => ({
                      ...prev,
                      conditionType: item.type as TriggerConditionType,
                    }))
                  }
                  className={`py-2 px-3 rounded-lg border text-center font-medium transition cursor-pointer ${
                    localConfig.conditionType === item.type
                      ? 'bg-amber-500/20 border-amber-500/60 text-amber-300 font-semibold'
                      : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>

            {/* Condition Specific Parameters */}
            <div className="p-4 bg-zinc-950/80 border border-zinc-800 rounded-xl space-y-3">
              {localConfig.conditionType === 'id_match' && (
                <div>
                  <label className="block text-zinc-400 mb-1">Target CAN Identifier (Hex)</label>
                  <input
                    type="text"
                    value={localConfig.targetIdHex}
                    onChange={(e) =>
                      setLocalConfig((p) => ({ ...p, targetIdHex: e.target.value }))
                    }
                    placeholder="e.g. 0x7E8 or 120"
                    className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded text-zinc-100 font-mono text-xs focus:outline-none focus:border-amber-500"
                  />
                  <span className="text-[11px] text-zinc-500 mt-1 block">
                    Trigger will trip whenever a frame with this ID is detected on the bus.
                  </span>
                </div>
              )}

              {localConfig.conditionType === 'byte_match' && (
                <div className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-zinc-400 mb-1">Target CAN ID (Optional or * for Any)</label>
                      <input
                        type="text"
                        value={localConfig.targetIdHex}
                        onChange={(e) =>
                          setLocalConfig((p) => ({ ...p, targetIdHex: e.target.value }))
                        }
                        placeholder="e.g. 0x7E8 or leave blank for any ID"
                        className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded text-zinc-100 font-mono text-xs focus:outline-none focus:border-amber-500"
                      />
                    </div>
                    <div>
                      <label className="block text-zinc-400 mb-1">Byte Offset (0 - 63)</label>
                      <input
                        type="number"
                        min={0}
                        max={63}
                        value={localConfig.byteIndex}
                        onChange={(e) =>
                          setLocalConfig((p) => ({
                            ...p,
                            byteIndex: Math.max(0, parseInt(e.target.value, 10) || 0),
                          }))
                        }
                        className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded text-zinc-100 font-mono text-xs focus:outline-none focus:border-amber-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-zinc-400 mb-1">Operator</label>
                      <select
                        value={localConfig.byteOperator}
                        onChange={(e: any) =>
                          setLocalConfig((p) => ({ ...p, byteOperator: e.target.value }))
                        }
                        className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded text-zinc-100 text-xs focus:outline-none focus:border-amber-500 font-mono"
                      >
                        <option value="==">== (Equals)</option>
                        <option value="!=">!= (Not Equal)</option>
                        <option value=">">&gt; (Greater than)</option>
                        <option value="<">&lt; (Less than)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-zinc-400 mb-1">Byte Value (Hex, e.g. 0x7F)</label>
                      <input
                        type="text"
                        value={localConfig.byteValueHex}
                        onChange={(e) =>
                          setLocalConfig((p) => ({ ...p, byteValueHex: e.target.value }))
                        }
                        placeholder="0x7F"
                        className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded text-zinc-100 font-mono text-xs focus:outline-none focus:border-amber-500"
                      />
                    </div>
                  </div>
                  <span className="text-[11px] text-zinc-500 block">
                    Example: Byte[1] == 0x7F catches ISO 14229 UDS Negative Response Code (NRC).
                  </span>
                </div>
              )}

              {localConfig.conditionType === 'dlc_condition' && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-zinc-400 mb-1">DLC Operator</label>
                    <select
                      value={localConfig.dlcOperator}
                      onChange={(e: any) =>
                        setLocalConfig((p) => ({ ...p, dlcOperator: e.target.value }))
                      }
                      className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded text-zinc-100 text-xs focus:outline-none focus:border-amber-500 font-mono"
                    >
                      <option value=">">&gt; (Greater than)</option>
                      <option value="==">== (Equal to)</option>
                      <option value="<">&lt; (Less than)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-zinc-400 mb-1">Data Length Code (Bytes)</label>
                    <input
                      type="number"
                      min={0}
                      max={64}
                      value={localConfig.dlcValue}
                      onChange={(e) =>
                        setLocalConfig((p) => ({
                          ...p,
                          dlcValue: parseInt(e.target.value, 10) || 8,
                        }))
                      }
                      className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded text-zinc-100 font-mono text-xs focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </div>
              )}

              {localConfig.conditionType === 'fd_brs' && (
                <div className="text-zinc-300">
                  <p>Trips on any CAN-FD frame where the <strong>Bit Rate Switch (BRS)</strong> bit is active.</p>
                  <span className="text-[11px] text-zinc-500 mt-1 block">
                    Useful for validating dual-bitrate transceiver speed transitions up to 8 Mbps.
                  </span>
                </div>
              )}

              {localConfig.conditionType === 'id_range' && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-zinc-400 mb-1">Min CAN ID (Hex)</label>
                    <input
                      type="text"
                      value={localConfig.idRangeMinHex}
                      onChange={(e) =>
                        setLocalConfig((p) => ({ ...p, idRangeMinHex: e.target.value }))
                      }
                      placeholder="0x700"
                      className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded text-zinc-100 font-mono text-xs focus:outline-none focus:border-amber-500"
                    />
                  </div>
                  <div>
                    <label className="block text-zinc-400 mb-1">Max CAN ID (Hex)</label>
                    <input
                      type="text"
                      value={localConfig.idRangeMaxHex}
                      onChange={(e) =>
                        setLocalConfig((p) => ({ ...p, idRangeMaxHex: e.target.value }))
                      }
                      placeholder="0x7FF"
                      className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded text-zinc-100 font-mono text-xs focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Action on Trigger */}
          <div className="space-y-3">
            <label className="block text-zinc-300 font-semibold">2. Trigger Action &amp; Post-Trigger Window</label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                {
                  type: 'freeze_buffer',
                  title: 'Auto-Freeze Buffer',
                  desc: 'Stops live stream after post-trigger frames arrive (oscilloscope style)',
                },
                {
                  type: 'snapshot_indexeddb',
                  title: 'IndexedDB Snapshot',
                  desc: 'Automatically commits buffer window to persistent storage',
                },
                {
                  type: 'highlight_only',
                  title: 'Visual Marker Only',
                  desc: 'Badges trigger event in feed without interrupting capture',
                },
              ].map((item) => (
                <div
                  key={item.type}
                  onClick={() =>
                    setLocalConfig((p) => ({ ...p, action: item.type as TriggerActionType }))
                  }
                  className={`p-3 rounded-xl border cursor-pointer transition flex flex-col justify-between ${
                    localConfig.action === item.type
                      ? 'bg-cyan-950/40 border-cyan-500 text-cyan-200'
                      : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  <div className="font-semibold text-xs text-zinc-200 mb-1">{item.title}</div>
                  <div className="text-[11px] text-zinc-400">{item.desc}</div>
                </div>
              ))}
            </div>

            {localConfig.action !== 'highlight_only' && (
              <div className="p-3 bg-zinc-950/80 border border-zinc-800 rounded-xl flex items-center justify-between">
                <div>
                  <div className="font-semibold text-zinc-200">Post-Trigger Record Window</div>
                  <div className="text-[11px] text-zinc-400">
                    Number of frames to record <em>after</em> the trigger event before halting:
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  {[20, 50, 100, 200].map((num) => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => setLocalConfig((p) => ({ ...p, postTriggerFrames: num }))}
                      className={`px-2.5 py-1 rounded text-xs font-mono font-semibold transition cursor-pointer ${
                        localConfig.postTriggerFrames === num
                          ? 'bg-amber-500 text-zinc-950 shadow'
                          : 'bg-zinc-900 border border-zinc-700 text-zinc-300 hover:text-white'
                      }`}
                    >
                      {num}
                    </button>
                  ))}
                  <span className="text-zinc-500 text-xs">frames</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-zinc-800 bg-zinc-950 flex items-center justify-between">
          <div>
            {triggerStatus === 'armed' ? (
              <button
                type="button"
                onClick={onDisarmTrigger}
                className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-red-400 font-semibold rounded-lg text-xs transition cursor-pointer border border-red-900/40 flex items-center space-x-1.5"
              >
                <span>Disarm Trigger</span>
              </button>
            ) : (
              <span className="text-zinc-500 text-xs font-mono">
                Status: {triggerStatus.toUpperCase()}
              </span>
            )}
          </div>

          <div className="flex items-center space-x-2.5">
            <button
              type="button"
              onClick={handleSaveOnly}
              className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-medium rounded-lg text-xs transition cursor-pointer"
            >
              Save Configuration
            </button>
            <button
              type="button"
              onClick={handleArmAndClose}
              className="px-4 py-1.5 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold rounded-lg text-xs transition cursor-pointer flex items-center space-x-1.5 shadow"
            >
              <Zap className="w-3.5 h-3.5" />
              <span>Arm &amp; Run Trigger</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
