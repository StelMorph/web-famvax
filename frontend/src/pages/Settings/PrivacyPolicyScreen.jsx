import React, { useContext } from 'react';
import { AppContext } from '../../contexts/AppContext.js';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowLeft } from '@fortawesome/free-solid-svg-icons';

function PrivacyPolicyScreen() {
    const { goBack } = useContext(AppContext);
    return (
        <div className="screen active text-content-screen">
            <nav className="simple-nav">
                <button className="btn-icon back-button" onClick={goBack}><FontAwesomeIcon icon={faArrowLeft} /></button>
                <h2>Privacy Policy</h2>
            </nav>
            <div className="content-wrapper">
                <p><strong>Last Updated: May 3, 2024</strong></p>
                <p>This is placeholder text for the privacy policy...</p>
            </div>
        </div>
    );
}

export default PrivacyPolicyScreen;