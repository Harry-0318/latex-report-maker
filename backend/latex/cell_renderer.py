import re

def escape_latex(text: str) -> str:
    """
    Escapes special LaTeX characters in the text.
    """
    if not text:
        return ""
        
    chars = {
        '&': r'\&',
        '%': r'\%',
        '$': r'\$',
        '#': r'\#',
        '_': r'\_',
        '{': r'\{',
        '}': r'\}',
        '~': r'\textasciitilde{}',
        '^': r'\textasciicircum{}',
        '\\': r'\textbackslash{}',
    }
    pattern = re.compile('|'.join(re.escape(key) for key in chars.keys()))
    return pattern.sub(lambda x: chars[x.group()], text)

def render_cell(cell, image_map):
    """
    Converts a single cell into a LaTeX string.
    
    Args:
        cell: Pydantic model or dict containing cell data (type, mode, content, etc.)
        image_map: Dictionary mapping original filenames to their clean names in the zip.
    
    Returns:
        str: LaTeX content for the cell.
    """
    # If cell is a Pydantic model, convert to dict-like access or just attribute access
    # Assuming 'cell' is a Pydantic model from main.py, so we use dot notation.
    # We'll handle both for robustness if needed, but sticky to dot notation for Pydantic.
    
    c_type = cell.type
    content = cell.content or ""
    
    if c_type == "text":
        # Convert text content to paragraphs
        # Simple implementation: split by double newlines and wrap in nothing special, 
        # as parskip package handles spacing. Just escape text.
        safe_content = escape_latex(content)
        # Convert newlines to simple breaks or just let LaTeX handle it?
        # Typically double newline is a paragraph break.
        return f"{safe_content}\n\n"

    elif c_type == "code":
        # Wrap in lstlisting
        # No escaping needed inside lstlisting usually, except for specific cases, 
        # but basic listing is safe.
        return f"\\begin{{lstlisting}}\n{content}\n\\end{{lstlisting}}\n\n"

    elif c_type == "image":
        # Handle images
        mode = getattr(cell, "mode", "placeholder") # placeholder, camera, gallery
        caption = getattr(cell, "caption", "")
        safe_caption = escape_latex(caption) if caption else ""
        
        if mode == "placeholder":
            # Boxed placeholder
            return (
                f"\\begin{{figure}}[H]\n"
                f"\\centering\n"
                f"\\fbox{{\\begin{{minipage}}{{0.8\\textwidth}}\n"
                f"\\centering\\vspace{{2cm}}\n"
                f"\\textbf{{[Image Placeholder]}}\n"
                f"\\vspace{{2cm}}\n"
                f"\\end{{minipage}}}}\n"
                f"\\caption{{{safe_caption}}}\n"
                f"\\end{{figure}}\n\n"
            )
        else:
            # Camera or Gallery - expects an image file
            # content field might hold the filename source
            original_filename = getattr(cell, "original_filename", content) # Assuming content or a specific field holds the ref
            
            # Since we receive the file separately, we need to map to the saved filename
            # The 'content' of an image cell in the JSON usually points to the file identifier/name
            
            # However, looking at the user request: "Receive: ... zero or more image files"
            # The backend receiving logic needs to coordinate this. 
            # Let's assume 'content' holds the filename that matches the uploaded file's filename.
            
            clean_filename = image_map.get(original_filename)
            
            if clean_filename:
                return (
                    f"\\begin{{figure}}[H]\n"
                    f"\\centering\n"
                    f"\\includegraphics[width=0.8\\linewidth]{{images/{clean_filename}}}\n"
                    f"\\caption{{{safe_caption}}}\n"
                    f"\\end{{figure}}\n\n"
                )
            else:
                # Fallback if image not found
                return (
                    f"\\begin{{figure}}[H]\n"
                    f"\\centering\n"
                    f"\\fbox{{Image not found: {escape_latex(original_filename)}}}\n"
                    f"\\caption{{{safe_caption}}}\n"
                    f"\\end{{figure}}\n\n"
                )
    
    return ""
