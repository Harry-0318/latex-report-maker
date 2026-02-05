
from fastapi.testclient import TestClient
from main import app
import json
import zipfile
import io
import os

client = TestClient(app)

def test_generate_zip():
    print("Starting verification test...")
    
    # Simulating the unique filename logic from frontend
    unique_filename_1 = "123_test_image.png"
    unique_filename_2 = "456_test_image.png"

    # Create dummy image content
    dummy_image_content = b"fake_image_bytes"

    # Files with unique names
    files = [
        ('files', (unique_filename_1, dummy_image_content, 'image/png')),
        ('files', (unique_filename_2, dummy_image_content, 'image/png'))
    ]
    
    # Create report JSON with nested structure
    report_data = {
        "title": "Test Lab Report",
        "author": "Antigravity Agent",
        "sections": [
            {
                "id": "sec1",
                "title": "Section 1",
                "subsections": [
                    {
                        "id": "sub1",
                        "title": "Subsection 1",
                        "cells": [
                             {
                                "id": "cell1",
                                "type": "text",
                                "content": "Intro text."
                            },
                            {
                                "id": "cell2",
                                "type": "image",
                                "mode": "camera",
                                "content": unique_filename_1, # Using unique filename
                                "original_filename": unique_filename_1,
                                "caption": "Image 1"
                            },
                             {
                                "id": "cell3",
                                "type": "image",
                                "mode": "gallery",
                                "content": unique_filename_2, # Using unique filename
                                "original_filename": unique_filename_2,
                                "caption": "Image 2"
                            }
                        ]
                    }
                ]
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

                    if "Test Lab Report" in tex_content:
                        print("Verification: Title present")
                    else:
                        print("Error: Title missing in TEX")
                        
                    if "images/img_001.png" in file_list and "images/img_002.png" in file_list:
                         print("Found images/img_001.png and images/img_002.png")
                    else:
                         print("Error: Images missing from ZIP")
                         
                else:
                    print("Error: main.tex missing from ZIP")
                    
        except zipfile.BadZipFile:
            print("Error: Response is not a valid ZIP file")
    else:
        print(f"Error: Endpoint returned {response.status_code}")
        print(response.text)

if __name__ == "__main__":
    os.chdir(os.path.dirname(os.path.abspath(__file__)))
    test_generate_zip()
