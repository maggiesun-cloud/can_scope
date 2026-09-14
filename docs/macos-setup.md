# macOS Setup Guide for CANScope & PCAN-USB

This guide provides step-by-step instructions for configuring **CANScope** and **`python-can`** with **PEAK-System PCAN-USB** hardware on macOS (both Apple Silicon M1/M2/M3/M4 and Intel x86_64).

---

## 1. Prerequisites

- **Operating System**: macOS 12 (Monterey), 13 (Ventura), 14 (Sonoma), 15 (Sequoia), or later
- **Python**: Python 3.10, 3.11, 3.12, or 3.13
- **Hardware**: PEAK-System PCAN-USB, PCAN-USB FD, or PCAN-USB Pro (optional for simulation mode)

---

## 2. Python Environment & python-can Installation

Follow these 5 terminal commands to configure a dedicated, clean virtual environment with complete PCAN support:

```bash
# 1. Verify Python 3 installation
python3 --version

# 2. Create an isolated virtual environment in your home directory
python3 -m venv ~/canscope-venv

# 3. Activate the virtual environment
source ~/canscope-venv/bin/activate

# 4. Install python-can with PCANBasic driver support
python3 -m pip install -U "python-can[pcan]"

# 5. Verify python-can installation and version
python3 -c "import can; print(can.__version__)"
```

### Expected Output:
```text
4.6.1
```
*(or your installed 4.x version)*

---

## 3. Verify PCAN Backend Registration

To ensure `python-can` has successfully registered the `pcan` interface backend on macOS, run:

```bash
python3 -c "import can; print('PCAN backend registered:', 'pcan' in can.interfaces.BACKENDS)"
```

### Expected Output:
```text
PCAN backend registered: True
```

---

## 4. Hardware Driver Installation (PEAK / MacCAN)

macOS does not feature native kernel SocketCAN. Instead, PCAN-USB hardware communicates through the **PCANBasic dynamic library / PCBUSB framework**.

### Option A: Official PEAK PCAN-Basic Package (Recommended)
1. Download the macOS PCAN-Basic package from [PEAK-System](https://www.peak-system.com) or the MacCAN project.
2. Run the installer or copy `PCBUSB.framework` to:
   ```text
   /Library/Frameworks/PCBUSB.framework
   ```
3. If macOS Gatekeeper flags the driver, open **System Settings > Privacy & Security** and click **Allow**.

### Option B: Homebrew / MacCAN Library
If using Homebrew or standalone dynamic libraries:
```bash
# Check if libpcanbasic or PCBUSB.framework is present
ls -ld /Library/Frameworks/PCBUSB.framework /usr/local/lib/libpcanbasic* /opt/homebrew/lib/libpcanbasic* 2>/dev/null
```

---

## 5. Physical USB Adapter Verification

1. Connect your **PEAK PCAN-USB** adapter to your Mac via USB 2.0/3.0 or a USB-C adapter.
2. Verify that macOS recognizes the USB device:
   ```bash
   system_profiler SPUSBDataType | grep -E -i "peak|pcan"
   ```
   **Expected Output:**
   ```text
   PCAN-USB:
     Product ID: 0x000c
     Vendor ID: 0x0c72  (PEAK-System Technik GmbH)
   ```

3. Test opening the CAN channel directly with Python:
   ```bash
   python3 -c "import can; bus = can.Bus(interface='pcan', channel='PCAN_USBBUS1', bitrate=500000); print('PCAN-USB connected successfully:', bus); bus.shutdown()"
   ```

---

## 6. Running CANScope with Local Hardware

To connect CANScope directly to your physical PCAN-USB hardware on macOS:

```bash
# Navigate to the repository
cd canscope

# Start the native backend with your virtual environment
cd backend
source ~/canscope-venv/bin/activate
python main.py
```

Then launch the frontend web interface:
```bash
npm run dev
```

Open `http://localhost:3000`:
1. Click **Connect** in the top navigation bar.
2. Select **PCAN** as the interface backend.
3. Select channel **`PCAN_USBBUS1`**.
4. Set your nominal bitrate (default: `500000` / 500 kbit/s).
5. Click **Connect**.

---

## 7. Diagnostic Quick Check (1-Liner)

Copy and run this single command in Terminal anytime to diagnose your full macOS setup:

```bash
python3 -c '
import can, platform, os
print(f"OS: macOS ({platform.mac_ver()[0]}) on {platform.machine()}")
print(f"Python: {platform.python_version()}")
print(f"python-can: {can.__version__}")
print(f"PCAN Registered: {\"pcan\" in can.interfaces.BACKENDS}")
frameworks = [p for p in ["/Library/Frameworks/PCBUSB.framework", "/usr/local/lib/libpcanbasic.dylib", "/opt/homebrew/lib/libpcanbasic.dylib"] if os.path.exists(p)]
print(f"Driver Library: {frameworks[0] if frameworks else \"NOT FOUND (Install PCBUSB.framework)\"}")
'
```

---

## 8. Troubleshooting FAQ

| Issue | Root Cause | Solution |
|---|---|---|
| `ModuleNotFoundError: No module named 'can'` | Virtual environment is not activated. | Run `source ~/canscope-venv/bin/activate` before executing scripts. |
| `PCAN backend registered: False` | `python-can` was installed without PCAN extras. | Run `pip install -U "python-can[pcan]"`. |
| `Cannot initialize PCAN channel` | Missing `PCBUSB.framework` or adapter not connected. | Verify `system_profiler SPUSBDataType` and check `/Library/Frameworks/PCBUSB.framework`. |
| `Permission denied` opening USB device | macOS Privacy/Security Gatekeeper lock. | Go to **System Settings > Privacy & Security** and allow PEAK-System extension. |
