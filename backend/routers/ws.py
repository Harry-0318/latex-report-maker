from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from services.ws_hub import ws_hub

router = APIRouter()

@router.websocket("/ws/report-session/{editor_session_id}")
async def websocket_endpoint(websocket: WebSocket, editor_session_id: str):
    await ws_hub.connect(editor_session_id, websocket)
    try:
        while True:
            # We don't expect messages from the client in this flow
            # but we need to keep the connection open and detect disconnection
            await websocket.receive_text()
    except WebSocketDisconnect:
        ws_hub.disconnect(editor_session_id, websocket)
    except Exception:
        ws_hub.disconnect(editor_session_id, websocket)
