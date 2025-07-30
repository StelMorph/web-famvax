// src/components/shared/NotificationManager.jsx

import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCheckCircle, faExclamationTriangle, faInfoCircle, faQuestionCircle, faTimes } from '@fortawesome/free-solid-svg-icons';

const NOTIFICATION_CONFIG = {
    success: { icon: faCheckCircle, themeClass: 'success', title: 'Success' },
    error: { icon: faExclamationTriangle, themeClass: 'error', title: 'Error' },
    'confirm-destructive': { icon: faQuestionCircle, themeClass: 'error', title: 'Confirmation' }, // Uses error color scheme
    confirm: { icon: faQuestionCircle, themeClass: 'confirm', title: 'Confirmation' },
    info: { icon: faInfoCircle, themeClass: 'info', title: 'Information' },
};

const Toast = ({ notification, onHide }) => {
    useEffect(() => {
        // Errors get 8 seconds, others get 3 seconds
        const duration = notification.type === 'error' ? 8000 : 3000;
        const timer = setTimeout(onHide, duration);
        return () => clearTimeout(timer);
    }, [notification, onHide]);

    const config = NOTIFICATION_CONFIG[notification.type] || NOTIFICATION_CONFIG.info;

    return (
        <div className={`toast-notification ${config.themeClass}`}>
            <FontAwesomeIcon icon={config.icon} className="toast-icon" />
            <div className="toast-content">
                <span className="toast-title">{notification.title || config.title}</span>
                <span className="toast-message">{notification.message}</span>
            </div>
            <button className="toast-close-btn" onClick={onHide}>
                <FontAwesomeIcon icon={faTimes} />
            </button>
        </div>
    );
};

const ConfirmationModal = ({ notification, onHide }) => {
    const isDestructive = notification.type === 'confirm-destructive';
    const typeClass = isDestructive ? 'error' : (notification.type || 'confirm');
    const config = NOTIFICATION_CONFIG[notification.type];

    const handleConfirm = () => {
        if (notification.onConfirm) {
            notification.onConfirm();
        }
        onHide();
    };

    return (
        <div className="modal-overlay notification">
            <div className={`notification-modal modern ${typeClass}`}>
                <div className="icon-circle">
                    <FontAwesomeIcon icon={config.icon} className="modal-icon" />
                </div>
                <h3 className="modal-title">{notification.title}</h3>
                <p className="modal-message">{notification.message}</p>
                <div className="modal-buttons">
                    <button type="button" className="btn btn-cancel" onClick={onHide}>
                        {notification.cancelText || 'Cancel'}
                    </button>
                    <button 
                        type="button" 
                        className={`btn ${isDestructive ? 'btn-destructive' : 'btn-confirm'}`} 
                        onClick={handleConfirm}
                    >
                        {notification.confirmText || 'OK'}
                    </button>
                </div>
            </div>
        </div>
    );
};


function NotificationManager({ notification, onHide }) {
    if (!notification) return null;
    
    // Render as a toast for simple messages without a confirm action
    if ((notification.type === 'success' || notification.type === 'info' || notification.type === 'error') && !notification.onConfirm) {
        return <Toast notification={notification} onHide={onHide} />;
    }
    
    // Render as a modal for confirmations or errors that require user acknowledgement
    if (notification.type.startsWith('confirm') || (notification.type === 'error' && notification.onConfirm)) {
         return <ConfirmationModal notification={notification} onHide={onHide} />;
    }

    return null;
}

export default NotificationManager;