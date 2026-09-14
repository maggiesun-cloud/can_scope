import os
import sys
import platform
from typing import Optional, List, Dict, Any, Callable
from .interface import CanInterface
from .mock import MockCanInterface
from .socketcan import SocketCanInterface
from .pcan import PcanInterface
from .models import CanConfigModel, CanFrameModel, BusStatusModel, SystemInfoModel, CanInterfaceDescriptor

try:
    import can
    PYTHON_CAN_VER = getattr(can, "__version__", "4.4.0")
except ImportError:
    PYTHON_CAN_VER = "not_installed"

class CanManager:
    """
    Central coordinator for CAN interface discovery, lifecycle, and routing.
    Enforces hardware abstraction and avoids vendor/OS hardcoding.
    """

    def __init__(self):
        self._current_interface: Optional[CanInterface] = None
        self._config: Optional[CanConfigModel] = None
        self._listeners: List[Callable[[CanFrameModel], None]] = []

    def discover_system(self) -> SystemInfoModel:
        plat = platform.system().lower() # 'linux', 'darwin', etc.
        arch = platform.machine().lower()
        available_backends = ["mock"]

        detected_interfaces: List[CanInterfaceDescriptor] = [
            CanInterfaceDescriptor(
                backend="mock",
                channel="mock0",
                name="Simulated CAN Bus (Mock)",
                available=True,
                isVirtual=True,
                details="Multi-ECU simulated automotive powertrain and ADAS traffic"
            )
        ]

        pcan_available = False
        pcan_msg = "PCAN driver/API not detected. Verify PCAN-USB connection and driver."
        socketcan_available = False
        socketcan_msg = "SocketCAN is only supported natively on Linux."

        if plat == "linux":
            socketcan_msg = "SocketCAN subsystem available."
            # Check /sys/class/net for can interfaces
            if os.path.isdir("/sys/class/net"):
                try:
                    for iface in os.listdir("/sys/class/net"):
                        if iface.startswith("can") or iface.startswith("vcan"):
                            socketcan_available = True
                            if "socketcan" not in available_backends:
                                available_backends.append("socketcan")
                            detected_interfaces.append(CanInterfaceDescriptor(
                                backend="socketcan",
                                channel=iface,
                                name=f"SocketCAN {iface}",
                                available=True,
                                isVirtual=iface.startswith("vcan"),
                                details=f"Linux network CAN interface {iface}"
                            ))
                except Exception:
                    pass

            # Check for PCAN chardev on Linux (/dev/pcan*)
            if os.path.isdir("/dev"):
                try:
                    pcan_nodes = [n for n in os.listdir("/dev") if n.startswith("pcan")]
                    if pcan_nodes:
                        pcan_available = True
                        if "pcan" not in available_backends:
                            available_backends.append("pcan")
                        pcan_msg = f"Detected {len(pcan_nodes)} PCAN device node(s)."
                        for node in pcan_nodes:
                            detected_interfaces.append(CanInterfaceDescriptor(
                                backend="pcan",
                                channel=f"/dev/{node}",
                                name=f"PEAK PCAN-USB ({node})",
                                available=True,
                                details="Native PCAN character device"
                            ))
                except Exception:
                    pass

        elif plat == "darwin":
            # macOS: Check for PCAN dynamic library / framework
            pcan_frameworks = [
                "/Library/Frameworks/PCBUSB.framework",
                "/usr/local/lib/libpcanbasic.dylib",
                "/opt/homebrew/lib/libpcanbasic.dylib"
            ]
            if any(os.path.exists(p) for p in pcan_frameworks):
                pcan_available = True
                if "pcan" not in available_backends:
                    available_backends.append("pcan")
                pcan_msg = "PCANBasic library detected on macOS."
                detected_interfaces.append(CanInterfaceDescriptor(
                    backend="pcan",
                    channel="PCAN_USBBUS1",
                    name="PEAK PCAN-USB Channel 1",
                    available=True,
                    details="macOS PCANBasic dynamic library API"
                ))
            else:
                pcan_msg = "PCANBasic framework not found. Install MacCAN / PCAN-USB driver."

        return SystemInfoModel(
            platform=plat,
            architecture=arch,
            osRelease=platform.release(),
            pythonVersion=sys.version.split()[0],
            pythonCanVersion=PYTHON_CAN_VER,
            fastApiVersion="0.115.0",
            availableBackends=available_backends,
            detectedInterfaces=detected_interfaces,
            driverStatus={
                "pcan": {"available": pcan_available, "message": pcan_msg},
                "socketcan": {"available": socketcan_available, "message": socketcan_msg},
                "mock": {"available": True, "message": "High-fidelity mock engine available without physical hardware."},
            }
        )

    def connect(self, config: CanConfigModel) -> bool:
        if self._current_interface:
            self.disconnect()

        sys_info = self.discover_system()
        target_backend = config.backend

        # Automatic hardware discovery & selection
        if target_backend == "auto":
            if "socketcan" in sys_info.availableBackends:
                target_backend = "socketcan"
                config.channel = next((i.channel for i in sys_info.detectedInterfaces if i.backend == "socketcan"), "can0")
            elif "pcan" in sys_info.availableBackends:
                target_backend = "pcan"
                config.channel = next((i.channel for i in sys_info.detectedInterfaces if i.backend == "pcan"), "PCAN_USBBUS1")
            else:
                raise RuntimeError(
                    "NO CAN HARDWARE DETECTED. Please connect a PCAN-USB interface or start Simulation Mode."
                )

        if target_backend == "mock":
            self._current_interface = MockCanInterface()
        elif target_backend == "socketcan":
            if "socketcan" not in sys_info.availableBackends:
                raise RuntimeError("SocketCAN backend unavailable on this system.")
            self._current_interface = SocketCanInterface()
        elif target_backend == "pcan":
            if "pcan" not in sys_info.availableBackends:
                raise RuntimeError(
                    "PCAN backend unavailable. Please verify:\n"
                    "- PCAN driver/API installation\n"
                    "- PCAN-USB connection\n"
                    "- python-can installation\n"
                    "- operating system support"
                )
            self._current_interface = PcanInterface()
        else:
            raise ValueError(f"Unknown CAN backend: {target_backend}")

        self._config = config
        return self._current_interface.connect(config)

    def disconnect(self) -> None:
        if self._current_interface:
            self._current_interface.disconnect()
            self._current_interface = None

    def configure(self, config: CanConfigModel) -> bool:
        self._config = config
        if self._current_interface:
            return self._current_interface.configure(config)
        return True

    def receive(self, timeout: Optional[float] = None) -> Optional[CanFrameModel]:
        if self._current_interface:
            return self._current_interface.receive(timeout=timeout)
        return None

    def send(self, frame: CanFrameModel) -> bool:
        if self._current_interface:
            return self._current_interface.send(frame)
        return False

    def get_status(self) -> BusStatusModel:
        if self._current_interface:
            return self._current_interface.get_status()
        return BusStatusModel(
            connectionState="disconnected",
            backend="mock",
            interfaceName="None",
            channel="none",
            bitrate=500000,
            fdEnabled=False,
            listenOnly=False,
            busLoad=0.0,
            fps=0,
            totalFrames=0,
            rxFrames=0,
            txFrames=0,
            errorFrames=0,
            tec=0,
            rec=0,
            busState="active",
            controllerState="STOPPED",
            uptimeSeconds=0
        )
