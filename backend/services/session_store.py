from datetime import datetime, timedelta
from typing import Dict, Optional
import threading
import time
from models.upload_models import UploadSession

class SessionStore:
    def __init__(self, ttl_seconds: int = 900):
        self._sessions: Dict[str, UploadSession] = {}
        self._ttl_seconds = ttl_seconds
        self._lock = threading.Lock()
        
        # Start cleanup thread
        self._cleanup_thread = threading.Thread(target=self._cleanup_loop, daemon=True)
        self._cleanup_thread.start()

    def create_session(self, editor_session_id: str, target_cell_id: str) -> UploadSession:
        expires_at = datetime.utcnow() + timedelta(seconds=self._ttl_seconds)
        session = UploadSession(
            editorSessionId=editor_session_id,
            targetCellId=target_cell_id,
            expiresAt=expires_at
        )
        with self._lock:
            self._sessions[session.sessionId] = session
        return session

    def get_session(self, session_id: str) -> Optional[UploadSession]:
        with self._lock:
            session = self._sessions.get(session_id)
            if session:
                if session.expiresAt < datetime.utcnow() or session.status != "active":
                    return None
            return session

    def mark_used(self, session_id: str):
        with self._lock:
            if session_id in self._sessions:
                self._sessions[session_id].status = "used"

    def _cleanup_loop(self):
        while True:
            time.sleep(60) # Cleanup every minute
            now = datetime.utcnow()
            with self._lock:
                expired_ids = [
                    sid for sid, s in self._sessions.items() 
                    if s.expiresAt < now or s.status != "active"
                ]
                for sid in expired_ids:
                    del self._sessions[sid]

session_store = SessionStore()
