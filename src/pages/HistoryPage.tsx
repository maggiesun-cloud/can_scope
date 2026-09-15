import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  CanFrame,
  SnifferSessionMeta,
  SnifferHistoryFilter,
  IndexedDbStorageStats,
  IndexedDbSettings,
} from '../types/can';
import { indexedDbService, DEFAULT_RETENTION_MONTHS, DEFAULT_INDEXEDDB_SETTINGS } from '../services/indexedDb';
import { formatTimestamp, formatBytesHex, formatAscii } from '../utils/formatters';
import { exportToVectorAsc, exportToSocketCanDump, downloadFile } from '../utils/traceExporter';
import { TraceReplayStation } from '../components/TraceReplayStation';
import {
  Archive,
  Search,
  Calendar,
  Clock,
  HardDrive,
  Trash2,
  Download,
  UploadCloud,
  Layers,
  ChevronRight,
  ChevronDown,
  RefreshCw,
  SlidersHorizontal,
  FileText,
  Eye,
  CheckCircle2,
  AlertTriangle,
  Play,
  Save,
  Tag,
  Sparkles,
  ExternalLink,
  ShieldCheck,
  Radio,
  X,
} from 'lucide-react';

interface HistoryPageProps {
  currentBufferFrames: CanFrame[];
  onLoadSessionIntoMonitor: (frames: CanFrame[], sessionName: string) => void;
  onSaveCurrentBuffer: (name?: string, notes?: string) => Promise<SnifferSessionMeta | null>;
  onNavigateToMonitor?: () => void;
  onStreamFrameToMonitor?: (frame: CanFrame) => void;
  addToast?: (title: string, message?: string, type?: any) => void;
  activeDbc?: any;
}

export const HistoryPage: React.FC<HistoryPageProps> = ({
  currentBufferFrames,
  onLoadSessionIntoMonitor,
  onSaveCurrentBuffer,
  onNavigateToMonitor,
  onStreamFrameToMonitor,
  addToast,
  activeDbc,
}) => {
  // Navigation / Mode tab
  const [activeTab, setActiveTab] = useState<'sessions' | 'replay'>('sessions');

  // State
  const [sessions, setSessions] = useState<SnifferSessionMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<IndexedDbStorageStats | null>(null);
  const [settings, setSettings] = useState<IndexedDbSettings | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [canIdFilter, setCanIdFilter] = useState('');
  const [datePreset, setDatePreset] = useState<SnifferHistoryFilter['dateRangePreset']>('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [channelFilter, setChannelFilter] = useState('all');
  const [protocolFilter, setProtocolFilter] = useState<'all' | 'classic' | 'fd' | 'mixed'>('all');
  const [sortBy, setSortBy] = useState<SnifferHistoryFilter['sortBy']>('timestamp_desc');

  // Selected session for detailed frame inspection
  const [inspectingSessionId, setInspectingSessionId] = useState<string | null>(null);
  const [inspectingSessionMeta, setInspectingSessionMeta] = useState<SnifferSessionMeta | null>(null);
  const [inspectingFrames, setInspectingFrames] = useState<CanFrame[] | null>(null);
  const [framesLoading, setFramesLoading] = useState(false);
  const [frameSearchQuery, setFrameSearchQuery] = useState('');

  // Quick save modal / state
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [saveName, setSaveName] = useState('');
  const [saveNotes, setSaveNotes] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Settings modal
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [tempRetention, setTempRetention] = useState(DEFAULT_RETENTION_MONTHS);
  const [tempAutoSaveOnClear, setTempAutoSaveOnClear] = useState(true);

  // Editing session notes
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [editingNotes, setEditingNotes] = useState('');

  // Status message
  const [actionMessage, setActionMessage] = useState<{
    text: string;
    type: 'success' | 'info' | 'error';
  } | null>(null);

  const showStatus = (text: string, type: 'success' | 'info' | 'error' = 'info') => {
    setActionMessage({ text, type });
    setTimeout(() => setActionMessage(null), 4000);
  };

  // Fetch sessions and storage stats
  const refreshData = useCallback(async () => {
    setLoading(true);
    try {
      const filter: SnifferHistoryFilter = {
        searchQuery: searchQuery || undefined,
        canId: canIdFilter || undefined,
        dateRangePreset: datePreset,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        channel: channelFilter,
        protocol: protocolFilter,
        sortBy,
      };

      const [loadedSessions, loadedStats, loadedSettings] = await Promise.all([
        indexedDbService.getSnifferSessions(filter),
        indexedDbService.getStorageStats(),
        indexedDbService.loadSettings(),
      ]);

      setSessions(loadedSessions);
      setStats(loadedStats);
      setSettings(loadedSettings);
      setTempRetention(loadedSettings.retentionMonths);
      setTempAutoSaveOnClear(loadedSettings.autoSaveOnClear);
    } catch (err: any) {
      showStatus(`Error loading history: ${err.message}`, 'error');
    } finally {
      setLoading(false);
    }
  }, [searchQuery, canIdFilter, datePreset, startDate, endDate, channelFilter, protocolFilter, sortBy]);

  useEffect(() => {
    refreshData();
  }, [refreshData]);

  // Load frames when user inspects a session
  const handleInspectSession = async (session: SnifferSessionMeta) => {
    if (inspectingSessionId === session.id) {
      // Toggle close
      setInspectingSessionId(null);
      setInspectingSessionMeta(null);
      setInspectingFrames(null);
      return;
    }

    setInspectingSessionId(session.id);
    setInspectingSessionMeta(session);
    setFramesLoading(true);
    setFrameSearchQuery('');

    try {
      const frames = await indexedDbService.getSnifferSessionFrames(session.id);
      setInspectingFrames(frames || []);
    } catch (err: any) {
      showStatus(`Could not load frames: ${err.message}`, 'error');
      setInspectingFrames([]);
    } finally {
      setFramesLoading(false);
    }
  };

  // Delete a session
  const handleDeleteSession = async (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this historical sniffer capture?')) return;

    try {
      await indexedDbService.deleteSnifferSession(sessionId);
      showStatus('Capture deleted from IndexedDB.', 'info');
      if (inspectingSessionId === sessionId) {
        setInspectingSessionId(null);
        setInspectingFrames(null);
      }
      refreshData();
    } catch (err: any) {
      showStatus(`Delete error: ${err.message}`, 'error');
    }
  };

  // Save edited notes
  const handleSaveNotes = async (sessionId: string) => {
    try {
      await indexedDbService.updateSnifferSessionMeta(sessionId, { notes: editingNotes });
      setEditingSessionId(null);
      showStatus('Notes updated.', 'success');
      refreshData();
    } catch (err: any) {
      showStatus(`Error updating notes: ${err.message}`, 'error');
    }
  };

  // Prune expired (>6 months) sessions
  const handlePruneExpired = async () => {
    try {
      const count = await indexedDbService.pruneExpiredSessions(settings?.retentionMonths || DEFAULT_RETENTION_MONTHS);
      if (count > 0) {
        showStatus(`Pruned ${count} captures older than ${settings?.retentionMonths || 6} months.`, 'success');
      } else {
        showStatus(`All captures are within the ${settings?.retentionMonths || 6}-month retention window.`, 'info');
      }
      refreshData();
    } catch (err: any) {
      showStatus(`Pruning error: ${err.message}`, 'error');
    }
  };

  // Clear all history
  const handleClearAll = async () => {
    if (!confirm('WARNING: Are you sure you want to permanently delete ALL historical CAN sniffer captures in IndexedDB?')) {
      return;
    }
    try {
      await indexedDbService.clearAllSnifferHistory();
      setInspectingSessionId(null);
      setInspectingFrames(null);
      showStatus('All sniffer history cleared.', 'info');
      refreshData();
    } catch (err: any) {
      showStatus(`Clear error: ${err.message}`, 'error');
    }
  };

  // Export session to CSV
  const handleExportCsv = async (session: SnifferSessionMeta, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    try {
      const frames =
        inspectingSessionId === session.id && inspectingFrames
          ? inspectingFrames
          : await indexedDbService.getSnifferSessionFrames(session.id);

      if (!frames || frames.length === 0) {
        showStatus('No frames found to export.', 'error');
        return;
      }

      const header = 'timestamp,direction,id,type,dlc,data\n';
      const rows = frames.map((f) => {
        const ftype = f.extended && f.fd ? 'EXT_FD' : f.extended ? 'EXT' : f.fd ? 'STD_FD' : 'STD';
        const dataStr = f.data.map((b) => b.toString(16).toUpperCase().padStart(2, '0')).join(' ');
        return `${f.timestamp.toFixed(6)},${f.direction},${f.idHex},${ftype},${f.dlc},${dataStr}`;
      });

      const blob = new Blob([header + rows.join('\n')], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${session.name.replace(/[^a-zA-Z0-9_-]/g, '_')}_${session.timestamp}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      showStatus(`Exported ${frames.length} frames to CSV.`, 'success');
    } catch (err: any) {
      showStatus(`Export error: ${err.message}`, 'error');
    }
  };

  // Export session to JSON
  const handleExportJson = async (session: SnifferSessionMeta, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    try {
      const frames =
        inspectingSessionId === session.id && inspectingFrames
          ? inspectingFrames
          : await indexedDbService.getSnifferSessionFrames(session.id);

      if (!frames || frames.length === 0) {
        showStatus('No frames found to export.', 'error');
        return;
      }

      const exportPayload = {
        metadata: session,
        frames,
      };

      const blob = new Blob([JSON.stringify(exportPayload, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${session.name.replace(/[^a-zA-Z0-9_-]/g, '_')}_${session.timestamp}.json`;
      a.click();
      URL.revokeObjectURL(url);
      showStatus(`Exported ${frames.length} frames to JSON.`, 'success');
    } catch (err: any) {
      showStatus(`Export error: ${err.message}`, 'error');
    }
  };

  // Export session to Vector .asc format
  const handleExportAsc = async (session: SnifferSessionMeta, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    try {
      const frames =
        inspectingSessionId === session.id && inspectingFrames
          ? inspectingFrames
          : await indexedDbService.getSnifferSessionFrames(session.id);

      if (!frames || frames.length === 0) {
        showStatus('No frames found to export.', 'error');
        return;
      }

      const ascContent = exportToVectorAsc(frames);
      const filename = `${session.name.replace(/[^a-zA-Z0-9_-]/g, '_')}_${session.timestamp}.asc`;
      downloadFile(ascContent, filename, 'text/plain');
      showStatus(`Exported ${frames.length} frames to Vector .asc format.`, 'success');
    } catch (err: any) {
      showStatus(`Export error: ${err.message}`, 'error');
    }
  };

  // Export session to SocketCAN candump format
  const handleExportCandump = async (session: SnifferSessionMeta, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    try {
      const frames =
        inspectingSessionId === session.id && inspectingFrames
          ? inspectingFrames
          : await indexedDbService.getSnifferSessionFrames(session.id);

      if (!frames || frames.length === 0) {
        showStatus('No frames found to export.', 'error');
        return;
      }

      const candumpContent = exportToSocketCanDump(frames, session.channel || 'can0');
      const filename = `${session.name.replace(/[^a-zA-Z0-9_-]/g, '_')}_${session.timestamp}.log`;
      downloadFile(candumpContent, filename, 'text/plain');
      showStatus(`Exported ${frames.length} frames to SocketCAN candump log.`, 'success');
    } catch (err: any) {
      showStatus(`Export error: ${err.message}`, 'error');
    }
  };

  // Load into monitor
  const handleLoadIntoLiveMonitor = async (session: SnifferSessionMeta, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    try {
      const frames =
        inspectingSessionId === session.id && inspectingFrames
          ? inspectingFrames
          : await indexedDbService.getSnifferSessionFrames(session.id);

      if (!frames || frames.length === 0) {
        showStatus('No frames in this capture to load.', 'error');
        return;
      }

      onLoadSessionIntoMonitor(frames, session.name);
      if (onNavigateToMonitor) {
        onNavigateToMonitor();
      }
    } catch (err: any) {
      showStatus(`Error loading session: ${err.message}`, 'error');
    }
  };

  // Save current live buffer
  const handleConfirmSaveCurrent = async () => {
    if (currentBufferFrames.length === 0) {
      showStatus('Live sniffer buffer is currently empty.', 'error');
      return;
    }
    setIsSaving(true);
    try {
      const meta = await onSaveCurrentBuffer(
        saveName.trim() || undefined,
        saveNotes.trim() || undefined
      );
      if (meta) {
        showStatus(`Successfully saved ${meta.frameCount} frames to IndexedDB!`, 'success');
        setShowSaveModal(false);
        setSaveName('');
        setSaveNotes('');
        refreshData();
      }
    } catch (err: any) {
      showStatus(`Save error: ${err.message}`, 'error');
    } finally {
      setIsSaving(false);
    }
  };

  // Seed sample data for testing 6-month history
  const handleSeedSamples = async () => {
    try {
      await indexedDbService.seedSampleHistoryIfEmpty();
      showStatus('Added representative sample captures spanning past 5 months.', 'success');
      refreshData();
    } catch (err: any) {
      showStatus(`Seed error: ${err.message}`, 'error');
    }
  };

  // Save imported trace directly to IndexedDB
  const handleSaveTraceSession = async (frames: CanFrame[], name: string, notes?: string) => {
    const hasFd = frames.some((f) => f.fd);
    const hasClassic = frames.some((f) => !f.fd);
    const protocol = hasFd && hasClassic ? 'mixed' : hasFd ? 'fd' : 'classic';

    await indexedDbService.saveSnifferSession(
      {
        name,
        channel: 'can0',
        bitrate: 500000,
        protocol,
        notes: notes || `Imported trace file (${frames.length} frames)`,
        tags: ['imported', 'trace_replay'],
      },
      frames
    );
    refreshData();
  };

  // Filtered frames inside inspection view
  const filteredInspectFrames = useMemo(() => {
    if (!inspectingFrames) return [];
    if (!frameSearchQuery.trim()) return inspectingFrames;

    const q = frameSearchQuery.trim().toLowerCase();
    return inspectingFrames.filter((f) => {
      if (f.idHex.toLowerCase().includes(q)) return true;
      if (f.id.toString().includes(q)) return true;
      const hexData = f.data.map((b) => b.toString(16).padStart(2, '0')).join(' ');
      if (hexData.includes(q)) return true;
      return false;
    });
  }, [inspectingFrames, frameSearchQuery]);

  // Extract unique available channels from sessions
  const availableChannels = useMemo(() => {
    const s = new Set<string>();
    sessions.forEach((item) => s.add(item.channel));
    return Array.from(s);
  }, [sessions]);

  return (
    <div className="p-6 space-y-6 overflow-y-auto h-full text-zinc-200">
      {/* Action status notification banner */}
      {actionMessage && (
        <div
          className={`p-3 rounded-lg flex items-center justify-between text-xs font-medium border ${
            actionMessage.type === 'success'
              ? 'bg-emerald-950/60 border-emerald-800/80 text-emerald-300'
              : actionMessage.type === 'error'
              ? 'bg-rose-950/60 border-rose-800/80 text-rose-300'
              : 'bg-cyan-950/60 border-cyan-800/80 text-cyan-300'
          }`}
        >
          <div className="flex items-center space-x-2">
            {actionMessage.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            ) : actionMessage.type === 'error' ? (
              <AlertTriangle className="w-4 h-4 text-rose-400" />
            ) : (
              <ShieldCheck className="w-4 h-4 text-cyan-400" />
            )}
            <span>{actionMessage.text}</span>
          </div>
          <button
            onClick={() => setActionMessage(null)}
            className="text-zinc-400 hover:text-zinc-200 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Header section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-zinc-100 flex items-center space-x-2">
            <Archive className="w-5 h-5 text-cyan-400" />
            <span>CAN Sniffer History Cache</span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-cyan-950/80 text-cyan-300 border border-cyan-800/60">
              IndexedDB • 6-Month Retention
            </span>
          </h2>
          <p className="text-xs text-zinc-400 mt-1">
            Browser-native persistent storage designed for 100+ daily sniffer captures with fast search, CAN ID indexing, and replay
          </p>
        </div>

        {/* Header Action Buttons */}
        <div className="flex items-center flex-wrap gap-2">
          <button
            onClick={() => {
              setSaveName(
                `Sniffer Cache ${new Date().toISOString().split('T')[0]} (${currentBufferFrames.length} frames)`
              );
              setShowSaveModal(true);
            }}
            disabled={currentBufferFrames.length === 0}
            className={`px-3 py-1.5 rounded text-xs font-semibold flex items-center space-x-1.5 transition cursor-pointer ${
              currentBufferFrames.length > 0
                ? 'bg-cyan-600 hover:bg-cyan-500 text-zinc-950 shadow-sm'
                : 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
            }`}
            title="Snapshot the active live sniffer buffer into IndexedDB"
          >
            <Save className="w-3.5 h-3.5" />
            <span>Save Live Buffer ({currentBufferFrames.length})</span>
          </button>

          <button
            onClick={handlePruneExpired}
            className="px-2.5 py-1.5 rounded text-xs font-medium bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-700/80 transition cursor-pointer flex items-center space-x-1"
            title="Scan and remove entries older than the retention limit (default: 6 months)"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Prune &gt;6mo</span>
          </button>

          <button
            onClick={() => setShowSettingsModal(true)}
            className="px-2.5 py-1.5 rounded text-xs font-medium bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-700/80 transition cursor-pointer flex items-center space-x-1"
            title="Configure retention policy and auto-save options"
          >
            <SlidersHorizontal className="w-3.5 h-3.5 text-zinc-400" />
            <span>Settings</span>
          </button>

          <button
            onClick={refreshData}
            className="p-1.5 rounded text-xs bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 border border-zinc-800 transition cursor-pointer"
            title="Refresh history from IndexedDB"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Primary View Switcher */}
      <div className="flex items-center space-x-1 bg-zinc-900 p-1 rounded-lg border border-zinc-800 text-xs w-fit">
        <button
          onClick={() => setActiveTab('sessions')}
          className={`px-3 py-1.5 rounded transition font-semibold cursor-pointer flex items-center space-x-1.5 ${
            activeTab === 'sessions'
              ? 'bg-zinc-800 text-white shadow'
              : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <Archive className="w-3.5 h-3.5 text-cyan-400" />
          <span>Captured Sessions Cache ({sessions.length})</span>
        </button>
        <button
          onClick={() => setActiveTab('replay')}
          className={`px-3 py-1.5 rounded transition font-semibold cursor-pointer flex items-center space-x-1.5 ${
            activeTab === 'replay'
              ? 'bg-zinc-800 text-white shadow'
              : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <Play className="w-3.5 h-3.5 text-amber-400" />
          <span>Vector .asc / Log File Replay Station</span>
        </button>
      </div>

      {activeTab === 'replay' ? (
        <TraceReplayStation
          onStreamFrameToMonitor={onStreamFrameToMonitor}
          onSaveTraceToHistory={handleSaveTraceSession}
          onLoadSessionIntoMonitor={onLoadSessionIntoMonitor}
          onNavigateToMonitor={onNavigateToMonitor}
          addToast={addToast}
        />
      ) : (
        <div className="space-y-6">
          {/* Storage & Capacity Overview Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3.5 bg-zinc-900/90 border border-zinc-800 rounded-lg">
          <div className="flex items-center justify-between text-zinc-400 text-xs">
            <span>Saved Captures</span>
            <Archive className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-xl font-bold font-mono text-zinc-100 mt-1">
            {stats ? stats.sessionCount.toLocaleString() : '—'}
          </div>
          <div className="text-[11px] text-zinc-500 mt-0.5">
            {stats && stats.sessionCount > 0 ? 'Indexed in browser' : 'Storage ready'}
          </div>
        </div>

        <div className="p-3.5 bg-zinc-900/90 border border-zinc-800 rounded-lg">
          <div className="flex items-center justify-between text-zinc-400 text-xs">
            <span>Total Frames</span>
            <Layers className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-xl font-bold font-mono text-zinc-100 mt-1">
            {stats ? stats.totalFrames.toLocaleString() : '—'}
          </div>
          <div className="text-[11px] text-zinc-500 mt-0.5">
            Across all saved sessions
          </div>
        </div>

        <div className="p-3.5 bg-zinc-900/90 border border-zinc-800 rounded-lg">
          <div className="flex items-center justify-between text-zinc-400 text-xs">
            <span>IndexedDB Usage</span>
            <HardDrive className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-xl font-bold font-mono text-zinc-100 mt-1">
            {stats
              ? stats.totalEstimatedBytes > 1024 * 1024
                ? `${(stats.totalEstimatedBytes / (1024 * 1024)).toFixed(2)} MB`
                : `${(stats.totalEstimatedBytes / 1024).toFixed(1)} KB`
              : '—'}
          </div>
          <div className="text-[11px] text-zinc-500 mt-0.5 truncate">
            {stats?.browserStorageEstimate
              ? `Quota: ${(stats.browserStorageEstimate.quotaBytes / (1024 * 1024 * 1024)).toFixed(1)} GB`
              : 'Local persistent disk'}
          </div>
        </div>

        <div className="p-3.5 bg-zinc-900/90 border border-zinc-800 rounded-lg">
          <div className="flex items-center justify-between text-zinc-400 text-xs">
            <span>Retention Period</span>
            <Clock className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-xl font-bold font-mono text-zinc-100 mt-1">
            {settings?.retentionMonths || DEFAULT_RETENTION_MONTHS} Months
          </div>
          <div className="text-[11px] text-emerald-400/90 mt-0.5 flex items-center space-x-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
            <span>Auto-prune active</span>
          </div>
        </div>
      </div>

      {/* Comprehensive Search & Filter Controls */}
      <div className="p-4 bg-zinc-900 border border-zinc-800 rounded-xl space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
          {/* Free text search */}
          <div className="md:col-span-5 relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search captures by name, notes, or CAN ID..."
              className="w-full pl-9 pr-8 py-2 bg-zinc-950 border border-zinc-800 rounded text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-cyan-500 font-mono"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Specific CAN ID Filter */}
          <div className="md:col-span-3 relative">
            <Tag className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input
              type="text"
              value={canIdFilter}
              onChange={(e) => setCanIdFilter(e.target.value)}
              placeholder="Filter by ID (e.g. 0x123)"
              className="w-full pl-8 pr-3 py-2 bg-zinc-950 border border-zinc-800 rounded text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-cyan-500 font-mono"
            />
          </div>

          {/* Sort By */}
          <div className="md:col-span-2">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="w-full py-2 px-2.5 bg-zinc-950 border border-zinc-800 rounded text-xs text-zinc-300 focus:outline-none focus:border-cyan-500 font-sans"
            >
              <option value="timestamp_desc">Newest First</option>
              <option value="timestamp_asc">Oldest First</option>
              <option value="frames_desc">Most Frames</option>
              <option value="size_desc">Largest Size</option>
            </select>
          </div>

          {/* Channel Filter */}
          <div className="md:col-span-2">
            <select
              value={channelFilter}
              onChange={(e) => setChannelFilter(e.target.value)}
              className="w-full py-2 px-2.5 bg-zinc-950 border border-zinc-800 rounded text-xs text-zinc-300 focus:outline-none focus:border-cyan-500 font-mono"
            >
              <option value="all">All Channels</option>
              {availableChannels.map((ch) => (
                <option key={ch} value={ch}>
                  {ch}
                </option>
              ))}
              <option value="can0">can0</option>
              <option value="mock0">mock0</option>
              <option value="vcan0">vcan0</option>
            </select>
          </div>
        </div>

        {/* Date Presets Row */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-zinc-800/80">
          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            <span className="text-zinc-500 mr-1 flex items-center space-x-1">
              <Calendar className="w-3.5 h-3.5" />
              <span>Timeline:</span>
            </span>
            {(
              [
                { id: 'all', label: 'All Time' },
                { id: 'today', label: 'Today' },
                { id: 'yesterday', label: 'Yesterday' },
                { id: '7d', label: 'Past 7d' },
                { id: '30d', label: 'Past 30d' },
                { id: '180d', label: 'Past 6 Months (180d)' },
                { id: 'custom', label: 'Custom Range' },
              ] as const
            ).map((p) => (
              <button
                key={p.id}
                onClick={() => setDatePreset(p.id)}
                className={`px-2.5 py-1 rounded text-xs transition cursor-pointer font-medium ${
                  datePreset === p.id
                    ? 'bg-cyan-950 text-cyan-300 border border-cyan-700/80 shadow-sm'
                    : 'bg-zinc-950/80 hover:bg-zinc-800 text-zinc-400 border border-zinc-800'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Custom Date Pickers if 'custom' is active */}
          {datePreset === 'custom' && (
            <div className="flex items-center space-x-2 text-xs">
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="px-2 py-1 bg-zinc-950 border border-zinc-800 rounded text-xs text-zinc-300"
              />
              <span className="text-zinc-500">to</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="px-2 py-1 bg-zinc-950 border border-zinc-800 rounded text-xs text-zinc-300"
              />
            </div>
          )}

          {/* Protocol chips */}
          <div className="flex items-center space-x-1 text-xs">
            <span className="text-zinc-500 mr-1">Protocol:</span>
            {(['all', 'classic', 'fd', 'mixed'] as const).map((pr) => (
              <button
                key={pr}
                onClick={() => setProtocolFilter(pr)}
                className={`px-2 py-0.5 rounded text-[11px] font-mono transition cursor-pointer ${
                  protocolFilter === pr
                    ? 'bg-zinc-800 text-cyan-400 border border-cyan-800'
                    : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                {pr.toUpperCase()}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content Area: Session Cards List */}
      {loading ? (
        <div className="py-16 text-center text-zinc-500 space-y-3">
          <RefreshCw className="w-8 h-8 mx-auto animate-spin text-cyan-500" />
          <p className="text-xs">Loading IndexedDB sniffer cache...</p>
        </div>
      ) : sessions.length === 0 ? (
        <div className="p-12 text-center border border-dashed border-zinc-800 rounded-xl space-y-4 bg-zinc-900/30">
          <Archive className="w-10 h-10 mx-auto text-zinc-600" />
          <div>
            <h3 className="text-sm font-semibold text-zinc-200">No Historical Captures Found</h3>
            <p className="text-xs text-zinc-500 mt-1 max-w-md mx-auto">
              {searchQuery || canIdFilter || datePreset !== 'all'
                ? 'No saved captures matched your search or date filter. Try clearing filters.'
                : 'Your browser has not stored any sniffer sessions yet. You can snapshot the live sniffer buffer anytime or populate sample captures to test 6-month historical search.'}
            </p>
          </div>

          <div className="flex items-center justify-center space-x-3 pt-2">
            {searchQuery || canIdFilter || datePreset !== 'all' ? (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setCanIdFilter('');
                  setDatePreset('all');
                  setChannelFilter('all');
                  setProtocolFilter('all');
                }}
                className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded text-xs transition cursor-pointer"
              >
                Clear All Filters
              </button>
            ) : (
              <>
                <button
                  onClick={handleSeedSamples}
                  className="px-3.5 py-1.5 bg-cyan-950/80 hover:bg-cyan-900 text-cyan-300 border border-cyan-700/60 rounded text-xs font-medium flex items-center space-x-1.5 transition cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Seed 6-Month Demo Captures</span>
                </button>
                {currentBufferFrames.length > 0 && (
                  <button
                    onClick={() => {
                      setSaveName(`Sniffer Snapshot (${currentBufferFrames.length} frames)`);
                      setShowSaveModal(true);
                    }}
                    className="px-3.5 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-zinc-950 rounded text-xs font-semibold flex items-center space-x-1.5 transition cursor-pointer"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>Save Current Live Buffer</span>
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs text-zinc-400 px-1">
            <span>
              Showing <strong className="text-zinc-200">{sessions.length}</strong> historical capture
              {sessions.length === 1 ? '' : 's'} in IndexedDB
            </span>
            <button
              onClick={handleClearAll}
              className="text-rose-400 hover:text-rose-300 text-xs flex items-center space-x-1 cursor-pointer transition"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear All History</span>
            </button>
          </div>

          {/* Session Cards */}
          {sessions.map((session) => {
            const isInspecting = inspectingSessionId === session.id;
            const captureDate = new Date(session.timestamp);
            const daysAgo = Math.floor((Date.now() - session.timestamp) / (24 * 60 * 60 * 1000));
            const daysToExpiry = Math.max(
              0,
              Math.ceil((session.expiresAt - Date.now()) / (24 * 60 * 60 * 1000))
            );

            return (
              <div
                key={session.id}
                className={`bg-zinc-900 border rounded-xl transition shadow-sm overflow-hidden ${
                  isInspecting ? 'border-cyan-500/80 ring-1 ring-cyan-500/30' : 'border-zinc-800/90 hover:border-zinc-700'
                }`}
              >
                {/* Session Card Header */}
                <div
                  onClick={() => handleInspectSession(session)}
                  className="p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-3 cursor-pointer select-none"
                >
                  <div className="flex items-start space-x-3 min-w-0">
                    <div
                      className={`p-2.5 rounded-lg shrink-0 mt-0.5 ${
                        session.protocol === 'fd'
                          ? 'bg-purple-950/60 text-purple-400 border border-purple-800/40'
                          : 'bg-cyan-950/60 text-cyan-400 border border-cyan-800/40'
                      }`}
                    >
                      <Layers className="w-4 h-4" />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center flex-wrap gap-2">
                        <span className="font-semibold text-sm text-zinc-100 truncate">
                          {session.name}
                        </span>

                        {session.isAutoSaved && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-zinc-800 text-zinc-400 border border-zinc-700">
                            Auto-Saved
                          </span>
                        )}

                        <span
                          className={`px-1.5 py-0.5 rounded text-[10px] font-mono uppercase ${
                            session.protocol === 'fd'
                              ? 'bg-purple-950 text-purple-300 border border-purple-800'
                              : session.protocol === 'mixed'
                              ? 'bg-amber-950 text-amber-300 border border-amber-800'
                              : 'bg-zinc-800 text-zinc-300 border border-zinc-700'
                          }`}
                        >
                          {session.protocol === 'fd' ? 'CAN-FD' : session.protocol === 'mixed' ? 'CAN/FD' : 'Classic CAN'}
                        </span>
                      </div>

                      {/* Metadata Details Row */}
                      <div className="flex items-center flex-wrap gap-x-4 gap-y-1 text-xs text-zinc-400 mt-1 font-mono">
                        <span className="flex items-center space-x-1 text-zinc-300">
                          <Clock className="w-3.5 h-3.5 text-zinc-500" />
                          <span>
                            {captureDate.toLocaleDateString()} {captureDate.toLocaleTimeString()}
                          </span>
                          <span className="text-zinc-500 text-[11px]">
                            ({daysAgo === 0 ? 'Today' : `${daysAgo}d ago`})
                          </span>
                        </span>

                        <span>
                          Channel:{' '}
                          <strong className="text-zinc-200">{session.channel}</strong> @{' '}
                          {(session.bitrate / 1000).toFixed(0)}k
                        </span>

                        <span>
                          Frames:{' '}
                          <strong className="text-cyan-400">
                            {session.frameCount.toLocaleString()}
                          </strong>
                          {session.durationSeconds > 0 && ` (${session.durationSeconds}s)`}
                        </span>

                        <span className="text-zinc-500">
                          Size: {(session.sizeBytes / 1024).toFixed(1)} KB
                        </span>

                        <span
                          className={`text-[11px] ${
                            daysToExpiry < 30 ? 'text-amber-400' : 'text-emerald-400/90'
                          }`}
                          title={`Scheduled for automatic IndexedDB purge in ${daysToExpiry} days`}
                        >
                          Expires in {daysToExpiry}d
                        </span>
                      </div>

                      {/* Notes snippet if present */}
                      {session.notes && (
                        <p className="text-xs text-zinc-400 mt-1 italic font-sans truncate max-w-xl">
                          &ldquo;{session.notes}&rdquo;
                        </p>
                      )}

                      {/* Unique CAN IDs Chips */}
                      <div className="flex items-center flex-wrap gap-1 mt-2">
                        <span className="text-[11px] text-zinc-500 mr-1">IDs ({session.uniqueCanIds.length}):</span>
                        {session.uniqueCanIdsHex.slice(0, 8).map((hexId) => (
                          <span
                            key={hexId}
                            onClick={(e) => {
                              e.stopPropagation();
                              setCanIdFilter(hexId);
                            }}
                            className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-zinc-950 text-cyan-300/90 border border-zinc-800 hover:border-cyan-700 transition cursor-pointer"
                            title="Click to filter sessions by this CAN ID"
                          >
                            {hexId}
                          </span>
                        ))}
                        {session.uniqueCanIdsHex.length > 8 && (
                          <span className="text-[10px] font-mono text-zinc-500">
                            +{session.uniqueCanIdsHex.length - 8} more
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Actions Column */}
                  <div
                    onClick={(e) => e.stopPropagation()}
                    className="flex items-center flex-wrap gap-2 shrink-0 pt-2 lg:pt-0"
                  >
                    <button
                      onClick={() => handleInspectSession(session)}
                      className={`px-3 py-1.5 rounded text-xs font-medium transition cursor-pointer flex items-center space-x-1.5 ${
                        isInspecting
                          ? 'bg-cyan-950 text-cyan-300 border border-cyan-700'
                          : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200'
                      }`}
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>{isInspecting ? 'Close Inspection' : 'Inspect Frames'}</span>
                    </button>

                    <button
                      onClick={(e) => handleLoadIntoLiveMonitor(session, e)}
                      className="px-3 py-1.5 rounded text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-zinc-950 transition cursor-pointer flex items-center space-x-1"
                      title="Load these frames into the active CANScope monitor"
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                      <span>Load to Monitor</span>
                    </button>

                    <button
                      onClick={(e) => handleExportCsv(session, e)}
                      className="p-1.5 rounded text-zinc-400 hover:text-emerald-400 hover:bg-zinc-800 border border-zinc-800 transition cursor-pointer"
                      title="Export this capture as CSV"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </button>

                    <button
                      onClick={(e) => handleExportAsc(session, e)}
                      className="px-2 py-1 rounded text-[11px] font-mono text-zinc-400 hover:text-amber-300 hover:bg-zinc-800 border border-zinc-800 transition cursor-pointer"
                      title="Export this capture in Vector Informatik .asc format"
                    >
                      .ASC
                    </button>

                    <button
                      onClick={(e) => handleExportCandump(session, e)}
                      className="px-2 py-1 rounded text-[11px] font-mono text-zinc-400 hover:text-cyan-300 hover:bg-zinc-800 border border-zinc-800 transition cursor-pointer"
                      title="Export this capture in SocketCAN candump log format"
                    >
                      .LOG
                    </button>

                    <button
                      onClick={(e) => handleDeleteSession(session.id, e)}
                      className="p-1.5 rounded text-zinc-500 hover:text-rose-400 hover:bg-zinc-800 border border-zinc-800 transition cursor-pointer"
                      title="Delete this capture from IndexedDB"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Inline Frame Inspector when card is open */}
                {isInspecting && (
                  <div className="border-t border-zinc-800 bg-zinc-950/80 p-4 space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-zinc-800/80">
                      <div className="flex items-center space-x-2">
                        <Layers className="w-4 h-4 text-cyan-400" />
                        <span className="font-semibold text-xs text-zinc-200">
                          Captured Frames ({inspectingFrames ? inspectingFrames.length : 0})
                        </span>
                      </div>

                      <div className="flex items-center space-x-2">
                        <div className="relative">
                          <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-500" />
                          <input
                            type="text"
                            value={frameSearchQuery}
                            onChange={(e) => setFrameSearchQuery(e.target.value)}
                            placeholder="Filter frames by ID or byte..."
                            className="pl-7 pr-2.5 py-1 bg-zinc-900 border border-zinc-800 rounded text-xs text-zinc-300 font-mono placeholder-zinc-600 focus:outline-none focus:border-cyan-500"
                          />
                        </div>

                        <button
                          onClick={() => handleExportCsv(session)}
                          className="px-2.5 py-1 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded text-xs text-zinc-300 transition cursor-pointer flex items-center space-x-1"
                        >
                          <Download className="w-3 h-3" />
                          <span>CSV</span>
                        </button>

                        <button
                          onClick={() => handleExportJson(session)}
                          className="px-2.5 py-1 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded text-xs text-zinc-300 transition cursor-pointer flex items-center space-x-1"
                        >
                          <FileText className="w-3 h-3" />
                          <span>JSON</span>
                        </button>

                        <button
                          onClick={() => handleExportAsc(session)}
                          className="px-2.5 py-1 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded text-xs text-amber-300 font-mono transition cursor-pointer flex items-center space-x-1"
                          title="Export as Vector .asc"
                        >
                          <Download className="w-3 h-3" />
                          <span>ASC</span>
                        </button>

                        <button
                          onClick={() => handleExportCandump(session)}
                          className="px-2.5 py-1 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded text-xs text-cyan-300 font-mono transition cursor-pointer flex items-center space-x-1"
                          title="Export as SocketCAN candump log"
                        >
                          <Download className="w-3 h-3" />
                          <span>LOG</span>
                        </button>
                      </div>
                    </div>

                    {/* Frame Table */}
                    {framesLoading ? (
                      <div className="py-8 text-center text-zinc-500 text-xs">
                        <RefreshCw className="w-5 h-5 mx-auto animate-spin text-cyan-400 mb-1" />
                        Loading frame payload from IndexedDB...
                      </div>
                    ) : filteredInspectFrames.length === 0 ? (
                      <div className="py-6 text-center text-zinc-500 text-xs font-mono">
                        No frames match the search filter within this capture.
                      </div>
                    ) : (
                      <div className="max-h-72 overflow-y-auto border border-zinc-800/80 rounded bg-zinc-950 font-mono text-xs">
                        <table className="w-full text-left border-collapse">
                          <thead className="bg-zinc-900 text-zinc-400 text-[11px] sticky top-0 border-b border-zinc-800">
                            <tr>
                              <th className="py-1.5 px-3">#</th>
                              <th className="py-1.5 px-3">Time</th>
                              <th className="py-1.5 px-3">Dir</th>
                              <th className="py-1.5 px-3">CAN ID</th>
                              <th className="py-1.5 px-3">Type</th>
                              <th className="py-1.5 px-3">DLC</th>
                              <th className="py-1.5 px-3">Data Bytes (Hex)</th>
                              <th className="py-1.5 px-3">ASCII</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-zinc-900 text-zinc-300 text-[11px]">
                            {filteredInspectFrames.slice(0, 300).map((f, idx) => (
                              <tr key={idx} className="hover:bg-zinc-900/60 transition">
                                <td className="py-1 px-3 text-zinc-500">{idx + 1}</td>
                                <td className="py-1 px-3 text-zinc-400">
                                  {f.timestamp ? f.timestamp.toFixed(6) : '—'}
                                </td>
                                <td className="py-1 px-3">
                                  <span
                                    className={`px-1 rounded text-[9px] font-bold ${
                                      f.direction === 'TX'
                                        ? 'bg-amber-950 text-amber-400 border border-amber-800/50'
                                        : 'bg-cyan-950 text-cyan-400 border border-cyan-800/50'
                                    }`}
                                  >
                                    {f.direction}
                                  </span>
                                </td>
                                <td className="py-1 px-3 font-bold text-cyan-300">{f.idHex}</td>
                                <td className="py-1 px-3 text-zinc-400">
                                  {f.fd ? 'CAN-FD' : f.extended ? 'EXT' : 'STD'}
                                </td>
                                <td className="py-1 px-3 text-zinc-400">{f.dlc}</td>
                                <td className="py-1 px-3 font-mono text-zinc-200">
                                  {f.data.map((b) => b.toString(16).toUpperCase().padStart(2, '0')).join(' ')}
                                </td>
                                <td className="py-1 px-3 text-zinc-500 font-mono">
                                  {formatAscii(f.data)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                        {filteredInspectFrames.length > 300 && (
                          <div className="py-2 text-center text-zinc-500 text-[11px] bg-zinc-900/40 border-t border-zinc-800">
                            Showing first 300 of {filteredInspectFrames.length} frames. Export CSV for the complete trace.
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
      </div>
      )}

      {/* Save Modal */}
      {showSaveModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-sm text-zinc-100 flex items-center space-x-2">
                <Archive className="w-4 h-4 text-cyan-400" />
                <span>Save Sniffer Cache to IndexedDB</span>
              </h3>
              <button
                onClick={() => setShowSaveModal(false)}
                className="text-zinc-500 hover:text-zinc-300"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-zinc-400">
              Stores currently active live sniffer frames ({currentBufferFrames.length} frames) into the browser&apos;s IndexedDB with automatic 6-month retention.
            </p>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-zinc-300 font-medium mb-1">Capture Name / Label</label>
                <input
                  type="text"
                  value={saveName}
                  onChange={(e) => setSaveName(e.target.value)}
                  placeholder="e.g. Engine Calibration Run #4"
                  className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded text-zinc-200 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-zinc-300 font-medium mb-1">Notes / Diagnostic Context (Optional)</label>
                <textarea
                  rows={3}
                  value={saveNotes}
                  onChange={(e) => setSaveNotes(e.target.value)}
                  placeholder="Add notes, vehicle model, bench setup, or specific IDs monitored..."
                  className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded text-zinc-200 focus:outline-none focus:border-cyan-500 resize-none"
                />
              </div>

              <div className="p-3 bg-zinc-950/60 border border-zinc-800 rounded text-[11px] text-zinc-400 space-y-1">
                <div className="flex justify-between">
                  <span>Frames to persist:</span>
                  <strong className="text-cyan-400">{currentBufferFrames.length.toLocaleString()}</strong>
                </div>
                <div className="flex justify-between">
                  <span>Storage Lifetime:</span>
                  <strong className="text-zinc-200">6 Months (180 days)</strong>
                </div>
                <div className="flex justify-between">
                  <span>Estimated Footprint:</span>
                  <strong className="text-zinc-300">
                    {((currentBufferFrames.length * 64) / 1024).toFixed(1)} KB
                  </strong>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end space-x-3 pt-2">
              <button
                onClick={() => setShowSaveModal(false)}
                className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded text-xs transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmSaveCurrent}
                disabled={isSaving}
                className="px-4 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-zinc-950 font-semibold rounded text-xs transition cursor-pointer flex items-center space-x-1.5"
              >
                {isSaving && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                <span>Save Capture</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Settings Modal */}
      {showSettingsModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-sm text-zinc-100 flex items-center space-x-2">
                <SlidersHorizontal className="w-4 h-4 text-cyan-400" />
                <span>IndexedDB Storage & Retention Settings</span>
              </h3>
              <button
                onClick={() => setShowSettingsModal(false)}
                className="text-zinc-500 hover:text-zinc-300"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <label className="block text-zinc-300 font-medium mb-1">
                  Retention Policy (Auto-Purge Window)
                </label>
                <select
                  value={tempRetention}
                  onChange={(e) => setTempRetention(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded text-zinc-200 focus:outline-none focus:border-cyan-500"
                >
                  <option value={1}>1 Month (30 Days)</option>
                  <option value={3}>3 Months (90 Days)</option>
                  <option value={6}>6 Months (180 Days) - Recommended</option>
                  <option value={12}>12 Months (1 Year)</option>
                </select>
                <p className="text-[11px] text-zinc-500 mt-1">
                  Captures older than this duration will be automatically pruned to manage browser disk space.
                </p>
              </div>

              <div className="pt-2 border-t border-zinc-800 space-y-2">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={tempAutoSaveOnClear}
                    onChange={(e) => setTempAutoSaveOnClear(e.target.checked)}
                    className="rounded border-zinc-700 bg-zinc-950 text-cyan-500 focus:ring-0 cursor-pointer"
                  />
                  <span className="text-zinc-200">
                    Auto-snapshot sniffer buffer before clearing
                  </span>
                </label>
                <p className="text-[11px] text-zinc-500 pl-5">
                  Automatically safeguards your frames into IndexedDB whenever you click &quot;Clear&quot; on the Monitor.
                </p>
              </div>

              <div className="p-3 bg-zinc-950/60 border border-zinc-800 rounded text-[11px] text-zinc-400">
                <div className="font-semibold text-zinc-300 mb-1">Capacity Assumption (100 sniffer/day):</div>
                <div>100 sniffer captures/day x 180 days = ~18,000 captures.</div>
                <div>IndexedDB natively manages this volume with sub-10ms key querying.</div>
              </div>
            </div>

            <div className="flex items-center justify-end space-x-3 pt-2">
              <button
                onClick={() => setShowSettingsModal(false)}
                className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded text-xs transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  await indexedDbService.saveSettings({
                    retentionMonths: tempRetention,
                    autoSaveOnClear: tempAutoSaveOnClear,
                  });
                  setSettings({
                    ...DEFAULT_INDEXEDDB_SETTINGS,
                    retentionMonths: tempRetention,
                    autoSaveOnClear: tempAutoSaveOnClear,
                  });
                  showStatus('Settings saved successfully.', 'success');
                  setShowSettingsModal(false);
                }}
                className="px-4 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-zinc-950 font-semibold rounded text-xs transition cursor-pointer"
              >
                Save Preferences
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
