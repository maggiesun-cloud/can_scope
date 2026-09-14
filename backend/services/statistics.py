import time
from typing import Dict, Any, Optional
from collections import defaultdict

class CanStatistics:
    """
    Real-time CAN bus traffic statistics engine.
    Calculates sliding-window FPS, bus load percentage, per-ID message count,
    inter-frame period, and frequency.
    """

    def __init__(self, bitrate: int = 500000):
        self.bitrate = bitrate
        self.total_frames = 0
        self.rx_frames = 0
        self.tx_frames = 0
        self.error_frames = 0

        self.last_seen: Dict[int, float] = {}
        self.id_counts: Dict[int, int] = defaultdict(int)
        self.id_periods: Dict[int, float] = {}
        self.id_frequencies: Dict[int, float] = {}

        self._window_frames = 0
        self._window_start = time.time()
        self.current_fps = 0
        self.current_bus_load = 0.0

    def update_frame(self, can_id: int, is_rx: bool, is_fd: bool, timestamp: Optional[float] = None) -> None:
        now = timestamp or time.time()
        self.total_frames += 1
        if is_rx:
            self.rx_frames += 1
        else:
            self.tx_frames += 1

        self._window_frames += 1
        self.id_counts[can_id] += 1

        if can_id in self.last_seen:
            period_ms = (now - self.last_seen[can_id]) * 1000.0
            if period_ms > 0:
                self.id_periods[can_id] = round(period_ms, 1)
                self.id_frequencies[can_id] = round(1000.0 / period_ms, 1)
        self.last_seen[can_id] = now

        # Update rolling FPS and bus load every 500ms
        elapsed = now - self._window_start
        if elapsed >= 0.5:
            self.current_fps = int(self._window_frames / elapsed)
            bits_per_frame = 280 if is_fd else 120
            bits_per_sec = self.current_fps * bits_per_frame
            self.current_bus_load = round(min(100.0, (bits_per_sec / max(1, self.bitrate)) * 100), 1)
            self._window_frames = 0
            self._window_start = now

    def get_id_stats(self, can_id: int) -> Dict[str, Any]:
        return {
            "count": self.id_counts.get(can_id, 0),
            "periodMs": self.id_periods.get(can_id, 0.0),
            "frequencyHz": self.id_frequencies.get(can_id, 0.0),
            "lastSeen": self.last_seen.get(can_id, 0.0),
        }
