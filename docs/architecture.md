# CANScope System Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                  CANScope React Web UI                       │
│    (High-throughput sniffer, Graphing, DBC, Transmit, Errors)│
└──────────────────────────────┬───────────────────────────────┘
                               │
               REST APIs + WebSocket (/ws/can)
                               │
┌──────────────────────────────▼───────────────────────────────┐
│               FastAPI / Express Backend Service              │
│        (Hardware Detection, State Management, Buffer)        │
└──────────────────────────────┬───────────────────────────────┘
                               │
┌──────────────────────────────▼───────────────────────────────┐
│                    CAN Interface Manager                     │
│               (Hardware Abstraction Layer)                   │
└──────────────┬───────────────┼────────────────┬──────────────┘
               │               │                │
               ▼               ▼                ▼
     ┌─────────────────┐ ┌───────────┐ ┌─────────────────┐
     │SocketCanDriver  │ │PcanDriver │ │MockCanInterface │
     │(Linux SocketCAN)│ │(python-can│ │(Multi-ECU       │
     │                 │ │ PCAN)     │ │ Simulation)     │
     └────────┬────────┘ └─────┬─────┘ └─────────────────┘
              │                │
              ▼                ▼
     ┌─────────────────┐ ┌───────────┐
     │Linux Kernel CAN │ │PEAK PCAN  │
     │(can0, vcan0)    │ │USB Driver │
     └─────────────────┘ └───────────┘
```

## 1. Hardware Abstraction Layer (HAL)
All hardware adapters implement the unified `CanInterface` abstraction:
- `connect(config)`
- `disconnect()`
- `configure(config)`
- `start()` / `stop()`
- `receive(timeout)`
- `send(message)`
- `get_status()`

No OS-specific assumptions, hardcoded driver paths, library filenames, or device paths exist in the presentation layer.

## 2. Common Frame Model
Every backend converts raw frames into the canonical `CanFrame` specification:
```typescript
interface CanFrame {
  timestamp: number;
  direction: "RX" | "TX";
  id: number;
  idHex: string;
  extended: boolean;
  fd: boolean;
  brs?: boolean;
  esi?: boolean;
  dlc: number;
  data: number[];
}
```

## 3. High-Rate Real-Time Streaming
- The backend produces continuous frame streams over standard WebSockets (`/ws/can`).
- The frontend batches updates into an atomic buffer and renders through a high-performance virtualized viewport to preserve 60fps UI responsiveness under heavy traffic (>5,000 fps).

## 4. DBC Decoding Subsystem
- Modular DBC parser extracts message IDs and signal specifications (Intel little-endian & Motorola big-endian).
- Real-time decoder computes scaled physical values (`val * factor + offset`) and units.
