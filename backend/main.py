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
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
