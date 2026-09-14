# CAN Bus Diagnostics, Error Frames & Bus State Guide

This guide details the physical and data link layer error confinement mechanisms implemented according to **ISO 11898-1**, and how to diagnose bus issues in **CANScope**.

---

## 1. CAN Fault Confinement Overview

CAN is a deterministic, fault-tolerant protocol with hardware-enforced error detection. Every CAN controller node maintains two internal 8-bit counters:
- **TEC (Transmit Error Counter)**: Increments when a node encounters errors during message transmission.
- **REC (Receive Error Counter)**: Increments when a node detects errors while receiving messages from the bus.

The ratio and magnitude of these counters determine the node's **Fault State**.

---

## 2. The 3 ISO 11898-1 Node States

In the **Errors** page (`ErrorsPage`), CANScope visualizes the active node state in real time:

| State | Counter Condition | Behavior |
| :--- | :--- | :--- |
| **Error Active** | $\text{TEC} < 128 \text{ and } \text{REC} < 128$ | **Normal operation**. The node participates fully in bus communication and transmits active error flags (6 dominant bits) when an anomaly is detected. |
| **Error Warning** | $\text{TEC} \ge 96 \text{ or } \text{REC} \ge 96$ | Warning threshold indicating degraded physical layer, termination mismatch, or slight baud rate drift. |
| **Error Passive** | $\text{TEC} \ge 128 \text{ or } \text{REC} \ge 128$ | The node may still send and receive frames, but may **only** transmit passive error flags (6 recessive bits). Transmitting nodes must wait an additional suspend transmission time before re-arbitration. |
| **Bus Off** | $\text{TEC} > 255$ | **Severe condition**. The node is electrically isolated from the bus by the controller to prevent locking up the entire network. No transmissions or ACKs are allowed until a hardware reset. |

---

## 3. Common CAN Error Frame Types

When an error frame occurs, CANScope classifies the root cause:

1. **Bit Stuffing Error**:
   - CAN uses bit-stuffing: after 5 consecutive identical bits, an opposite polarity bit is inserted.
   - If 6 consecutive bits of the same polarity are received before the CRC delimiter, a bit-stuffing error is flagged.
   - *Causes*: Noise spikes on twisted pair, incorrect sample point, or baud rate discrepancy.

2. **CRC Error**:
   - The cyclic redundancy check sequence calculated by the receiver does not match the CRC field in the frame header.
   - *Causes*: High-frequency electromagnetic interference (EMI), long cable runs, or missing ground reference.

3. **ACK Delimiter / Missing ACK Error**:
   - The transmitting node transmits a recessive bit in the ACK slot. At least one receiving node must drive the bus dominant to acknowledge valid receipt.
   - If the ACK slot remains recessive, a missing ACK error is triggered.
   - *Causes*: Transmitting on a dead bus with no other active nodes, or all other nodes are in Listen-Only mode.

4. **Form Error**:
   - A fixed-form bit (such as CRC delimiter, ACK delimiter, or End-of-Frame) contains an illegal bit value.
   - *Causes*: Ground shifts, reflections from missing $120\,\Omega$ termination resistors.

5. **Bit Monitoring Error**:
   - The transmitting node reads back a bit value different from what it drove onto the bus (outside of normal arbitration or ACK slot).
   - *Causes*: Bus short to GND, short to 12V/24V, or transceiver hardware failure.

---

## 4. Physical Layer Troubleshooting Checklist

If you see high error rates, Error Passive, or Bus-Off states:

- **Check Bus Termination**: A high-speed CAN bus requires exactly two **$120\,\Omega$ termination resistors** at each physical end of the bus (measuring approximately **$60\,\Omega$** across CAN-High and CAN-Low with power off).
- **Verify Bitrate**: Ensure all connected nodes agree on nominal baudrate (e.g. 500 kbps) and sample point (typically 75% to 80%).
- **Stub Lengths**: Keep drop lines (stubs) from the main bus trunk line shorter than 0.3 meters to prevent high-frequency impedance reflections.
- **Common Ground**: Ensure a common ground return is connected between the CAN transceiver and the target ECU.
