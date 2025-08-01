import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCheckCircle, faExclamationTriangle, faInfoCircle, faQuestionCircle } from '@fortawesome/free-solid-svg-icons';

const NOTIFICATION_CONFIG = {
    success: { icon: faCheckCircle, colorClass: 'success' },
    error: { icon: faExclamationTriangle, colorClass: 'error' },
    confirm: { icon: faQuestionCircle, colorClass: 'confirm' },
    info: { icon: faInfoCircle, colorClass: 'info' },
};

function NotificationModal({ notification, onHide }) {
    if (!notification) return null;
    const config = NOTIFICATION_CONFIG[notification.type] || NOTIFICATION_CONFIG.info;

    const handleConfirm = () => {
        if (notification.onConfirm) notification.onConfirm();
        onHide();
    };

    return (
        <div className="modal-overlay">
            <div className={`notification-modal modern ${config.colorClass}`}>
                <div className="icon-circle">
                    <FontAwesomeIcon icon={config.icon} className="modal-icon" />
                </div>
                <h2 className="modal-title">{notification.title}</h2>
                <p className="modal-message">{notification.message}</p>
                <div className="modal-buttons">
                    {notification.type === 'confirm' && (
                        <button className="btn btn-cancel" onClick={onHide}>
                            {notification.cancelText || 'Cancel'}
                        </button>
                    )}
                    <button className="btn btn-confirm" onClick={handleConfirm}>
                        {notification.confirmText || 'OK'}
                    </button>
                </div>
            </div>
        </div>
    );
}

export default NotificationModal;
