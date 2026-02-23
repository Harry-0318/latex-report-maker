import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import imageCompression from 'browser-image-compression';
import { validateUploadSession, uploadMobileImage } from '../lib/api';

const MobileUploadPage = () => {
    const [searchParams] = useSearchParams();
    const sessionId = searchParams.get('sessionId');

    const [session, setSession] = useState(null);
    const [status, setStatus] = useState('loading'); // loading, ready, compressing, uploading, success, error
    const [error, setError] = useState(null);
    const [progress, setProgress] = useState(0);

    useEffect(() => {
        if (!sessionId) {
            setStatus('error');
            setError('No session ID provided. Please scan the QR code again.');
            return;
        }

        validateUploadSession(sessionId)
            .then(data => {
                setSession(data);
                setStatus('ready');
            })
            .catch(err => {
                setStatus('error');
                setError(err.message || 'Failed to validate session');
            });
    }, [sessionId]);

    const handleFileChange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        try {
            setStatus('compressing');
            const options = {
                maxSizeMB: 2,
                maxWidthOrHeight: 1920,
                useWebWorker: true,
                onProgress: (p) => setProgress(p),
            };

            const compressedFile = await imageCompression(file, options);

            setStatus('uploading');
            await uploadMobileImage(sessionId, compressedFile);
            setStatus('success');
        } catch (err) {
            console.error('Upload failed', err);
            setStatus('error');
            setError(err.message || 'Upload failed. Please try again.');
        }
    };

    return (
        <div className="mobile-upload-container" style={{ padding: '20px', textAlign: 'center', fontFamily: 'sans-serif' }}>
            <h1>Report Image Upload</h1>

            {status === 'loading' && <p>Validating session...</p>}

            {status === 'ready' && (
                <div className="upload-box">
                    <p>Ready to upload photo for cell: <strong>{session.targetCellId}</strong></p>
                    <div style={{ marginTop: '30px' }}>
                        <label className="upload-label" style={{
                            display: 'inline-block',
                            padding: '15px 30px',
                            backgroundColor: '#007bff',
                            color: 'white',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            fontSize: '18px'
                        }}>
                            Capture or Select Photo
                            <input
                                type="file"
                                accept="image/*"
                                capture="environment"
                                onChange={handleFileChange}
                                style={{ display: 'none' }}
                            />
                        </label>
                    </div>
                </div>
            )}

            {(status === 'compressing' || status === 'uploading') && (
                <div className="status-box">
                    <p>{status === 'compressing' ? 'Optimizing photo...' : 'Uploading...'}</p>
                    <div style={{ width: '100%', height: '10px', backgroundColor: '#eee', borderRadius: '5px', marginTop: '10px' }}>
                        <div style={{ width: `${progress}%`, height: '100%', backgroundColor: '#007bff', borderRadius: '5px', transition: 'width 0.3s' }}></div>
                    </div>
                </div>
            )}

            {status === 'success' && (
                <div className="success-box" style={{ color: 'green' }}>
                    <p style={{ fontSize: '48px' }}>✅</p>
                    <h2>Upload Successful!</h2>
                    <p>Your photo has been sent to the report editor. You can close this tab now.</p>
                    <button
                        onClick={() => setStatus('ready')}
                        style={{ marginTop: '20px', padding: '10px 20px', cursor: 'pointer' }}
                    >
                        Upload Another
                    </button>
                </div>
            )}

            {status === 'error' && (
                <div className="error-box" style={{ color: 'red' }}>
                    <p style={{ fontSize: '48px' }}>❌</p>
                    <h2>Error</h2>
                    <p>{error}</p>
                    {sessionId && (
                        <button
                            onClick={() => window.location.reload()}
                            style={{ marginTop: '20px', padding: '10px 20px', cursor: 'pointer' }}
                        >
                            Try Again
                        </button>
                    )}
                </div>
            )}
        </div>
    );
};

export default MobileUploadPage;
