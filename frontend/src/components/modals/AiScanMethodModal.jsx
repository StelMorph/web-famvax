// src/components/modals/AiScanMethodModal.jsx
import React, { useRef } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPenToSquare, faCamera, faUpload, faTimes } from '@fortawesome/free-solid-svg-icons';

function AiScanMethodModal({ onTakePhoto, onFileSelected, onClose }) {
    const fileInputRef = useRef(null);

    const handleUploadClick = () => {
        fileInputRef.current.click();
    };

    const handleFileChange = (event) => {
        const file = event.target.files[0];
        if (file) {
            onFileSelected(file);
        }
    };

    return (
        <div className="modal-content">
            <div className="modal-header">
                <h3>Add with AI</h3>
                <button onClick={onClose} className="btn-icon modal-close"><FontAwesomeIcon icon={faTimes} /></button>
            </div>
            <div className="modal-body add-method-modal-body" style={{paddingTop: '0'}}>
                <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    style={{ display: 'none' }}
                    accept="image/*,application/pdf"
                />
                
                <h4 className="modal-subtitle-with-icon">
                    <FontAwesomeIcon icon={faPenToSquare} />
                    <span>Upload or Capture Document</span>
                </h4>

                <p style={{ color: 'var(--text-color-light)', marginBottom: '30px', marginTop: 0 }}>
                    Use your camera or upload a file. Our AI will extract the information.
                </p>
                <div className="add-method-options">
                    <button className="add-method-option" onClick={onTakePhoto}>
                        <FontAwesomeIcon icon={faCamera} className="option-icon" />
                        <span className="option-title">Take Photo</span>
                        <span className="option-subtitle">Use your device's camera</span>
                    </button>
                    <button className="add-method-option" onClick={handleUploadClick}>
                        <FontAwesomeIcon icon={faUpload} className="option-icon" />
                        <span className="option-title">Upload File</span>
                        <span className="option-subtitle">Select an image or PDF</span>
                    </button>
                </div>
            </div>
        </div>
    );
}

export default AiScanMethodModal;