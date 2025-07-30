// src/components/modals/ConfirmEmailModal.jsx

import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPaperPlane, faSpinner } from '@fortawesome/free-solid-svg-icons';
import { CognitoIdentityProviderClient, ConfirmSignUpCommand } from '@aws-sdk/client-cognito-identity-provider';
import awsConfig from '../../../aws-config.js';

function ConfirmEmailModal({ email, onConfirm, onClose, onResend }) {
    const [code, setCode] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [timer, setTimer] = useState(59);

    useEffect(() => {
        if (timer === 0) return;
        const intervalId = setInterval(() => {
            setTimer(prevTimer => prevTimer - 1);
        }, 1000);
        return () => clearInterval(intervalId);
    }, [timer]);

    const handleResendClick = () => {
        if (timer > 0) return;
        onResend();
        setTimer(59);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (code.length < 6) {
            setError('Please enter a valid 6-digit code.');
            return;
        }
        setIsLoading(true);
        setError('');
        
        const client = new CognitoIdentityProviderClient({ region: awsConfig.cognito.region });
        const command = new ConfirmSignUpCommand({
            ClientId: awsConfig.cognito.userPoolClientId,
            Username: email,
            ConfirmationCode: code,
        });

        try {
            await client.send(command);
            onConfirm(); // On success, call the handler from Modals.jsx
        } catch (err) {
            setError(err.message || 'Verification failed. Please check the code and try again.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="modal-content" style={{ maxWidth: '480px', textAlign: 'center' }}>
            <div className="modal-header" style={{ justifyContent: 'center', borderBottom: 'none' }}>
                <div className="main-ai-icon" style={{ backgroundColor: '#e7f3ff', color: 'var(--primary-color)'}}>
                    <FontAwesomeIcon icon={faPaperPlane} />
                </div>
            </div>
            <div className="modal-body" style={{ minHeight: 'auto' }}>
                <h2>Verify your email</h2>
                <p>We've sent a 6-digit code to <strong>{email}</strong>. Please enter it below to confirm your account.</p>
                
                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <input 
                            type="text" 
                            placeholder="Enter 6-digit code" 
                            value={code}
                            onChange={(e) => setCode(e.target.value)}
                            maxLength="6"
                            style={{ textAlign: 'center', fontSize: '18pt', letterSpacing: '0.5rem' }}
                        />
                         {error && <p className="error-message">{error}</p>}
                    </div>
                    <button type="submit" className="btn btn-dark" style={{ width: '100%', margin: '0' }} disabled={isLoading}>
                         {isLoading ? <FontAwesomeIcon icon={faSpinner} spin /> : 'Verify Account'}
                    </button>
                </form>

                <p style={{ fontSize: '12pt', marginTop: '20px' }}>
                    Didn't get a code? 
                    {timer > 0 ? (
                        <span style={{color: 'var(--dark-gray)'}}> Resend in {timer}s</span>
                    ) : (
                        <a href="#" onClick={(e) => { e.preventDefault(); handleResendClick(); }}> Resend</a>
                    )}
                </p>

            </div>
            <div className="modal-footer" style={{ justifyContent: 'center', borderTop: 'none', paddingTop: 0 }}>
                 <button type="button" className="btn-text" onClick={onClose}>Cancel</button>
            </div>
        </div>
    );
}

export default ConfirmEmailModal;