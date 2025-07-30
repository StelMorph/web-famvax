import React, { useState, useEffect, useRef, useContext } from 'react';
import { AppContext } from '../contexts/AppContext.js';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTimes, faSpinner, faVideoSlash } from '@fortawesome/free-solid-svg-icons';

function CameraScanModal({ onClose, onSuccess }) {
    const { appState } = useContext(AppContext);
    const [permissionStatus, setPermissionStatus] = useState('pending'); // 'pending', 'granted', 'denied'
    const [stream, setStream] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const videoRef = useRef(null);
    const canvasRef = useRef(null);

    // --- Step 1: Request Camera Permission and Start Stream ---
    useEffect(() => {
        const startCamera = async () => {
            try {
                // Request access to the user's camera
                const mediaStream = await navigator.mediaDevices.getUserMedia({
                    video: { facingMode: 'environment' } // Prefer the rear camera
                });
                setStream(mediaStream);
                setPermissionStatus('granted');
            } catch (err) {
                console.error("Camera permission denied or not available:", err);
                setPermissionStatus('denied');
            }
        };

        startCamera();

        // --- Cleanup Function ---
        return () => {
            // Stop all video tracks when the component unmounts
            if (stream) {
                stream.getTracks().forEach(track => track.stop());
            }
        };
    }, []); // Empty dependency array means this runs only once on mount

    // --- Step 2: Connect Stream to Video Element ---
    useEffect(() => {
        if (stream && videoRef.current) {
            videoRef.current.srcObject = stream;
        }
    }, [stream]);

    // --- Step 3: Capture Snapshot and Send to Server ---
    const handleCapture = async () => {
        if (!videoRef.current || !canvasRef.current) return;
        setIsSubmitting(true);

        const video = videoRef.current;
        const canvas = canvasRef.current;

        // Set canvas dimensions to match the video feed
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;

        // Draw the current video frame onto the canvas
        const context = canvas.getContext('2d');
        context.drawImage(video, 0, 0, canvas.width, canvas.height);

        // Get the image as a base64-encoded PNG
        const base64Image = canvas.toDataURL('image/png');

        // --- Step 4: POST to Backend (Simulated) ---
        try {
            console.log(`Sending image data to /api/scan... (context: ${appState.addType})`);
            
            await new Promise(resolve => setTimeout(resolve, 1500));
            
            // Simulate a successful response with an empty data object.
            // In a real app, this object would be populated by the backend.
            const simulatedResult = {
                extractedData: {}
            };

            onSuccess(simulatedResult.extractedData); // Pass data to the parent
            
        } catch (error) {
            console.error('Failed to send image for scanning:', error);
            alert('There was an error scanning the document. Please try again.');
        } finally {
            setIsSubmitting(false);
            onClose(); // Close the modal after submission
        }
    };

    return (
        <div className="modal-content scanner-modal-content">
            <div className="modal-header">
                <h3>Scan Document</h3>
                <button onClick={onClose} className="btn-icon modal-close" title="Close"><FontAwesomeIcon icon={faTimes} /></button>
            </div>
            <div className="scanner-body">
                {permissionStatus === 'granted' ? (
                    <>
                        <video ref={videoRef} autoPlay playsInline muted className="scanner-video-feed"></video>
                        <canvas ref={canvasRef} style={{ display: 'none' }}></canvas>
                    </>
                ) : permissionStatus === 'pending' ? (
                    <div className="scanner-status"><FontAwesomeIcon icon={faSpinner} spin /> Requesting Camera Access...</div>
                ) : (
                    <div className="scanner-status error">
                        <FontAwesomeIcon icon={faVideoSlash} />
                        <h4>Camera Access Denied</h4>
                        <p>Please allow camera access in your browser settings to use this feature.</p>
                    </div>
                )}
            </div>
            {permissionStatus === 'granted' && (
                 <div className="scanner-footer">
                    <button className="btn-capture" onClick={handleCapture} disabled={isSubmitting}>
                        {isSubmitting ? <FontAwesomeIcon icon={faSpinner} spin style={{color: 'var(--primary-color)'}}/> : <div className="capture-inner-circle"></div>}
                    </button>
                </div>
            )}
        </div>
    );
}

export default CameraScanModal;