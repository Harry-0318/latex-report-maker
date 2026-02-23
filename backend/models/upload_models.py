from pydantic import BaseModel, Field
from typing import Optional, Dict
from datetime import datetime
import uuid

class UploadSessionCreate(BaseModel):
    editorSessionId: str
    targetCellId: str

class UploadSession(BaseModel):
    sessionId: str = Field(default_factory=lambda: str(uuid.uuid4()))
    editorSessionId: str
    targetCellId: str
    createdAt: datetime = Field(default_factory=datetime.utcnow)
    expiresAt: datetime
    status: str = "active" # active, used, expired

class AssetMeta(BaseModel):
    width: int
    height: int
    sizeBytes: int
    mimeType: str

class StoredAsset(BaseModel):
    assetId: str
    pathOrKey: str
    originalFilename: str
    mimeType: str
    sizeBytes: int
    width: int
    height: int
    createdAt: datetime = Field(default_factory=datetime.utcnow)

class MobileUploadResponse(BaseModel):
    assetId: str
    assetUrl: str
    meta: AssetMeta

class PhotoUploadedPayload(BaseModel):
    targetCellId: str
    assetId: str
    assetUrl: str
    meta: AssetMeta
    uploadedAt: datetime = Field(default_factory=datetime.utcnow)

class WSMessage(BaseModel):
    type: str # e.g., "photo_uploaded"
    payload: Dict
