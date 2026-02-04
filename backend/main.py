from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.responses import Response
from pydantic import BaseModel
from typing import List, Optional
import json

# Import local modules
# Assuming backend is the root or in python path. 
# Relative imports might be tricky depending on how it's run.
# Using absolute imports based on file structure.
from latex.cell_renderer import render_cell
from latex.template import LATEX_TEMPLATE
from zip_utils.zip_builder import create_report_zip

from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all origins
    allow_credentials=True,
    allow_methods=["*"],  # Allows all methods
    allow_headers=["*"],  # Allows all headers
)

class Cell(BaseModel):
    id: str
    type: str  # text, code, image
    content: Optional[str] = ""
    mode: Optional[str] = "placeholder" # for images
    caption: Optional[str] = ""
    original_filename: Optional[str] = None # for tracking image files

class Report(BaseModel):
    title: str
    author: str
    cells: List[Cell]

@app.post("/generate-zip")
async def generate_zip(
    report_json: str = Form(...),
    files: List[UploadFile] = File(default=[])
):
    try:
        # Parse JSON
        report_data = json.loads(report_json)
        report = Report(**report_data)
        
        # Prepare image map: original_filename -> clean_filename
        # We also need to read the file contents
        image_files = {} # clean_filename -> bytes
        image_map = {} # original_filename -> clean_filename
        
        # Map uploaded files by their filename
        # Note: frontend must send files with names matching what's in 'original_filename' or 'content'
        uploaded_file_map = {f.filename: f for f in files}
        
        # Process cells to find images and map them
        image_counter = 1
        for cell in report.cells:
            if cell.type == "image" and cell.mode != "placeholder":
                # Determine the filename to look for
                target_filename = cell.original_filename or cell.content
                
                if target_filename in uploaded_file_map:
                    file_obj = uploaded_file_map[target_filename]
                    # Create a clean safe filename for latex
                    # e.g. img001.png, img002.jpg
                    ext = target_filename.split('.')[-1] if '.' in target_filename else 'png'
                    clean_name = f"img_{image_counter:03d}.{ext}"
                    
                    # Read content
                    # If we haven't read this file yet (in case of duplicate usage? Unlikely for this app but possible)
                    # We re-read or cache. UploadFile.read() consumes stream.
                    await file_obj.seek(0)
                    content = await file_obj.read()
                    
                    image_files[clean_name] = content
                    image_map[target_filename] = clean_name
                    image_counter += 1
        
        # Render cells
        latex_body_parts = []
        for cell in report.cells:
            latex_body_parts.append(render_cell(cell, image_map))
            
        latex_body = "".join(latex_body_parts)
        
        # Fill template
        full_latex = LATEX_TEMPLATE % {
            "title": report.title,
            "author": report.author,
            "content": latex_body
        }
        
        # Create ZIP
        zip_bytes = create_report_zip(full_latex, image_files)
        
        # Return response
        filename = f"{report.title.replace(' ', '_')}_Report.zip"
        return Response(
            content=zip_bytes,
            media_type="application/zip",
            headers={"Content-Disposition": f"attachment; filename={filename}"}
        )

    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="Invalid JSON format in report_json")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
