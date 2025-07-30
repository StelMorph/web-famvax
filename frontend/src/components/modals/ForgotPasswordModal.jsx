import React, { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faEnvelope, faSpinner, faCheckCircle, faTimes } from '@fortawesome/free-solid-svg-icons';

function ForgotPasswordModal({ onClose }) {
    const [email, setEmail] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isSent, setIsSent] = useState(false);

    const handleSendResetLink = async (e) => {
        e.preventDefault();
        if (!email) return;
        setIsLoading(true);
        // Simulate API call to send reset link
        await new Promise(resolve => setTimeout(resolve, 1500));
        setIsLoading(false);
        setIsSent(true);
    };

    if (isSent) {
        return (
            <div className="modal-content" style={{ maxWidth: '480px', textAlign: 'center' }}>
                 <div className="modal-header" style={{ justifyContent: 'center', borderBottom: 'none' }}>
                    <div className="main-ai-icon" style={{ backgroundColor: '#e8f5e9', color: 'var(--success-color)'}}>
                        <FontAwesomeIcon icon={faCheckCircle} />
                    </div>
                </div>
                <div className="modal-body" style={{ minHeight: 'auto' }}>
                    <h2>Check your email</h2>
                    <p>If an account exists for <strong>{email}</strong>, you will receive an email with instructions on how to reset your password.</p>
                </div>
                <div className="modal-footer" style={{ justifyContent: 'center' }}>
                    <button className="btn btn-primary" onClick={onClose}>Done</button>
                </div>
            </div>
        )
    }

    return (
        <div className="modal-content" style={{ maxWidth: '480px' }}>
            <div className="modal-header">
                <h3>Reset Password</h3>
                <button onClick={onClose} className="btn-icon modal-close" title="Close"><FontAwesomeIcon icon={faTimes} /></button>
            </div>
            <form onSubmit={handleSendResetLink}>
                <div className="modal-body" style={{ minHeight: 'auto' }}>
                    <p>Enter the email address associated with your account and we'll send you a link to reset your password.</p>
                    <div className="form-group">
                    <label htmlFor="reset-email" className="label-with-icon">
                        Email
                        <FontAwesomeIcon icon={faEnvelope} className="label-icon" />
                    </label>
                        <input 
                            type="email" 
                            id="reset-email"
                            className="form-control"
                            placeholder="you@example.com" 
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />
                    </div>
                </div>
                <div className="modal-footer">
                    <button type="submit" className="btn btn-primary" disabled={isLoading || !email}>
                        {isLoading ? <FontAwesomeIcon icon={faSpinner} spin /> : 'Send Reset Link'}
                    </button>
                </div>
            </form>
        </div>
    );
}

export default ForgotPasswordModal;