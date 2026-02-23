from fastapi import WebSocket
from typing import Dict, Set
import json
from models.upload_models import WSMessage

class WSHub:
    def __init__(self):
        self._connections: Dict[str, Set[WebSocket]] = {}

    async def connect(self, editor_session_id: str, websocket: WebSocket):
        await websocket.accept()
        if editor_session_id not in self._connections:
            self._connections[editor_session_id] = set()
        self._connections[editor_session_id].add(websocket)

    def disconnect(self, editor_session_id: str, websocket: WebSocket):
        if editor_session_id in self._connections:
            self._connections[editor_session_id].discard(websocket)
            if not self._connections[editor_session_id]:
                del self._connections[editor_session_id]

    async def broadcast(self, editor_session_id: str, message: WSMessage):
        if editor_session_id in self._connections:
            disconnected_sockets = set()
            payload_json = message.json()
            for websocket in self._connections[editor_session_id]:
                try:
                    await websocket.send_text(payload_json)
                except Exception:
                    disconnected_sockets.add(websocket)
            
            for ws in disconnected_sockets:
                self.disconnect(editor_session_id, ws)

ws_hub = WSHub()
