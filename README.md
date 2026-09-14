# CANScope

> **Professional Browser-Based CAN & CAN-FD Bus Monitoring, Sniffing, Decoding, Graphing, and Transmission Application**

CANScope delivers the functionality and high density of classic desktop CAN analyzers (such as PCAN-View and CANoe) within a modern, responsive web application. It communicates through a backend hardware abstraction layer with dynamic device discovery, supporting **PCAN-USB on Linux and macOS**, **SocketCAN on Linux**, and **Mock CAN Mode** for zero-hardware simulation.

---

## Key Features

- **Dynamic Hardware Discovery**: Discovers operating system, CPU architecture, kernel SocketCAN interfaces, and PCAN hardware at runtime. No hard-coded driver paths, USB device paths, or vendor assumptions.
- **High-Performance CAN Sniffer**: Virtualized message table supporting 50,000+ frames with real-time byte change highlighting, period/frequency calculation, and deep filtering.
- **DBC Decoding**: Drag & drop `.dbc` network database loader with automatic message & signal extraction (supports both Intel little-endian and Motorola big-endian).
- **Real-Time Signal Graphing**: 60fps waveform oscilloscope for raw bytes, physical DBC signals, message frequencies, and counters.
- **CAN-FD Support**: Full support for flexible data-rate frames up to 64 bytes with Bit Rate Switch (BRS) and Error State Indicator (ESI).
- **Safe Transmission Controls**: Single-shot and periodic frame transmission (10ms to 1000ms) with explicit safety warnings and listen-only locks.
- **CAN Error & Bus Diagnostics**: Real-time Transmit Error Counter (TEC), Receive Error Counter (REC), and bus state tracking (Active, Warning, Passive, Bus-Off).
- **Logging & Export**: Live recording buffer with export to standard CSV (`timestamp,direction,id,type,dlc,data`) and JSON.

---

## Architecture Overview

```
Frontend (React + Vite + Tailwind + WebSockets)
       │
       ▼ REST & /ws/can
Backend Server (FastAPI / Express Hardware Gateway)
       │
       ▼ CanManager (Hardware Abstraction Layer)
 ┌─────┴───────────────┬─────────────────┐
 ▼                     ▼                 ▼
SocketCAN (Linux)     PCAN (Linux/macOS) Mock (Simulator)
```

The browser communicates exclusively through REST endpoints and the real-time WebSocket. Hardware-specific libraries and drivers remain strictly isolated in the backend.

---

## Installation & Setup

### 1. Prerequisites
- **Node.js**: v18+ or v20+
- **Python**: 3.10+ (for native Python backend usage)

### 2. Frontend & Node Gateway Installation
```bash
npm install
npm run dev
```
The application opens at `http://localhost:3000`.

### 3. Python FastAPI Backend Installation (Optional Native Server)
```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python main.py
```

---

## Real Hardware Configuration

### Linux + SocketCAN (PCAN-USB or Virtual CAN)
1. Verify device connection via kernel logs:
   ```bash
   dmesg | grep -i pcan
   ```
2. Identify the assigned network interface name (e.g., `can0`, `can1`):
   ```bash
   ip link show type can
   ```
3. Bring the interface up with the desired nominal bitrate (e.g., 500 kbit/s):
   ```bash
   sudo ip link set can0 up type can bitrate 500000
   ```
4. For CAN-FD interfaces:
   ```bash
   sudo ip link set can0 up type can bitrate 500000 dbitrate 2000000 fd on
   ```
5. Verify on command line:
   ```bash
   candump can0
   ```
6. In CANScope, open **Connection Settings**, select **SocketCAN**, choose `can0`, and click **Connect**.

### macOS + PCAN-USB
1. Install the official PEAK PCAN-Basic driver or MacCAN library for macOS.
2. Connect your PCAN-USB adapter to an available USB port.
3. In CANScope, open **Connection Settings**, select **PCAN**, select the discovered channel (e.g. `PCAN_USBBUS1`), and click **Connect**.
4. If no driver is installed, CANScope will clearly inform you with diagnostic guidance and allow instant fallback to **Simulation Mode**.

### Simulation Mode (Mock CAN)
No hardware required! Select **Mock** in the connection dialog. The built-in multi-ECU simulator produces realistic:
- Powertrain status (0x100 @ 10ms / 100Hz)
- Vehicle dynamics (0x123 @ 20ms / 50Hz)
- EV Battery pack BMS (0x200 @ 50ms / 20Hz)
- ADAS Radar (0x456 @ 100ms / 10Hz)
- Body electronics (0x500 @ 500ms / 2Hz)
- CAN-FD test frames and occasional bus glitches.

---

## REST API Reference

| Endpoint | Method | Description |
|---|---|---|
| `/api/system` | `GET` | Runtime platform, CPU architecture, and driver discovery |
| `/api/status` | `GET` | Current bus load, FPS, total/RX/TX/error frame counters |
| `/api/interfaces` | `GET` | Discovered hardware channels and virtual adapters |
| `/api/connect` | `POST` | Connect to chosen interface, channel, and bitrate |
| `/api/disconnect` | `POST` | Terminate active connection |
| `/api/config` | `GET` | Retrieve active CAN configuration |
| `/api/configure` | `POST` | Reconfigure bitrate or listen-only mode |
| `/api/transmit` | `POST` | Transmit single-shot or periodic CAN/CAN-FD frame |
| `/api/record/start` | `POST` | Start traffic recording session |
| `/api/record/stop` | `POST` | Stop recording session |
| `/api/logs` | `GET` | Download captured traffic (`?format=csv` or `?format=json`) |
| `/api/dbc/load` | `POST` | Upload and parse Vector `.dbc` file |
| `/api/errors` | `GET` | Query bus state and controller error frame history |

---

## WebSocket Stream

Connect to:
```
ws://localhost:3000/ws/can
```
Payload schema:
```json
{
  "timestamp": 1757801234.123,
  "direction": "RX",
  "id": 291,
  "idHex": "0x123",
  "extended": false,
  "fd": false,
  "dlc": 8,
  "data": [1, 2, 3, 4, 5, 6, 7, 8]
}
```

---

## Keyboard Shortcuts

- `Space`: Pause / Resume live sniffer
- `C`: Clear monitor buffer
- `R`: Start / Stop recording session
- `F`: Focus ID and payload filter
- `Esc`: Close open modal panels
