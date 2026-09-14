import time
import io
import csv
from typing import List, Dict, Any, Optional
from ..can.models import CanFrameModel

class CanRecorder:
    """
    CAN Traffic Recorder service supporting CSV, JSON, and extensible
    for ASC, BLF, and MDF4 format exporters.
    """

    def __init__(self):
        self._is_recording = False
        self._is_paused = False
        self._start_time: Optional[float] = None
        self._frames: List[CanFrameModel] = []

    def start(self) -> None:
        self._is_recording = True
        self._is_paused = False
        self._start_time = time.time()
        self._frames.clear()

    def pause(self) -> None:
        if self._is_recording:
            self._is_paused = True

    def resume(self) -> None:
        if self._is_recording:
            self._is_paused = False

    def stop(self) -> Dict[str, Any]:
        self._is_recording = False
        self._is_paused = False
        duration = time.time() - (self._start_time or time.time())
        return {
            "durationSeconds": round(duration, 2),
            "frameCount": len(self._frames),
            "estimatedSizeBytes": len(self._frames) * 48
        }

    def record_frame(self, frame: CanFrameModel) -> None:
        if self._is_recording and not self._is_paused:
            self._frames.append(frame)

    def export_csv(self) -> str:
        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow(["timestamp", "direction", "id", "type", "dlc", "data"])
        for f in self._frames:
            ftype = "EXT_FD" if f.extended and f.fd else ("EXT" if f.extended else ("STD_FD" if f.fd else "STD"))
            data_str = " ".join(f"{b:02X}" for b in f.data)
            writer.writerow([f"{f.timestamp:.6f}", f.direction.value, f.idHex, ftype, f.dlc, data_str])
        return output.getvalue()

    def export_json(self) -> List[Dict[str, Any]]:
        return [f.model_dump() for f in self._frames]

    @property
    def is_recording(self) -> bool:
        return self._is_recording

    @property
    def frame_count(self) -> int:
        return len(self._frames)
