import React from 'react';
import { DbcSignal } from '../types/can';

interface BitMatrixVisualizerProps {
  dlc: number;
  signals: DbcSignal[];
  selectedSignalIndex: number | null;
  onSelectSignal: (index: number) => void;
  hoveredSignalIndex: number | null;
  onHoverSignal: (index: number | null) => void;
}

// Visual color palette for distinct signals
export const SIGNAL_COLORS = [
  { bg: 'bg-emerald-500/20', border: 'border-emerald-500', text: 'text-emerald-300', dot: 'bg-emerald-400', ring: 'ring-emerald-500' },
  { bg: 'bg-cyan-500/20', border: 'border-cyan-500', text: 'text-cyan-300', dot: 'bg-cyan-400', ring: 'ring-cyan-500' },
  { bg: 'bg-purple-500/20', border: 'border-purple-500', text: 'text-purple-300', dot: 'bg-purple-400', ring: 'ring-purple-500' },
  { bg: 'bg-amber-500/20', border: 'border-amber-500', text: 'text-amber-300', dot: 'bg-amber-400', ring: 'ring-amber-500' },
  { bg: 'bg-rose-500/20', border: 'border-rose-500', text: 'text-rose-300', dot: 'bg-rose-400', ring: 'ring-rose-500' },
  { bg: 'bg-blue-500/20', border: 'border-blue-500', text: 'text-blue-300', dot: 'bg-blue-400', ring: 'ring-blue-500' },
  { bg: 'bg-teal-500/20', border: 'border-teal-500', text: 'text-teal-300', dot: 'bg-teal-400', ring: 'ring-teal-500' },
  { bg: 'bg-orange-500/20', border: 'border-orange-500', text: 'text-orange-300', dot: 'bg-orange-400', ring: 'ring-orange-500' },
  { bg: 'bg-indigo-500/20', border: 'border-indigo-500', text: 'text-indigo-300', dot: 'bg-indigo-400', ring: 'ring-indigo-500' },
  { bg: 'bg-pink-500/20', border: 'border-pink-500', text: 'text-pink-300', dot: 'bg-pink-400', ring: 'ring-pink-500' },
];

/**
 * Computes all bit indices occupied by a signal depending on endianness
 */
export function getSignalBitIndices(signal: DbcSignal): number[] {
  const indices: number[] = [];
  if (signal.byteOrder === 'little_endian') {
    // Intel: sequential bits starting from startBit
    for (let i = 0; i < signal.length; i++) {
      indices.push(signal.startBit + i);
    }
  } else {
    // Motorola: startBit is MSB
    let currentByte = Math.floor(signal.startBit / 8);
    let currentBitInByte = signal.startBit % 8;
    for (let i = 0; i < signal.length; i++) {
      indices.push(currentByte * 8 + currentBitInByte);
      currentBitInByte--;
      if (currentBitInByte < 0) {
        currentBitInByte = 7;
        currentByte++;
      }
    }
  }
  return indices;
}

export const BitMatrixVisualizer: React.FC<BitMatrixVisualizerProps> = ({
  dlc,
  signals,
  selectedSignalIndex,
  onSelectSignal,
  hoveredSignalIndex,
  onHoverSignal,
}) => {
  const byteCount = Math.min(Math.max(dlc, 1), 8); // Display 1 to 8 bytes for standard visual grid
  const totalBits = byteCount * 8;

  // Map bit index -> array of signal indices that claim it
  const bitOwnership: Map<number, number[]> = new Map();
  for (let b = 0; b < totalBits; b++) {
    bitOwnership.set(b, []);
  }

  signals.forEach((sig, sigIdx) => {
    const bitIndices = getSignalBitIndices(sig);
    bitIndices.forEach((bit) => {
      if (bit >= 0 && bit < totalBits) {
        const existing = bitOwnership.get(bit) || [];
        existing.push(sigIdx);
        bitOwnership.set(bit, existing);
      }
    });
  });

  // Check if any bit is claimed by > 1 signal (collision)
  const hasCollisions = Array.from(bitOwnership.values()).some((arr) => arr.length > 1);

  return (
    <div className="p-4 bg-zinc-950 border border-zinc-800 rounded-xl space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center space-x-2">
          <span className="text-xs font-bold uppercase tracking-wider text-zinc-300 font-mono">
            Payload Bit Allocation Matrix ({byteCount} Bytes • {totalBits} Bits)
          </span>
          {hasCollisions && (
            <span className="text-[10px] px-2 py-0.5 rounded bg-rose-950/80 text-rose-300 border border-rose-800 font-mono font-bold animate-pulse">
              Bit Collision Warning!
            </span>
          )}
        </div>
        <div className="text-[11px] text-zinc-500 font-mono">
          Bit 7 (MSB) ← Bit 0 (LSB)
        </div>
      </div>

      {/* Bit Matrix Grid */}
      <div className="overflow-x-auto pb-1">
        <div className="min-w-[480px] space-y-1.5 font-mono text-[11px]">
          {/* Header Bit Numbers */}
          <div className="grid grid-cols-9 gap-1 text-center text-zinc-500 text-[10px]">
            <div className="text-left font-semibold text-zinc-600 pl-1">Byte</div>
            {[7, 6, 5, 4, 3, 2, 1, 0].map((b) => (
              <div key={b} className="font-semibold text-zinc-500">
                Bit {b}
              </div>
            ))}
          </div>

          {/* Byte Rows */}
          {Array.from({ length: byteCount }).map((_, byteIndex) => {
            return (
              <div key={byteIndex} className="grid grid-cols-9 gap-1 items-center">
                {/* Byte Label */}
                <div className="text-left text-zinc-400 font-bold text-[10px] pl-1">
                  B{byteIndex}{' '}
                  <span className="text-[9px] text-zinc-600 font-normal">
                    [{byteIndex * 8 + 7}..{byteIndex * 8}]
                  </span>
                </div>

                {/* 8 Bits in this Byte (Bit 7 down to Bit 0 standard automotive display) */}
                {[7, 6, 5, 4, 3, 2, 1, 0].map((bitInByte) => {
                  const absoluteBitIndex = byteIndex * 8 + bitInByte;
                  const owners = bitOwnership.get(absoluteBitIndex) || [];
                  const isCollision = owners.length > 1;
                  const hasOwner = owners.length === 1;
                  const primaryOwnerIndex = owners[0];
                  const isStartBit =
                    hasOwner && signals[primaryOwnerIndex]?.startBit === absoluteBitIndex;

                  const isSelected =
                    selectedSignalIndex !== null && owners.includes(selectedSignalIndex);
                  const isHovered =
                    hoveredSignalIndex !== null && owners.includes(hoveredSignalIndex);

                  const palette = hasOwner
                    ? SIGNAL_COLORS[primaryOwnerIndex % SIGNAL_COLORS.length]
                    : null;

                  return (
                    <button
                      key={bitInByte}
                      type="button"
                      onClick={() => {
                        if (hasOwner) {
                          onSelectSignal(primaryOwnerIndex);
                        }
                      }}
                      onMouseEnter={() => {
                        if (hasOwner) {
                          onHoverSignal(primaryOwnerIndex);
                        }
                      }}
                      onMouseLeave={() => {
                        onHoverSignal(null);
                      }}
                      title={
                        isCollision
                          ? `Collision at bit ${absoluteBitIndex}: ${owners.map((idx) => signals[idx]?.name).join(', ')}`
                          : hasOwner
                          ? `Bit ${absoluteBitIndex} (${signals[primaryOwnerIndex]?.name})`
                          : `Bit ${absoluteBitIndex} (Unassigned)`
                      }
                      className={`h-9 rounded-md border flex flex-col items-center justify-between p-1 transition-all cursor-pointer select-none text-center relative ${
                        isCollision
                          ? 'bg-rose-950/80 border-rose-600 text-rose-200 ring-2 ring-rose-500'
                          : hasOwner
                          ? `${palette?.bg} ${palette?.border} ${palette?.text} ${
                              isSelected
                                ? 'ring-2 ' + palette?.ring + ' scale-[1.05] z-10 font-bold'
                                : isHovered
                                ? 'brightness-125'
                                : 'opacity-90'
                            }`
                          : 'bg-zinc-900/40 border-zinc-800/80 text-zinc-600 hover:border-zinc-700'
                      }`}
                    >
                      <div className="flex items-center justify-between w-full text-[9px] leading-none">
                        <span className="opacity-70">{absoluteBitIndex}</span>
                        {isStartBit && (
                          <span
                            className="w-1.5 h-1.5 rounded-full bg-white shadow-sm"
                            title="Start Bit (LSB/MSB)"
                          />
                        )}
                      </div>

                      <div className="text-[10px] font-mono leading-none truncate max-w-[40px]">
                        {isCollision ? (
                          <span className="font-bold text-rose-300">ERR!</span>
                        ) : hasOwner ? (
                          <span className="font-semibold">{signals[primaryOwnerIndex]?.name.slice(0, 4)}</span>
                        ) : (
                          <span className="text-zinc-700">·</span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>

      {/* Signal Colors Legend */}
      {signals.length > 0 && (
        <div className="pt-2 border-t border-zinc-800/80 flex flex-wrap items-center gap-2">
          <span className="text-[11px] text-zinc-500 font-sans mr-1">Signals:</span>
          {signals.map((sig, idx) => {
            const palette = SIGNAL_COLORS[idx % SIGNAL_COLORS.length];
            const isSelected = selectedSignalIndex === idx;
            const isHovered = hoveredSignalIndex === idx;

            return (
              <button
                key={sig.name + idx}
                type="button"
                onClick={() => onSelectSignal(idx)}
                onMouseEnter={() => onHoverSignal(idx)}
                onMouseLeave={() => onHoverSignal(null)}
                className={`px-2 py-0.5 rounded-md border text-[11px] font-mono flex items-center space-x-1.5 transition cursor-pointer ${
                  isSelected
                    ? `${palette.bg} ${palette.border} ${palette.text} font-bold ring-1 ${palette.ring}`
                    : isHovered
                    ? `${palette.bg} ${palette.border} ${palette.text}`
                    : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <span className={`w-2 h-2 rounded-full ${palette.dot}`} />
                <span className="truncate max-w-[120px]">{sig.name}</span>
                <span className="text-[9px] opacity-70">
                  [{sig.startBit}:{sig.length}b]
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
