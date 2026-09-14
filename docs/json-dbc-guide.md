# Custom CAN ID Signal Decoding with JSON Schema Guide

This guide explains how to define, edit, upload, and auto-decode custom CAN IDs using a clean, human-readable **JSON format** in **CANScope**.

---

## 1. Why JSON Format?

While the Vector `.dbc` format is an automotive standard, its syntax (`BO_ 291 ... SG_ ... : 0|16@1+ ...`) is difficult to read and error-prone to edit by hand.

CANScope supports a **standardized JSON format** for CAN message and signal definitions:
- **Easy to Edit**: Edit in any text editor (VS Code, Notepad, browser).
- **Flexible ID Formats**: Enter CAN IDs in Hexadecimal (`"0x123"`, `"0x18FF50E5"`) or Decimal (`291`).
- **Human-Readable Fields**: Intuitive keys like `startBit`, `length`, `byteOrder`, `scale`, `offset`, and `unit`.
- **Full Compatibility**: Works identically to Vector `.dbc` files for real-time sniffing, physical value calculation, and waveform oscilloscope plotting.

---

## 2. Complete JSON Schema Specification

Save your file as `custom_can.json` or `my_sensors.json`. The root structure is:

```json
{
  "name": "Custom CAN Network Database",
  "version": "1.0",
  "messages": [
    {
      "id": "0x123",
      "name": "Motor_Controller_Status",
      "dlc": 8,
      "transmitter": "INV_ECU",
      "comment": "Main traction inverter status and telemetry",
      "signals": [
        {
          "name": "MotorSpeed",
          "startBit": 0,
          "length": 16,
          "byteOrder": "little_endian",
          "isSigned": false,
          "scale": 0.5,
          "offset": 0,
          "min": 0,
          "max": 10000,
          "unit": "RPM",
          "comment": "Rotor rotational speed"
        },
        {
          "name": "InverterTemp",
          "startBit": 16,
          "length": 8,
          "byteOrder": "little_endian",
          "isSigned": true,
          "scale": 1.0,
          "offset": -40,
          "min": -40,
          "max": 150,
          "unit": "°C",
          "comment": "IGBT heat sink temperature"
        },
        {
          "name": "DCBusVoltage",
          "startBit": 24,
          "length": 16,
          "byteOrder": "little_endian",
          "isSigned": false,
          "scale": 0.1,
          "offset": 0,
          "min": 0,
          "max": 800,
          "unit": "V",
          "comment": "High voltage DC bus input"
        },
        {
          "name": "PhaseCurrent",
          "startBit": 40,
          "length": 16,
          "byteOrder": "little_endian",
          "isSigned": true,
          "scale": 0.1,
          "offset": 0,
          "min": -500,
          "max": 500,
          "unit": "A",
          "comment": "RMS phase current"
        },
        {
          "name": "InverterFaultFlag",
          "startBit": 56,
          "length": 1,
          "byteOrder": "little_endian",
          "isSigned": false,
          "scale": 1,
          "offset": 0,
          "min": 0,
          "max": 1,
          "unit": "",
          "comment": "1 = Fault Active, 0 = Normal"
        },
        {
          "name": "RollingCounter",
          "startBit": 60,
          "length": 4,
          "byteOrder": "little_endian",
          "isSigned": false,
          "scale": 1,
          "offset": 0,
          "min": 0,
          "max": 15,
          "unit": "",
          "comment": "Alive heartbeat sequence counter (0-15)"
        }
      ]
    }
  ]
}
```

---

## 3. Field Definitions & Reference

### Message Properties

| Field | Type | Description | Example |
|---|---|---|---|
| `id` | `string` \| `number` | The CAN identifier. Supports Hex (`"0x123"`, `"0x18FF50E5"`) or Decimal (`291`). Supports both 11-bit Standard and 29-bit Extended IDs. | `"0x123"` |
| `name` | `string` | Human-readable name of the message. | `"MotorStatus"` |
| `dlc` | `number` | Data Length Code in bytes (typically 8 for CAN 2.0, up to 64 for CAN-FD). | `8` |
| `transmitter` | `string` *(optional)* | Sending ECU or node name. | `"Inverter"` |
| `comment` | `string` *(optional)* | Descriptive documentation of the message. | `"Traction telemetry"` |
| `signals` | `array` | List of signals packed into this message. | `[...]` |

---

### Signal Properties

| Field | Type | Description | Default | Example |
|---|---|---|---|---|
| `name` | `string` | Unique identifier name for this field. | **Required** | `"BatteryVoltage"` |
| `startBit` | `number` | Bit position where the signal begins (0 to 63 for 8-byte payload). | **Required** | `0` (Byte 0, Bit 0) |
| `length` | `number` | Bit length of the signal (e.g. 1 bit for flags, 8 for bytes, 16 for words). | **Required** | `16` |
| `byteOrder` | `string` | Endianness: `"little_endian"` (Intel / LSB first) or `"big_endian"` (Motorola / MSB first). | `"little_endian"` | `"little_endian"` |
| `isSigned` | `boolean` | `true` for two's complement signed values (allowing negatives), `false` for unsigned. | `false` | `true` |
| `scale` | `number` | Multiplier factor applied to raw integer value. | `1.0` | `0.01` |
| `offset` | `number` | Additive offset applied after scaling. | `0.0` | `-40.0` |
| `unit` | `string` | Engineering physical unit displayed in the UI. | `""` | `"km/h"`, `"°C"`, `"V"` |
| `min` | `number` *(optional)* | Minimum valid physical value. | `0` | `-40` |
| `max` | `number` *(optional)* | Maximum valid physical value. | `100` | `150` |

---

## 4. How Physical Decoding Formula Works

The physical value is automatically calculated by CANScope according to:

$$\text{Physical Value} = (\text{Raw Integer Bits} \times \text{Scale}) + \text{Offset}$$

### Common Examples:
1. **Engine Coolant Temperature (-40°C to +150°C)**:
   - 8-bit unsigned integer (range 0 to 255)
   - `scale: 1`, `offset: -40`, `unit: "°C"`
   - If raw byte is `0x50` (decimal `80`):
     $$\text{Physical} = (80 \times 1) + (-40) = 40 \text{ °C}$$

2. **Battery Pack Voltage (0.00V to 500.00V)**:
   - 16-bit unsigned integer (bytes 0–1)
   - `scale: 0.01`, `offset: 0`, `unit: "V"`
   - If raw 16-bit word is `0x0F00` (decimal `3840`):
     $$\text{Physical} = (3840 \times 0.01) + 0 = 38.4 \text{ V}$$

3. **Steering Angle with Negative Values (-540.0° to +540.0°)**:
   - 16-bit signed integer (`isSigned: true`)
   - `scale: 0.1`, `offset: 0`, `unit: "deg"`
   - If raw 16-bit signed value is `-450`:
     $$\text{Physical} = (-450 \times 0.1) = -45.0 \text{ deg}$$

---

## 5. Endianness & Bit Addressing

### Little-Endian (Intel / LSB first)
- Most common in x86, ARM, and modern automotive microcontrollers.
- Bit numbering starts at `Byte 0, Bit 0` (Bit index 0) and extends upward across consecutive bytes.
- Set: `"byteOrder": "little_endian"` (or `"intel"`).

### Big-Endian (Motorola / MSB first)
- Traditional German automotive CAN standard.
- The highest bit of the signal is positioned at `startBit`, traversing downward.
- Set: `"byteOrder": "big_endian"` (or `"motorola"`).

---

## 6. Full Example: Multi-ECU Vehicle & Robotics Schema

Here is a ready-to-use template defining two separate CAN IDs (`0x200` Battery and `0x250` Wheel Speed):

```json
{
  "name": "Robotics Platform CAN Database",
  "version": "1.0",
  "messages": [
    {
      "id": "0x200",
      "name": "BMS_BatteryStatus",
      "dlc": 8,
      "transmitter": "BMS",
      "signals": [
        {
          "name": "PackVoltage",
          "startBit": 0,
          "length": 16,
          "byteOrder": "little_endian",
          "isSigned": false,
          "scale": 0.01,
          "offset": 0,
          "unit": "V"
        },
        {
          "name": "PackCurrent",
          "startBit": 16,
          "length": 16,
          "byteOrder": "little_endian",
          "isSigned": true,
          "scale": 0.1,
          "offset": 0,
          "unit": "A"
        },
        {
          "name": "StateOfCharge",
          "startBit": 32,
          "length": 8,
          "byteOrder": "little_endian",
          "isSigned": false,
          "scale": 0.5,
          "offset": 0,
          "unit": "%"
        },
        {
          "name": "MaxCellTemp",
          "startBit": 40,
          "length": 8,
          "byteOrder": "little_endian",
          "isSigned": true,
          "scale": 1,
          "offset": -40,
          "unit": "°C"
        }
      ]
    },
    {
      "id": "0x250",
      "name": "WheelSpeedSensors",
      "dlc": 8,
      "transmitter": "ABS_ECU",
      "signals": [
        {
          "name": "FrontLeftSpeed",
          "startBit": 0,
          "length": 16,
          "byteOrder": "little_endian",
          "isSigned": false,
          "scale": 0.01,
          "offset": 0,
          "unit": "km/h"
        },
        {
          "name": "FrontRightSpeed",
          "startBit": 16,
          "length": 16,
          "byteOrder": "little_endian",
          "isSigned": false,
          "scale": 0.01,
          "offset": 0,
          "unit": "km/h"
        },
        {
          "name": "RearLeftSpeed",
          "startBit": 32,
          "length": 16,
          "byteOrder": "little_endian",
          "isSigned": false,
          "scale": 0.01,
          "offset": 0,
          "unit": "km/h"
        },
        {
          "name": "RearRightSpeed",
          "startBit": 48,
          "length": 16,
          "byteOrder": "little_endian",
          "isSigned": false,
          "scale": 0.01,
          "offset": 0,
          "unit": "km/h"
        }
      ]
    }
  ]
}
```

---

## 7. How to Upload and Decode in CANScope

1. **Prepare your file**:
   Save your custom definitions as a `.json` file (e.g. `my_can_config.json`).
2. **Open CANScope**:
   Click on the **DBC Decoder** tab in the left navigation sidebar.
3. **Upload**:
   - Drag & drop your `.json` file directly into the drop zone, or
   - Click **Upload DBC / JSON** and choose your file.
   - *(You can also paste the JSON text directly in the interactive in-app editor).*
4. **Test in the Sandbox**:
   - In the **Interactive Signal Decoder Sandbox**, input your CAN ID (e.g. `0x200`) and test bytes (`00 12 00 00 64 50 00 00`).
   - Click **Test Decode** to immediately see your decoded physical signals.
5. **Real-time Automatic Decoding**:
   - Navigate to **Monitor** (Live Sniffer): Incoming frames matching your IDs automatically display every signal name, formatted value, and unit in the right inspector and table.
   - Navigate to **Graphs**: Your custom signals automatically appear in the channel selector for high-speed multi-signal waveform plotting!
