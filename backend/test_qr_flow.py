import json
from fastapi.testclient import TestClient
from main import app
import uuid
import os

client = TestClient(app)

def test_upload_flow():
    print("\n--- Testing QR Upload Flow ---")
    
    editor_session_id = str(uuid.uuid4())
    target_cell_id = "cell_123"
    
    # 1. Create upload session
    print("1. Creating upload session...")
    resp = client.post("/upload-sessions", json={
        "editorSessionId": editor_session_id,
        "targetCellId": target_cell_id
    })
    assert resp.status_code == 200
    session_data = resp.json()
    session_id = session_data["sessionId"]
    print(f"   Session created: {session_id}")
    
    # 2. Validate session (mobile)
    print("2. Validating session (mobile)...")
    resp = client.get(f"/upload-sessions/{session_id}")
    assert resp.status_code == 200
    assert resp.json()["targetCellId"] == target_cell_id
    print("   Session valid")
    
    # 3. Upload image (mobile)
    print("3. Uploading image (mobile)...")
    from PIL import Image
    import io
    img = Image.new('RGB', (100, 100), color = 'red')
    img_byte_arr = io.BytesIO()
    img.save(img_byte_arr, format='JPEG')
    dummy_image = img_byte_arr.getvalue()
    
    files = {'file': ('photo.jpg', dummy_image, 'image/jpeg')}
    resp = client.post(f"/upload-sessions/{session_id}/image", files=files)
    assert resp.status_code == 200
    upload_data = resp.json()
    asset_id = upload_data["assetId"]
    asset_url = upload_data["assetUrl"]
    print(f"   Image uploaded. Asset ID: {asset_id}")
    
    # 4. Verify asset serving
    print("4. Verifying asset serving...")
    resp = client.get(asset_url)
    assert resp.status_code == 200
    print("   Asset served successfully")
    
    # 5. Verify ZIP generation with asset_id
    print("5. Verifying ZIP generation with asset_id...")
    report_data = {
        "title": "Asset Test",
        "author": "Tester",
        "sections": [
            {
                "id": "s1",
                "title": "Section 1",
                "subsections": [
                    {
                        "id": "sub1",
                        "title": "Sub 1",
                        "cells": [
                            {
                                "id": target_cell_id,
                                "type": "image",
                                "asset_id": asset_id,
                                "content": "phone_photo.jpg"
                            }
                        ]
                    }
                ]
            }
        ]
    }
    
    resp = client.post("/generate-zip", data={"report_json": json.dumps(report_data)})
    assert resp.status_code == 200
    print("   ZIP generated successfully with asset_id")
    
    print("--- QR Upload Flow Test Passed ---\n")

if __name__ == "__main__":
    # Ensure nested imports work
    import sys
    sys.path.append(os.path.join(os.getcwd(), 'backend'))
    test_upload_flow()
