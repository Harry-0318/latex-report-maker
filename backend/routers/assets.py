from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse
from services.asset_store import asset_store
import os

router = APIRouter()

@router.get("/assets/{asset_id}")
async def get_asset(asset_id: str):
    path = asset_store.get_asset_path(asset_id)
    if not path or not os.path.exists(path):
        raise HTTPException(status_code=404, detail="Asset not found")
    
    return FileResponse(path, media_type="image/jpeg")
