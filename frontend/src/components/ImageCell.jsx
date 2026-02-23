import React, { useState, useEffect } from 'react';
import PhoneUploadModal from './PhoneUploadModal';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || `${window.location.protocol}//${window.location.hostname}:8000`;

export default function ImageCell({ cell, updateCell }) {
    const [preview, setPreview] = useState(null);
    const [showPhoneModal, setShowPhoneModal] = useState(false);
    console.log(BACKEND_URL);

    useEffect(() => {
        // Determine initial preview based on cell state, file, or asset_url
        if (cell.file_obj) {
            const objectUrl = URL.createObjectURL(cell.file_obj);
            setPreview(objectUrl);
            return () => URL.revokeObjectURL(objectUrl);
        } else if (cell.asset_url) {
            setPreview(`${BACKEND_URL}${cell.asset_url}`);
        } else if (cell.mode === 'placeholder') {
            setPreview(null);
        } else {
            setPreview(null);
        }
    }, [cell.file_obj, cell.asset_url, cell.mode]);

    const handleModeChange = (mode) => {
        // Clear file/asset if moving to placeholder
        updateCell(cell.id, { mode, file_obj: null, asset_id: null, asset_url: null, content: "" });
    };

    const handleFileChange = (e) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            // Update cell with file object. Clear asset fields if any.
            updateCell(cell.id, {
                file_obj: file,
                content: file.name,
                asset_id: null,
                asset_url: null
            });
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
                <button
                    className="btn-phone-upload"
                    onClick={() => setShowPhoneModal(true)}
                    style={{ marginLeft: '10px', fontSize: '12px' }}
                >
                    📱 From Phone
                </button>
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
                        <div style={{ position: 'relative' }}>
                            <img src={preview} alt="Preview" className="image-preview" />
                            {cell.asset_id && (
                                <span style={{
                                    position: 'absolute',
                                    top: '5px',
                                    right: '5px',
                                    backgroundColor: 'rgba(0,123,255,0.8)',
                                    color: 'white',
                                    fontSize: '10px',
                                    padding: '2px 5px',
                                    borderRadius: '4px'
                                }}>
                                    Cloud
                                </span>
                            )}
                        </div>
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

            {showPhoneModal && (
                <PhoneUploadModal
                    targetCellId={cell.id}
                    onClose={() => setShowPhoneModal(false)}
                />
            )}
        </div>
    );
}
