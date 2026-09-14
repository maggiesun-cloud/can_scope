# CANScope

> **Professional Browser-Based CAN & CAN-FD Bus Monitoring, Sniffing, Decoding, Graphing, and Transmission Application**

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Node: v18+](https://img.shields.io/badge/Node.js-18%2B-green.svg)](https://nodejs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-blue.svg)](https://www.typescriptlang.org)
[![CAN Support](https://img.shields.io/badge/CAN-Standard%20%7C%20Extended%20%7C%20CAN--FD-orange.svg)](#key-features)
[![Platforms](https://img.shields.io/badge/Hardware-SocketCAN%20%7C%20PCAN%20%7C%20Simulator-brightgreen.svg)](#real-hardware-configuration)

CANScope delivers the functionality and high density of classic desktop CAN analyzers (such as PCAN-View and CANoe) within a modern, responsive web application. It communicates through a backend hardware abstraction layer with dynamic device discovery, supporting **PCAN-USB on Linux and macOS**, **SocketCAN on Linux**, and a **Built-in Mock CAN Simulator** for instant testing without any physical hardware.

---

## ⚡ 1-Command Quick Start

You can clone and launch the complete application with **one single command**:

```bash
git clone https://github.com/maggiesun-cloud/can_scope.git && cd can_scope && npm install && npm run dev
```

The application will immediately be running at **`http://localhost:3000`**!

> **No hardware or Python required to start:** The built-in simulator automatically generates multi-ECU powertrain, BMS, and sensor traffic with CAN-FD and error frames right away.

---

## 📦 One-Command Full Installation (From Source)

If you have already cloned the repository and want to install all required libraries in one step:

### Option A: Standard (Node.js Full-Stack App — Recommended)
```bash
npm install && npm run dev
```

### Option B: All-In-One Source Installer (Node.js + Optional Python Backend)
```bash
./setup.sh
# or:
npm run setup
```
This automated script verifies your environment, installs all Node.js dependencies, and optionally provisions a Python virtual environment with `python-can` if Python 3 is installed on your machine.

---

## 🏎️ Key Features

- **Dynamic Hardware Discovery**: Automatically probes the host OS, kernel SocketCAN interfaces, and PCAN hardware at runtime. No hard-coded driver paths or vendor locks.
- **Multi-Port & Multi-Channel Support**: Seamlessly switch between physical adapter ports (e.g. `can0` vs. `can1`, `PCAN_USBBUS1` vs. `PCAN_USBBUS2`).
- **Configurable Bitrates**: Full support for standard speeds: `125 kbit/s`, `250 kbit/s` (SAE J1939), `500 kbit/s` (Standard Automotive OBD-II), and `1 Mbit/s` (Motorsport / Robotics), plus secondary CAN-FD data bitrates up to `8 Mbit/s`.
- **High-Performance CAN Sniffer**: Virtualized table supporting 50,000+ frames with real-time byte change highlighting, frequency counters, and pause/resume buffers.
- **DBC Decoding**: Drag & drop Vector `.dbc` network database loader with automatic message and signal extraction (both Intel little-endian and Motorola big-endian).
- **Real-Time Waveform Oscilloscope**: 60fps continuous signal plotting for physical DBC values, raw bytes, and message frequencies.
- **CAN-FD Support**: Complete support for flexible data-rate frames up to 64 bytes with Bit Rate Switch (BRS) and Error State Indicator (ESI).
- **Safe Transmission Engine**: Single-shot and periodic cyclic frame injection (10ms to 2000ms) with safety locks and payload validation.
- **CAN Diagnostics & Error Telemetry**: Real-time Transmit Error Counter (TEC), Receive Error Counter (REC), and bus state tracking (Active, Warning, Passive, Bus-Off).
- **Export & Offline Recording**: Export captured traces to standard CSV, JSON, and IndexedDB local browser storage.

---

## 🛠️ Architecture Overview

```
Frontend (React 19 + Vite + Tailwind CSS + WebSockets)
       │
       ▼ REST API & /ws/can (Port 3000)
Backend Server (Express Full-Stack / tsx / Optional FastAPI Gateway)
       │
       ▼ Hardware Abstraction Layer (HAL)
 ┌─────┴──────────────────┬──────────────────────┐
 ▼                        ▼                      ▼
SocketCAN (Linux)        PCAN (macOS / Linux)    Mock CAN (Simulation)
`can0`, `can1`, `vcan0`  `PCAN_USBBUS1`, etc.    Multi-ECU Simulation
```

The browser communicates exclusively through REST endpoints and the real-time WebSocket. Hardware-specific libraries and drivers remain strictly isolated in the backend.

---

## ⚙️ Real Hardware Configuration

### 1. Nominal Bitrates: 500 kbit/s vs. 1 Mbit/s

> **Crucial Rule:** All nodes connected to the same physical CAN bus must share the exact same nominal bitrate. If the bitrate is mismatched, the transceiver will detect bit timing violations and transmit Error Frames, placing the node into *Error Passive* or *Bus-Off* state.

| Nominal Bitrate | Primary Use Cases | Max Recommended Bus Length | Notes |
| :--- | :--- | :--- | :--- |
| **500 kbit/s (Standard)** | Passenger cars, OBD-II diagnostic ports, automotive powertrain | ≤ 100 meters | Most common automotive rate; optimal balance of noise rejection and speed. |
| **1 Mbit/s (1 Million)** | Motorsport ECUs, industrial robotics (CANopen), testbenches | ≤ 25–40 meters | Maximum ISO 11898-1 standard rate; requires clean wiring & dual 120 Ω bus termination. |
| **250 kbit/s** | Commercial heavy-duty trucks (SAE J1939), marine (NMEA 2000) | ≤ 250 meters | High noise immunity for long cable runs. |
| **125 kbit/s** | Body electronics, climate controls, older vehicle architectures | ≤ 500 meters | Fault-tolerant low-speed CAN. |

#### How to change bitrate in CANScope:
1. Click **Disconnect** in the top status bar (if connected).
2. Click **Connect** to open the **CAN Bus Interface Configuration** dialog.
3. In the **Nominal Bitrate** dropdown, select `500 kbit/s (Standard Automotive / OBD-II)` or `1 Mbit/s (1 Million / Motorsport / Robotics)`.
4. Click **Connect to Bus**. The top bar badge will immediately reflect the new rate (e.g. `500k` or `1.0M`).

---

### 2. Multi-Channel CAN Devices (Selecting Ports)

If your CAN adapter has multiple physical channels (e.g., dual-port PCAN-USB Pro, dual CANable, Kvaser 2x/4x, InnoMaker USB-CAN Dual):

| Operating System | Channel 1 | Channel 2 | Channel 3 / 4 | Virtual / Custom |
| :--- | :--- | :--- | :--- | :--- |
| **Linux (SocketCAN)** | `can0` | `can1` | `can2`, `can3` | `vcan0`, `slcan0` |
| **macOS / Windows (PCAN)** | `PCAN_USBBUS1` | `PCAN_USBBUS2` | `PCAN_USBBUS3` | `PCAN_LANBUS1` |
| **Simulation Mode** | `mock0` | `mock1` | — | `mock0` |

#### How to switch ports in CANScope:
1. In the **CAN Bus Interface Configuration** dialog, look at the **Channel / Node** field.
2. **Detected Channels**: Select your desired channel from the dropdown (e.g., `can0` or `can1`).
3. **Manual Port Entry**: If your port isn't automatically listed, type the channel name directly into the box (e.g. `can1` or `PCAN_USBBUS2`).
4. Click **Connect to Bus**. The top bar will display the active channel.

---

### 3. Linux Setup (SocketCAN)

1. Check kernel detection:
   ```bash
   dmesg | grep -i -E "can|pcan"
   ```
2. Check available network interfaces:
   ```bash
   ip link show type can
   ```
3. Bring up the interface with your desired speed (e.g. 500k or 1M):
   ```bash
   # 500 kbit/s
   sudo ip link set can0 up type can bitrate 500000

   # Or 1 Mbit/s
   sudo ip link set can0 up type can bitrate 1000000
   ```
4. For CAN-FD devices:
   ```bash
   sudo ip link set can0 up type can bitrate 500000 dbitrate 2000000 fd on
   ```
5. In CANScope, choose **SocketCAN**, select `can0` (or `can1`), and click **Connect**.

---

### 4. macOS Setup (PCAN-USB)

For full step-by-step instructions, see the [macOS Setup Guide](docs/macos-setup.md).

1. Install the PEAK PCAN-Basic driver / MacCAN library (`libPCBUsb.dylib`).
2. Connect your PCAN-USB adapter to a USB port.
3. Install `python-can` with PCAN support:
   ```bash
   python3 -m pip install -U "python-can[pcan]"
   ```
4. In CANScope, choose **PCAN**, select `PCAN_USBBUS1` (or `PCAN_USBBUS2` for Port 2), and click **Connect**.

---

## ⌨️ Global Keyboard Shortcuts

| Shortcut | Action |
|---|---|
| `Space` | Pause / Resume live sniffer stream |
| `C` | Clear monitor frame buffer |
| `R` | Start / Stop recording session |
| `F` | Quick focus search & filter input |
| `Esc` | Close open modal dialogues |

---

## 📖 Complete Documentation Guides

Comprehensive documentation is available directly in the in-app **Documentation Hub** (`Docs` tab) and in standalone guides:

- **[Sniffer Operation & Controls Guide](docs/sniffer-guide.md)**: Bitrate configuration, multi-port selection, frame filtering, highlighting, and capture buffers.
- **[Transmit Engine & Periodic Simulation Guide](docs/transmit-guide.md)**: Single-shot injection, cyclic periodic schedulers (10ms–2000ms), standard/extended IDs, and CAN-FD Bit Rate Switching (BRS).
- **[Real-Time Oscilloscope & Signal Graphing Guide](docs/graphs-guide.md)**: Multi-channel continuous waveform plotting, DBC physical signal conversion with units, raw byte tracking, and rolling time windows.
- **[Visual Schema Editor & 64-Bit Matrix Guide](docs/visual-schema-guide.md)**: Interactive payload bit matrix, collision/overlap detection, Intel/Motorola endianness, live formula sandbox, and Vector `.dbc` / JSON export.
- **[Custom CAN JSON DBC Guide](docs/json-dbc-guide.md)**: Human-readable JSON schema specification for custom CAN ID signal decoding.
- **[Offline History Cache & Trace Replay Guide](docs/history-guide.md)**: Zero-cloud browser-local IndexedDB persistence, session tagging, BLF/ASC/CSV export, and offline post-mortem playback.
- **[CAN Bus Diagnostics & Error Frames Guide](docs/errors-guide.md)**: ISO 11898-1 fault confinement (Error Active, Error Passive, Bus-Off), TEC/REC counter telemetry, and physical 120 Ω bus termination checks.
- **[macOS & PCAN Setup Guide](docs/macos-setup.md)**: Driver and hardware verification for PEAK-System USB adapters on macOS.
- **[Linux SocketCAN & vcan Setup Guide](docs/linux-setup.md)**: Setting up Linux kernel SocketCAN interfaces, virtual CAN (`vcan0`), and terminal inspection with `can-utils`.
- **[Architecture Overview](docs/architecture.md)**: Technical breakdown of the dual-thread HAL and WebSocket streaming pipeline.

---

## 📄 License

MIT License. Free for automotive engineering, robotics, research, and production diagnostic use.
