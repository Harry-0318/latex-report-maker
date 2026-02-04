import io
import zipfile
from typing import Dict, Tuple

def create_report_zip(latex_content: str, images: Dict[str, bytes]) -> bytes:
    """
    Creates a ZIP file containing main.tex and an images directory.
    
    Args:
        latex_content: The full content of the main.tex file.
        images: A dictionary where key is filename and value is file bytes.
        
    Returns:
        bytes: The ZIP file content.
    """
    zip_buffer = io.BytesIO()
    
    with zipfile.ZipFile(zip_buffer, "w", zipfile.ZIP_DEFLATED) as zip_file:
        # Write main.tex
        zip_file.writestr("main.tex", latex_content)
        
        # Write images
        for filename, content in images.items():
            zip_file.writestr(f"images/{filename}", content)
            
    return zip_buffer.getvalue()
