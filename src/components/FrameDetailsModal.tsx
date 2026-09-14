import React, { useState } from 'react';
import { CanFrame } from '../types/can';
import { formatTimestamp, formatBytesHex, formatAscii } from '../utils/formatters';
import { X, Copy, Check, Database, Binary, Info } from 'lucide-react';

interface FrameDetailsModalProps {
  frame: CanFrame | null;
  onClose: () => void;
}

export const FrameDetailsModal: React.FC<FrameDetailsModalProps> = ({ frame, onClose }) => {
  const [copiedFormat, setCopiedFormat] = useState<string | null>(null);

  if (!frame) return null;

  const handleCopy = (text: string, formatName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedFormat(formatName);
    setTimeout(() => setCopiedFormat(null), 1500);
  };

  const hexPayload = formatBytesHex(frame.data);
  const asciiPayload = formatAscii(frame.data);

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-zinc-800 flex items-center justify-between bg-zinc-950">
          <div className="flex items-center space-x-3">
            <span className="font-mono text-cyan-400 font-bold text-lg">{frame.idHex}</span>
            <span className="text-zinc-400 font-mono text-xs">({frame.id} decimal)</span>
            <span
              className={`px-2 py-0.5 rounded text-[10px] font-bold tracking-wide ${
                frame.direction === 'RX'
                  ? 'bg-cyan-950 text-cyan-300 border border-cyan-800'
                  : 'bg-amber-950 text-amber-300 border border-amber-800'
              }`}
            >
              {frame.direction}
            </span>
            <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-zinc-800 text-zinc-300">
              {frame.extended ? 'EXTENDED (29-bit)' : 'STANDARD (11-bit)'}
            </span>
            {frame.fd && (
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-950 text-indigo-300 border border-indigo-700">
                CAN-FD
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-5 space-y-5 overflow-y-auto font-mono text-xs">
          {/* Metadata Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-zinc-950/60 p-3.5 rounded-lg border border-zinc-800/80">
            <div>
              <span className="text-[10px] text-zinc-500 uppercase block font-sans">Timestamp</span>
              <span className="text-zinc-200 font-semibold">{formatTimestamp(frame.timestamp)}</span>
            </div>
            <div>
              <span className="text-[10px] text-zinc-500 uppercase block font-sans">DLC</span>
              <span className="text-zinc-200 font-semibold">
                {frame.dlc} bytes ({frame.data.length} len)
              </span>
            </div>
            <div>
              <span className="text-[10px] text-zinc-500 uppercase block font-sans">Period</span>
              <span className="text-zinc-200 font-semibold">{frame.periodMs ? `${frame.periodMs} ms` : '-'}</span>
            </div>
            <div>
              <span className="text-[10px] text-zinc-500 uppercase block font-sans">Frequency</span>
              <span className="text-zinc-200 font-semibold">{frame.freqHz ? `${frame.freqHz} Hz` : '-'}</span>
            </div>
          </div>

          {/* Byte-by-Byte Detailed Breakdown Table */}
          <div>
            <div className="flex items-center space-x-2 text-zinc-300 font-sans font-semibold mb-2">
              <Binary className="w-4 h-4 text-cyan-400" />
              <span>Byte-by-Byte Payload Breakdown</span>
            </div>
            <div className="border border-zinc-800 rounded-lg overflow-hidden">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-zinc-950 text-zinc-400 text-[11px] border-b border-zinc-800">
                    <th className="p-2 w-12 text-center">Byte</th>
                    <th className="p-2 w-16">Hex</th>
                    <th className="p-2 w-16">Dec</th>
                    <th className="p-2">Binary (8-bit)</th>
                    <th className="p-2 w-16">ASCII</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/60">
                  {frame.data.map((byte, idx) => (
                    <tr
                      key={idx}
                      className={`hover:bg-zinc-800/40 ${
                        frame.changedBytes && frame.changedBytes[idx] ? 'bg-amber-500/10' : ''
                      }`}
                    >
                      <td className="p-2 text-center text-zinc-500 font-bold">[{idx}]</td>
                      <td className="p-2 font-bold text-cyan-300">0x{byte.toString(16).toUpperCase().padStart(2, '0')}</td>
                      <td className="p-2 text-zinc-300">{byte}</td>
                      <td className="p-2 text-zinc-400 font-mono tracking-widest text-[11px]">
                        {byte.toString(2).padStart(8, '0').slice(0, 4)}{' '}
                        {byte.toString(2).padStart(8, '0').slice(4)}
                      </td>
                      <td className="p-2 text-zinc-400 font-mono">
                        {byte >= 32 && byte <= 126 ? String.fromCharCode(byte) : '.'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* DBC Decoded Signals Section */}
          {frame.decoded && Object.keys(frame.decoded).length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center space-x-2 text-zinc-300 font-sans font-semibold">
                <Database className="w-4 h-4 text-emerald-400" />
                <span>Decoded DBC Signals</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {Object.entries(frame.decoded).map(([name, val]) => (
                  <div
                    key={name}
                    className="p-2.5 bg-zinc-950 border border-zinc-800 rounded-lg flex items-center justify-between"
                  >
                    <span className="text-zinc-400 text-xs">{name}</span>
                    <span className="text-emerald-400 font-semibold text-xs">{String(val)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Export & Copy Options */}
          <div className="pt-2 border-t border-zinc-800 flex items-center justify-between font-sans">
            <div className="flex items-center space-x-2">
              <button
                onClick={() => handleCopy(hexPayload, 'hex')}
                className="px-2.5 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded text-xs flex items-center space-x-1.5 transition cursor-pointer"
              >
                {copiedFormat === 'hex' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>Copy Hex</span>
              </button>

              <button
                onClick={() => handleCopy(JSON.stringify(frame, null, 2), 'json')}
                className="px-2.5 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded text-xs flex items-center space-x-1.5 transition cursor-pointer"
              >
                {copiedFormat === 'json' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>Copy JSON</span>
              </button>

              <button
                onClick={() =>
                  handleCopy(
                    `${frame.timestamp},${frame.direction},${frame.idHex},${frame.extended ? 'EXT' : 'STD'},${
                      frame.dlc
                    },${hexPayload}`,
                    'csv'
                  )
                }
                className="px-2.5 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded text-xs flex items-center space-x-1.5 transition cursor-pointer"
              >
                {copiedFormat === 'csv' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>Copy CSV</span>
              </button>
            </div>

            <button
              onClick={onClose}
              className="px-4 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded text-xs font-semibold transition cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
