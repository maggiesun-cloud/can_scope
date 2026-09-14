# CANScope Sniffer Operation & Control Guide

This guide details how to operate, start, pause, stop, filter, and record CAN and CAN-FD bus traffic using the **CANScope Sniffer**.

---

## 1. Quick Reference: Sniffer Actions & Keyboard Shortcuts

| Action | Interface Method | Keyboard Shortcut | Function |
| :--- | :--- | :--- | :--- |
| **Pause / Resume Sniffer** | Click **Pause / Resume** in Monitor toolbar | `Space` | Freezes or unfreezes live frame rendering |
| **Start / Stop Bus Traffic** | Click **Connect / Disconnect** in Top Status Bar | — | Opens or closes hardware CAN interface driver |
| **Start / Stop Recording** | Click **Start / Stop Recording** in Logging page | `R` | Captures trace session for `.blf`, `.asc`, `.csv` |
| **Clear Frame Buffer** | Click **Clear** (trash icon) in Monitor toolbar | `C` | Clears current frame table and restarts counters |
| **Toggle Auto-Scroll** | Click **Auto-Scroll** in Monitor toolbar | — | Locks viewport to the newest incoming frame |
| **Dismiss Modal** | Click outside modal or press `Esc` | `Esc` | Closes any open dialog or details view |

*Note: Keyboard shortcuts are active globally when your cursor is not focused inside a text input or textarea.*

---

## 2. Starting & Stopping the Bus Hardware Connection

Before traffic can be sniffed, CANScope must attach to an active CAN interface.

### How to Start Sniffing from Hardware:
1. Locate the **Top Status Bar** at the top of the window, or click **Configure Connection** on the **Dashboard**.
2. Click the **Connect** button (or the connection status indicator).
3. In the **CAN Interface Configuration** dialog:
   - **Select Backend**:
     - `pcan`: For PEAK-System USB adapters on Linux or macOS (`PCAN_USBBUS1`, `PCAN_USBBUS2`).
     - `socketcan`: For Linux native CAN controllers (`can0`, `can1`) or virtual busses (`vcan0`).
     - `mock`: Built-in zero-hardware simulation bus with realistic vehicle powertrain and sensor traffic.
   - **Select Channel / Port (Multi-Channel Support)**:
     - See [Section 2.1: Multi-Channel Port Selection](#21-multi-channel-port-selection) below.
   - **Configure Nominal Bitrate (500k vs 1M)**:
     - See [Section 2.2: Bitrate Configuration](#22-bitrate-configuration-500k-vs-1-million) below.
   - **CAN-FD (Optional)**:
     - Enable CAN-FD and configure the secondary data bitrate (e.g., `2,000,000` or `5,000,000` bps).
   - **Listen-Only Mode (Recommended for passive sniffing)**:
     - Check **Listen-Only Mode** to prevent the CAN controller from sending Acknowledge (ACK) bits or error frames, ensuring 100% passive, non-intrusive monitoring.
4. Click **Connect to Bus**.
5. The top status bar will change to a green **Connected** badge displaying real-time bus load, message rate (msg/s), and frame counts.

### 2.1 Multi-Channel Port Selection

If your hardware CAN interface supports multiple physical ports (e.g., dual-channel PEAK PCAN-USB Pro, dual CANable, Kvaser 2x/4x, InnoMaker USB-CAN Dual):

| Operating System & Driver | Channel 1 | Channel 2 | Channel 3 / 4 | Custom / Virtual |
| :--- | :--- | :--- | :--- | :--- |
| **Linux (SocketCAN)** | `can0` | `can1` | `can2`, `can3` | `vcan0`, `slcan0` |
| **macOS / Windows (PEAK PCAN)** | `PCAN_USBBUS1` | `PCAN_USBBUS2` | `PCAN_USBBUS3`, `PCAN_USBBUS4` | `PCAN_LANBUS1` |
| **Simulator (Zero Hardware)** | `mock0` | `mock1` | — | `mock0` |

#### How to Switch Channels in CANScope:
1. Click **Disconnect** in the top bar if currently running.
2. Click **Connect** to open the **CAN Bus Interface Configuration** modal.
3. In the **Channel / Node** field:
   - **Auto-Detected**: If your OS reports multiple channels, select from the dropdown (e.g. `can1 (SocketCAN Device)` or `PCAN_USBBUS2`).
   - **Manual Port Entry**: If not auto-detected or using an external bridge, click the text input and directly type the interface identifier (e.g., `can1`, `PCAN_USBBUS2`, `vcan1`).
4. Click **Connect to Bus**. The top status badge will immediately update to show the active channel.

### 2.2 Bitrate Configuration (500k vs. 1 Million)

CAN is a synchronous shared-bus protocol. **All physical nodes connected to the same CAN bus must operate at the exact same nominal bitrate**. If there is a baud rate mismatch, transceivers will interpret incoming bits as frame format violations and spam Error Frames on the wire.

| Nominal Bitrate | Standard Use Cases | Typical Bus Length | Characteristics |
| :--- | :--- | :--- | :--- |
| **500 kbit/s (Standard)** | OBD-II Diagnostics, High-Speed Powertrain, Modern Passenger Cars (ISO 11898-2) | ≤ 100 meters | Standard in automotive passenger vehicles; balances electromagnetic immunity and throughput. |
| **1 Mbit/s (1 Million)** | High-Performance Motorsport, Robotics, Internal ECU testbenches, Aerospace (CANopen) | ≤ 25–40 meters | Maximum standard ISO 11898-1 rate. Requires clean wiring and 120 Ω termination resistors at both bus ends. |
| **250 kbit/s** | Heavy-Duty Trucks & Commercial Vehicles (SAE J1939), Marine (NMEA 2000), Agriculture (ISOBUS) | ≤ 250 meters | Maximum cable distance with high noise rejection. |
| **125 kbit/s** | Low-Speed Body CAN, Infotainment, Climate controls, Older architectures | ≤ 500 meters | Highly fault-tolerant. |

#### How to Change the Sniffer Bitrate in CANScope:
1. Disconnect the active sniffer by clicking **Disconnect** in the top status bar.
2. Click **Connect** in the top status bar.
3. In the **Nominal Bitrate** dropdown, select:
   - `500 kbit/s (Standard)` for standard automotive/OBD-II buses.
   - `1 Mbit/s` for 1-million bps high-speed/robotics setups.
4. If using **CAN-FD**, check **Enable CAN-FD Flexible Data-Rate** to configure the accelerated payload data phase (`2 Mbit/s`, `4 Mbit/s`, or `5 Mbit/s`).
5. Click **Connect to Bus**. The status bar badge will reflect the new bitrate (e.g., `500k` or `1.0M`).

### How to Stop Sniffing from Hardware:
1. In the **Top Status Bar**, click the red **Disconnect** button.
2. The hardware CAN channel is gracefully closed, stopping all reception and background polling threads.

---

## 3. Pausing & Resuming the Live Sniffer View

While connected to a high-speed CAN bus (e.g., 2,000+ msg/s), new frames arrive too quickly to read manually. The **Pause** feature lets you freeze the display without dropping data in the background.

### How to Pause:
- Click the amber **Pause** button in the **Monitor** toolbar, OR
- Press the **`Spacebar`** on your keyboard.

### What Happens When Paused:
- The screen freezes at the exact moment of pausing.
- Incoming frames are still received by the background ring buffer so you do not miss packets.
- You can freely scroll up and down, click on individual frames to inspect their DLC, bit flags (IDE, RTR, BRS, ESI), and decoded DBC signals.
- Auto-scroll is temporarily suspended.

### How to Resume:
- Click the green **Resume** button, OR
- Press the **`Spacebar`** again.
- The view will re-synchronize to live streaming.

---

## 4. Starting & Stopping Session Recording (Log Capture)

When you need to export or archive a specific test run (e.g., driving cycle, diagnostic handshake, or bench test), use the **Logging** module.

### How to Start Recording:
1. Navigate to the **Logging** page in the left sidebar (or press `R` from any screen).
2. Configure your file format:
   - **Vector BLF (`.blf`)**: Industry standard binary log with microsecond accuracy.
   - **Vector ASC (`.asc`)**: Standard ASCII format compatible with CANoe, CANalyzer, and PCAN-Trace.
   - **CSV (`.csv`)**: Spreadsheets and data science pipelines.
   - **PEAK TRC (`.trc`)**: Native PCAN-View trace format.
3. Click **Start Recording** (or press **`R`**).
4. The recording timer and captured frame counter will increment in real time.

### How to Stop Recording:
1. Click **Stop Recording** (or press **`R`**).
2. Click **Download Log** to save the file to your computer, or click **Save to History** to store it in your browser's persistent IndexedDB cache for later offline playback.

---

## 5. Sniffer Filtering & Search

The Monitor view includes comprehensive filtering controls to isolate specific messages:

- **Direction Filter**: Switch between `All`, `RX` (Received), or `TX` (Transmitted).
- **Protocol Filter**: Switch between `All`, `Classic CAN (11/29-bit)`, or `CAN-FD (up to 64 bytes)`.
- **CAN ID Range**: Enter minimum and maximum IDs in decimal or hex (e.g., `0x100` to `0x200`).
- **Real-Time Search**: Filter on message names, hexadecimal payload bytes, or decoded physical signal values.
- **Auto-Scroll**: Toggle on or off to follow live traffic or hold your scroll position.
