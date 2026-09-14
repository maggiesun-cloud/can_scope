# Linux SocketCAN & Virtual CAN (vcan) Setup Guide

This guide covers how to configure native Linux kernel **SocketCAN** interfaces and virtual CAN (`vcan0`) buses for development and hardware testing with **CANScope**.

---

## 1. What is SocketCAN?

SocketCAN is the standard Linux kernel network stack implementation for Controller Area Networks (CAN). It exposes CAN interfaces as network interfaces (similar to `eth0` or `wlan0`), allowing standard socket programming and kernel-level queuing.

CANScope supports SocketCAN natively via `python-can` and the high-performance backend HAL.

---

## 2. Setting Up a Virtual CAN Interface (`vcan0`)

For testing and development without physical hardware:

```bash
# 1. Load the Linux kernel virtual CAN module
sudo modprobe vcan

# 2. Create the virtual interface
sudo ip link add dev vcan0 type vcan

# 3. Bring the interface up
sudo ip link set up vcan0

# 4. Verify status
ip link show vcan0
```

Once up, select `socketcan` backend and channel `vcan0` in CANScope's connection dialog.

---

## 3. Configuring Physical CAN Hardware (e.g. `can0`)

For physical USB adapters (such as PEAK PCAN-USB in SocketCAN mode, Candlelight, Kvaser, or Waveshare USB-CAN):

```bash
# 1. Set the nominal bitrate (e.g. 500 kbit/s)
sudo ip link set can0 type can bitrate 500000

# 2. (Optional) For CAN-FD with 2 Mbps data rate:
sudo ip link set can0 type can bitrate 500000 dbitrate 2000000 fd on

# 3. (Optional) Enable Listen-Only mode (passive sniffing):
sudo ip link set can0 type can listen-only on

# 4. Bring the interface up
sudo ip link set up can0

# 5. Check bus statistics and errors
ip -details -statistics link show can0
```

---

## 4. Useful Linux CLI Tools (`can-utils`)

Install `can-utils` for debugging from the terminal:

```bash
sudo apt-get install can-utils

# Sniff frames in terminal
candump can0

# Send a single test frame
cansend can0 123#DEADBEEF

# Generate random traffic on vcan0
cangen vcan0 -g 10
```
