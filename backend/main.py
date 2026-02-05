from fastapi import FastAPI, UploadFile, File, Form, HTTPException
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
# Assuming backend is the root or in python path. 
# Relative imports might be tricky depending on how it's run.
# Using absolute imports based on file structure.
from latex.cell_renderer import render_cell, escape_latex
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

STORAGE_BASE_URL = "https://storage.projectalpha.in"

@app.get("/get-template/{code}")
async def get_template(code: str):
    if len(code) != 6:
        return JSONResponse(content={"success": False, "error": "Invalid template code length"}, status_code=400)

    # Use the new service
    # Import inside function or at top - keeping imports top is better but for this tool usage I'll add import at top in next step or just do it here if I assume I can edit whole file or multiple chunks.
    # I can't edit multiple chunks with replace_file_content.
    # I will do dynamic import here for safety or assume I can add import.
    # Actually, I should update imports first or use full path.
    # Let's use local import for now to minimise conflict, or update the top of file later.
    from services.templateStorage import fetchAllTemplates
    
    records = await fetchAllTemplates()
    
    target_template = None
    for record in records:
        if record.get("code") == code:
            target_template = record
            break
    
    if target_template:
        return {
            "success": True,
            "name": target_template.get("name"),
            "structure": target_template.get("structure")
        }
    else:
        return JSONResponse(content={"success": False, "error": "Invalid template code"}, status_code=404)

@app.get("/admin/templates")
async def admin_list_templates():
    """Admin endpoint to list all available template codes and names."""
    from services.templateStorage import fetchAllTemplates
    
    try:
        records = await fetchAllTemplates()
        
        # Return only code and name, not full structure
        templates = [
            {"code": r.get("code"), "name": r.get("name")}
            for r in records
            if r.get("code") and r.get("name")
        ]
        
        return templates
    
    except Exception as e:
        print(f"Admin templates error: {e}")
        return JSONResponse(
            content={"success": False, "error": "storage_unreachable"},
            status_code=502
        )

class Cell(BaseModel):
    id: str
    type: str  # text, code, image
    content: Optional[str] = ""
    mode: Optional[str] = "placeholder" # for images
    caption: Optional[str] = ""
    original_filename: Optional[str] = None # for tracking image files

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
    sections: List[Section]

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
        image_map = {} # original_filename -> clean_filename
        
        uploaded_file_map = {f.filename: f for f in files}
        
        # Process all cells in the nested structure
        image_counter = 1
        for section in report.sections:
            for subsection in section.subsections:
                for cell in subsection.cells:
                    if cell.type == "image" and cell.mode != "placeholder":
                        target_filename = cell.original_filename or cell.content
                        if target_filename in uploaded_file_map:
                            file_obj = uploaded_file_map[target_filename]
                            ext = target_filename.split('.')[-1] if '.' in target_filename else 'png'
                            clean_name = f"img_{image_counter:03d}.{ext}"
                            
                            await file_obj.seek(0)
                            content = await file_obj.read()
                            image_files[clean_name] = content
                            image_map[target_filename] = clean_name
                            image_counter += 1
        
        # Build LaTeX Body
        latex_body_parts = []
        
        # Add TOC if significant
        if len(report.sections) > 5:
            latex_body_parts.append("\\tableofcontents\n\\newpage\n\n")

        for section in report.sections:
            latex_body_parts.append(f"\\section{{{escape_latex(section.title)}}}\n")
            
            for subsection in section.subsections:
                latex_body_parts.append(f"\\subsection{{{escape_latex(subsection.title)}}}\n")
                
                for cell in subsection.cells:
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
        print(f"ERROR: {e}") # Print error to server logs
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
