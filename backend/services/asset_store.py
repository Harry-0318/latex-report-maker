import os
import uuid
from typing import Dict, Optional
from models.upload_models import StoredAsset, AssetMeta
from datetime import datetime

class AssetStore:
    def __init__(self, storage_dir: str = "/tmp/report_assets"):
        self.storage_dir = storage_dir
        self._assets: Dict[str, StoredAsset] = {}
        if not os.path.exists(self.storage_dir):
            os.makedirs(self.storage_dir)

    def store_asset(self, data: bytes, original_filename: str, meta: AssetMeta) -> StoredAsset:
        asset_id = str(uuid.uuid4())
        ext = "jpg" # We normalize to JPEG in image_processor
        filename = f"{asset_id}.{ext}"
        path = os.path.join(self.storage_dir, filename)
        
        with open(path, "wb") as f:
            f.write(data)
            
        asset = StoredAsset(
            assetId=asset_id,
            pathOrKey=path,
            originalFilename=original_filename,
            mimeType=meta.mimeType,
            sizeBytes=meta.sizeBytes,
            width=meta.width,
            height=meta.height
        )
        self._assets[asset_id] = asset
        return asset

    def get_asset(self, asset_id: str) -> Optional[StoredAsset]:
        return self._assets.get(asset_id)

    def get_asset_path(self, asset_id: str) -> Optional[str]:
        asset = self.get_asset(asset_id)
        if asset and os.path.exists(asset.pathOrKey):
            return asset.pathOrKey
        return None

asset_store = AssetStore()
