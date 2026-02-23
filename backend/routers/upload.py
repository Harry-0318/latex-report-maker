from fastapi import APIRouter, HTTPException, UploadFile, File, Request
from models.upload_models import UploadSessionCreate, UploadSession, MobileUploadResponse, PhotoUploadedPayload, WSMessage
from services.session_store import session_store
from services.image_processing import image_processor
from services.asset_store import asset_store
from services.ws_hub import ws_hub
import os

router = APIRouter()

@router.post("/upload-sessions", response_model=UploadSession)
async def create_upload_session(request: UploadSessionCreate):
    session = session_store.create_session(request.editorSessionId, request.targetCellId)
    # Note: In a real app, mobileUploadUrl would be constructed using the backend's public URL
    # For now, we return the sessionId and let the frontend build the URL
    return session

@router.get("/upload-sessions/{session_id}", response_model=UploadSession)
async def validate_upload_session(session_id: str):
    session = session_store.get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found or expired")
    return session

@router.post("/upload-sessions/{session_id}/image", response_model=MobileUploadResponse)
async def mobile_upload_image(session_id: str, file: UploadFile = File(...)):
    session = session_store.get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found or expired")
    
    content = await file.read()
    processed_data, meta = image_processor.process_image(content, file.filename)
    asset = asset_store.store_asset(processed_data, file.filename, meta)
    
    # Broadcast to desktop
    # Note: assetUrl depends on the serving endpoint
    asset_url = f"/assets/{asset.assetId}"
    
    payload = PhotoUploadedPayload(
        targetCellId=session.targetCellId,
        assetId=asset.assetId,
        assetUrl=asset_url,
        meta=meta
    )
    
    await ws_hub.broadcast(
        session.editorSessionId,
        WSMessage(type="photo_uploaded", payload=payload.dict())
    )
    
    session_store.mark_used(session_id)
    
    return MobileUploadResponse(
        assetId=asset.assetId,
        assetUrl=asset_url,
        meta=meta
    )
