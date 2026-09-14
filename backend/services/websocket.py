import json
from typing import Set
from fastapi import WebSocket

class WebSocketBroadcaster:
    """
    Manages active client WebSocket connections for real-time CAN stream.
    """

    def __init__(self):
        self.active_connections: Set[WebSocket] = set()

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.add(websocket)

    def disconnect(self, websocket: WebSocket):
        self.active_connections.discard(websocket)

    async def broadcast_frame(self, frame_dict: dict):
        if not self.active_connections:
            return

        payload = json.dumps(frame_dict)
        disconnected = set()
        for connection in list(self.active_connections):
            try:
                await connection.send_text(payload)
            except Exception:
                disconnected.add(connection)

        for conn in disconnected:
            self.active_connections.discard(conn)
