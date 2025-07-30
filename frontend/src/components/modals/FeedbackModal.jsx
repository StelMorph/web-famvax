// src/components/modals/FeedbackModal.jsx

import React, { useState, useContext } from 'react';
import { AppContext } from '../../contexts/AppContext.js'; // Ensure context is imported
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTimes } from '@fortawesome/free-solid-svg-icons';

function FeedbackModal({ onClose }) {
    const { showNotification } = useContext(AppContext);
    const [feedback, setFeedback] = useState('');
    const [isSending, setIsSending] = useState(false);

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!feedback.trim()) {
            // Use the new notification system for errors
            showNotification({
                type: 'error',
                title: 'Input Required',
                message: 'Please enter your feedback before sending.',
            });
            return;
        }
        setIsSending(true);
        setTimeout(() => {
            // On success, show a success toast and close the modal
            showNotification({ type: 'success', message: "Thank you for your feedback!" });
            setIsSending(false);
            onClose();
            // Also trigger the mail-to link
            window.location.href = `mailto:hn@famvax.com?subject=App Feedback&body=${encodeURIComponent(feedback)}`;
        }, 1000);
    };

    return (
        <div className="modal-content">
            <div className="modal-header">
                <h2>Send Feedback</h2>
                <button className="btn-icon modal-close" onClick={onClose}><FontAwesomeIcon icon={faTimes} /></button>
            </div>
            <form onSubmit={handleSubmit}>
                <p>We'd love to hear your thoughts or suggestions on how we can improve.</p>
                <div className="form-group">
                    <label htmlFor="feedback-text">Your message</label>
                    <textarea 
                        id="feedback-text"
                        rows="5" 
                        value={feedback} 
                        onChange={(e) => setFeedback(e.target.value)}
                        placeholder="Type your feedback here..."
                        required
                    ></textarea>
                </div>
                <div className="modal-footer">
                    <button type="button" className="btn btn-outline" onClick={onClose}>Cancel</button>
                    <button type="submit" className="btn btn-primary" disabled={isSending}>
                        {isSending ? 'Sending...' : 'Send Feedback'}
                    </button>
                </div>
            </form>
        </div>
    );
}

export default FeedbackModal;