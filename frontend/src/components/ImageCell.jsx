import React, { useState, useEffect } from 'react';

export default function ImageCell({ cell, updateCell }) {
    const [preview, setPreview] = useState(null);

    useEffect(() => {
        // Determine initial preview based on cell state or file
        if (cell.file_obj) {
            const objectUrl = URL.createObjectURL(cell.file_obj);
            setPreview(objectUrl);
            return () => URL.revokeObjectURL(objectUrl);
        } else if (cell.mode === 'placeholder') {
            setPreview(null);
        }
    }, [cell.file_obj, cell.mode]);

    const handleModeChange = (mode) => {
        // Clear file if moving to placeholder, or switching modes effectively resets "current" file logic
        updateCell(cell.id, { mode, file_obj: null, content: "" });
    };

    const handleFileChange = (e) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            // Update cell with file object. We use 'content' to store the filename for reference
            updateCell(cell.id, { file_obj: file, content: file.name });
        }
    };

    return (
        <div className="cell-image">
            <div className="image-mode-selector">
                <label className="image-mode-label">
                    <input
                        type="radio"
                        name={`mode-${cell.id}`}
                        value="camera"
                        checked={cell.mode === 'camera'}
                        onChange={() => handleModeChange('camera')}
                    />
                    Camera
                </label>
                <label className="image-mode-label">
                    <input
                        type="radio"
                        name={`mode-${cell.id}`}
                        value="gallery"
                        checked={cell.mode === 'gallery'}
                        onChange={() => handleModeChange('gallery')}
                    />
                    Gallery
                </label>
                <label className="image-mode-label">
                    <input
                        type="radio"
                        name={`mode-${cell.id}`}
                        value="placeholder"
                        checked={cell.mode === 'placeholder'}
                        onChange={() => handleModeChange('placeholder')}
                    />
                    Placeholder
                </label>
            </div>

            <div className="image-input-area">
                {cell.mode === 'camera' && (
                    <input
                        type="file"
                        accept="image/*"
                        capture="environment"
                        onChange={handleFileChange}
                    />
                )}

                {cell.mode === 'gallery' && (
                    <input
                        type="file"
                        accept="image/*"
                        onChange={handleFileChange}
                    />
                )}
            </div>

            <div className="image-display">
                {cell.mode === 'placeholder' ? (
                    <div className="image-placeholder-box">
                        [Boxed Figure Placeholder]
                    </div>
                ) : (
                    preview ? (
                        <img src={preview} alt="Preview" className="image-preview" />
                    ) : (
                        <div className="text-sm text-gray-500 italic p-2 border border-dashed text-center">
                            No image selected
                        </div>
                    )
                )}
            </div>

            <input
                type="text"
                placeholder="Figure Caption"
                value={cell.caption || ""}
                onChange={(e) => updateCell(cell.id, { caption: e.target.value })}
            />
        </div>
    );
}
