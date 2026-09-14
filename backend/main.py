import asyncio
import threading
from contextlib import asynccontextmanager
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from .can.manager import CanManager
from .services.recorder import CanRecorder
from .services.websocket import WebSocketBroadcaster
from .dbc.parser import parse_dbc_content
from .api.status import create_status_router
from .api.connection import create_connection_router
from .api.configuration import create_configuration_router
from .api.logging import create_logging_router

manager = CanManager()
recorder = CanRecorder()
broadcaster = WebSocketBroadcaster()

# Background async pump for streaming frames from CAN interface to WebSockets
stop_pump = threading.Event()

def frame_pump_worker(loop: asyncio.AbstractEventLoop):
    while not stop_pump.is_set():
        frame = manager.receive(timeout=0.05)
        if frame is not None:
            recorder.record_frame(frame)
            asyncio.run_coroutine_threadsafe(
                broadcaster.broadcast_frame(frame.model_dump()),
                loop
            )

@asynccontextmanager
async def lifespan(app: FastAPI):
    loop = asyncio.get_running_loop()
    pump_thread = threading.Thread(target=frame_pump_worker, args=(loop,), daemon=True)
    pump_thread.start()
    yield
    stop_pump.set()
    manager.disconnect()

app = FastAPI(
    title="CANScope API",
    description="Professional CAN/CAN-FD Bus sniffer, analyzer, and transmission backend",
    version="1.0.0",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount REST API routers
app.include_router(create_status_router(manager))
app.include_router(create_connection_router(manager))
app.include_router(create_configuration_router(manager))
app.include_router(create_logging_router(recorder))

class DbcUploadModel(BaseModel):
    content: str
    filename: str = "custom.dbc"

@app.post("/api/dbc/load")
def load_dbc(payload: DbcUploadModel):
    try:
        parsed = parse_dbc_content(payload.content, payload.filename)
        return {
            "success": True,
            "filename": payload.filename,
            "messageCount": len(parsed.messages),
            "messages": [m.model_dump() for m in parsed.messages]
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to parse DBC: {str(e)}")

@app.websocket("/ws/can")
async def websocket_can_endpoint(websocket: WebSocket):
    await broadcaster.connect(websocket)
    try:
        # Send initial status
        status = manager.get_status()
        await websocket.send_json({"type": "status", "data": status.model_dump()})

        while True:
            data = await websocket.receive_text()
            # Handle client messages if any
            if "ping" in data:
                await websocket.send_json({"type": "pong"})
    except WebSocketDisconnect:
        broadcaster.disconnect(websocket)
    except Exception:
        broadcaster.disconnect(websocket)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.main:app", host="0.0.0.0", port=8000, reload=True)
