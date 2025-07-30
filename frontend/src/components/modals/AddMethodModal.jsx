import React, { useContext } from 'react';
import { AppContext } from '../../contexts/AppContext.js'; // <-- VERIFIED CORRECT
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faMagic, faPenToSquare, faTimes, faLock } from '@fortawesome/free-solid-svg-icons';

function AddMethodModal({ onManual, onAiScan, onClose, title }) {
    const { currentUser, navigateTo } = useContext(AppContext);
    const isPremium = currentUser.isPremium;

    const handleAiScanClick = () => {
        if (isPremium) {
            onAiScan();
        } else {
            onClose();
            navigateTo('subscription-screen');
        }
    };

    return (
        <div className="modal-content">
            <div className="modal-header"><h3>{title || 'Add New'}</h3><button onClick={onClose} className="btn-icon modal-close"><FontAwesomeIcon icon={faTimes} /></button></div>
            <div className="modal-body add-method-modal-body">
                <p>How would you like to add the new information?</p>
                <div className="add-method-options">
                    <button className={`add-method-option ${!isPremium ? 'premium-feature' : ''}`} onClick={handleAiScanClick}>
                        {!isPremium && (<div className="premium-badge"><FontAwesomeIcon icon={faLock} /> PREMIUM</div>)}
                        <FontAwesomeIcon icon={faMagic} className="option-icon" />
                        <span className="option-title">Scan with AI</span>
                        <span className="option-subtitle">Use your camera or upload a file.</span>
                    </button>
                    <button className="add-method-option" onClick={onManual}>
                        <FontAwesomeIcon icon={faPenToSquare} className="option-icon" />
                        <span className="option-title">Manual Entry</span>
                        <span className="option-subtitle">Fill in the details yourself.</span>
                    </button>
                </div>
            </div>
        </div>
    );
}

export default AddMethodModal;