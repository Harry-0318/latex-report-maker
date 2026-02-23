import React, { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { createUploadSession } from '../lib/api';
import { getEditorSessionId } from '../utils/editorSession';

const PhoneUploadModal = ({ targetCellId, onClose }) => {
    const [session, setSession] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [timeLeft, setTimeLeft] = useState(900); // 15 minutes

    useEffect(() => {
        const editorSessionId = getEditorSessionId();
        createUploadSession(editorSessionId, targetCellId)
            .then(data => {
                setSession(data);
                setLoading(false);
                // Calculate initial time left if possible, or just use 900
                setTimeLeft(900);
            })
            .catch(err => {
                setError(err.message || 'Failed to start upload session');
                setLoading(false);
            });
    }, [targetCellId]);

    useEffect(() => {
        if (!session) return;
        const timer = setInterval(() => {
            setTimeLeft(prev => {
                if (prev <= 1) {
                    clearInterval(timer);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
        return () => clearInterval(timer);
    }, [session]);

    const formatTime = (seconds) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m}:${s.toString().padStart(2, '0')}`;
    };
    
    const mobileUrl = session
        ? `${window.location.origin}/mobile-upload?sessionId=${session.sessionId}`
        : '';

    return (
        <div className="modal-overlay" style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000
        }}>
            <div className="modal-content" style={{
                backgroundColor: 'white',
                padding: '30px',
                borderRadius: '12px',
                maxWidth: '400px',
                width: '90%',
                textAlign: 'center',
                position: 'relative'
            }}>
                <button onClick={onClose} style={{
                    position: 'absolute',
                    top: '10px',
                    right: '10px',
                    border: 'none',
                    background: 'none',
                    fontSize: '24px',
                    cursor: 'pointer'
                }}>×</button>

                <h3>Upload from Phone</h3>
                <p style={{ fontSize: '14px', color: '#666' }}>Scan this QR code with your phone camera to upload a photo directly to this cell.</p>

                {loading && <div style={{ padding: '40px' }}>Creating session...</div>}

                {error && (
                    <div style={{ color: 'red', padding: '20px' }}>
                        <p>Error: {error}</p>
                        <button onClick={() => window.location.reload()}>Retry</button>
                    </div>
                )}

                {session && timeLeft > 0 && (
                    <div className="qr-container" style={{ margin: '20px 0' }}>
                        <QRCodeSVG value={mobileUrl} size={256} />
                        <div style={{ marginTop: '15px' }}>
                            <p style={{ fontSize: '12px', color: '#999' }}>Session expires in: <strong>{formatTime(timeLeft)}</strong></p>
                            <p style={{ fontSize: '12px', wordBreak: 'break-all', marginTop: '10px' }}>
                                <a href={mobileUrl} target="_blank" rel="noreferrer">Manual Link</a>
                            </p>
                        </div>
                    </div>
                )}

                {session && timeLeft === 0 && (
                    <div style={{ padding: '20px', color: 'red' }}>
                        <p>Session expired. Please close and try again.</p>
                    </div>
                )}

                <div style={{ marginTop: '20px' }}>
                    <button className="btn-secondary" onClick={onClose}>Cancel</button>
                </div>
            </div>
        </div>
    );
};

export default PhoneUploadModal;
