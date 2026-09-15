import React, { useState } from 'react';
import { CanFrame } from '../types/can';
import { formatTimestamp, formatBytesHex, formatAscii } from '../utils/formatters';
import { X, Copy, Check, Database, Binary, LayoutGrid, Info, HelpCircle } from 'lucide-react';

interface FrameDetailsModalProps {
  frame: CanFrame | null;
  onClose: () => void;
}

export const FrameDetailsModal: React.FC<FrameDetailsModalProps> = ({ frame, onClose }) => {
  const [copiedFormat, setCopiedFormat] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'matrix' | 'table'>('matrix');
  const [hoveredByteIdx, setHoveredByteIdx] = useState<number | null>(null);

  if (!frame) return null;

  const handleCopy = (text: string, formatName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedFormat(formatName);
    setTimeout(() => setCopiedFormat(null), 1500);
  };

  const hexPayload = formatBytesHex(frame.data);
  const asciiPayload = formatAscii(frame.data);
  const totalBytes = frame.data.length;

  // Group data into 16-byte chunks for the CAN-FD matrix
  const rows: { offset: number; bytes: number[] }[] = [];
  for (let i = 0; i < totalBytes; i += 16) {
    rows.push({
      offset: i,
      bytes: frame.data.slice(i, i + 16),
    });
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
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
                CAN-FD (Up to 64B)
              </span>
            )}
            {frame.brs && (
              <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-950 text-emerald-300 border border-emerald-800">
                BRS
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
              <span className="text-[10px] text-zinc-500 uppercase block font-sans">DLC / Length</span>
              <span className="text-zinc-200 font-semibold">
                DLC {frame.dlc} ({totalBytes} bytes)
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

          {/* View Mode Toggle Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 text-zinc-300 font-sans font-semibold">
              <Binary className="w-4 h-4 text-cyan-400" />
              <span>Payload Data Inspection ({totalBytes} Bytes)</span>
            </div>

            <div className="flex items-center space-x-1 bg-zinc-950 p-0.5 rounded border border-zinc-800 text-[11px] font-sans">
              <button
                onClick={() => setViewMode('matrix')}
                className={`px-2.5 py-1 rounded transition flex items-center space-x-1 cursor-pointer ${
                  viewMode === 'matrix' ? 'bg-zinc-800 text-white' : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <LayoutGrid className="w-3 h-3" />
                <span>16-Byte Matrix & ASCII</span>
              </button>
              <button
                onClick={() => setViewMode('table')}
                className={`px-2.5 py-1 rounded transition flex items-center space-x-1 cursor-pointer ${
                  viewMode === 'table' ? 'bg-zinc-800 text-white' : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <Binary className="w-3 h-3" />
                <span>Detailed Bit Breakdown</span>
              </button>
            </div>
          </div>

          {/* Hovered Byte Inspector Badge */}
          {hoveredByteIdx !== null && frame.data[hoveredByteIdx] !== undefined && (
            <div className="p-2.5 bg-cyan-950/40 border border-cyan-500/40 rounded-lg text-cyan-200 text-xs flex items-center justify-between font-mono animate-in fade-in duration-100">
              <div className="flex items-center space-x-3">
                <span className="font-bold text-cyan-300">Byte [{hoveredByteIdx}] (Offset +0x{hoveredByteIdx.toString(16).toUpperCase().padStart(2, '0')}):</span>
                <span>Hex: <strong className="text-white">0x{frame.data[hoveredByteIdx].toString(16).toUpperCase().padStart(2, '0')}</strong></span>
                <span>Dec: <strong className="text-white">{frame.data[hoveredByteIdx]}</strong></span>
                <span>Binary: <strong className="text-white">{frame.data[hoveredByteIdx].toString(2).padStart(8, '0')}</strong></span>
                <span>Bits: <strong className="text-zinc-400">{hoveredByteIdx * 8}..{hoveredByteIdx * 8 + 7}</strong></span>
              </div>
              <span className="text-[10px] text-cyan-400 font-sans">
                Char: {frame.data[hoveredByteIdx] >= 32 && frame.data[hoveredByteIdx] <= 126 ? `'${String.fromCharCode(frame.data[hoveredByteIdx])}'` : '(non-printable)'}
              </span>
            </div>
          )}

          {/* Mode 1: 16-Byte CAN-FD Hexdump & ASCII Matrix */}
          {viewMode === 'matrix' && (
            <div className="bg-zinc-950 border border-zinc-800 rounded-lg p-3 font-mono text-xs overflow-x-auto">
              <div className="min-w-[620px]">
                {/* Header Offsets */}
                <div className="text-zinc-500 text-[11px] pb-1 border-b border-zinc-800/80 mb-2 flex items-center">
                  <span className="w-14 shrink-0 font-bold">Offset</span>
                  <div className="flex space-x-2 mr-4">
                    {Array.from({ length: 16 }).map((_, i) => (
                      <span
                        key={i}
                        className={`w-6 text-center ${i === 8 ? 'ml-2' : ''} ${
                          hoveredByteIdx !== null && hoveredByteIdx % 16 === i ? 'text-cyan-400 font-bold' : ''
                        }`}
                      >
                        {i.toString(16).toUpperCase().padStart(2, '0')}
                      </span>
                    ))}
                  </div>
                  <span className="text-zinc-500 border-l border-zinc-800 pl-3">Synchronized ASCII</span>
                </div>

                {/* Data Rows */}
                {rows.map((row) => {
                  return (
                    <div key={row.offset} className="flex items-center py-1 hover:bg-zinc-900/60 rounded px-1 transition">
                      {/* Row Offset */}
                      <span className="w-14 text-zinc-500 shrink-0 font-bold">
                        0x{row.offset.toString(16).toUpperCase().padStart(4, '0')}
                      </span>

                      {/* 16 Hex Bytes with 8-byte gutter */}
                      <div className="flex space-x-2 mr-4">
                        {Array.from({ length: 16 }).map((_, col) => {
                          const byteIndex = row.offset + col;
                          const hasByte = byteIndex < totalBytes;
                          const byteVal = hasByte ? frame.data[byteIndex] : null;
                          const isHovered = hoveredByteIdx === byteIndex;
                          const isChanged = frame.changedBytes && frame.changedBytes[byteIndex];

                          return (
                            <span
                              key={col}
                              onMouseEnter={() => hasByte && setHoveredByteIdx(byteIndex)}
                              onMouseLeave={() => setHoveredByteIdx(null)}
                              className={`w-6 text-center rounded transition font-mono ${col === 8 ? 'ml-2' : ''} ${
                                !hasByte
                                  ? 'text-zinc-800 select-none'
                                  : isHovered
                                  ? 'bg-cyan-500 text-black font-bold shadow'
                                  : isChanged
                                  ? 'bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30'
                                  : 'text-zinc-200 hover:text-cyan-300 cursor-pointer'
                              }`}
                            >
                              {byteVal !== null ? byteVal.toString(16).toUpperCase().padStart(2, '0') : '..'}
                            </span>
                          );
                        })}
                      </div>

                      {/* Synchronized ASCII Column */}
                      <div className="border-l border-zinc-800 pl-3 flex space-x-0.5 text-zinc-400 font-mono tracking-wider">
                        {Array.from({ length: 16 }).map((_, col) => {
                          const byteIndex = row.offset + col;
                          const hasByte = byteIndex < totalBytes;
                          const byteVal = hasByte ? frame.data[byteIndex] : null;
                          const isHovered = hoveredByteIdx === byteIndex;
                          const char =
                            byteVal !== null && byteVal >= 32 && byteVal <= 126
                              ? String.fromCharCode(byteVal)
                              : '.';

                          return (
                            <span
                              key={col}
                              onMouseEnter={() => hasByte && setHoveredByteIdx(byteIndex)}
                              onMouseLeave={() => setHoveredByteIdx(null)}
                              className={`w-3.5 text-center cursor-pointer transition ${
                                !hasByte
                                  ? 'text-zinc-800'
                                  : isHovered
                                  ? 'bg-cyan-400 text-black font-bold'
                                  : char === '.'
                                  ? 'text-zinc-600'
                                  : 'text-emerald-400 font-bold'
                              }`}
                            >
                              {char}
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Mode 2: Detailed Bit-by-Bit Table */}
          {viewMode === 'table' && (
            <div className="border border-zinc-800 rounded-lg overflow-hidden max-h-72 overflow-y-auto">
              <table className="w-full text-left border-collapse">
                <thead className="sticky top-0 bg-zinc-950 text-zinc-400 text-[11px] border-b border-zinc-800 z-10">
                  <tr>
                    <th className="p-2 w-14 text-center">Byte</th>
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
                      onMouseEnter={() => setHoveredByteIdx(idx)}
                      onMouseLeave={() => setHoveredByteIdx(null)}
                      className={`hover:bg-zinc-800/40 cursor-pointer ${
                        hoveredByteIdx === idx ? 'bg-zinc-800/80' : ''
                      } ${frame.changedBytes && frame.changedBytes[idx] ? 'bg-amber-500/10' : ''}`}
                    >
                      <td className="p-2 text-center text-zinc-500 font-bold">[{idx}]</td>
                      <td className="p-2 font-bold text-cyan-300">
                        0x{byte.toString(16).toUpperCase().padStart(2, '0')}
                      </td>
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
          )}

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

