from fastapi import FastAPI, UploadFile, File, Form, HTTPException, APIRouter
from fastapi.responses import Response, JSONResponse
from pydantic import BaseModel
from typing import List, Optional
import json
import os
import httpx
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Import local modules
from latex.cell_renderer import render_cell, escape_latex
from latex.base_document import BASE_DOCUMENT
from zip_utils.zip_builder import create_report_zip

from routers import upload, ws, assets
from services.asset_store import asset_store

from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(upload.router, tags=["upload"])
app.include_router(ws.router, tags=["websocket"])
app.include_router(assets.router, tags=["assets"])

class Cell(BaseModel):
    id: str
    type: str  # text, code, image
    content: Optional[str] = ""
    mode: Optional[str] = "placeholder" # for images
    caption: Optional[str] = ""
    original_filename: Optional[str] = None # for tracking image files
    asset_id: Optional[str] = None # for pre-uploaded assets via phone

class Subsection(BaseModel):
    id: str
    title: str
    cells: List[Cell]

class Section(BaseModel):
    id: str
    title: str
    subsections: List[Subsection]

class Report(BaseModel):
    title: str
    author: str
    cells: List[Cell] = []
    sections: List[Section]

async def process_cells(cells: List[Cell], uploaded_file_map, image_files, image_map, image_counter):
    for cell in cells:
        if cell.type == "image" and cell.mode != "placeholder":
            content_bytes = None
            ext = "png"
            
            # 1. Check for asset_id (pre-uploaded via phone)
            if cell.asset_id:
                asset_path = asset_store.get_asset_path(cell.asset_id)
                if asset_path and os.path.exists(asset_path):
                    with open(asset_path, "rb") as f:
                        content_bytes = f.read()
                    ext = asset_path.split('.')[-1]
            
            # 2. Fallback to multipart upload (desktop)
            if not content_bytes:
                target_filename = cell.original_filename or cell.content
                if target_filename in uploaded_file_map:
                    file_obj = uploaded_file_map[target_filename]
                    ext = target_filename.split('.')[-1] if '.' in target_filename else 'png'
                    await file_obj.seek(0)
                    content_bytes = await file_obj.read()
            
            # 3. If we have content, add it to the ZIP map
            if content_bytes:
                clean_name = f"img_{image_counter[0]:03d}.{ext}"
                image_files[clean_name] = content_bytes
                # Use id as key in map if filename is not stable
                # latex renderer uses image_map[cell.original_filename or cell.content]
                target_key = cell.original_filename or cell.content
                if cell.asset_id:
                    # For asset_id, cell.content might be empty/URL
                    # We need a stable key for renderer. 
                    # Renderer uses cell.content if original_filename is missing.
                    target_key = cell.original_filename or cell.content or cell.asset_id
                
                image_map[target_key] = clean_name
                image_counter[0] += 1

@app.post("/generate-zip")
async def generate_zip(
    report_json: str = Form(...),
    files: List[UploadFile] = File(default=[])
):
    try:
        # Parse JSON
        report_data = json.loads(report_json)
        report = Report(**report_data)
        
        # Prepare image map
        image_files = {} # clean_filename -> bytes
        image_map = {} # target_key -> clean_filename
        
        uploaded_file_map = {f.filename: f for f in files}
        image_counter = [1] # Using list for mutable counter in recursion/loops
        
        # Process top-level cells
        await process_cells(report.cells, uploaded_file_map, image_files, image_map, image_counter)

        # Process sections/subsections
        for section in report.sections:
            for subsection in section.subsections:
                await process_cells(subsection.cells, uploaded_file_map, image_files, image_map, image_counter)
        
        # Build LaTeX Body
        latex_body_parts = []
        
        # Add TOC if significant
        if len(report.sections) > 5:
            latex_body_parts.append("\\tableofcontents\n\\newpage\n\n")

        for cell in report.cells:
            latex_body_parts.append(render_cell(cell, image_map))

        for section in report.sections:
            latex_body_parts.append(f"\\section{{{escape_latex(section.title)}}}\n")
            for subsection in section.subsections:
                latex_body_parts.append(f"\\subsection{{{escape_latex(subsection.title)}}}\n")
                for cell in subsection.cells:
                    latex_body_parts.append(render_cell(cell, image_map))
        
        latex_body = "".join(latex_body_parts)
        
        # Fill document structure
        full_latex = BASE_DOCUMENT % {
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
        print(f"ERROR: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
