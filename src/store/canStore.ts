import { useState, useEffect, useRef, useCallback } from 'react';
import {
  BusStatus,
  CanFrame,
  DbcDatabase,
  FilterConfig,
  RecordingSession,
  SystemInfo,
  IndexedDbSettings,
  SnifferSessionMeta,
} from '../types/can';
import { parseDbc, decodeFrameWithDbc, SAMPLE_VEHICLE_DBC } from '../utils/dbc';
import { canWsClient } from '../services/websocket';
import * as api from '../services/api';
import {
  indexedDbService,
  DEFAULT_INDEXEDDB_SETTINGS,
  DEFAULT_RETENTION_MONTHS,
} from '../services/indexedDb';

export interface ToastMessage {
  id: string;
  title: string;
  message?: string;
  type: 'info' | 'success' | 'warning' | 'error';
  timestamp: number;
}

export interface AggregatedIdStats {
  id: number;
  idHex: string;
  extended: boolean;
  fd: boolean;
  count: number;
  lastTimestamp: number;
  periodMs: number;
  freqHz: number;
  lastData: number[];
  lastDlc: number;
  changedBytes: boolean[];
  decoded?: Record<string, string | number>;
}

export function useCanStore() {
  const [status, setStatus] = useState<BusStatus>({
    connectionState: 'disconnected',
    backend: 'mock',
    interfaceName: 'Mock CAN Bus Simulator',
    channel: 'mock0',
    bitrate: 500000,
    dataBitrate: 2000000,
    fdEnabled: false,
    listenOnly: false,
    busLoad: 0,
    fps: 0,
    totalFrames: 0,
    rxFrames: 0,
    txFrames: 0,
    errorFrames: 0,
    tec: 0,
    rec: 0,
    busState: 'active',
    controllerState: 'STOPPED',
    uptimeSeconds: 0,
  });

  const [systemInfo, setSystemInfo] = useState<SystemInfo | null>(null);
  const [frames, setFrames] = useState<CanFrame[]>([]);
  const [aggregatedStats, setAggregatedStats] = useState<Map<number, AggregatedIdStats>>(new Map());
  const [isPaused, setIsPaused] = useState(false);
  const [maxDisplayLimit, setMaxDisplayLimit] = useState<number>(5000);
  const [selectedFrame, setSelectedFrame] = useState<CanFrame | null>(null);
  const [activeDbc, setActiveDbc] = useState<DbcDatabase | null>(() =>
    parseDbc(SAMPLE_VEHICLE_DBC, 'Powertrain_EV_ADAS.dbc')
  );

  const [filter, setFilter] = useState<FilterConfig>({
    direction: 'all',
    frameType: 'all',
    protocol: 'all',
    searchQuery: '',
  });

  const [recording, setRecording] = useState<RecordingSession>({
    isRecording: false,
    isPaused: false,
    startTime: null,
    durationSeconds: 0,
    frameCount: 0,
    estimatedSizeBytes: 0,
  });

  const [indexedDbSettings, setIndexedDbSettings] = useState<IndexedDbSettings>(DEFAULT_INDEXEDDB_SETTINGS);

  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // Internal buffers for high-rate throttling
  const frameBufferRef = useRef<CanFrame[]>([]);
  const aggStatsRef = useRef<Map<number, AggregatedIdStats>>(new Map());
  const isPausedRef = useRef(isPaused);
  isPausedRef.current = isPaused;
  const activeDbcRef = useRef(activeDbc);
  activeDbcRef.current = activeDbc;
  const maxLimitRef = useRef(maxDisplayLimit);
  maxLimitRef.current = maxDisplayLimit;

  // Add toast helper
  const addToast = useCallback(
    (title: string, message?: string, type: 'info' | 'success' | 'warning' | 'error' = 'info') => {
      const newToast: ToastMessage = {
        id: `toast-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        title,
        message,
        type,
        timestamp: Date.now(),
      };
      setToasts((prev) => [...prev.slice(-4), newToast]);
    },
    []
  );

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Frame ingestion handler
  const handleIncomingFrame = useCallback((rawFrame: CanFrame) => {
    if (isPausedRef.current) return;

    // Decode DBC if matching
    const decoded = decodeFrameWithDbc(rawFrame.id, rawFrame.data, activeDbcRef.current);

    // Compute aggregated per-ID statistics & changed bytes
    const currentAgg = aggStatsRef.current.get(rawFrame.id);
    let changedBytes = rawFrame.data.map(() => false);
    let periodMs = 0;
    let freqHz = 0;

    if (currentAgg) {
      periodMs = Math.round((rawFrame.timestamp - currentAgg.lastTimestamp) * 1000 * 10) / 10;
      freqHz = periodMs > 0 ? Math.round((1000 / periodMs) * 10) / 10 : 0;
      changedBytes = rawFrame.data.map((b, i) =>
        currentAgg.lastData[i] !== undefined ? currentAgg.lastData[i] !== b : false
      );
    }

    const updatedAgg: AggregatedIdStats = {
      id: rawFrame.id,
      idHex: rawFrame.idHex,
      extended: rawFrame.extended,
      fd: rawFrame.fd,
      count: (currentAgg ? currentAgg.count : 0) + 1,
      lastTimestamp: rawFrame.timestamp,
      periodMs,
      freqHz,
      lastData: rawFrame.data,
      lastDlc: rawFrame.dlc,
      changedBytes,
      decoded,
    };

    aggStatsRef.current.set(rawFrame.id, updatedAgg);

    const enrichedFrame: CanFrame = {
      ...rawFrame,
      count: updatedAgg.count,
      periodMs,
      freqHz,
      changedBytes,
      decoded,
    };

    frameBufferRef.current.push(enrichedFrame);
  }, []);

  // Flush buffer to React state on periodic animation timer (30ms interval = ~33 fps render refresh)
  useEffect(() => {
    const flushInterval = setInterval(() => {
      if (frameBufferRef.current.length > 0) {
        const batch = frameBufferRef.current;
        frameBufferRef.current = [];

        setFrames((prev) => {
          const combined = [...prev, ...batch];
          const limit = maxLimitRef.current;
          return combined.length > limit ? combined.slice(combined.length - limit) : combined;
        });

        setAggregatedStats(new Map(aggStatsRef.current));
      }
    }, 40);

    return () => clearInterval(flushInterval);
  }, []);

  // Connect WebSocket on mount & poll status
  useEffect(() => {
    canWsClient.connect();

    const unsubFrame = canWsClient.onFrame(handleIncomingFrame);
    const unsubStatus = canWsClient.onStatus((newStatus) => {
      setStatus(newStatus);
    });

    // Initial system and status fetch
    api
      .fetchSystemInfo()
      .then(setSystemInfo)
      .catch(() => {});

    api
      .fetchBusStatus()
      .then(setStatus)
      .catch(() => {});

    // Polling fallback every 1500ms
    const pollInterval = setInterval(() => {
      api
        .fetchBusStatus()
        .then(setStatus)
        .catch(() => {});
    }, 1500);

    // Initialize IndexedDB settings & 6-month retention maintenance
    indexedDbService.loadSettings().then(setIndexedDbSettings).catch(() => {});
    indexedDbService.pruneExpiredSessions(DEFAULT_RETENTION_MONTHS).catch(() => {});
    indexedDbService.seedSampleHistoryIfEmpty().catch(() => {});

    return () => {
      unsubFrame();
      unsubStatus();
      clearInterval(pollInterval);
      canWsClient.disconnect();
    };
  }, [handleIncomingFrame]);

  // Save current sniffer buffer to browser's IndexedDB
  const saveSnifferToIndexedDb = useCallback(
    async (
      customName?: string,
      notes?: string,
      customFrames?: CanFrame[]
    ): Promise<SnifferSessionMeta | null> => {
      const targetFrames = customFrames || frames;
      if (targetFrames.length === 0) {
        addToast('Nothing to Save', 'No frames in the current sniffer cache.', 'warning');
        return null;
      }
      try {
        const meta = await indexedDbService.saveSnifferSession(
          {
            name: customName,
            channel: status.channel || 'mock0',
            bitrate: status.bitrate || 500000,
            notes,
            retentionMonths: indexedDbSettings.retentionMonths || DEFAULT_RETENTION_MONTHS,
          },
          targetFrames
        );
        addToast(
          'Saved to IndexedDB Cache',
          `Saved ${meta.frameCount.toLocaleString()} frames (${meta.uniqueCanIds.length} unique IDs). Stored for 6 months.`,
          'success'
        );
        return meta;
      } catch (err: any) {
        addToast('IndexedDB Save Failed', err.message || 'Error writing to storage', 'error');
        return null;
      }
    },
    [frames, status.channel, status.bitrate, indexedDbSettings.retentionMonths, addToast]
  );

  // Load a historical session's frames into the active monitor for live analysis/graphs
  const loadHistoricalFrames = useCallback(
    (historicalFrames: CanFrame[], sessionName: string) => {
      frameBufferRef.current = [];
      aggStatsRef.current.clear();

      // Reconstruct aggregated stats from historical frames
      const newAggMap = new Map<number, AggregatedIdStats>();
      historicalFrames.forEach((rawFrame) => {
        const decoded = decodeFrameWithDbc(rawFrame.id, rawFrame.data, activeDbcRef.current);
        const currentAgg = newAggMap.get(rawFrame.id);
        let periodMs = 0;
        let freqHz = 0;
        let changedBytes = rawFrame.data.map(() => false);
        if (currentAgg) {
          periodMs = Math.round((rawFrame.timestamp - currentAgg.lastTimestamp) * 1000 * 10) / 10;
          freqHz = periodMs > 0 ? Math.round((1000 / periodMs) * 10) / 10 : 0;
          changedBytes = rawFrame.data.map((b, i) =>
            currentAgg.lastData[i] !== undefined ? currentAgg.lastData[i] !== b : false
          );
        }
        newAggMap.set(rawFrame.id, {
          id: rawFrame.id,
          idHex: rawFrame.idHex,
          extended: rawFrame.extended,
          fd: rawFrame.fd,
          count: (currentAgg ? currentAgg.count : 0) + 1,
          lastTimestamp: rawFrame.timestamp,
          periodMs,
          freqHz,
          lastData: rawFrame.data,
          lastDlc: rawFrame.dlc,
          changedBytes,
          decoded,
        });
      });

      aggStatsRef.current = newAggMap;
      setAggregatedStats(newAggMap);
      setFrames(historicalFrames);
      setIsPaused(true); // Pause sniffer so historical capture is cleanly viewable
      addToast(
        'Historical Session Loaded',
        `Loaded ${historicalFrames.length.toLocaleString()} frames from "${sessionName}". Sniffer paused.`,
        'info'
      );
    },
    [addToast]
  );

  const updateIndexedDbSettings = useCallback(
    async (newSettings: Partial<IndexedDbSettings>) => {
      setIndexedDbSettings((prev) => {
        const updated = { ...prev, ...newSettings };
        indexedDbService.saveSettings(updated).catch(() => {});
        return updated;
      });
      addToast('Storage Settings Updated', 'IndexedDB retention and preferences saved.', 'info');
    },
    [addToast]
  );

  // Actions
  const clearFrames = useCallback(() => {
    // If auto-save on clear is enabled, save snapshot if there are frames
    if (indexedDbSettings.autoSaveOnClear && frames.length >= 10) {
      indexedDbService
        .saveSnifferSession(
          {
            name: `Auto-saved Cache (${frames.length} frames before clear)`,
            channel: status.channel || 'can0',
            bitrate: status.bitrate || 500000,
            isAutoSaved: true,
            retentionMonths: indexedDbSettings.retentionMonths || DEFAULT_RETENTION_MONTHS,
          },
          frames
        )
        .then(() => {
          addToast(
            'Auto-saved to IndexedDB',
            `Cached ${frames.length} frames to 6-month history before clear.`,
            'info'
          );
        })
        .catch(() => {});
    }

    frameBufferRef.current = [];
    aggStatsRef.current.clear();
    setFrames([]);
    setAggregatedStats(new Map());
    addToast('Monitor Cleared', 'Message buffer has been cleared.', 'info');
  }, [frames, indexedDbSettings.autoSaveOnClear, indexedDbSettings.retentionMonths, status.channel, status.bitrate, addToast]);

  const togglePause = useCallback(() => {
    setIsPaused((p) => {
      const next = !p;
      addToast(next ? 'Sniffer Paused' : 'Sniffer Resumed', undefined, 'info');
      return next;
    });
  }, [addToast]);

  const handleConnect = useCallback(
    async (cfg: any) => {
      try {
        const res = await api.connectInterface(cfg);
        setStatus(res.status);
        addToast(
          'Connected Successfully',
          `Interface ${res.status.interfaceName} on ${res.status.channel}`,
          'success'
        );
        // Refresh system info
        api.fetchSystemInfo().then(setSystemInfo);
        return true;
      } catch (err: any) {
        addToast('Connection Failed', err.message || 'Could not connect', 'error');
        return false;
      }
    },
    [addToast]
  );

  const handleDisconnect = useCallback(async () => {
    try {
      const res = await api.disconnectInterface();
      setStatus(res.status);
      addToast('Disconnected', 'CAN interface disconnected', 'info');
    } catch (err: any) {
      addToast('Disconnect Failed', err.message, 'error');
    }
  }, [addToast]);

  const handleToggleRecording = useCallback(async () => {
    if (!recording.isRecording) {
      try {
        await api.startRecording();
        setRecording({
          isRecording: true,
          isPaused: false,
          startTime: Date.now(),
          durationSeconds: 0,
          frameCount: 0,
          estimatedSizeBytes: 0,
        });
        addToast('Recording Started', 'Capturing frames to buffer', 'success');
      } catch (err: any) {
        addToast('Recording Error', err.message, 'error');
      }
    } else {
      try {
        const res = await api.stopRecording();
        setRecording({
          isRecording: false,
          isPaused: false,
          startTime: null,
          durationSeconds: res.durationSeconds,
          frameCount: res.frameCount,
          estimatedSizeBytes: res.estimatedSizeBytes,
        });
        addToast(
          'Recording Stopped',
          `Captured ${res.frameCount.toLocaleString()} frames in ${res.durationSeconds}s`,
          'info'
        );
      } catch (err: any) {
        addToast('Stop Error', err.message, 'error');
      }
    }
  }, [recording.isRecording, addToast]);

  const handleLoadDbc = useCallback(
    async (content: string, filename: string) => {
      try {
        const parsed = parseDbc(content, filename);
        setActiveDbc(parsed);
        await api.uploadDbcFile(content, filename);
        addToast(
          'DBC Database Loaded',
          `${filename} (${parsed.messages.length} messages, ${parsed.messages.reduce(
            (acc, m) => acc + m.signals.length,
            0
          )} signals)`,
          'success'
        );
        return true;
      } catch (err: any) {
        addToast('DBC Load Error', err.message, 'error');
        return false;
      }
    },
    [addToast]
  );

  const streamReplayFrame = useCallback((frame: CanFrame) => {
    frameBufferRef.current.push(frame);
  }, []);

  return {
    status,
    systemInfo,
    frames,
    aggregatedStats,
    isPaused,
    maxDisplayLimit,
    selectedFrame,
    activeDbc,
    filter,
    recording,
    indexedDbSettings,
    toasts,
    setMaxDisplayLimit,
    setSelectedFrame,
    setFilter,
    clearFrames,
    togglePause,
    saveSnifferToIndexedDb,
    loadHistoricalFrames,
    streamReplayFrame,
    updateIndexedDbSettings,
    handleConnect,
    handleDisconnect,
    handleToggleRecording,
    handleLoadDbc,
    addToast,
    removeToast,
  };
}
