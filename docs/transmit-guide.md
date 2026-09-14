# CANScope Transmit Engine & Periodic Simulation Guide

This guide describes how to configure, simulate, and transmit custom CAN and CAN-FD messages using **CANScope**.

---

## 1. Overview of the Transmit Module

The Transmit module allows automotive and embedded engineers to inject messages into the CAN bus for:
- ECU functional testing and bench verification.
- Diagnostic request simulation (e.g. OBD-II PIDs, UDS diagnostic sessions).
- Vehicle node emulation (e.g. broadcasting simulated speed, RPM, or BMS status).
- End-to-end latency testing.

---

## 2. Single-Shot Manual Transmission

Use the **Manual Single-Shot Transmission** section to send one frame on demand.

### Parameters:
- **CAN ID**: Enter in hexadecimal (e.g., `0x7DF` for OBD-II functional broadcast, `0x18DA00F1` for 29-bit UDS request).
- **Extended ID (29-bit)**: Toggle to switch between standard 11-bit CAN 2.0A IDs (`0x000` to `0x7FF`) and 29-bit CAN 2.0B extended identifiers (`0x00000000` to `0x1FFFFFFF`).
- **CAN-FD Mode**: Check to transmit flexible data-rate frames with payloads up to 64 bytes.
- **BRS (Bit Rate Switch)**: When CAN-FD is active, enables high-speed data phase transmission (e.g. 2 Mbps or 5 Mbps).
- **DLC (Data Length Code)**: Standard lengths: `0` to `8` bytes for Classic CAN; up to `64` bytes for CAN-FD.
- **Payload Data (Hex)**: Space-separated hexadecimal bytes, for example:
  ```text
  02 01 0C 00 00 00 00 00
  ```
  *(OBD-II Service 01, PID 0C Engine RPM request)*

### How to Transmit:
1. Ensure the bus is **Connected** and **Listen-Only Mode is OFF**.
2. Click **Send Frame**.
3. The transmitted frame will be tagged with a blue `TX` indicator in the live sniffer.

---

## 3. Periodic Message Transmission (Cyclic Simulation)

Modern automotive ECUs expect periodic cyclic broadcasts (e.g., every 10 ms, 50 ms, or 100 ms). CANScope includes a dedicated multi-task periodic scheduler.

### Creating a Periodic Transmission Task:
1. In the **Periodic Transmission Tasks** table, click **Add Task**.
2. Set a human-readable **Task Name** (e.g., `Simulated Diagnostic Tester Present` or `Heartbeat Broadcast`).
3. Set the **CAN ID** (e.g., `0x7E0` or `0x300`).
4. Choose **Period (ms)**:
   - `10 ms`: Fast dynamics (chassis control, throttle position).
   - `20 ms` - `50 ms`: Engine status, vehicle speed.
   - `100 ms`: General status, temperature metrics.
   - `1000 ms` - `2000 ms`: Slow heartbeats, diagnostic keep-alive (`02 3E 80 ...`).
5. Enter the hex payload string.
6. Click the green **Start** icon next to the task to activate transmission.
7. Click the red **Stop** icon to pause cyclic sending.

### Global Task Controls:
- **Start All**: Commences all configured periodic tasks simultaneously.
- **Stop All**: Immediately halts all periodic transmissions.

---

## 4. Listen-Only Safety Interlock

> **Safety Notice**: When your CAN interface is connected in **Listen-Only Mode**, transmission is physically or logically inhibited by the controller to prevent disrupting operational vehicle networks.
> 
> If you attempt to transmit while in Listen-Only mode:
> - CANScope displays a warning banner.
> - Transmission buttons are disabled.
> - To enable transmission, disconnect the bus, uncheck **Listen-Only Mode** in the connection dialog, and reconnect.
