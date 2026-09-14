import re
from typing import List, Dict, Optional, Any
from pydantic import BaseModel

class DbcSignalModel(BaseModel):
    name: str
    startBit: int
    length: int
    byteOrder: str # "little_endian" or "big_endian"
    isSigned: bool
    scale: float
    offset: float
    min: float
    max: float
    unit: str
    receivers: List[str] = []

class DbcMessageModel(BaseModel):
    id: int
    idHex: str
    name: str
    dlc: int
    transmitter: str
    signals: List[DbcSignalModel] = []

class DbcDatabaseModel(BaseModel):
    filename: str
    messages: List[DbcMessageModel] = []

def parse_dbc_content(content: str, filename: str = "custom.dbc") -> DbcDatabaseModel:
    messages: List[DbcMessageModel] = []
    current_msg: Optional[DbcMessageModel] = None

    for line in content.splitlines():
        line = line.strip()
        if not line or line.startswith("//"):
            continue

        # BO_ <id> <name>: <dlc> <transmitter>
        bo_match = re.match(r"^BO_\s+(\d+)\s+([a-zA-Z0-9_]+)\s*:\s*(\d+)\s+([a-zA-Z0-9_]+)", line)
        if bo_match:
            raw_id = int(bo_match.group(1))
            clean_id = raw_id & 0x1FFFFFFF # strip extended flag
            current_msg = DbcMessageModel(
                id=clean_id,
                idHex=f"0x{clean_id:X}",
                name=bo_match.group(2),
                dlc=int(bo_match.group(3)),
                transmitter=bo_match.group(4),
                signals=[]
            )
            messages.append(current_msg)
            continue

        # SG_ <name> : <start>|<len>@<endian><sign> (<scale>,<offset>) [<min>|<max>] "<unit>" <rx>
        sg_match = re.match(
            r"^SG_\s+([a-zA-Z0-9_]+)\s*(?:M\s*|\s*):\s*(\d+)\|(\d+)@([01])([+-])\s*\(([^,]+),([^)]+)\)\s*\[([^|]+)\|([^\]]+)\]\s*\"([^\"]*)\"\s*(.*)",
            line
        )
        if sg_match and current_msg is not None:
            signal = DbcSignalModel(
                name=sg_match.group(1),
                startBit=int(sg_match.group(2)),
                length=int(sg_match.group(3)),
                byteOrder="little_endian" if sg_match.group(4) == "1" else "big_endian",
                isSigned=sg_match.group(5) == "-",
                scale=float(sg_match.group(6)),
                offset=float(sg_match.group(7)),
                min=float(sg_match.group(8)),
                max=float(sg_match.group(9)),
                unit=sg_match.group(10),
                receivers=[r.strip() for r in sg_match.group(11).split(",") if r.strip()]
            )
            current_msg.signals.append(signal)

    return DbcDatabaseModel(filename=filename, messages=messages)
