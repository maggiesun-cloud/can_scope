from enum import Enum
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field

class CanDirection(str, Enum):
    RX = "RX"
    TX = "TX"

class BackendType(str, Enum):
    MOCK = "mock"
    SOCKETCAN = "socketcan"
    PCAN = "pcan"
    AUTO = "auto"

class BusStateEnum(str, Enum):
    ACTIVE = "active"
    WARNING = "warning"
    PASSIVE = "passive"
    BUS_OFF = "bus_off"

class CanFrameModel(BaseModel):
    timestamp: float = Field(..., description="Unix timestamp in seconds with fractional precision")
    direction: CanDirection = Field(default=CanDirection.RX)
    id: int = Field(..., description="CAN ID integer value")
    idHex: str = Field(..., description="Hex representation of CAN ID, e.g. 0x123")
    extended: bool = Field(default=False)
    fd: bool = Field(default=False)
    brs: Optional[bool] = Field(default=False)
    esi: Optional[bool] = Field(default=False)
    dlc: int = Field(default=8)
    data: List[int] = Field(default_factory=list)

class CanConfigModel(BaseModel):
    backend: BackendType = Field(default=BackendType.MOCK)
    channel: str = Field(default="mock0")
    bitrate: int = Field(default=500000)
    dataBitrate: Optional[int] = Field(default=2000000)
    fdEnabled: bool = Field(default=False)
    listenOnly: bool = Field(default=False)
    autoReconnect: bool = Field(default=False)

class CanInterfaceDescriptor(BaseModel):
    backend: str
    channel: str
    name: str
    available: bool
    isVirtual: bool = False
    details: Optional[str] = None

class SystemInfoModel(BaseModel):
    platform: str
    architecture: str
    osRelease: Optional[str] = None
    pythonVersion: str
    pythonCanVersion: str
    fastApiVersion: str
    availableBackends: List[str]
    detectedInterfaces: List[CanInterfaceDescriptor]
    driverStatus: Dict[str, Dict[str, Any]]

class BusStatusModel(BaseModel):
    connectionState: str # "disconnected", "connecting", "connected", "error"
    backend: str
    interfaceName: str
    channel: str
    bitrate: int
    dataBitrate: Optional[int] = None
    fdEnabled: bool
    listenOnly: bool
    busLoad: float
    fps: int
    totalFrames: int
    rxFrames: int
    txFrames: int
    errorFrames: int
    tec: int
    rec: int
    busState: BusStateEnum
    controllerState: str
    errorMessage: Optional[str] = None
    uptimeSeconds: int = 0
