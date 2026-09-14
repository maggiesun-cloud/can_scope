import time
import threading
import queue
from typing import Optional
from .interface import CanInterface
from .models import CanConfigModel, CanFrameModel, BusStatusModel, CanDirection, BusStateEnum

try:
    import can
    PYTHON_CAN_AVAILABLE = True
except ImportError:
    can = None
    PYTHON_CAN_AVAILABLE = False

class PcanInterface(CanInterface):
    """
    PCAN-USB interface adapter using python-can't PCAN backend.
    Compatible with Linux (pcan chardev / netdev) and macOS (PCANBasic API / PCBUSB).
    Does not assume hardcoded driver paths or library filenames.
    """

    def __init__(self):
        self._bus = None
        self._connected = False
        self._running = False
        self._config = CanConfigModel(backend="pcan", channel="PCAN_USBBUS1")
        self._rx_queue: queue.Queue[CanFrameModel] = queue.Queue(maxsize=10000)
        self._thread: Optional[threading.Thread] = None

        self._start_time = 0.0
        self._total_frames = 0
        self._rx_frames = 0
        self._tx_frames = 0
        self._error_frames = 0
        self._tec = 0
        self._rec = 0
        self._fps = 0
        self._bus_load = 0.0

    def connect(self, config: CanConfigModel) -> bool:
        if not PYTHON_CAN_AVAILABLE:
            raise RuntimeError(
                "PCAN backend unavailable: python-can package is not installed."
            )

        self._config = config
        kwargs = {
            "interface": "pcan",
            "channel": config.channel or "PCAN_USBBUS1",
            "bitrate": config.bitrate,
        }
        if config.fdEnabled:
            kwargs["fd"] = True
            if config.dataBitrate:
                kwargs["data_bitrate"] = config.dataBitrate

        try:
            self._bus = can.Bus(**kwargs)
            self._connected = True
            self._start_time = time.time()
            self.start()
            return True
        except Exception as e:
            self._connected = False
            raise RuntimeError(
                f"PCAN-USB connection failed on channel '{config.channel}': {str(e)}. "
                f"Please verify driver installation and USB connection."
            )

    def disconnect(self) -> None:
        self.stop()
        if self._bus is not None:
            try:
                self._bus.shutdown()
            except Exception:
                pass
            self._bus = None
        self._connected = False

    def configure(self, config: CanConfigModel) -> bool:
        self._config = config
        if self._connected:
            self.disconnect()
            return self.connect(config)
        return True

    def start(self) -> None:
        if self._running:
            return
        self._running = True
        self._thread = threading.Thread(target=self._recv_worker, daemon=True)
        self._thread.start()

    def stop(self) -> None:
        self._running = False
        if self._thread and self._thread.is_alive():
            self._thread.join(timeout=1.0)
            self._thread = None

    def receive(self, timeout: Optional[float] = None) -> Optional[CanFrameModel]:
        try:
            return self._rx_queue.get(timeout=timeout if timeout is not None else 0.05)
        except queue.Empty:
            return None

    def send(self, message: CanFrameModel) -> bool:
        if not self._connected or not self._bus:
            return False
        if self._config.listenOnly:
            return False

        try:
            can_msg = can.Message(
                arbitration_id=message.id,
                data=bytes(message.data),
                is_extended_id=message.extended,
                is_fd=message.fd,
                bitrate_switch=bool(message.brs),
            )
            self._bus.send(can_msg)
            self._tx_frames += 1
            self._total_frames += 1
            return True
        except Exception:
            self._error_frames += 1
            return False

    def get_status(self) -> BusStatusModel:
        uptime = int(time.time() - self._start_time) if self._connected else 0
        return BusStatusModel(
            connectionState="connected" if self._connected else "disconnected",
            backend="pcan",
            interfaceName="PEAK PCAN-USB",
            channel=self._config.channel,
            bitrate=self._config.bitrate,
            dataBitrate=self._config.dataBitrate,
            fdEnabled=self._config.fdEnabled,
            listenOnly=self._config.listenOnly,
            busLoad=self._bus_load,
            fps=self._fps,
            totalFrames=self._total_frames,
            rxFrames=self._rx_frames,
            txFrames=self._tx_frames,
            errorFrames=self._error_frames,
            tec=self._tec,
            rec=self._rec,
            busState=BusStateEnum.ACTIVE,
            controllerState="LISTEN-ONLY" if self._config.listenOnly else ("OPERATIONAL" if self._connected else "STOPPED"),
            uptimeSeconds=uptime,
        )

    def _recv_worker(self):
        while self._running and self._connected and self._bus:
            try:
                msg = self._bus.recv(timeout=0.05)
                if msg is not None:
                    frame = CanFrameModel(
                        timestamp=msg.timestamp or time.time(),
                        direction=CanDirection.RX,
                        id=msg.arbitration_id,
                        idHex=f"0x{msg.arbitration_id:X}",
                        extended=msg.is_extended_id,
                        fd=msg.is_fd,
                        brs=getattr(msg, "bitrate_switch", False),
                        esi=getattr(msg, "error_state_indicator", False),
                        dlc=msg.dlc,
                        data=list(msg.data),
                    )
                    try:
                        self._rx_queue.put_nowait(frame)
                        self._rx_frames += 1
                        self._total_frames += 1
                    except queue.Full:
                        pass
            except Exception:
                pass
