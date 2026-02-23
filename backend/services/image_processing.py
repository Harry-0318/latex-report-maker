from PIL import Image, ExifTags
import io
import os
from typing import Tuple, Optional
from models.upload_models import AssetMeta

class ImageProcessor:
    def __init__(self, max_dimension: int = 1920, quality: int = 80):
        self.max_dimension = max_dimension
        self.quality = quality

    def process_image(self, data: bytes, filename: str) -> Tuple[bytes, AssetMeta]:
        img = Image.open(io.BytesIO(data))
        
        # Auto-orient using EXIF
        try:
            for orientation in ExifTags.TAGS.keys():
                if ExifTags.TAGS[orientation] == 'Orientation':
                    break
            exif = dict(img._getexif().items())

            if exif[orientation] == 3:
                img = img.rotate(180, expand=True)
            elif exif[orientation] == 6:
                img = img.rotate(270, expand=True)
            elif exif[orientation] == 8:
                img = img.rotate(90, expand=True)
        except (AttributeError, KeyError, IndexError):
            # No EXIF or no orientation info
            pass

        # Resize if needed
        width, height = img.size
        if max(width, height) > self.max_dimension:
            if width > height:
                new_width = self.max_dimension
                new_height = int(height * (self.max_dimension / width))
            else:
                new_height = self.max_dimension
                new_width = int(width * (self.max_dimension / height))
            img = img.resize((new_width, new_height), Image.LANCZOS)
            width, height = new_width, new_height

        # Convert to RGB if necessary (e.g., for RGBA to JPEG)
        if img.mode in ("RGBA", "P"):
            img = img.convert("RGB")
        elif img.mode != "RGB":
            img = img.convert("RGB")

        # Save to buffer
        output_buffer = io.BytesIO()
        img.save(output_buffer, format="JPEG", quality=self.quality, optimize=True, progressive=True)
        processed_data = output_buffer.getvalue()
        
        meta = AssetMeta(
            width=width,
            height=height,
            sizeBytes=len(processed_data),
            mimeType="image/jpeg"
        )
        
        return processed_data, meta

image_processor = ImageProcessor()
