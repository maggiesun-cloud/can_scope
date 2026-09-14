import React from 'react';
import { SystemInfo, BusStatus } from '../types/can';
import { Cpu, CheckCircle2, XCircle, AlertTriangle, Terminal, HardDrive, Info } from 'lucide-react';

interface SettingsPageProps {
  systemInfo: SystemInfo | null;
  status: BusStatus;
}

export const SettingsPage: React.FC<SettingsPageProps> = ({ systemInfo, status }) => {
  return (
    <div className="p-6 space-y-6 overflow-y-auto h-full text-zinc-200">
      <div>
        <h2 className="text-base font-bold text-zinc-100 flex items-center space-x-2">
          <Cpu className="w-5 h-5 text-cyan-400" />
          <span>System Environment & Hardware Diagnostics</span>
        </h2>
        <p className="text-xs text-zinc-400 mt-0.5">
          Runtime host inspection, dynamic driver discovery, and hardware configuration instructions
        </p>
      </div>

      {/* Host Environment Summary */}
      <div className="p-5 bg-zinc-900 border border-zinc-800 rounded-xl space-y-4">
        <h3 className="font-bold text-zinc-100 text-sm">Host System Architecture</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs font-mono">
          <div className="p-3 bg-zinc-950 border border-zinc-800 rounded-lg">
            <span className="text-[10px] text-zinc-500 uppercase block font-sans">Operating System</span>
            <span className="font-bold text-zinc-200 capitalize mt-0.5 block">
              {systemInfo?.platform || 'Linux'}
            </span>
          </div>

          <div className="p-3 bg-zinc-950 border border-zinc-800 rounded-lg">
            <span className="text-[10px] text-zinc-500 uppercase block font-sans">Architecture</span>
            <span className="font-bold text-zinc-200 mt-0.5 block">
              {systemInfo?.architecture || 'x86_64'}
            </span>
          </div>

          <div className="p-3 bg-zinc-950 border border-zinc-800 rounded-lg">
            <span className="text-[10px] text-zinc-500 uppercase block font-sans">python-can Version</span>
            <span className="font-bold text-cyan-300 mt-0.5 block">
              {systemInfo?.pythonCanVersion || '4.4.0'}
            </span>
          </div>

          <div className="p-3 bg-zinc-950 border border-zinc-800 rounded-lg">
            <span className="text-[10px] text-zinc-500 uppercase block font-sans">API Backend</span>
            <span className="font-bold text-emerald-400 mt-0.5 block">
              FastAPI / Node HAL
            </span>
          </div>
        </div>
      </div>

      {/* Driver Status Checklist */}
      <div className="p-5 bg-zinc-900 border border-zinc-800 rounded-xl space-y-3">
        <h3 className="font-bold text-zinc-100 text-sm">Hardware Driver Discovery Status</h3>
        <div className="space-y-2.5 text-xs">
          {/* Mock Engine */}
          <div className="p-3.5 bg-zinc-950 border border-zinc-800/80 rounded-lg flex items-start justify-between gap-3">
            <div className="flex items-start space-x-3">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-zinc-200">Mock CAN Engine (Simulation)</span>
                <p className="text-zinc-400 text-[11px] mt-0.5">
                  Virtual bus simulator producing multi-ECU powertrain, ADAS, and BMS traffic without hardware.
                </p>
              </div>
            </div>
            <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800 font-mono text-[10px] font-bold">
              READY
            </span>
          </div>

          {/* SocketCAN */}
          <div className="p-3.5 bg-zinc-950 border border-zinc-800/80 rounded-lg flex items-start justify-between gap-3">
            <div className="flex items-start space-x-3">
              {systemInfo?.driverStatus.socketcan.available ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              )}
              <div>
                <span className="font-bold text-zinc-200">Linux SocketCAN Subsystem</span>
                <p className="text-zinc-400 text-[11px] mt-0.5">
                  {systemInfo?.driverStatus.socketcan.message ||
                    'Native kernel network CAN stack for Linux (can0, vcan0).'}
                </p>
              </div>
            </div>
            <span
              className={`px-2 py-0.5 rounded font-mono text-[10px] font-bold border ${
                systemInfo?.driverStatus.socketcan.available
                  ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
                  : 'bg-zinc-800 text-zinc-400 border-zinc-700'
              }`}
            >
              {systemInfo?.driverStatus.socketcan.available ? 'AVAILABLE' : 'NOT DETECTED'}
            </span>
          </div>

          {/* PCAN */}
          <div className="p-3.5 bg-zinc-950 border border-zinc-800/80 rounded-lg flex items-start justify-between gap-3">
            <div className="flex items-start space-x-3">
              {systemInfo?.driverStatus.pcan.available ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              )}
              <div>
                <span className="font-bold text-zinc-200">PEAK-System PCAN-USB Adapter</span>
                <p className="text-zinc-400 text-[11px] mt-0.5">
                  {systemInfo?.driverStatus.pcan.message ||
                    'Cross-platform PCANBasic dynamic library driver (Linux & macOS).'}
                </p>
              </div>
            </div>
            <span
              className={`px-2 py-0.5 rounded font-mono text-[10px] font-bold border ${
                systemInfo?.driverStatus.pcan.available
                  ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
                  : 'bg-zinc-800 text-zinc-400 border-zinc-700'
              }`}
            >
              {systemInfo?.driverStatus.pcan.available ? 'AVAILABLE' : 'NOT DETECTED'}
            </span>
          </div>
        </div>
      </div>

      {/* Hardware Setup Guides */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
        <div className="p-5 bg-zinc-900 border border-zinc-800 rounded-xl space-y-2">
          <div className="flex items-center space-x-2 font-bold text-zinc-100">
            <Terminal className="w-4 h-4 text-cyan-400" />
            <span>Linux SocketCAN Configuration</span>
          </div>
          <p className="text-zinc-400 leading-relaxed">
            To initialize a physical CAN interface or create a virtual CAN bus:
          </p>
          <div className="p-2.5 bg-zinc-950 rounded border border-zinc-800 font-mono text-[11px] text-zinc-300 space-y-1">
            <div># 1. Load vcan kernel module (if testing virtually):</div>
            <div className="text-cyan-400">sudo modprobe vcan</div>
            <div className="text-cyan-400">sudo ip link add dev vcan0 type vcan</div>
            <div className="text-cyan-400">sudo ip link set up vcan0</div>
            <div className="mt-2"># 2. Or configure a real hardware adapter:</div>
            <div className="text-cyan-400">sudo ip link set can0 up type can bitrate 500000</div>
          </div>
        </div>

        <div className="p-5 bg-zinc-900 border border-zinc-800 rounded-xl space-y-2">
          <div className="flex items-center space-x-2 font-bold text-zinc-100">
            <Info className="w-4 h-4 text-emerald-400" />
            <span>macOS PCAN-USB Setup</span>
          </div>
          <p className="text-zinc-400 leading-relaxed">
            macOS does not have kernel-native SocketCAN. To use PCAN-USB:
          </p>
          <ul className="list-disc list-inside space-y-1 text-zinc-300 leading-relaxed">
            <li>Install the MacCAN library or official PEAK PCANBasic package.</li>
            <li>Connect your PCAN-USB adapter to a USB 2.0/3.0 port.</li>
            <li>
              CANScope dynamically identifies <code className="text-cyan-400 font-mono">PCAN_USBBUS1</code>{' '}
              without hardcoded path assumptions.
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
};
