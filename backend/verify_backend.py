
from fastapi.testclient import TestClient
from main import app
import json
import zipfile
import io
import os

client = TestClient(app)

def test_generate_zip():
    print("Starting verification test...")
    
    # Create a dummy image
    dummy_image_content = b"fake_image_bytes"
    files = [
        ('files', ('test_image.png', dummy_image_content, 'image/png'))
    ]
    
    # Create report JSON
    report_data = {
        "title": "Test Lab Report",
        "author": "Antigravity Agent",
        "cells": [
            {
                "id": "1",
                "type": "text",
                "content": "This is a test paragraph with special chars: 100% & $5."
            },
            {
                "id": "2",
                "type": "code",
                "content": "print('Hello World')\nreturn True"
            },
            {
                "id": "3",
                "type": "image",
                "mode": "camera",
                "content": "test_image.png",
                "caption": "A captured image"
            },
            {
                "id": "4",
                "type": "image",
                "mode": "placeholder",
                "caption": "Draw here"
            }
        ]
    }
    
    response = client.post(
        "/generate-zip",
        data={"report_json": json.dumps(report_data)},
        files=files
    )
    
    if response.status_code == 200:
        print("Success: Endpoint returned 200 OK")
        
        # Verify it's a valid ZIP
        try:
            zip_buffer = io.BytesIO(response.content)
            with zipfile.ZipFile(zip_buffer, 'r') as zf:
                file_list = zf.namelist()
                print(f"ZIP contents: {file_list}")
                
                if "main.tex" in file_list:
                    print("Found main.tex")
                    tex_content = zf.read("main.tex").decode('utf-8')
                    # Basic checks on content
                    if "Test Lab Report" in tex_content:
                        print("Verification: Title present")
                    else:
                        print("Error: Title missing in TEX")
                        
                    if "A captured image" in tex_content:
                         print("Verification: Caption present")
                    
                    if "images/img_001.png" in file_list:
                         print("Found images/img_001.png")
                    elif any(f.startswith("images/") for f in file_list):
                         print("Found image directory but maybe different name")
                    else:
                         print("Error: Image missing from ZIP")
                         
                else:
                    print("Error: main.tex missing from ZIP")
                    
        except zipfile.BadZipFile:
            print("Error: Response is not a valid ZIP file")
    else:
        print(f"Error: Endpoint returned {response.status_code}")
        print(response.text)

if __name__ == "__main__":
    # Ensure we are in backend dir so imports work
    os.chdir(os.path.dirname(os.path.abspath(__file__)))
    test_generate_zip()
