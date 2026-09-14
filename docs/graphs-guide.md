# CANScope Real-Time Oscilloscope & Signal Graphing Guide

This guide describes how to configure, visualize, and analyze continuous time-series signal waveforms extracted from live CAN bus messages.

---

## 1. Overview of the Graphs Module

The **Graphs** view acts as a multi-channel digital oscilloscope for automotive CAN bus signals. It decodes raw hexadecimal payloads into real-world physical values (such as RPM, vehicle speed, coolant temperature, or battery voltage) and plots them continuously across a rolling time window.

---

## 2. Choosing What to Plot

The Graphs view provides two flexible extraction modes:

### Mode A: DBC Physical Signal Plotting (Recommended)
When a DBC database or Custom JSON Schema is loaded:
1. Select the target **CAN ID** from the dropdown list (e.g., `0x123 - Engine_Data`).
2. Choose **DBC Signal** as the plot source.
3. Select the specific signal from the dropdown (e.g., `Engine_RPM`, `Vehicle_Speed`, or `Throttle_Pos`).
4. CANScope applies the signal's conversion formula:
   $$\text{Physical Value} = (\text{Raw Value} \times \text{Scale}) + \text{Offset}$$
5. The Y-axis automatically formats with the signal's native engineering unit (`rpm`, `km/h`, `°C`, `V`, `bar`).

### Mode B: Raw Payload Byte Tracking
If no DBC is available or when reverse-engineering unknown proprietary messages:
1. Select the target **CAN ID**.
2. Select **Raw Byte** as the plot source.
3. Choose the byte index (`Byte 0` through `Byte 7` or up to `Byte 63` on CAN-FD).
4. The chart plots the raw unsigned 8-bit integer value ($0 \dots 255$) as it evolves over time.

---

## 3. Scope Controls & Display Options

- **Time Window**: Select the visible horizontal time horizon (`5s`, `15s`, `30s`, or `60s`). Shorter windows show micro-transients; longer windows reveal macro trends.
- **Pause Graph**: Freeze the scope display to inspect a transient waveform, spike, or glitch without losing the current data window.
- **Clear Plot**: Discards existing plot points and restarts waveform accumulation.
- **Live Legend & Cursor Readout**: Hovering over the waveform reveals the exact timestamp (down to millisecond resolution) and decoded physical value.

---

## 4. Launching Directly from the Messages Catalog

To quickly graph any signal without manually entering its CAN ID:
1. Open the **Messages** page in the left sidebar.
2. Locate the message or signal you want to inspect.
3. Click the **Graph Signal** icon (line chart icon).
4. CANScope immediately switches to the Oscilloscope view with that message and signal pre-selected and focused.
