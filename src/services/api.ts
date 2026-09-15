import {
  BusStatus,
  CanConfig,
  CanInterfaceDescriptor,
  SystemInfo,
  TransmitMessageConfig,
} from '../types/can';

const BASE_URL = '/api';

export async function fetchSystemInfo(): Promise<SystemInfo> {
  const res = await fetch(`${BASE_URL}/system`);
  if (!res.ok) throw new Error('Failed to fetch system information');
  return res.json();
}

export async function fetchBusStatus(): Promise<BusStatus> {
  const res = await fetch(`${BASE_URL}/status`);
  if (!res.ok) throw new Error('Failed to fetch bus status');
  return res.json();
}

export async function fetchInterfaces(): Promise<CanInterfaceDescriptor[]> {
  const res = await fetch(`${BASE_URL}/interfaces`);
  if (!res.ok) throw new Error('Failed to fetch interfaces');
  return res.json();
}

export async function connectInterface(config: Partial<CanConfig>): Promise<{ success: boolean; status: BusStatus }> {
  const res = await fetch(`${BASE_URL}/connect`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(config),
  });
  const data = await res.json();
  if (!res.ok) {
    const errorMsg = data.message || 'Connection failed';
    const err = new Error(errorMsg) as any;
    err.offerSimulation = data.offerSimulation;
    throw err;
  }
  return data;
}

export async function disconnectInterface(): Promise<{ success: boolean; status: BusStatus }> {
  const res = await fetch(`${BASE_URL}/disconnect`, {
    method: 'POST',
  });
  if (!res.ok) throw new Error('Failed to disconnect interface');
  return res.json();
}

export async function fetchConfig(): Promise<CanConfig> {
  const res = await fetch(`${BASE_URL}/config`);
  if (!res.ok) throw new Error('Failed to fetch configuration');
  return res.json();
}

export async function updateConfig(config: Partial<CanConfig>): Promise<{ success: boolean; config: CanConfig }> {
  const res = await fetch(`${BASE_URL}/configure`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(config),
  });
  if (!res.ok) throw new Error('Failed to update configuration');
  return res.json();
}

export async function transmitCanFrame(payload: {
  id: number;
  extended: boolean;
  fd: boolean;
  brs?: boolean;
  dlc: number;
  data: number[];
  periodMs?: number;
  taskId?: string;
  stopPeriodic?: boolean;
}): Promise<{ success: boolean; taskId?: string; message?: string }> {
  const res = await fetch(`${BASE_URL}/transmit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || 'Transmission failed');
  }
  return data;
}

export async function startRecording(): Promise<{ success: boolean; message: string }> {
  const res = await fetch(`${BASE_URL}/record/start`, { method: 'POST' });
  if (!res.ok) throw new Error('Failed to start recording');
  return res.json();
}

export async function stopRecording(): Promise<{
  success: boolean;
  durationSeconds: number;
  frameCount: number;
  estimatedSizeBytes: number;
}> {
  const res = await fetch(`${BASE_URL}/record/stop`, { method: 'POST' });
  if (!res.ok) throw new Error('Failed to stop recording');
  return res.json();
}

export async function uploadDbcFile(content: string, filename: string): Promise<{ success: boolean; message: string }> {
  const res = await fetch(`${BASE_URL}/dbc/load`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content, filename }),
  });
  if (!res.ok) throw new Error('Failed to load DBC on backend');
  return res.json();
}

export async function fetchErrors(): Promise<{
  busState: string;
  tec: number;
  rec: number;
  errorFrames: number;
  controllerState: string;
  recentErrors: any[];
}> {
  const res = await fetch(`${BASE_URL}/errors`);
  if (!res.ok) throw new Error('Failed to fetch CAN errors');
  return res.json();
}

export async function clearErrors(): Promise<{ success: boolean }> {
  const res = await fetch(`${BASE_URL}/errors/clear`, { method: 'POST' });
  if (!res.ok) throw new Error('Failed to clear errors');
  return res.json();
}

export interface AutoBaudResult {
  success: boolean;
  detectedBitrate: number;
  confidence: string;
  testedRates: Array<{
    bitrate: number;
    status: 'detected' | 'silent' | 'no_traffic' | 'error';
    validFrames: number;
    errorFrames: number;
  }>;
  details: string;
}

export async function autoDetectBaudRate(channel: string, backend: string): Promise<AutoBaudResult> {
  const res = await fetch(`${BASE_URL}/autobaud`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ channel, backend }),
  });
  if (!res.ok) throw new Error('Failed to auto-detect baud rate');
  return res.json();
}

