import React, { useState, useMemo } from 'react';
import { AggregatedIdStats } from '../store/canStore';
import { DbcDatabase, CanFrame } from '../types/can';
import { formatTimestamp, formatAscii } from '../utils/formatters';
import { Search, ArrowUpDown, Eye, Database, Activity } from 'lucide-react';

interface MessagesPageProps {
  aggregatedStats: Map<number, AggregatedIdStats>;
  activeDbc: DbcDatabase | null;
  onSelectFrame: (frame: CanFrame) => void;
  onNavigateToGraph?: (canId: number) => void;
}

type SortField = 'id' | 'count' | 'period' | 'frequency' | 'lastSeen';

export const MessagesPage: React.FC<MessagesPageProps> = ({
  aggregatedStats,
  activeDbc,
  onSelectFrame,
  onNavigateToGraph,
}) => {
  const [search, setSearch] = useState('');
  const [sortField, setSortField] = useState<SortField>('count');
  const [sortAsc, setSortAsc] = useState(false);

  // DBC Message Name lookup map
  const dbcNameMap = useMemo(() => {
    const map = new Map<number, string>();
    if (activeDbc) {
      activeDbc.messages.forEach((m) => {
        map.set(m.id, m.name);
      });
    }
    return map;
  }, [activeDbc]);

  const sortedList = useMemo(() => {
    let items: AggregatedIdStats[] = Array.from(aggregatedStats.values()) as AggregatedIdStats[];

    if (search.trim()) {
      const q = search.toLowerCase().trim();
      items = items.filter((item) => {
        if (item.idHex.toLowerCase().includes(q)) return true;
        if (item.id.toString().includes(q)) return true;
        const dbcName = dbcNameMap.get(item.id);
        if (dbcName && dbcName.toLowerCase().includes(q)) return true;
        return false;
      });
    }

    return items.sort((a, b) => {
      let valA: number = 0;
      let valB: number = 0;
      if (sortField === 'id') {
        valA = a.id;
        valB = b.id;
      } else if (sortField === 'count') {
        valA = a.count;
        valB = b.count;
      } else if (sortField === 'period') {
        valA = a.periodMs;
        valB = b.periodMs;
      } else if (sortField === 'frequency') {
        valA = a.freqHz;
        valB = b.freqHz;
      } else if (sortField === 'lastSeen') {
        valA = a.lastTimestamp;
        valB = b.lastTimestamp;
      }

      return sortAsc ? valA - valB : valB - valA;
    });
  }, [aggregatedStats, search, sortField, sortAsc, dbcNameMap]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-zinc-950 text-zinc-200">
      {/* Header Toolbar */}
      <div className="p-4 bg-zinc-900 border-b border-zinc-800 flex items-center justify-between gap-4">
        <div>
          <h2 className="text-sm font-bold text-zinc-100 flex items-center space-x-2">
            <span>Aggregated CAN ID Monitor</span>
            <span className="px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400 font-mono text-xs border border-zinc-700/60">
              {aggregatedStats.size} Unique IDs
            </span>
          </h2>
          <p className="text-xs text-zinc-400 mt-0.5">
            Real-time periodic message matrix with cycle time, frequency, and live payload changes
          </p>
        </div>

        <div className="relative w-72">
          <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-zinc-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by Hex ID or DBC Name..."
            className="w-full pl-9 pr-3 py-1.5 bg-zinc-950 border border-zinc-700 rounded text-xs font-mono text-zinc-200 focus:outline-none focus:border-cyan-500"
          />
        </div>
      </div>

      {/* Aggregated Table */}
      <div className="flex-1 overflow-auto font-mono text-xs">
        <table className="w-full border-collapse text-left">
          <thead className="bg-zinc-900/95 text-zinc-400 sticky top-0 z-10 border-b border-zinc-800 text-[11px]">
            <tr>
              <th
                onClick={() => handleSort('id')}
                className="py-2.5 px-3 cursor-pointer hover:text-cyan-300 transition"
              >
                <div className="flex items-center space-x-1">
                  <span>CAN ID</span>
                  <ArrowUpDown className="w-3 h-3 text-zinc-500" />
                </div>
              </th>
              <th className="py-2.5 px-3">DBC Message Name</th>
              <th className="py-2.5 px-2">Type</th>
              <th className="py-2.5 px-2 text-center">DLC</th>
              <th
                onClick={() => handleSort('count')}
                className="py-2.5 px-3 text-right cursor-pointer hover:text-cyan-300 transition"
              >
                <div className="flex items-center justify-end space-x-1">
                  <span>Count</span>
                  <ArrowUpDown className="w-3 h-3 text-zinc-500" />
                </div>
              </th>
              <th
                onClick={() => handleSort('period')}
                className="py-2.5 px-3 text-right cursor-pointer hover:text-cyan-300 transition"
              >
                <div className="flex items-center justify-end space-x-1">
                  <span>Period</span>
                  <ArrowUpDown className="w-3 h-3 text-zinc-500" />
                </div>
              </th>
              <th
                onClick={() => handleSort('frequency')}
                className="py-2.5 px-3 text-right cursor-pointer hover:text-cyan-300 transition"
              >
                <div className="flex items-center justify-end space-x-1">
                  <span>Frequency</span>
                  <ArrowUpDown className="w-3 h-3 text-zinc-500" />
                </div>
              </th>
              <th className="py-2.5 px-3">Latest Payload Data</th>
              <th className="py-2.5 px-3 text-zinc-500">ASCII</th>
              <th className="py-2.5 px-3 text-center">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-900">
            {sortedList.length === 0 ? (
              <tr>
                <td colSpan={10} className="py-16 text-center text-zinc-500 font-sans">
                  No active CAN message streams detected.
                </td>
              </tr>
            ) : (
              sortedList.map((item) => {
                const dbcName = dbcNameMap.get(item.id);

                return (
                  <tr key={item.id} className="hover:bg-zinc-900/60 transition">
                    <td className="py-2.5 px-3 font-bold text-cyan-400">{item.idHex}</td>
                    <td className="py-2.5 px-3 font-sans font-medium text-zinc-200">
                      {dbcName ? (
                        <span className="flex items-center space-x-1 text-emerald-300">
                          <Database className="w-3 h-3 text-emerald-400" />
                          <span>{dbcName}</span>
                        </span>
                      ) : (
                        <span className="text-zinc-500 text-xs italic">Unmapped</span>
                      )}
                    </td>
                    <td className="py-2.5 px-2 text-[10px] text-zinc-400">
                      {item.fd ? 'CAN-FD' : item.extended ? 'EXT' : 'STD'}
                    </td>
                    <td className="py-2.5 px-2 text-center text-zinc-300">{item.lastDlc}</td>
                    <td className="py-2.5 px-3 text-right text-zinc-200 font-semibold">
                      {item.count.toLocaleString()}
                    </td>
                    <td className="py-2.5 px-3 text-right text-zinc-300">
                      {item.periodMs ? `${item.periodMs} ms` : '-'}
                    </td>
                    <td className="py-2.5 px-3 text-right text-emerald-400 font-semibold">
                      {item.freqHz ? `${item.freqHz} Hz` : '-'}
                    </td>
                    <td className="py-2.5 px-3">
                      <div className="flex flex-wrap gap-1 items-center">
                        {item.lastData.map((byte, idx) => {
                          const hasChanged = item.changedBytes && item.changedBytes[idx];
                          return (
                            <span
                              key={idx}
                              className={`px-1 rounded font-mono ${
                                hasChanged
                                  ? 'bg-amber-400 text-zinc-950 font-bold animate-pulse'
                                  : 'text-zinc-300'
                              }`}
                            >
                              {byte.toString(16).toUpperCase().padStart(2, '0')}
                            </span>
                          );
                        })}
                      </div>
                    </td>
                    <td className="py-2.5 px-3 text-zinc-500 max-w-[80px] truncate">
                      {formatAscii(item.lastData)}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <div className="flex items-center justify-center space-x-2">
                        <button
                          onClick={() => {
                            const syntheticFrame: CanFrame = {
                              timestamp: item.lastTimestamp,
                              direction: 'RX',
                              id: item.id,
                              idHex: item.idHex,
                              extended: item.extended,
                              fd: item.fd,
                              dlc: item.lastDlc,
                              data: item.lastData,
                              periodMs: item.periodMs,
                              freqHz: item.freqHz,
                              changedBytes: item.changedBytes,
                              decoded: item.decoded,
                            };
                            onSelectFrame(syntheticFrame);
                          }}
                          className="p-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white transition cursor-pointer"
                          title="Inspect Details"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>

                        {onNavigateToGraph && (
                          <button
                            onClick={() => onNavigateToGraph(item.id)}
                            className="p-1 rounded bg-zinc-800 hover:bg-zinc-700 text-cyan-400 hover:text-cyan-200 transition cursor-pointer"
                            title="Graph Signal"
                          >
                            <Activity className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
