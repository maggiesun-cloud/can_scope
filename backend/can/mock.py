import time
import math
import threading
import queue
from typing import Optional
from .interface import CanInterface
from .models import CanConfigModel, CanFrameModel, BusStatusModel, CanDirection, BusStateEnum

class MockCanInterface(CanInterface):
    """
    High-fidelity virtual CAN/CAN-FD bus simulator.
    Generates realistic multi-ECU automotive powertrain, vehicle dynamics,
    battery management, and ADAS frames at standard periodic intervals.
    """

    def __init__(self):
        self._connected = False
        self._running = False
        self._config = CanConfigModel(backend="mock", channel="mock0")
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

        # State variables for signal generators
        self._engine_counter = 0
        self._mock_speed = 65.0
        self._mock_rpm = 1800.0

    def connect(self, config: CanConfigModel) -> bool:
        self._config = config
        self._connected = True
        self._start_time = time.time()
        self.start()
        return True

    def disconnect(self) -> None:
        self.stop()
        self._connected = False
        with self._rx_queue.mutex:
            self._rx_queue.queue.clear()

    def configure(self, config: CanConfigModel) -> bool:
        self._config = config
        return True

    def start(self) -> None:
        if self._running:
            return
        self._running = True
        self._thread = threading.Thread(target=self._generation_worker, daemon=True)
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
        if not self._connected:
            return False
        if self._config.listenOnly:
            return False

        message.direction = CanDirection.TX
        message.timestamp = time.time()
        self._tx_frames += 1
        self._total_frames += 1

        # Echo transmitted frame back into queue so sniffer logs it
        try:
            self._rx_queue.put_nowait(message)
        except queue.Full:
            pass
        return True

    def get_status(self) -> BusStatusModel:
        uptime = int(time.time() - self._start_time) if self._connected else 0
        bus_state = BusStateEnum.ACTIVE
        if self._tec >= 128 or self._rec >= 128:
            bus_state = BusStateEnum.PASSIVE
        elif self._tec >= 96 or self._rec >= 96:
            bus_state = BusStateEnum.WARNING

        return BusStatusModel(
            connectionState="connected" if self._connected else "disconnected",
            backend="mock",
            interfaceName="Mock CAN Bus Simulator",
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
            busState=bus_state,
            controllerState="LISTEN-ONLY" if self._config.listenOnly else ("OPERATIONAL" if self._connected else "STOPPED"),
            uptimeSeconds=uptime,
        )

    def _enqueue_frame(self, frame: CanFrameModel):
        try:
            self._rx_queue.put_nowait(frame)
            self._rx_frames += 1
            self._total_frames += 1
        except queue.Full:
            pass

    def _generation_worker(self):
        last_10ms = time.time()
        last_20ms = time.time()
        last_50ms = time.time()
        last_100ms = time.time()
        last_500ms = time.time()
        last_rate_calc = time.time()
        frame_window_count = 0

        while self._running and self._connected:
            now = time.time()

            # 1. 0x100 Powertrain (10 ms)
            if now - last_10ms >= 0.010:
                last_10ms = now
                self._engine_counter = (self._engine_counter + 1) % 16
                rpm_jitter = math.sin(now * 1.5) * 350
                rpm = max(800, min(6500, int(2100 + rpm_jitter)))
                rpm_raw = int(rpm * 4)
                coolant_raw = int(88 + 40) # 88 C

                frame = CanFrameModel(
                    timestamp=now,
                    direction=CanDirection.RX,
                    id=0x100,
                    idHex="0x100",
                    extended=False,
                    fd=False,
                    dlc=8,
                    data=[
                        self._engine_counter & 0x0F,
                        0x00,
                        rpm_raw & 0xFF,
                        (rpm_raw >> 8) & 0xFF,
                        120, # Torque
                        coolant_raw,
                        0x00,
                        0x00,
                    ]
                )
                self._enqueue_frame(frame)
                frame_window_count += 1

            # 2. 0x123 Vehicle Dynamics (20 ms)
            if now - last_20ms >= 0.020:
                last_20ms = now
                speed_raw = int(max(0, 75 + math.sin(now * 0.8) * 20) * 100)
                steer_raw = int(math.sin(now * 1.2) * 250) & 0xFFFF
                frame = CanFrameModel(
                    timestamp=now,
                    direction=CanDirection.RX,
                    id=0x123,
                    idHex="0x123",
                    extended=False,
                    fd=False,
                    dlc=8,
                    data=[
                        speed_raw & 0xFF,
                        (speed_raw >> 8) & 0xFF,
                        90, # Throttle
                        0,  # Brake
                        steer_raw & 0xFF,
                        (steer_raw >> 8) & 0xFF,
                        0x00,
                        0x01
                    ]
                )
                self._enqueue_frame(frame)
                frame_window_count += 1

            # 3. 0x200 EV Battery System (50 ms)
            if now - last_50ms >= 0.050:
                last_50ms = now
                volt_raw = int((380 + math.sin(now * 0.5) * 6) * 10)
                curr_raw = int(18.5 * 10) & 0xFFFF
                soc_raw = int(78 / 0.5)
                frame = CanFrameModel(
                    timestamp=now,
                    direction=CanDirection.RX,
                    id=0x200,
                    idHex="0x200",
                    extended=False,
                    fd=False,
                    dlc=8,
                    data=[
                        volt_raw & 0xFF,
                        (volt_raw >> 8) & 0xFF,
                        curr_raw & 0xFF,
                        (curr_raw >> 8) & 0xFF,
                        soc_raw,
                        35 + 40, # max temp
                        31 + 40, # min temp
                        0x00
                    ]
                )
                self._enqueue_frame(frame)
                frame_window_count += 1

            # 4. 0x456 ADAS Radar (100 ms)
            if now - last_100ms >= 0.100:
                last_100ms = now
                dist_raw = int((42.0 + math.sin(now * 0.3) * 15) / 0.05)
                frame = CanFrameModel(
                    timestamp=now,
                    direction=CanDirection.RX,
                    id=0x456,
                    idHex="0x456",
                    extended=False,
                    fd=False,
                    dlc=8,
                    data=[
                        dist_raw & 0xFF,
                        (dist_raw >> 8) & 0xFF,
                        0xF0, 0xFF, 0x00, 0x00, 0x00, 0x00
                    ]
                )
                self._enqueue_frame(frame)
                frame_window_count += 1

            # 5. 0x500 Body Electronics (500 ms)
            if now - last_500ms >= 0.500:
                last_500ms = now
                ambient_raw = int((21.5 + 40) / 0.5)
                frame = CanFrameModel(
                    timestamp=now,
                    direction=CanDirection.RX,
                    id=0x500,
                    idHex="0x500",
                    extended=False,
                    fd=False,
                    dlc=8,
                    data=[ambient_raw, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]
                )
                self._enqueue_frame(frame)
                frame_window_count += 1

            # Bus FPS and load calculation
            if now - last_rate_calc >= 0.5:
                dur = now - last_rate_calc
                fps = int(frame_window_count / dur)
                self._fps = fps
                bits_per_frame = 280 if self._config.fdEnabled else 120
                bits_per_sec = fps * bits_per_frame
                nominal = self._config.bitrate or 500000
                self._bus_load = round(min(100.0, (bits_per_sec / nominal) * 100), 1)
                frame_window_count = 0
                last_rate_calc = now

            time.sleep(0.002)
