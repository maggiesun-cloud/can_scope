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
     - `virtual`: Built-in zero-hardware simulation bus with realistic vehicle powertrain and sensor traffic.
   - **Configure Bitrate**:
     - Choose nominal bitrate (e.g., `500,000` bps for standard automotive or `250,000` bps for J1939).
   - **CAN-FD (Optional)**:
     - Enable CAN-FD and configure the secondary data bitrate (e.g., `2,000,000` or `5,000,000` bps).
   - **Listen-Only Mode (Recommended for passive sniffing)**:
     - Check **Listen-Only Mode** to prevent the CAN controller from sending Acknowledge (ACK) bits or error frames, ensuring 100% passive, non-intrusive monitoring.
4. Click **Connect Interface**.
5. The top status bar will change to a green **Connected** badge displaying real-time bus load, message rate (msg/s), and frame counts.

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
