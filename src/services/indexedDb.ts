import {
  CanFrame,
  SnifferSessionMeta,
  SnifferSessionWithFrames,
  SnifferHistoryFilter,
  IndexedDbStorageStats,
  IndexedDbSettings,
} from '../types/can';

const DB_NAME = 'CANScopeSnifferDB';
const DB_VERSION = 1;
const SESSIONS_STORE = 'sniffer_sessions';
const FRAMES_STORE = 'sniffer_frames';
const SETTINGS_STORE = 'app_settings';

export const DEFAULT_RETENTION_MONTHS = 6;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

export const DEFAULT_INDEXEDDB_SETTINGS: IndexedDbSettings = {
  autoSaveEnabled: false,
  retentionMonths: DEFAULT_RETENTION_MONTHS,
  autoSaveIntervalFrames: 1000,
  autoSaveOnPause: false,
  autoSaveOnClear: true,
};

class IndexedDbService {
  private dbPromise: Promise<IDBDatabase> | null = null;

  private getDB(): Promise<IDBDatabase> {
    if (!this.dbPromise) {
      this.dbPromise = new Promise((resolve, reject) => {
        if (typeof window === 'undefined' || !window.indexedDB) {
          reject(new Error('IndexedDB is not supported in this browser environment.'));
          return;
        }

        const request = window.indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = (event) => {
          const db = (event.target as IDBOpenDBRequest).result;

          // Sessions metadata store
          if (!db.objectStoreNames.contains(SESSIONS_STORE)) {
            const sessionsStore = db.createObjectStore(SESSIONS_STORE, { keyPath: 'id' });
            sessionsStore.createIndex('timestamp', 'timestamp', { unique: false });
            sessionsStore.createIndex('dateStr', 'dateStr', { unique: false });
            sessionsStore.createIndex('channel', 'channel', { unique: false });
            sessionsStore.createIndex('expiresAt', 'expiresAt', { unique: false });
          }

          // Full frames payload store (keyed by sessionId)
          if (!db.objectStoreNames.contains(FRAMES_STORE)) {
            db.createObjectStore(FRAMES_STORE, { keyPath: 'sessionId' });
          }

          // App Settings store
          if (!db.objectStoreNames.contains(SETTINGS_STORE)) {
            db.createObjectStore(SETTINGS_STORE, { keyPath: 'key' });
          }
        };

        request.onsuccess = () => {
          resolve(request.result);
        };

        request.onerror = () => {
          reject(request.error || new Error('Failed to open IndexedDB'));
        };
      });
    }
    return this.dbPromise;
  }

  /**
   * Calculate expiration timestamp (e.g. 6 months = 180 days from now)
   */
  public calculateExpiresAt(timestampMs: number, retentionMonths: number = DEFAULT_RETENTION_MONTHS): number {
    const days = retentionMonths * 30;
    return timestampMs + days * MS_PER_DAY;
  }

  /**
   * Save a sniffer buffer snapshot to IndexedDB
   */
  public async saveSnifferSession(
    data: {
      name?: string;
      channel: string;
      bitrate: number;
      protocol?: 'classic' | 'fd' | 'mixed';
      notes?: string;
      tags?: string[];
      isAutoSaved?: boolean;
      retentionMonths?: number;
      timestamp?: number;
    },
    frames: CanFrame[]
  ): Promise<SnifferSessionMeta> {
    const db = await this.getDB();
    const now = data.timestamp || Date.now();
    const dateObj = new Date(now);
    const dateStr = dateObj.toISOString().split('T')[0];

    // Compute unique CAN IDs
    const idSet = new Set<number>();
    let hasClassic = false;
    let hasFd = false;
    let durationSec = 0;

    if (frames.length > 0) {
      const minTime = frames[0].timestamp;
      const maxTime = frames[frames.length - 1].timestamp;
      durationSec = Math.max(0, Math.round((maxTime - minTime) * 10) / 10);
    }

    frames.forEach((f) => {
      idSet.add(f.id);
      if (f.fd) hasFd = true;
      else hasClassic = true;
    });

    const uniqueCanIds = Array.from(idSet).sort((a, b) => a - b);
    const uniqueCanIdsHex = uniqueCanIds.map((id) => '0x' + id.toString(16).toUpperCase());

    const protocol =
      data.protocol || (hasClassic && hasFd ? 'mixed' : hasFd ? 'fd' : 'classic');

    const sessionId = `sniff_${now}_${Math.random().toString(36).substr(2, 6)}`;
    const sessionName =
      data.name?.trim() ||
      `Sniffer Capture ${dateStr} ${dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`;

    // Approximate size in bytes: ~60 bytes per frame + metadata
    const estimatedSizeBytes = frames.length * 64 + 1024;
    const retentionMonths = data.retentionMonths || DEFAULT_RETENTION_MONTHS;
    const expiresAt = this.calculateExpiresAt(now, retentionMonths);

    const sessionMeta: SnifferSessionMeta = {
      id: sessionId,
      name: sessionName,
      timestamp: now,
      dateStr,
      channel: data.channel || 'can0',
      bitrate: data.bitrate || 500000,
      protocol,
      frameCount: frames.length,
      uniqueCanIds,
      uniqueCanIdsHex,
      durationSeconds: durationSec,
      sizeBytes: estimatedSizeBytes,
      notes: data.notes || '',
      tags: data.tags || [],
      expiresAt,
      isAutoSaved: !!data.isAutoSaved,
    };

    return new Promise((resolve, reject) => {
      const tx = db.transaction([SESSIONS_STORE, FRAMES_STORE], 'readwrite');

      tx.onerror = () => reject(tx.error);
      tx.oncomplete = () => resolve(sessionMeta);

      // Save metadata
      const sessionsStore = tx.objectStore(SESSIONS_STORE);
      sessionsStore.put(sessionMeta);

      // Save frames payload
      const framesStore = tx.objectStore(FRAMES_STORE);
      framesStore.put({
        sessionId,
        frames,
      });
    });
  }

  /**
   * Query sniffer session metadata with fast filters
   */
  public async getSnifferSessions(filter?: SnifferHistoryFilter): Promise<SnifferSessionMeta[]> {
    const db = await this.getDB();

    return new Promise((resolve, reject) => {
      const tx = db.transaction([SESSIONS_STORE], 'readonly');
      const store = tx.objectStore(SESSIONS_STORE);
      const request = store.getAll();

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        let list: SnifferSessionMeta[] = request.result || [];

        // Apply filters
        if (filter) {
          // Date Range Presets
          if (filter.dateRangePreset && filter.dateRangePreset !== 'all') {
            const now = Date.now();
            let minTime = 0;
            const todayStart = new Date();
            todayStart.setHours(0, 0, 0, 0);

            switch (filter.dateRangePreset) {
              case 'today':
                minTime = todayStart.getTime();
                break;
              case 'yesterday': {
                const yestStart = new Date(todayStart.getTime() - MS_PER_DAY);
                const yestEnd = todayStart.getTime() - 1;
                list = list.filter((s) => s.timestamp >= yestStart.getTime() && s.timestamp <= yestEnd);
                minTime = 0;
                break;
              }
              case '7d':
                minTime = now - 7 * MS_PER_DAY;
                break;
              case '30d':
                minTime = now - 30 * MS_PER_DAY;
                break;
              case '90d':
                minTime = now - 90 * MS_PER_DAY;
                break;
              case '180d': // 6 months retention window
                minTime = now - 180 * MS_PER_DAY;
                break;
            }

            if (minTime > 0) {
              list = list.filter((s) => s.timestamp >= minTime);
            }
          }

          // Custom date filter
          if (filter.startDate) {
            const startTime = new Date(filter.startDate + 'T00:00:00').getTime();
            list = list.filter((s) => s.timestamp >= startTime);
          }
          if (filter.endDate) {
            const endTime = new Date(filter.endDate + 'T23:59:59').getTime();
            list = list.filter((s) => s.timestamp <= endTime);
          }

          // Channel filter
          if (filter.channel && filter.channel !== 'all') {
            list = list.filter((s) => s.channel.toLowerCase() === filter.channel!.toLowerCase());
          }

          // Protocol filter
          if (filter.protocol && filter.protocol !== 'all') {
            list = list.filter((s) => s.protocol === filter.protocol);
          }

          // CAN ID filter
          if (filter.canId !== undefined && filter.canId !== '') {
            const cleanId =
              typeof filter.canId === 'string' && filter.canId.startsWith('0x')
                ? parseInt(filter.canId, 16)
                : Number(filter.canId);

            if (!isNaN(cleanId)) {
              list = list.filter((s) => s.uniqueCanIds.includes(cleanId));
            }
          }

          // Free text search query (in name, notes, or hex IDs)
          if (filter.searchQuery && filter.searchQuery.trim()) {
            const q = filter.searchQuery.trim().toLowerCase();
            list = list.filter((s) => {
              if (s.name.toLowerCase().includes(q)) return true;
              if (s.notes && s.notes.toLowerCase().includes(q)) return true;
              if (s.channel.toLowerCase().includes(q)) return true;
              // Check if query matches any CAN ID in hex or dec
              if (s.uniqueCanIdsHex.some((hex) => hex.toLowerCase().includes(q))) return true;
              if (s.uniqueCanIds.some((id) => id.toString().includes(q))) return true;
              return false;
            });
          }
        }

        // Sorting
        const sortBy = filter?.sortBy || 'timestamp_desc';
        list.sort((a, b) => {
          if (sortBy === 'timestamp_desc') return b.timestamp - a.timestamp;
          if (sortBy === 'timestamp_asc') return a.timestamp - b.timestamp;
          if (sortBy === 'frames_desc') return b.frameCount - a.frameCount;
          if (sortBy === 'size_desc') return b.sizeBytes - a.sizeBytes;
          return b.timestamp - a.timestamp;
        });

        resolve(list);
      };
    });
  }

  /**
   * Get full frames for a specific session
   */
  public async getSnifferSessionFrames(sessionId: string): Promise<CanFrame[] | null> {
    const db = await this.getDB();

    return new Promise((resolve, reject) => {
      const tx = db.transaction([FRAMES_STORE], 'readonly');
      const store = tx.objectStore(FRAMES_STORE);
      const request = store.get(sessionId);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        if (request.result && request.result.frames) {
          resolve(request.result.frames);
        } else {
          resolve(null);
        }
      };
    });
  }

  /**
   * Delete a single session and its frames
   */
  public async deleteSnifferSession(sessionId: string): Promise<void> {
    const db = await this.getDB();

    return new Promise((resolve, reject) => {
      const tx = db.transaction([SESSIONS_STORE, FRAMES_STORE], 'readwrite');
      tx.onerror = () => reject(tx.error);
      tx.oncomplete = () => resolve();

      tx.objectStore(SESSIONS_STORE).delete(sessionId);
      tx.objectStore(FRAMES_STORE).delete(sessionId);
    });
  }

  /**
   * Update session metadata (title, notes, tags)
   */
  public async updateSnifferSessionMeta(
    sessionId: string,
    updates: Partial<Pick<SnifferSessionMeta, 'name' | 'notes' | 'tags'>>
  ): Promise<void> {
    const db = await this.getDB();

    return new Promise((resolve, reject) => {
      const tx = db.transaction([SESSIONS_STORE], 'readwrite');
      const store = tx.objectStore(SESSIONS_STORE);
      const getReq = store.get(sessionId);

      getReq.onerror = () => reject(getReq.error);
      getReq.onsuccess = () => {
        const item: SnifferSessionMeta = getReq.result;
        if (!item) {
          reject(new Error(`Session ${sessionId} not found`));
          return;
        }

        const updated: SnifferSessionMeta = {
          ...item,
          ...updates,
        };

        const putReq = store.put(updated);
        putReq.onerror = () => reject(putReq.error);
        putReq.onsuccess = () => resolve();
      };
    });
  }

  /**
   * Automatic Pruning of sessions older than retention period (default 6 months / 180 days)
   */
  public async pruneExpiredSessions(retentionMonths: number = DEFAULT_RETENTION_MONTHS): Promise<number> {
    const db = await this.getDB();
    const cutoffTime = Date.now() - retentionMonths * 30 * MS_PER_DAY;

    return new Promise((resolve, reject) => {
      const tx = db.transaction([SESSIONS_STORE, FRAMES_STORE], 'readwrite');
      const sessionsStore = tx.objectStore(SESSIONS_STORE);
      const framesStore = tx.objectStore(FRAMES_STORE);

      const request = sessionsStore.getAll();
      let prunedCount = 0;

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const list: SnifferSessionMeta[] = request.result || [];
        list.forEach((session) => {
          // Check explicit expiresAt or general cutoff
          const isExpired =
            (session.expiresAt && session.expiresAt < Date.now()) ||
            session.timestamp < cutoffTime;

          if (isExpired) {
            sessionsStore.delete(session.id);
            framesStore.delete(session.id);
            prunedCount++;
          }
        });
      };

      tx.oncomplete = () => resolve(prunedCount);
      tx.onerror = () => reject(tx.error);
    });
  }

  /**
   * Clear all sniffer history
   */
  public async clearAllSnifferHistory(): Promise<void> {
    const db = await this.getDB();

    return new Promise((resolve, reject) => {
      const tx = db.transaction([SESSIONS_STORE, FRAMES_STORE], 'readwrite');
      tx.onerror = () => reject(tx.error);
      tx.oncomplete = () => resolve();

      tx.objectStore(SESSIONS_STORE).clear();
      tx.objectStore(FRAMES_STORE).clear();
    });
  }

  /**
   * Get storage usage statistics & browser quota
   */
  public async getStorageStats(): Promise<IndexedDbStorageStats> {
    const db = await this.getDB();

    return new Promise(async (resolve, reject) => {
      try {
        let browserStorageEstimate: { usageBytes: number; quotaBytes: number } | undefined;
        if (typeof navigator !== 'undefined' && navigator.storage && navigator.storage.estimate) {
          const est = await navigator.storage.estimate();
          browserStorageEstimate = {
            usageBytes: est.usage || 0,
            quotaBytes: est.quota || 0,
          };
        }

        const tx = db.transaction([SESSIONS_STORE], 'readonly');
        const store = tx.objectStore(SESSIONS_STORE);
        const req = store.getAll();

        req.onerror = () => reject(req.error);
        req.onsuccess = () => {
          const list: SnifferSessionMeta[] = req.result || [];
          let totalFrames = 0;
          let totalEstimatedBytes = 0;
          let oldestTimestamp: number | null = null;
          let newestTimestamp: number | null = null;

          list.forEach((s) => {
            totalFrames += s.frameCount;
            totalEstimatedBytes += s.sizeBytes;
            if (oldestTimestamp === null || s.timestamp < oldestTimestamp) {
              oldestTimestamp = s.timestamp;
            }
            if (newestTimestamp === null || s.timestamp > newestTimestamp) {
              newestTimestamp = s.timestamp;
            }
          });

          resolve({
            sessionCount: list.length,
            totalFrames,
            totalEstimatedBytes,
            oldestTimestamp,
            newestTimestamp,
            browserStorageEstimate,
          });
        };
      } catch (err) {
        reject(err);
      }
    });
  }

  /**
   * Load IndexedDB settings
   */
  public async loadSettings(): Promise<IndexedDbSettings> {
    try {
      const db = await this.getDB();
      return new Promise((resolve) => {
        const tx = db.transaction([SETTINGS_STORE], 'readonly');
        const store = tx.objectStore(SETTINGS_STORE);
        const req = store.get('sniffer_indexeddb_settings');

        req.onsuccess = () => {
          if (req.result && req.result.value) {
            resolve({ ...DEFAULT_INDEXEDDB_SETTINGS, ...req.result.value });
          } else {
            resolve(DEFAULT_INDEXEDDB_SETTINGS);
          }
        };
        req.onerror = () => resolve(DEFAULT_INDEXEDDB_SETTINGS);
      });
    } catch {
      return DEFAULT_INDEXEDDB_SETTINGS;
    }
  }

  /**
   * Save IndexedDB settings
   */
  public async saveSettings(settings: Partial<IndexedDbSettings>): Promise<void> {
    const db = await this.getDB();
    const current = await this.loadSettings();
    const updated = { ...current, ...settings };

    return new Promise((resolve, reject) => {
      const tx = db.transaction([SETTINGS_STORE], 'readwrite');
      const store = tx.objectStore(SETTINGS_STORE);
      const req = store.put({ key: 'sniffer_indexeddb_settings', value: updated });

      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  /**
   * Generate realistic historical sample captures across days/months for immediate testing
   */
  public async seedSampleHistoryIfEmpty(): Promise<boolean> {
    const stats = await this.getStorageStats();
    if (stats.sessionCount > 0) return false;

    // Seed 6 representative historical captures across past 5 months
    const now = Date.now();
    const sampleCaptures = [
      {
        name: 'Diagnostic Session - Engine Warmup & RPM Sweep',
        daysAgo: 1,
        channel: 'can0',
        bitrate: 500000,
        notes: 'Cold start test on testbench; logged 0x100 (Engine) and 0x7E8 (OBD responses)',
        canIds: [0x100, 0x102, 0x7E0, 0x7E8],
        frameCount: 1250,
      },
      {
        name: 'EV Battery BMS Discharge Cycle & Cell Balancing',
        daysAgo: 8,
        channel: 'can0',
        bitrate: 500000,
        notes: 'High-voltage pack discharge curve; Cell voltages 0x200-0x204',
        canIds: [0x200, 0x201, 0x202, 0x204],
        frameCount: 3420,
      },
      {
        name: 'ADAS Radar & Vision Object Track Sniffing',
        daysAgo: 24,
        channel: 'can0',
        bitrate: 500000,
        notes: 'Forward collision radar targets and lane departure warnings (0x456)',
        canIds: [0x456, 0x458, 0x500],
        frameCount: 2100,
      },
      {
        name: 'CAN-FD High Throughput Powertrain Benchmark',
        daysAgo: 60,
        channel: 'vcan0',
        bitrate: 500000,
        notes: 'CAN-FD 64-byte payload stress test at 2 Mbps data bitrate',
        canIds: [0x100, 0x123, 0x300, 0x600],
        frameCount: 4800,
      },
      {
        name: 'Chassis ESC & Wheel Speed Sensor Calibration',
        daysAgo: 110,
        channel: 'can0',
        bitrate: 500000,
        notes: 'Steering angle sensor 0x123 and individual wheel speeds',
        canIds: [0x123, 0x124, 0x500],
        frameCount: 1840,
      },
      {
        name: 'Body Control Gateway Door Lock & Lighting Trace',
        daysAgo: 155,
        channel: 'can0',
        bitrate: 250000,
        notes: 'Interior bus lighting events and keyless entry beacon capture',
        canIds: [0x500, 0x502, 0x510],
        frameCount: 950,
      },
    ];

    for (const sample of sampleCaptures) {
      const timestamp = now - sample.daysAgo * MS_PER_DAY;
      const syntheticFrames: CanFrame[] = [];

      for (let i = 0; i < Math.min(sample.frameCount, 200); i++) {
        const id = sample.canIds[i % sample.canIds.length];
        syntheticFrames.push({
          timestamp: timestamp / 1000 + i * 0.02,
          direction: i % 10 === 0 ? 'TX' : 'RX',
          id,
          idHex: '0x' + id.toString(16).toUpperCase(),
          extended: false,
          fd: id === 0x600,
          dlc: 8,
          data: [
            (i * 3) & 0xff,
            (id >> 8) & 0xff,
            id & 0xff,
            (i + 10) & 0xff,
            0x00,
            0x1f,
            0x40,
            (i & 0x0f),
          ],
        });
      }

      await this.saveSnifferSession(
        {
          name: sample.name,
          channel: sample.channel,
          bitrate: sample.bitrate,
          notes: sample.notes,
          timestamp,
          retentionMonths: DEFAULT_RETENTION_MONTHS,
        },
        syntheticFrames
      );
    }

    return true;
  }
}

export const indexedDbService = new IndexedDbService();
