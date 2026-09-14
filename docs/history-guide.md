# CANScope Offline History Cache & Trace Replay Guide

This guide explains how to store, manage, search, and replay captured CAN bus sessions using the browser-local **IndexedDB History Cache**.

---

## 1. Why Offline Browser Persistence?

In automotive engineering and embedded lab environments, vehicle telemetry data often contains sensitive intellectual property or operates in air-gapped test cells without internet connectivity.

CANScope implements a **zero-cloud, browser-local IndexedDB persistence engine**:
- **100% Client-Side Privacy**: Traces are stored strictly in your browser's private indexed database. No frame data is ever transmitted to remote cloud servers.
- **Large Trace Storage**: Holds dozens of sessions with hundreds of thousands of frames across test drives and dyno runs.
- **Offline Post-Mortem Analysis**: Reopen, filter, inspect, and graph historical captures without being connected to physical CAN hardware.

---

## 2. Saving a Capture Session

There are multiple ways to save active CAN traffic into the History Cache:
1. **From the Monitor Toolbar**: Click **Save to History** in the sniffer toolbar to snapshot the current frame buffer.
2. **From the Logging Module**: When stopping a recording run, click **Save to History**.
3. **Session Details**: You can attach:
   - **Session Name**: e.g., `Dyno_Pull_3_High_Boost` or `Cold_Weather_Start_Test`.
   - **Notes & Metadata**: Vehicle VIN, ECU calibration version, weather conditions, or ambient temperature.
   - **Tags**: Categorize traces with custom labels like `#engine`, `#abs`, `#diagnostics`.

---

## 3. Managing Cached Sessions in the History Hub

Open the **History Cache** page in the left sidebar:
- **Storage Metrics**: View used storage space (MB), percentage of browser quota used, and total captured frame count.
- **Search & Filters**: Search across session names, timestamps, notes, and tags.
- **Detail Inspection**: Click any session card to inspect frame counts, duration, CAN ID distribution, and message frequency statistics.
- **Exporting Files**: Export any saved historical session to Vector BLF (`.blf`), Vector ASC (`.asc`), or CSV (`.csv`) at any time.
- **Deletion & Cleanup**: Delete individual sessions or purge all cached data with one click.

---

## 4. Replaying a Saved Trace in the Sniffer & Graphs

To perform a post-mortem deep dive into a historical run:
1. Locate the desired session in the **History Cache**.
2. Click **Load into Monitor & Sniffer**.
3. CANScope populates the active frame buffer with the historical trace.
4. You can now:
   - Step through frames chronologically in the **Monitor**.
   - Decode messages with your loaded DBC database.
   - Switch to **Graphs** to plot the historical signals as continuous waveforms.
   - Run search filters to pinpoint anomalies or diagnostic trouble codes (DTCs).
