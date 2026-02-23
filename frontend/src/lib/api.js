const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || `${window.location.protocol}//${window.location.hostname}:8000`;

export const createUploadSession = async (editorSessionId, targetCellId) => {
    const response = await fetch(`${BACKEND_URL}/upload-sessions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ editorSessionId, targetCellId }),
    });
    if (!response.ok) throw new Error('Failed to create upload session');
    return response.json();
};

export const validateUploadSession = async (sessionId) => {
    const response = await fetch(`${BACKEND_URL}/upload-sessions/${sessionId}`);
    if (!response.ok) throw new Error('Invalid or expired session');
    return response.json();
};

export const uploadMobileImage = async (sessionId, file) => {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(`${BACKEND_URL}/upload-sessions/${sessionId}/image`, {
        method: 'POST',
        body: formData,
    });
    if (!response.ok) throw new Error('Upload failed');
    return response.json();
};
