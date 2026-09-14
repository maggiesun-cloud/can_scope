from abc import ABC, abstractmethod
from typing import Optional, Dict, Any
from .models import CanConfigModel, CanFrameModel, BusStatusModel

class CanInterface(ABC):
    """
    Abstract Hardware Abstraction Layer for CAN/CAN-FD interfaces.
    All vendor-specific drivers (SocketCAN, PCAN, Mock, Kvaser, Vector)
    derive from this base class and normalize to CanFrameModel.
    """

    @abstractmethod
    def connect(self, config: CanConfigModel) -> bool:
        """Establishes connection to the CAN interface."""
        pass

    @abstractmethod
    def disconnect(self) -> None:
        """Disconnects and releases hardware resources."""
        pass

    @abstractmethod
    def configure(self, config: CanConfigModel) -> bool:
        """Reconfigures bitrate, listen-only mode, or CAN-FD parameters."""
        pass

    @abstractmethod
    def start(self) -> None:
        """Starts background listener/reception engine."""
        pass

    @abstractmethod
    def stop(self) -> None:
        """Stops reception engine."""
        pass

    @abstractmethod
    def receive(self, timeout: Optional[float] = None) -> Optional[CanFrameModel]:
        """Receives next frame from the bus or queue."""
        pass

    @abstractmethod
    def send(self, message: CanFrameModel) -> bool:
        """Transmits a frame onto the CAN bus."""
        pass

    @abstractmethod
    def get_status(self) -> BusStatusModel:
        """Returns current bus status, counters, and error states."""
        pass
