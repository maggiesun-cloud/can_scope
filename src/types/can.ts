export type CanDirection = 'RX' | 'TX';

export interface CanFrame {
  timestamp: number; // Unix timestamp in seconds with fractional milliseconds
  direction: CanDirection;
  id: number; // Numeric CAN ID
  idHex: string; // e.g. "0x123" or "0x18FEF100"
  extended: boolean; // Standard (11-bit) vs Extended (29-bit)
  fd: boolean; // Classic CAN vs CAN-FD
  brs?: boolean; // Bit Rate Switch (CAN-FD)
  esi?: boolean; // Error State Indicator (CAN-FD)
  dlc: number; // Data Length Code (0-8 for CAN, up to 64 for CAN-FD)
  data: number[]; // Array of byte values (0-255)
  channel?: string; // e.g. "can0", "can1", "CH1", "CH2", etc.
  routedFrom?: string; // Channel where frame originated before router forwarding
  // Derived / sniffer UI metadata
  count?: number;
  periodMs?: number;
  freqHz?: number;
  changedBytes?: boolean[];
  decoded?: Record<string, string | number>;
}

export type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'error';
export type CanBackendType = 'mock' | 'socketcan' | 'pcan' | 'auto';
export type BusState = 'active' | 'warning' | 'passive' | 'bus_off';

export interface CanConfig {
  backend: CanBackendType;
  channel: string;
  bitrate: number; // e.g. 500000
  dataBitrate?: number; // e.g. 2000000 for CAN-FD
  fdEnabled: boolean;
  listenOnly: boolean;
  autoReconnect: boolean;
}

export interface CanInterfaceDescriptor {
  backend: CanBackendType;
  channel: string;
  name: string;
  available: boolean;
  isVirtual?: boolean;
  details?: string;
}

export interface SystemInfo {
  platform: string; // e.g. "linux", "darwin", "win32"
  architecture: string; // e.g. "x86_64", "arm64"
  osRelease?: string;
  pythonVersion?: string;
  pythonCanVersion?: string;
  fastApiVersion?: string;
  availableBackends: string[];
  detectedInterfaces: CanInterfaceDescriptor[];
  driverStatus: {
    pcan: {
      available: boolean;
      message: string;
    };
    socketcan: {
      available: boolean;
      message: string;
    };
    mock: {
      available: boolean;
      message: string;
    };
  };
}

export interface BusStatus {
  connectionState: ConnectionState;
  backend: CanBackendType;
  interfaceName: string;
  channel: string;
  bitrate: number;
  dataBitrate?: number;
  fdEnabled: boolean;
  listenOnly: boolean;
  busLoad: number; // 0.0 - 100.0%
  fps: number; // Frames per second
  totalFrames: number;
  rxFrames: number;
  txFrames: number;
  errorFrames: number;
  tec: number; // Transmit Error Counter
  rec: number; // Receive Error Counter
  busState: BusState;
  controllerState: string;
  errorMessage?: string;
  uptimeSeconds: number;
}

export interface CanErrorEvent {
  id: string;
  timestamp: number;
  type: string; // "CRC_ERROR" | "BIT_STUFFING" | "ACK_DELIMITER" | "FORM_ERROR" | "BUS_OFF"
  tec: number;
  rec: number;
  description: string;
}

export interface TransmitMessageConfig {
  id: string; // unique item id
  canId: number;
  canIdHex: string;
  extended: boolean;
  fd: boolean;
  brs: boolean;
  dlc: number;
  data: number[];
  periodMs: number; // 0 = single shot, >0 = periodic
  enabled: boolean;
  txCount: number;
  lastSent?: number;
}

export interface FilterConfig {
  idText?: string; // e.g. "0x123, 0x456" or "0x100-0x1FF"
  dataContains?: string; // e.g. "01 FF"
  direction: 'all' | 'RX' | 'TX';
  frameType: 'all' | 'standard' | 'extended';
  protocol: 'all' | 'can' | 'fd';
  searchQuery?: string;
}

export interface DbcSignal {
  name: string;
  startBit: number;
  length: number;
  byteOrder: 'little_endian' | 'big_endian'; // Intel (0) vs Motorola (1)
  isSigned: boolean;
  scale: number;
  offset: number;
  min: number;
  max: number;
  unit: string;
  receivers: string[];
  comment?: string;
}

export interface DbcMessage {
  id: number;
  idHex: string;
  name: string;
  dlc: number;
  transmitter: string;
  signals: DbcSignal[];
  comment?: string;
}

export interface DbcDatabase {
  filename: string;
  version?: string;
  messages: DbcMessage[];
}

export interface RecordingSession {
  isRecording: boolean;
  isPaused: boolean;
  startTime: number | null;
  durationSeconds: number;
  frameCount: number;
  estimatedSizeBytes: number;
}

export interface GraphSeriesConfig {
  id: string;
  name: string;
  color: string;
  canId: number;
  type: 'byte' | 'signal' | 'counter' | 'frequency';
  byteIndex?: number;
  isSigned?: boolean;
  signalName?: string;
  unit?: string;
}

export interface SnifferSessionMeta {
  id: string;
  name: string;
  timestamp: number; // Unix timestamp in ms
  dateStr: string; // YYYY-MM-DD
  channel: string;
  bitrate: number;
  protocol: 'classic' | 'fd' | 'mixed';
  frameCount: number;
  uniqueCanIds: number[];
  uniqueCanIdsHex: string[];
  durationSeconds: number;
  sizeBytes: number;
  notes?: string;
  tags?: string[];
  expiresAt: number; // Unix timestamp in ms (6 months by default)
  isAutoSaved?: boolean;
}

export interface SnifferSessionWithFrames extends SnifferSessionMeta {
  frames: CanFrame[];
}

export interface SnifferHistoryFilter {
  searchQuery?: string;
  canId?: string | number;
  dateRangePreset?: 'all' | 'today' | 'yesterday' | '7d' | '30d' | '90d' | '180d' | 'custom';
  startDate?: string;
  endDate?: string;
  channel?: string;
  protocol?: 'all' | 'classic' | 'fd' | 'mixed';
  sortBy?: 'timestamp_desc' | 'timestamp_asc' | 'frames_desc' | 'size_desc';
}

export interface IndexedDbStorageStats {
  sessionCount: number;
  totalFrames: number;
  totalEstimatedBytes: number;
  oldestTimestamp: number | null;
  newestTimestamp: number | null;
  browserStorageEstimate?: {
    usageBytes: number;
    quotaBytes: number;
  };
}

export interface IndexedDbSettings {
  autoSaveEnabled: boolean;
  retentionMonths: number; // default: 6
  autoSaveIntervalFrames: number;
  autoSaveOnPause: boolean;
  autoSaveOnClear: boolean;
}

// ==========================================
// 6-Channel CAN Router / Gateway Types
// ==========================================

export interface CanRouterChannelConfig {
  id: number; // 1 to 6
  name: string; // e.g. "CAN 1 (Powertrain)"
  interfaceCode: string; // e.g. "can0", "PCAN_USBBUS1", "CH1"
  domain: string; // e.g. "Powertrain", "Body & Comfort", "Chassis", "ADAS", "Infotainment", "Diagnostics"
  color: string; // Tailwind color theme identifier
  bitrate: number; // Nominal bitrate e.g. 500000
  dataBitrate?: number; // CAN-FD data bitrate e.g. 2000000
  fdEnabled: boolean;
  listenOnly: boolean;
  terminationResistor: boolean; // 120-ohm termination software switchable
  enabled: boolean;
  busLoad: number; // 0.0 - 100.0%
  fps: number;
  rxCount: number;
  txCount: number;
  errorCount: number;
  lastActiveTimestamp?: number;
}

export type RoutingAction = 'forward' | 'remap_id' | 'modify_data' | 'drop' | 'mirror';

export interface CanRoutingRule {
  id: string;
  name: string;
  enabled: boolean;
  sourceChannel: number | 'all'; // 1-6 or 'all'
  filterType: 'any' | 'id_exact' | 'id_range' | 'id_mask';
  filterId?: number; // e.g. 0x100
  filterIdHex?: string;
  filterRangeMin?: number;
  filterRangeMax?: number;
  filterMask?: number;
  targetChannels: number[]; // e.g. [2, 3] (1 to 6)
  action: RoutingAction;
  remapId?: number;
  remapIdHex?: string;
  dataTransform?: {
    byteIndex: number;
    operation: 'set' | 'mask_and' | 'mask_or' | 'xor' | 'offset';
    value: number;
  };
  rateLimitHz?: number;
  lastForwardedTimestamp?: number;
  matchedCount: number;
  routedCount: number;
  droppedCount: number;
  lastSeenTimestamp?: number;
}

export interface CanRouterPacketLog {
  id: string;
  timestamp: number;
  sourceChannel: number;
  targetChannels: number[];
  originalId: number;
  originalIdHex: string;
  routedId?: number;
  routedIdHex?: string;
  dlc: number;
  data: number[];
  action: RoutingAction;
  ruleName?: string;
  status: 'routed' | 'dropped' | 'modified';
}

