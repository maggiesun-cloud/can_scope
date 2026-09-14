from typing import List, Dict, Optional, Any
from .parser import DbcDatabaseModel, DbcSignalModel

def decode_signal(data: List[int], signal: DbcSignalModel) -> float:
    if not data:
        return 0.0

    raw_val = 0
    if signal.byteOrder == "little_endian":
        # Intel
        for i in range(signal.length):
            bit_pos = signal.startBit + i
            byte_idx = bit_pos // 8
            bit_idx = bit_pos % 8
            if byte_idx < len(data):
                bit = (data[byte_idx] >> bit_idx) & 1
                raw_val |= (bit << i)
    else:
        # Motorola
        bit_pos = signal.startBit
        for i in range(signal.length):
            byte_idx = bit_pos // 8
            bit_idx = bit_pos % 8
            if byte_idx < len(data):
                bit = (data[byte_idx] >> bit_idx) & 1
                raw_val = (raw_val << 1) | bit
            if bit_idx == 0:
                bit_pos += 15
            else:
                bit_pos -= 1

    # Two's complement for signed signals
    if signal.isSigned and signal.length > 1:
        sign_bit = 1 << (signal.length - 1)
        if raw_val & sign_bit:
            raw_val = raw_val - (1 << signal.length)

    scaled = (raw_val * signal.scale) + signal.offset
    return round(scaled, 2)

def decode_frame(can_id: int, data: List[int], db: Optional[DbcDatabaseModel]) -> Dict[str, Any]:
    if not db:
        return {}

    msg = next((m for m in db.messages if m.id == can_id), None)
    if not msg:
        return {}

    decoded = {}
    for sig in msg.signals:
        val = decode_signal(data, sig)
        decoded[sig.name] = f"{val} {sig.unit}".strip()
    return decoded
