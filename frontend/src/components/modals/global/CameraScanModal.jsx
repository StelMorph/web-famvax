import React, { useState, useEffect, useRef, useContext } from 'react';
import { AppContext } from '../../../contexts/AppContext.js';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTimes, faSpinner, faVideoSlash } from '@fortawesome/free-solid-svg-icons';
import '../../../styles/components/modals.css';

function CameraScanModal({ onClose, onSuccess }) {
  const { appState } = useContext(AppContext);
  const [permissionStatus, setPermissionStatus] = useState('pending'); // 'pending', 'granted', 'denied'
  const [stream, setStream] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [capturedDataUrl, setCapturedDataUrl] = useState(null); // <-- STATE FOR PREVIEW
  const [errorMsg, setErrorMsg] = useState('');

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const currentStreamRef = useRef(null);
  const fileRef = useRef(null);

  // --- 1. Start Camera and Handle Permissions ---
  useEffect(() => {
    let isMounted = true;
    const startCamera = async () => {
      // Stop any existing tracks before starting new ones
      if (currentStreamRef.current) {
        currentStreamRef.current.getTracks().forEach((track) => track.stop());
      }
      try {
        const mediaStream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' } },
        });
        if (!isMounted) return;
        currentStreamRef.current = mediaStream;
        setStream(mediaStream);
        setPermissionStatus('granted');
      } catch (err) {
        console.error('Camera permission denied or unavailable:', err);
        if (!isMounted) return;
        setPermissionStatus('denied');
        setErrorMsg('Please allow camera access, or upload a photo instead.');
      }
    };

    startCamera();

    return () => {
      isMounted = false;
      if (currentStreamRef.current) {
        currentStreamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  // --- 2. Connect Stream to Video Element ---
  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  // --- 3. CORE LOGIC CHANGE: Capture now only creates a preview ---
  const handleCapture = () => {
    if (!videoRef.current || !canvasRef.current) return;
    setErrorMsg('');

    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    // This converts the image to a data URL and sets the state, triggering the UI to show the preview.
    // It DOES NOT call onSuccess.
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          setErrorMsg('Could not capture image. Please try again.');
          return;
        }
        const reader = new FileReader();
        reader.onloadend = () => {
          setCapturedDataUrl(reader.result); // <-- THIS TRIGGERS THE PREVIEW RENDER
        };
        reader.readAsDataURL(blob);

        if (videoRef.current) videoRef.current.pause(); // Pause video feed during preview
      },
      'image/jpeg',
      0.85,
    );
  };

  // --- 4. NEW: This function handles the actual submission from the preview screen ---
  const handleUsePhoto = async () => {
    if (!capturedDataUrl) return;
    setIsSubmitting(true);
    setErrorMsg('');
    try {
      const response = await fetch(capturedDataUrl);
      const blob = await response.blob();
      const file = new File([blob], 'scan.jpg', { type: 'image/jpeg' });

      const formData = new FormData();
      formData.append('file', file);

      // --- SIMULATED BACKEND CALL ---
      console.log(
        'Uploading image to backend...',
        file.name,
        `${(file.size / 1024).toFixed(1)} KB`,
      );
      await new Promise((resolve) => setTimeout(resolve, 1500)); // Simulate network delay
      const simulatedResult = { extractedData: { vendor: 'Simulated Vendor', total: 123.45 } };
      // --- END SIMULATION ---

      onSuccess(simulatedResult.extractedData); // <-- onSuccess is ONLY called here
      onClose(); // Close modal on success
    } catch (error) {
      console.error('Failed to process image:', error);
      setErrorMsg('There was an error scanning the document. Please try again.');
      setIsSubmitting(false);
    }
  };

  // --- 5. NEW: This function handles the retake action ---
  const handleRetake = () => {
    setCapturedDataUrl(null); // <-- This clears the preview, showing the live video again
    setErrorMsg('');
    if (videoRef.current) {
      videoRef.current.play();
    }
  };

  // --- Fallback Upload Logic (for denied permissions) ---
  const openPicker = () => fileRef.current?.click();
  const onFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);
    setIsSubmitting(true);
    try {
      console.log('Uploading selected file...');
      await new Promise((resolve) => setTimeout(resolve, 1500));
      const simulatedResult = { extractedData: { vendor: 'Uploaded Cafe', total: 50.0 } };
      onSuccess(simulatedResult.extractedData);
      onClose();
    } catch (error) {
      setErrorMsg('Upload failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- RENDER LOGIC ---
  return (
    <div className="modal-content scanner-modal-content">
      <div className="modal-header">
        <h3>Scan Document</h3>
        <button onClick={onClose} className="btn-icon modal-close" title="Close">
          <FontAwesomeIcon icon={faTimes} />
        </button>
      </div>
      <div className="scanner-body">
        {permissionStatus === 'granted' ? (
          // --- THIS IS THE NEW RENDER LOGIC ---
          capturedDataUrl ? (
            // --- A. SHOW PREVIEW IF A PHOTO HAS BEEN CAPTURED ---
            <div className="scanner-preview">
              <img src={capturedDataUrl} alt="Captured preview" className="scanner-preview-img" />
              <div className="scanner-preview-actions">
                <button className="btn-secondary" onClick={handleRetake} disabled={isSubmitting}>
                  Retake
                </button>
                <button className="btn-primary" onClick={handleUsePhoto} disabled={isSubmitting}>
                  {isSubmitting ? <FontAwesomeIcon icon={faSpinner} spin /> : 'Use Photo'}
                </button>
              </div>
            </div>
          ) : (
            // --- B. SHOW LIVE CAMERA FEED IF NO PHOTO CAPTURED YET ---
            <>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="scanner-video-feed"
              ></video>
              <canvas ref={canvasRef} style={{ display: 'none' }}></canvas>
            </>
          )
        ) : permissionStatus === 'pending' ? (
          <div className="scanner-status">
            <FontAwesomeIcon icon={faSpinner} spin /> Requesting Camera Access...
          </div>
        ) : (
          // --- C. SHOW UPLOAD FALLBACK IF PERMISSION DENIED ---
          <div className="scanner-status error">
            <FontAwesomeIcon icon={faVideoSlash} />
            <h4>Camera Access Denied</h4>
            <p>Allow camera in browser settings, or upload a photo instead.</p>
            <input
              ref={fileRef}
              type="file"
              accept="image/*,application/pdf"
              capture="environment"
              style={{ display: 'none' }}
              onChange={onFileChange}
            />
            <button className="btn-primary" onClick={openPicker} disabled={isSubmitting}>
              {isSubmitting ? <FontAwesomeIcon icon={faSpinner} spin /> : 'Upload photo/file'}
            </button>
          </div>
        )}
      </div>

      {/* --- D. ONLY SHOW CAPTURE BUTTON WHEN IN LIVE VIEW --- */}
      {permissionStatus === 'granted' && !capturedDataUrl && (
        <div className="scanner-footer">
          {errorMsg && <p className="scanner-error">{errorMsg}</p>}
          <button className="btn-capture" onClick={handleCapture} disabled={isSubmitting}>
            <div className="capture-inner-circle"></div>
          </button>
        </div>
      )}
    </div>
  );
}

export default CameraScanModal;
