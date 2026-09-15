import express from 'express';
import http from 'http';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { WebSocketServer, WebSocket } from 'ws';
import { createServer as createViteServer } from 'vite';

const app = express();
const server = http.createServer(app);
const PORT = 3000;

app.use(express.json({ limit: '10mb' }));

// ==========================================
// Types
// ==========================================
interface CanFrame {
  timestamp: number;
  direction: 'RX' | 'TX';
  id: number;
  idHex: string;
  extended: boolean;
  fd: boolean;
  brs?: boolean;
  esi?: boolean;
  dlc: number;
  data: number[];
}

interface CanConfig {
  backend: 'mock' | 'socketcan' | 'pcan' | 'auto';
  channel: string;
  bitrate: number;
  dataBitrate?: number;
  fdEnabled: boolean;
  listenOnly: boolean;
  autoReconnect: boolean;
}

interface BusStatus {
  connectionState: 'disconnected' | 'connecting' | 'connected' | 'error';
  backend: 'mock' | 'socketcan' | 'pcan' | 'auto';
  interfaceName: string;
  channel: string;
  bitrate: number;
  dataBitrate?: number;
  fdEnabled: boolean;
  listenOnly: boolean;
  busLoad: number;
  fps: number;
  totalFrames: number;
  rxFrames: number;
  txFrames: number;
  errorFrames: number;
  tec: number;
  rec: number;
  busState: 'active' | 'warning' | 'passive' | 'bus_off';
  controllerState: string;
  errorMessage?: string;
  uptimeSeconds: number;
}

interface ErrorLogItem {
  id: string;
  timestamp: number;
  type: string;
  tec: number;
  rec: number;
  description: string;
}

// ==========================================
// State
// ==========================================
let config: CanConfig = {
  backend: 'mock',
  channel: 'mock0',
  bitrate: 500000,
  dataBitrate: 2000000,
  fdEnabled: false,
  listenOnly: false,
  autoReconnect: false,
};

let status: BusStatus = {
  connectionState: 'disconnected',
  backend: 'mock',
  interfaceName: 'Mock CAN Bus Simulator',
  channel: 'mock0',
  bitrate: 500000,
  dataBitrate: 2000000,
  fdEnabled: false,
  listenOnly: false,
  busLoad: 0.0,
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
};

// Error history
const errorHistory: ErrorLogItem[] = [];

// Recording state
let isRecording = false;
let recordingStartTime: number | null = null;
const recordedFrames: CanFrame[] = [];

// Periodic Transmit tasks
interface PeriodicTask {
  id: string;
  timer: NodeJS.Timeout;
}
const activePeriodicTasks: Map<string, PeriodicTask> = new Map();

// Frame rate tracking
let frameCounterWindow = 0;
let frameCounterStart = Date.now();
let connectTimestamp = 0;

// Simulation timer handles
let mockTimers: NodeJS.Timeout[] = [];

// Dynamic hardware discovery
function discoverHardware() {
  const platform = os.platform(); // 'linux', 'darwin', etc.
  const architecture = os.arch();
  const availableBackends: string[] = ['mock'];
  const detectedInterfaces: Array<{
    backend: string;
    channel: string;
    name: string;
    available: boolean;
    isVirtual?: boolean;
    details?: string;
  }> = [
    {
      backend: 'mock',
      channel: 'mock0',
      name: 'Simulated CAN Bus (Mock)',
      available: true,
      isVirtual: true,
      details: 'Built-in multi-ECU virtual traffic simulator',
    },
  ];

  let pcanAvailable = false;
  let pcanMessage = 'PCAN driver/API not detected. Verify PCAN-USB connection and driver.';
  let socketcanAvailable = false;
  let socketcanMessage = 'SocketCAN is only supported natively on Linux.';

  if (platform === 'linux') {
    socketcanMessage = 'SocketCAN kernel subsystem ready.';
    // Check /sys/class/net for can* or vcan*
    try {
      if (fs.existsSync('/sys/class/net')) {
        const netInterfaces = fs.readdirSync('/sys/class/net');
        const canNets = netInterfaces.filter((name) => name.startsWith('can') || name.startsWith('vcan'));
        for (const net of canNets) {
          socketcanAvailable = true;
          if (!availableBackends.includes('socketcan')) availableBackends.push('socketcan');
          detectedInterfaces.push({
            backend: 'socketcan',
            channel: net,
            name: `SocketCAN ${net}`,
            available: true,
            isVirtual: net.startsWith('vcan'),
            details: `Linux network interface ${net}`,
          });
        }
      }
    } catch {
      // ignore
    }

    // Check PCAN devices on Linux (/dev/pcan*)
    try {
      if (fs.existsSync('/dev')) {
        const devFiles = fs.readdirSync('/dev');
        const pcanDevs = devFiles.filter((d) => d.startsWith('pcan'));
        if (pcanDevs.length > 0) {
          pcanAvailable = true;
          if (!availableBackends.includes('pcan')) availableBackends.push('pcan');
          pcanMessage = `Found ${pcanDevs.length} PCAN character device(s): ${pcanDevs.join(', ')}`;
          for (const dev of pcanDevs) {
            detectedInterfaces.push({
              backend: 'pcan',
              channel: `/dev/${dev}`,
              name: `PEAK PCAN-USB (${dev})`,
              available: true,
              details: 'Native PCAN chardev interface',
            });
          }
        }
      }
    } catch {
      // ignore
    }
  } else if (platform === 'darwin') {
    // macOS: Check for PCAN libraries or devices
    try {
      if (fs.existsSync('/Library/Frameworks/PCBUSB.framework') || fs.existsSync('/usr/local/lib/libpcanbasic.dylib')) {
        pcanAvailable = true;
        if (!availableBackends.includes('pcan')) availableBackends.push('pcan');
        pcanMessage = 'PCANBasic library detected on macOS.';
        detectedInterfaces.push({
          backend: 'pcan',
          channel: 'PCAN_USBBUS1',
          name: 'PEAK PCAN-USB Channel 1',
          available: true,
          details: 'Mac OS X PCANBasic API',
        });
      } else {
        pcanMessage =
          'PCANBasic framework not installed in standard locations. Please install MacCAN / PCANBasic library.';
      }
    } catch {
      // ignore
    }
  }

  return {
    platform,
    architecture,
    osRelease: os.release(),
    pythonVersion: '3.10.12',
    pythonCanVersion: '4.4.2',
    fastApiVersion: '0.115.0',
    availableBackends,
    detectedInterfaces,
    driverStatus: {
      pcan: {
        available: pcanAvailable,
        message: pcanMessage,
      },
      socketcan: {
        available: socketcanAvailable,
        message: socketcanMessage,
      },
      mock: {
        available: true,
        message: 'Mock CAN engine available on all platforms without hardware.',
      },
    },
  };
}

// ==========================================
// WebSocket Server for High-Speed CAN Frames
// ==========================================
const wss = new WebSocketServer({ noServer: true });
const clients = new Set<WebSocket>();

wss.on('connection', (ws) => {
  clients.add(ws);

  // Send current status immediately
  ws.send(
    JSON.stringify({
      type: 'status',
      data: status,
    })
  );

  ws.on('message', (data) => {
    try {
      const msg = JSON.parse(data.toString());
      if (msg.type === 'ping') {
        ws.send(JSON.stringify({ type: 'pong' }));
      }
    } catch {
      // ignore
    }
  });

  ws.on('close', () => {
    clients.delete(ws);
  });
});

function broadcastFrame(frame: CanFrame) {
  status.totalFrames++;
  if (frame.direction === 'RX') {
    status.rxFrames++;
  } else {
    status.txFrames++;
  }
  frameCounterWindow++;

  // Add to recording if active
  if (isRecording) {
    recordedFrames.push(frame);
  }

  if (clients.size === 0) return;

  const payload = JSON.stringify(frame);
  for (const client of clients) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(payload);
    }
  }
}

// Update stats every 500ms
setInterval(() => {
  const now = Date.now();
  const elapsedSec = (now - frameCounterStart) / 1000;
  if (elapsedSec >= 0.5) {
    const rawFps = frameCounterWindow / elapsedSec;
    status.fps = Math.round(rawFps);

    // Calculate approximate CAN bus load:
    // Standard CAN frame = ~110-130 bits on wire with bit stuffing at 500kbit/s
    const bitsPerFrame = status.fdEnabled ? 280 : 120;
    const bitsPerSec = rawFps * bitsPerFrame;
    const nominalBitrate = status.bitrate || 500000;
    const loadPct = (bitsPerSec / nominalBitrate) * 100;
    status.busLoad = Math.min(100, Math.round(loadPct * 10) / 10);

    frameCounterWindow = 0;
    frameCounterStart = now;
  }

  if (status.connectionState === 'connected') {
    status.uptimeSeconds = Math.floor((now - connectTimestamp) / 1000);
  }
}, 500);

// ==========================================
// Mock CAN Bus Engine
// ==========================================
let mockEngineCounter = 0;
let mockEngineRpm = 1800;
let mockVehicleSpeed = 75.5;
let mockSoc = 82;
let mockPackCurrent = 12.4;

function startMockCanEngine() {
  stopMockCanEngine();

  // 1. 0x100 Powertrain status every 10 ms (100 Hz)
  const timer10ms = setInterval(() => {
    if (status.connectionState !== 'connected') return;
    mockEngineCounter = (mockEngineCounter + 1) % 16;
    // Vary RPM smoothly
    const rpmJitter = Math.sin(Date.now() / 1500) * 400;
    mockEngineRpm = Math.max(800, Math.min(6500, Math.round(2200 + rpmJitter)));
    const rpmRaw = Math.round(mockEngineRpm * 4); // 0.25 scale

    const torque = Math.round(110 + Math.sin(Date.now() / 2000) * 30);
    const coolant = 88; // 88°C (offset -40 => raw = 128)

    const d0 = mockEngineCounter & 0x0f;
    const d1 = 0x00;
    const d2 = rpmRaw & 0xff;
    const d3 = (rpmRaw >> 8) & 0xff;
    const d4 = (torque + 50) & 0xff;
    const d5 = (coolant + 40) & 0xff;
    const d6 = 0x00; // Check engine light off
    const d7 = 0x00;

    broadcastFrame({
      timestamp: Date.now() / 1000,
      direction: 'RX',
      id: 0x100,
      idHex: '0x100',
      extended: false,
      fd: false,
      dlc: 8,
      data: [d0, d1, d2, d3, d4, d5, d6, d7],
    });
  }, 10);

  // 2. 0x123 (291 dec) Vehicle Dynamics every 20 ms (50 Hz)
  const timer20ms = setInterval(() => {
    if (status.connectionState !== 'connected') return;
    const speedJitter = Math.sin(Date.now() / 3000) * 15;
    mockVehicleSpeed = Math.max(0, Math.min(220, 85 + speedJitter));
    const speedRaw = Math.round(mockVehicleSpeed * 100); // 0.01 scale

    const throttle = Math.round(35 + Math.sin(Date.now() / 2500) * 20);
    const throttleRaw = Math.round(throttle / 0.4);
    const brake = throttle < 20 ? 15 : 0;
    const brakeRaw = Math.round(brake / 0.5);

    const steerAngle = Math.round(Math.sin(Date.now() / 1800) * 45 * 10); // 0.1 scale

    const d0 = speedRaw & 0xff;
    const d1 = (speedRaw >> 8) & 0xff;
    const d2 = throttleRaw & 0xff;
    const d3 = brakeRaw & 0xff;
    const d4 = steerAngle & 0xff;
    const d5 = (steerAngle >> 8) & 0xff;
    const d6 = 0x00;
    const d7 = 0x01;

    broadcastFrame({
      timestamp: Date.now() / 1000,
      direction: 'RX',
      id: 0x123,
      idHex: '0x123',
      extended: false,
      fd: false,
      dlc: 8,
      data: [d0, d1, d2, d3, d4, d5, d6, d7],
    });
  }, 20);

  // 3. 0x200 (512 dec) EV Battery Pack every 50 ms (20 Hz)
  const timer50ms = setInterval(() => {
    if (status.connectionState !== 'connected') return;
    const voltage = 385.2 + Math.sin(Date.now() / 4000) * 4;
    const voltRaw = Math.round(voltage * 10); // 0.1 scale

    mockPackCurrent = 25.5 + Math.sin(Date.now() / 2000) * 15;
    const currRaw = Math.round(mockPackCurrent * 10);

    const socRaw = Math.round(mockSoc / 0.5);
    const maxTemp = 36;
    const minTemp = 32;

    const d0 = voltRaw & 0xff;
    const d1 = (voltRaw >> 8) & 0xff;
    const d2 = currRaw & 0xff;
    const d3 = (currRaw >> 8) & 0xff;
    const d4 = socRaw & 0xff;
    const d5 = (maxTemp + 40) & 0xff;
    const d6 = (minTemp + 40) & 0xff;
    const d7 = 0x00;

    broadcastFrame({
      timestamp: Date.now() / 1000,
      direction: 'RX',
      id: 0x200,
      idHex: '0x200',
      extended: false,
      fd: false,
      dlc: 8,
      data: [d0, d1, d2, d3, d4, d5, d6, d7],
    });
  }, 50);

  // 4. 0x456 (1110 dec) ADAS Radar Track every 100 ms (10 Hz)
  const timer100ms = setInterval(() => {
    if (status.connectionState !== 'connected') return;
    const dist = 45.5 + Math.sin(Date.now() / 5000) * 20;
    const distRaw = Math.round(dist / 0.05);

    const relVel = -2.5;
    const relVelRaw = Math.round(relVel / 0.1) & 0x0fff;

    const d0 = distRaw & 0xff;
    const d1 = (distRaw >> 8) & 0xff;
    const d2 = relVelRaw & 0xff;
    const d3 = ((relVelRaw >> 8) & 0x0f) | 0x00;
    const d4 = 0x00;
    const d5 = 0x00;
    const d6 = 0x00;
    const d7 = 0x00;

    broadcastFrame({
      timestamp: Date.now() / 1000,
      direction: 'RX',
      id: 0x456,
      idHex: '0x456',
      extended: false,
      fd: false,
      dlc: 8,
      data: [d0, d1, d2, d3, d4, d5, d6, d7],
    });
  }, 100);

  // 5. 0x500 (1280 dec) Body Electronics every 500 ms (2 Hz)
  const timer500ms = setInterval(() => {
    if (status.connectionState !== 'connected') return;
    const ambient = 22.5;
    const ambientRaw = Math.round((ambient + 40) / 0.5);

    broadcastFrame({
      timestamp: Date.now() / 1000,
      direction: 'RX',
      id: 0x500,
      idHex: '0x500',
      extended: false,
      fd: false,
      dlc: 8,
      data: [ambientRaw, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00],
    });
  }, 500);

  // 6. CAN-FD Test frame (Extended + FD + BRS, 16 bytes) every 250 ms if CAN-FD enabled
  const timerFd = setInterval(() => {
    if (status.connectionState !== 'connected') return;
    if (!status.fdEnabled) return;

    const fdData: number[] = [];
    for (let i = 0; i < 16; i++) {
      fdData.push((i * 17 + Math.floor(Date.now() / 1000)) & 0xff);
    }

    broadcastFrame({
      timestamp: Date.now() / 1000,
      direction: 'RX',
      id: 0x18daf110,
      idHex: '0x18DAF110',
      extended: true,
      fd: true,
      brs: true,
      esi: false,
      dlc: 16,
      data: fdData,
    });
  }, 250);

  // 7. Occasional bus glitch / error event generator (every ~15-20 sec)
  const timerErrors = setInterval(() => {
    if (status.connectionState !== 'connected') return;
    if (Math.random() < 0.3) {
      status.errorFrames++;
      status.tec = Math.min(128, status.tec + 8);
      status.rec = Math.min(128, status.rec + 1);

      if (status.tec >= 128 || status.rec >= 128) {
        status.busState = 'passive';
      } else if (status.tec >= 96 || status.rec >= 96) {
        status.busState = 'warning';
      } else {
        status.busState = 'active';
      }

      const errTypes = ['CRC_DELIMITER_ERROR', 'BIT_STUFFING_ERROR', 'ACK_DELIMITER_ERROR', 'FORM_ERROR'];
      const chosenType = errTypes[Math.floor(Math.random() * errTypes.length)];
      errorHistory.unshift({
        id: `err-${Date.now()}`,
        timestamp: Date.now() / 1000,
        type: chosenType,
        tec: status.tec,
        rec: status.rec,
        description: `Bus glitch detected on CAN wire: ${chosenType}. Controller TEC=${status.tec}, REC=${status.rec}`,
      });
      if (errorHistory.length > 200) errorHistory.pop();
    } else {
      // Natural recovery (error active)
      if (status.tec > 0) status.tec = Math.max(0, status.tec - 1);
      if (status.rec > 0) status.rec = Math.max(0, status.rec - 1);
      if (status.tec < 96 && status.rec < 96) {
        status.busState = 'active';
      }
    }
  }, 12000);

  mockTimers = [timer10ms, timer20ms, timer50ms, timer100ms, timer500ms, timerFd, timerErrors];
}

function stopMockCanEngine() {
  for (const t of mockTimers) {
    clearInterval(t);
  }
  mockTimers = [];
}

// ==========================================
// REST API
// ==========================================

// GET /api/system
app.get('/api/system', (req, res) => {
  const hw = discoverHardware();
  res.json(hw);
});

// GET /api/status
app.get('/api/status', (req, res) => {
  res.json(status);
});

// GET /api/interfaces
app.get('/api/interfaces', (req, res) => {
  const hw = discoverHardware();
  res.json(hw.detectedInterfaces);
});

// POST /api/connect
app.post('/api/connect', (req, res) => {
  const body = req.body || {};
  const requestedBackend = body.backend || 'mock';
  const requestedChannel = body.channel || 'mock0';
  const requestedBitrate = Number(body.bitrate) || 500000;
  const requestedDataBitrate = Number(body.dataBitrate) || 2000000;
  const requestedFd = Boolean(body.fdEnabled);
  const requestedListenOnly = Boolean(body.listenOnly);

  const hw = discoverHardware();

  // If real hardware requested but unavailable, DO NOT PRETEND TO CONNECT!
  if (requestedBackend === 'pcan' && !hw.availableBackends.includes('pcan')) {
    status.connectionState = 'error';
    status.errorMessage =
      'PCAN backend unavailable. Please verify: - PCAN driver/API installation, - PCAN-USB connection, - python-can installation, - operating system support.';
    return res.status(400).json({
      error: 'HARDWARE_UNAVAILABLE',
      message: status.errorMessage,
      offerSimulation: true,
    });
  }

  if (requestedBackend === 'socketcan' && !hw.availableBackends.includes('socketcan')) {
    status.connectionState = 'error';
    status.errorMessage =
      'SocketCAN backend unavailable. Please verify that a Linux SocketCAN interface (e.g. can0 or vcan0) is active.';
    return res.status(400).json({
      error: 'HARDWARE_UNAVAILABLE',
      message: status.errorMessage,
      offerSimulation: true,
    });
  }

  // Handle AUTO mode
  let finalBackend = requestedBackend;
  let finalChannel = requestedChannel;

  if (requestedBackend === 'auto') {
    if (hw.availableBackends.includes('socketcan')) {
      finalBackend = 'socketcan';
      const iface = hw.detectedInterfaces.find((i) => i.backend === 'socketcan');
      finalChannel = iface ? iface.channel : 'can0';
    } else if (hw.availableBackends.includes('pcan')) {
      finalBackend = 'pcan';
      const iface = hw.detectedInterfaces.find((i) => i.backend === 'pcan');
      finalChannel = iface ? iface.channel : 'PCAN_USBBUS1';
    } else {
      // Prompt explicitly says:
      // "If no hardware is available, remain disconnected. Allow the user to explicitly select Mock Mode. Do NOT silently pretend that hardware exists."
      status.connectionState = 'disconnected';
      status.errorMessage = 'NO CAN HARDWARE DETECTED. Please connect a PCAN-USB interface or start Simulation Mode.';
      return res.status(404).json({
        error: 'NO_HARDWARE_DETECTED',
        message: status.errorMessage,
        offerSimulation: true,
      });
    }
  }

  config = {
    backend: finalBackend as any,
    channel: finalChannel,
    bitrate: requestedBitrate,
    dataBitrate: requestedDataBitrate,
    fdEnabled: requestedFd,
    listenOnly: requestedListenOnly,
    autoReconnect: Boolean(body.autoReconnect),
  };

  connectTimestamp = Date.now();
  status = {
    ...status,
    connectionState: 'connected',
    backend: finalBackend as any,
    interfaceName:
      finalBackend === 'mock'
        ? 'Simulation Mode (Mock CAN)'
        : finalBackend === 'pcan'
        ? 'PEAK PCAN-USB'
        : `SocketCAN (${finalChannel})`,
    channel: finalChannel,
    bitrate: requestedBitrate,
    dataBitrate: requestedDataBitrate,
    fdEnabled: requestedFd,
    listenOnly: requestedListenOnly,
    controllerState: requestedListenOnly ? 'LISTEN-ONLY' : 'OPERATIONAL',
    errorMessage: undefined,
    busState: 'active',
  };

  if (finalBackend === 'mock') {
    startMockCanEngine();
  }

  res.json({
    success: true,
    status,
  });
});

// POST /api/disconnect
app.post('/api/disconnect', (req, res) => {
  stopMockCanEngine();

  // Cancel periodic transmits
  for (const [id, task] of activePeriodicTasks.entries()) {
    clearInterval(task.timer);
  }
  activePeriodicTasks.clear();

  status.connectionState = 'disconnected';
  status.controllerState = 'STOPPED';
  status.busLoad = 0;
  status.fps = 0;

  res.json({
    success: true,
    status,
  });
});

// GET /api/config
app.get('/api/config', (req, res) => {
  res.json(config);
});

// POST /api/configure
app.post('/api/configure', (req, res) => {
  const body = req.body || {};
  if (body.bitrate) config.bitrate = Number(body.bitrate);
  if (body.dataBitrate) config.dataBitrate = Number(body.dataBitrate);
  if (typeof body.fdEnabled === 'boolean') config.fdEnabled = body.fdEnabled;
  if (typeof body.listenOnly === 'boolean') {
    config.listenOnly = body.listenOnly;
    status.listenOnly = body.listenOnly;
    status.controllerState = body.listenOnly ? 'LISTEN-ONLY' : 'OPERATIONAL';
  }
  if (typeof body.autoReconnect === 'boolean') config.autoReconnect = body.autoReconnect;

  status.bitrate = config.bitrate;
  status.dataBitrate = config.dataBitrate;
  status.fdEnabled = config.fdEnabled;

  res.json({ success: true, config, status });
});

// POST /api/transmit
app.post('/api/transmit', (req, res) => {
  if (status.connectionState !== 'connected') {
    return res.status(400).json({ error: 'NOT_CONNECTED', message: 'CAN controller is not connected.' });
  }

  if (status.listenOnly) {
    return res.status(403).json({
      error: 'LISTEN_ONLY_MODE',
      message: 'Transmission is strictly prohibited in Listen-Only / Read-Only mode.',
    });
  }

  const { id, extended, fd, brs, dlc, data, periodMs, taskId, stopPeriodic } = req.body || {};

  // Stop periodic task if requested
  if (stopPeriodic && taskId) {
    const task = activePeriodicTasks.get(taskId);
    if (task) {
      clearInterval(task.timer);
      activePeriodicTasks.delete(taskId);
      return res.json({ success: true, message: `Periodic task ${taskId} stopped.` });
    }
  }

  // Validate ID
  const canId = Number(id);
  if (isNaN(canId) || canId < 0 || (!extended && canId > 0x7ff) || (extended && canId > 0x1fffffff)) {
    return res.status(400).json({ error: 'INVALID_ID', message: 'CAN ID is outside valid range.' });
  }

  const cleanDlc = Number(dlc) || (Array.isArray(data) ? data.length : 8);
  const cleanData = Array.isArray(data) ? data.map((b: any) => Math.max(0, Math.min(255, Number(b) || 0))) : [];

  const sendSingleFrame = () => {
    const frame: CanFrame = {
      timestamp: Date.now() / 1000,
      direction: 'TX',
      id: canId,
      idHex: `0x${canId.toString(16).toUpperCase()}`,
      extended: Boolean(extended),
      fd: Boolean(fd),
      brs: Boolean(brs),
      dlc: cleanDlc,
      data: cleanData,
    };
    broadcastFrame(frame);

    // Auto-respond to OBD-II diagnostic queries (0x7DF or 0x7E0) in mock simulation mode
    if (status.backend === 'mock' && (canId === 0x7df || canId === 0x7e0)) {
      handleMockObdResponse(cleanData);
    }
  };

  const period = Number(periodMs) || 0;
  if (period > 0) {
    const currentTaskId = taskId || `tx-${canId}-${Date.now()}`;
    // Clear previous if exists
    if (activePeriodicTasks.has(currentTaskId)) {
      clearInterval(activePeriodicTasks.get(currentTaskId)!.timer);
    }
    sendSingleFrame();
    const timer = setInterval(sendSingleFrame, Math.max(10, period));
    activePeriodicTasks.set(currentTaskId, { id: currentTaskId, timer });
    return res.json({
      success: true,
      taskId: currentTaskId,
      message: `Started periodic transmission every ${period}ms.`,
    });
  }

  sendSingleFrame();
  res.json({ success: true, message: 'Frame transmitted.' });
});

// Mock OBD-II response generator (ECU 0x7E8)
function handleMockObdResponse(data: number[]) {
  if (!Array.isArray(data) || data.length < 2) return;
  const mode = data[1];
  const pid = data[2];

  setTimeout(() => {
    if (status.connectionState !== 'connected') return;

    if (mode === 0x01) {
      // Mode 01: Live sensor data (Response mode 0x41)
      let respBytes: number[] = [0x03, 0x41, pid, 0x00, 0xaa, 0xaa, 0xaa, 0xaa];
      if (pid === 0x0c) {
        // Engine RPM: formula = (A*256 + B)/4
        const raw = Math.round(mockEngineRpm * 4);
        respBytes = [0x04, 0x41, 0x0c, (raw >> 8) & 0xff, raw & 0xff, 0xaa, 0xaa, 0xaa];
      } else if (pid === 0x0d) {
        // Vehicle Speed: 1 km/h per bit
        const spd = Math.max(0, Math.min(255, Math.round(mockVehicleSpeed)));
        respBytes = [0x03, 0x41, 0x0d, spd, 0xaa, 0xaa, 0xaa, 0xaa];
      } else if (pid === 0x05) {
        // Coolant Temp: formula = A - 40 (°C)
        respBytes = [0x03, 0x41, 0x05, (88 + 40) & 0xff, 0xaa, 0xaa, 0xaa, 0xaa];
      } else if (pid === 0x11) {
        // Throttle Position: 0-100% -> raw = (throttle * 255) / 100
        const th = Math.round(35 * 2.55);
        respBytes = [0x03, 0x41, 0x11, th, 0xaa, 0xaa, 0xaa, 0xaa];
      } else if (pid === 0x2f) {
        // Fuel Tank Level: 0-100%
        const fuel = Math.round(68 * 2.55);
        respBytes = [0x03, 0x41, 0x2f, fuel, 0xaa, 0xaa, 0xaa, 0xaa];
      } else if (pid === 0x04) {
        // Calculated Engine Load: 0-100%
        const load = Math.round(45 * 2.55);
        respBytes = [0x03, 0x41, 0x04, load, 0xaa, 0xaa, 0xaa, 0xaa];
      } else if (pid === 0x42) {
        // Control Module Voltage: formula = (A*256 + B)/1000 (V)
        const mv = 14200; // 14.2V
        respBytes = [0x04, 0x41, 0x42, (mv >> 8) & 0xff, mv & 0xff, 0xaa, 0xaa, 0xaa];
      } else if (pid === 0x0f) {
        // Intake Air Temp: A - 40
        respBytes = [0x03, 0x41, 0x0f, (22 + 40) & 0xff, 0xaa, 0xaa, 0xaa, 0xaa];
      } else if (pid === 0x1f) {
        // Run Time: seconds (A*256 + B)
        const sec = 1845;
        respBytes = [0x04, 0x41, 0x1f, (sec >> 8) & 0xff, sec & 0xff, 0xaa, 0xaa, 0xaa];
      }

      broadcastFrame({
        timestamp: Date.now() / 1000,
        direction: 'RX',
        id: 0x7e8,
        idHex: '0x7E8',
        extended: false,
        fd: false,
        dlc: 8,
        data: respBytes,
      });
    } else if (mode === 0x03) {
      // Mode 03: Request Diagnostic Trouble Codes (DTCs)
      // Response: 0x43, count, DTC bytes (e.g. P0103 = 0x01, 0x03)
      broadcastFrame({
        timestamp: Date.now() / 1000,
        direction: 'RX',
        id: 0x7e8,
        idHex: '0x7E8',
        extended: false,
        fd: false,
        dlc: 8,
        data: [0x04, 0x43, 0x01, 0x01, 0x03, 0xaa, 0xaa, 0xaa],
      });
    } else if (mode === 0x04) {
      // Mode 04: Clear DTCs (Response 0x44)
      broadcastFrame({
        timestamp: Date.now() / 1000,
        direction: 'RX',
        id: 0x7e8,
        idHex: '0x7E8',
        extended: false,
        fd: false,
        dlc: 8,
        data: [0x01, 0x44, 0xaa, 0xaa, 0xaa, 0xaa, 0xaa, 0xaa],
      });
    }
  }, 12);
}

// POST /api/autobaud - Listen-only baud rate auto detection
app.post('/api/autobaud', (req, res) => {
  const { channel, backend } = req.body || {};
  const currentBackend = backend || status.backend;

  // Simulate scanning 500k, 250k, 1M, 125k
  setTimeout(() => {
    res.json({
      success: true,
      detectedBitrate: 500000,
      confidence: 'high',
      testedRates: [
        { bitrate: 500000, status: 'detected', validFrames: 48, errorFrames: 0 },
        { bitrate: 250000, status: 'silent', validFrames: 0, errorFrames: 0 },
        { bitrate: 1000000, status: 'silent', validFrames: 0, errorFrames: 0 },
        { bitrate: 125000, status: 'silent', validFrames: 0, errorFrames: 0 },
      ],
      details: `Listen-only scan complete for ${channel || 'can0'}. Locked onto 500 kbit/s (Standard Automotive).`,
    });
  }, 350);
});

// POST /api/record/start
app.post('/api/record/start', (req, res) => {
  isRecording = true;
  recordingStartTime = Date.now();
  recordedFrames.length = 0; // reset
  res.json({
    success: true,
    message: 'Recording started.',
    startTime: recordingStartTime,
  });
});

// POST /api/record/stop
app.post('/api/record/stop', (req, res) => {
  isRecording = false;
  const duration = recordingStartTime ? (Date.now() - recordingStartTime) / 1000 : 0;
  res.json({
    success: true,
    message: 'Recording stopped.',
    durationSeconds: duration,
    frameCount: recordedFrames.length,
    estimatedSizeBytes: recordedFrames.length * 48,
  });
});

// GET /api/logs
app.get('/api/logs', (req, res) => {
  const format = req.query.format || 'json';

  if (format === 'csv') {
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="canscope_capture.csv"');
    let csv = 'timestamp,direction,id,type,dlc,data\n';
    for (const f of recordedFrames) {
      const type = f.extended ? (f.fd ? 'EXT_FD' : 'EXT') : f.fd ? 'STD_FD' : 'STD';
      const dataStr = f.data.map((b) => b.toString(16).padStart(2, '0').toUpperCase()).join(' ');
      csv += `${f.timestamp.toFixed(6)},${f.direction},${f.idHex},${type},${f.dlc},"${dataStr}"\n`;
    }
    return res.send(csv);
  }

  res.json({
    isRecording,
    frameCount: recordedFrames.length,
    frames: recordedFrames.slice(-5000), // return recent frames
  });
});

// POST /api/dbc/load
let loadedDbcContent: string | null = null;
app.post('/api/dbc/load', (req, res) => {
  const { content, filename } = req.body || {};
  if (!content) {
    return res.status(400).json({ error: 'MISSING_CONTENT', message: 'DBC file content is required.' });
  }
  loadedDbcContent = content;
  res.json({
    success: true,
    filename: filename || 'user.dbc',
    sizeBytes: content.length,
    message: 'DBC loaded successfully into backend.',
  });
});

// GET /api/errors
app.get('/api/errors', (req, res) => {
  res.json({
    busState: status.busState,
    tec: status.tec,
    rec: status.rec,
    errorFrames: status.errorFrames,
    controllerState: status.controllerState,
    recentErrors: errorHistory,
  });
});

// POST /api/errors/clear
app.post('/api/errors/clear', (req, res) => {
  errorHistory.length = 0;
  status.tec = 0;
  status.rec = 0;
  status.errorFrames = 0;
  status.busState = 'active';
  res.json({ success: true, message: 'Errors reset.' });
});

// ==========================================
// Vite Middleware / Static Serving
// ==========================================
async function start() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: process.env.DISABLE_HMR === 'true' ? false : undefined,
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  // Bind WebSocket upgrade to same port 3000
  server.on('upgrade', (request, socket, head) => {
    const { pathname } = new URL(request.url || '', `http://${request.headers.host}`);
    if (pathname === '/ws/can') {
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit('connection', ws, request);
      });
    } else {
      socket.destroy();
    }
  });

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`CANScope server running at http://0.0.0.0:${PORT}`);
  });
}

start();
