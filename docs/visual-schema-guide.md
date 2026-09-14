# CANScope Visual Custom Schema Editor & Bit Matrix Guide

This guide explains how to design, edit, test, and export custom CAN message schemas and signal layouts using the interactive **Visual Schema Designer** and **64-Bit Payload Allocation Matrix**.

---

## 1. Overview

While traditional Vector `.dbc` syntax (`BO_ ... SG_ ...`) is arcane and error-prone, CANScope provides a visual interface for constructing automotive and industrial CAN databases:
- **Interactive 64-Bit Allocation Matrix**: See exactly which bits and bytes each signal occupies.
- **Overlap & Collision Detection**: Conflicting bits are flagged in real time before saving.
- **Bi-directional Editing**: Changes in the visual designer update the JSON schema and Vector DBC representation instantaneously.
- **Live Math Sandbox**: Test your scale factor, offset, and signed two's-complement calculations with real-time numeric inputs.

---

## 2. Using the 64-Bit Allocation Matrix

The matrix visually renders the payload structure across Bytes 0 to 7:
- Each row represents one byte (`Byte 0` to `Byte 7`).
- Each column represents one bit (`Bit 7` down to `Bit 0`), following standard automotive big/little-endian bit grids.
- **Color Coding**: Each signal is rendered in a unique color so you can visualize signal spans across byte boundaries.
- **Start Bit Indicator**: The LSB (in Intel/Little-Endian) or MSB (in Motorola/Big-Endian) is marked with a distinctive anchor indicator.
- **Collision Detection**: If two signals share any bit positions, the conflicting cells turn bright red with an alert icon to prevent silent decoding corruption.
- **Click to Inspect**: Clicking any bit cell in the matrix immediately scrolls to and highlights that signal in the inspector form.

---

## 3. Signal Configuration Parameters

When adding or editing a signal, configure:
1. **Signal Name**: Alphanumeric identifier (e.g., `Battery_Pack_Voltage`, `Inverter_Temperature`).
2. **Start Bit (0-63)**: The starting bit position in the CAN frame payload.
3. **Bit Length (1-64)**: How many bits wide the signal is (e.g. 1 bit for boolean flags, 8/12/16 bits for analog sensors).
4. **Byte Order**:
   - **Little-Endian (Intel)**: Standard for modern automotive networks (least significant byte first).
   - **Big-Endian (Motorola)**: Common in European legacy ECUs (most significant byte first).
5. **Signed vs Unsigned**:
   - **Unsigned**: Standard positive integers ($0 \dots 2^N - 1$).
   - **Signed**: Two's-complement signed representation for values that can be negative (e.g. temperatures $-40 \dots +125^\circ\text{C}$, steering angles, torque).
6. **Scale & Offset Formula**:
   $$\text{Physical Value} = (\text{Raw Integer} \times \text{Scale}) + \text{Offset}$$
7. **Physical Limits (Min / Max)**: Valid engineering range boundaries.
8. **Engineering Units**: Select presets (`rpm`, `km/h`, `°C`, `V`, `mV`, `A`, `mA`, `%`, `bar`, `deg`, `Nm`, `kW`, `Hz`) or type custom units.

---

## 4. Live Formula & Math Sandbox

Before deploying a schema to live decoding, use the **Live Math Preview** card:
- Enter test raw integer values into the sandbox input field.
- The previewer computes the decoded value live using your specified scale and offset.
- Helps avoid common decimal scaling errors (e.g., scale factor `0.1` vs `0.01`).

---

## 5. Exporting & Activating Schemas

- **Apply to Live Decoder**: Instantly registers your active schema with the running CANScope sniffer. Incoming frames are immediately decoded without reloading the app.
- **Download JSON**: Saves the human-readable `.json` definition to your local filesystem.
- **Export Vector DBC**: Generates standard `.dbc` files compatible with CANoe, PCAN-View, Wireshark, or embedded C code generators.
- **Ready-to-Use Presets**: Load pre-built templates for:
  - Automotive Powertrain & Chassis
  - Electric Vehicle High-Voltage BMS
  - Robotics Joint Actuators & Motor Drives
