import time
import pytest
from backend.can.models import CanFrameModel, CanConfigModel, CanDirection
from backend.can.mock import MockCanInterface
from backend.can.manager import CanManager
from backend.dbc.parser import parse_dbc_content
from backend.dbc.decoder import decode_frame, decode_signal
from backend.services.statistics import CanStatistics

def test_can_frame_validation():
    frame = CanFrameModel(
        timestamp=time.time(),
        direction=CanDirection.RX,
        id=0x123,
        idHex="0x123",
        extended=False,
        fd=False,
        dlc=8,
        data=[1, 2, 3, 4, 5, 6, 7, 8]
    )
    assert frame.id == 291
    assert frame.idHex == "0x123"
    assert len(frame.data) == 8
    assert frame.direction == CanDirection.RX

def test_mock_can_generation():
    mock_iface = MockCanInterface()
    config = CanConfigModel(backend="mock", channel="mock0", bitrate=500000)
    assert mock_iface.connect(config) is True

    # Receive frames
    received = []
    start = time.time()
    while time.time() - start < 0.2:
        frame = mock_iface.receive(timeout=0.05)
        if frame:
            received.append(frame)

    assert len(received) > 0
    # Check that known IDs were produced
    ids = {f.id for f in received}
    assert 0x100 in ids or 0x123 in ids

    mock_iface.disconnect()

def test_dbc_parsing_and_decoding():
    dbc_content = """
BO_ 291 Vehicle_Dynamics: 8 BRAKE_CONTROLLER
 SG_ VehicleSpeed : 0|16@1+ (0.01,0) [0|250] "km/h" INSTRUMENT_CLUSTER
 SG_ ThrottlePosition : 16|8@1+ (0.4,0) [0|100] "%" POWERTRAIN
"""
    db = parse_dbc_content(dbc_content, "test.dbc")
    assert len(db.messages) == 1
    assert db.messages[0].name == "Vehicle_Dynamics"
    assert len(db.messages[0].signals) == 2

    # Speed: 80 km/h -> raw = 8000 (0x1F40 -> [0x40, 0x1F])
    # Throttle: 50% -> raw = 125 (0x7D)
    raw_data = [0x40, 0x1F, 0x7D, 0x00, 0x00, 0x00, 0x00, 0x00]
    decoded = decode_frame(291, raw_data, db)
    assert "80.0 km/h" in decoded["VehicleSpeed"]
    assert "50.0 %" in decoded["ThrottlePosition"]

def test_statistics_and_frequency():
    stats = CanStatistics(bitrate=500000)
    now = time.time()
    stats.update_frame(0x100, is_rx=True, is_fd=False, timestamp=now)
    stats.update_frame(0x100, is_rx=True, is_fd=False, timestamp=now + 0.02) # 20ms period

    id_stats = stats.get_id_stats(0x100)
    assert id_stats["count"] == 2
    assert id_stats["periodMs"] == 20.0
    assert id_stats["frequencyHz"] == 50.0

def test_backend_discovery():
    mgr = CanManager()
    sys_info = mgr.discover_system()
    assert sys_info.platform in ["linux", "darwin", "windows"]
    assert "mock" in sys_info.availableBackends
    assert any(i.backend == "mock" for i in sys_info.detectedInterfaces)

def test_transmission_in_listen_only():
    mock_iface = MockCanInterface()
    config = CanConfigModel(backend="mock", channel="mock0", listenOnly=True)
    mock_iface.connect(config)

    frame = CanFrameModel(
        timestamp=time.time(),
        direction=CanDirection.TX,
        id=0x123,
        idHex="0x123",
        extended=False,
        fd=False,
        dlc=1,
        data=[0xFF]
    )
    # Transmission must be rejected in listen-only mode
    assert mock_iface.send(frame) is False
    mock_iface.disconnect()
