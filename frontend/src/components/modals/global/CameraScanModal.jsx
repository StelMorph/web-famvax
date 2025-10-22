// src/components/modals/global/CameraScanModal.jsx
import React, { useState, useEffect, useRef } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faTimes,
  faSpinner,
  faVideoSlash,
  faCamera,
  faRepeat,
  faCheck,
} from '@fortawesome/free-solid-svg-icons';
import '../../../styles/components/modals.css';

function CameraScanModal({ onClose, onCaptureDataUrl }) {
  const [permissionStatus, setPermissionStatus] = useState('pending'); // pending | granted | denied
  const [isCapturing, setIsCapturing] = useState(false);
  const [capturedDataUrl, setCapturedDataUrl] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);

  const stopStream = () => {
    const s = streamRef.current;
    if (s && s.getTracks) s.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
  };

  const startStream = async () => {
    setErrorMsg('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {});
      }
      setPermissionStatus('granted');
    } catch {
      setPermissionStatus('denied');
      setErrorMsg('Camera permission denied or unavailable.');
    }
  };

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        if (navigator.permissions?.query) {
          const res = await navigator.permissions.query({ name: 'camera' });
          if (!mounted) return;
          if (res.state === 'granted') {
            setPermissionStatus('granted');
            await startStream();
          } else if (res.state === 'denied') {
            setPermissionStatus('denied');
          } else {
            await startStream(); // prompt
          }
          res.onchange = () => setPermissionStatus(res.state === 'granted' ? 'granted' : res.state);
        } else {
          await startStream();
        }
      } catch {
        await startStream();
      }
    })();

    return () => {
      mounted = false;
      stopStream();
    };
  }, []);

  const handleCapture = async () => {
    setIsCapturing(true);
    setErrorMsg('');
    try {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (!video || !canvas) return;

      const w = video.videoWidth || 1280;
      const h = video.videoHeight || 720;
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(video, 0, 0, w, h);

      const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
      setCapturedDataUrl(dataUrl);
    } catch (e) {
      setErrorMsg(e?.message || 'Failed to capture image.');
    } finally {
      setIsCapturing(false);
    }
  };

  const handleUsePhoto = () => {
    if (capturedDataUrl && typeof onCaptureDataUrl === 'function') {
      // Return the capture to the orchestrator
      onCaptureDataUrl(capturedDataUrl);
      stopStream();
      onClose?.();
    }
  };

  const handleRetake = () => {
    setCapturedDataUrl(null);
    setErrorMsg('');
  };

  const handleClose = () => {
    stopStream();
    onClose?.();
  };

  return (
    <div className="scanner-modal">
      <div className="scanner-header">
        <h2>Scan Document</h2>
        <button className="icon-button" onClick={handleClose} aria-label="Close">
          <FontAwesomeIcon icon={faTimes} />
        </button>
      </div>

      <div className="scanner-body">
        {permissionStatus === 'granted' && !capturedDataUrl && (
          <div className="video-box">
            <video ref={videoRef} playsInline muted />
            <canvas ref={canvasRef} style={{ display: 'none' }} />
          </div>
        )}

        {capturedDataUrl && (
          <div className="preview-box">
            <img src={capturedDataUrl} alt="Captured document" />
          </div>
        )}

        {(permissionStatus === 'denied' || permissionStatus === 'prompt') && !capturedDataUrl && (
          <div className="camera-denied">
            <FontAwesomeIcon icon={faVideoSlash} />
            <p>Camera access is blocked or unavailable. Enable permissions and try again.</p>
          </div>
        )}

        {isCapturing && (
          <div className="scanner-overlay">
            <FontAwesomeIcon className="spin" icon={faSpinner} />
            <span>Capturing…</span>
          </div>
        )}
      </div>

      {errorMsg && <p className="scanner-error-footer">{errorMsg}</p>}

      <div className="scanner-footer">
        {!capturedDataUrl ? (
          <button className="btn btn-primary" onClick={handleCapture}>
            <FontAwesomeIcon icon={faCamera} /> Capture
          </button>
        ) : (
          <div className="scanner-actions">
            <button className="btn btn-outline" onClick={handleRetake}>
              <FontAwesomeIcon icon={faRepeat} /> Retake
            </button>
            <button className="btn btn-primary" onClick={handleUsePhoto}>
              <FontAwesomeIcon icon={faCheck} /> Use Photo
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default CameraScanModal;
