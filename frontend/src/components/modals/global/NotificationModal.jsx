// frontend/src/components/NotificationModal.jsx
import React from 'react';
import './NotificationModal.css';

const NotificationModal = ({ notification, onHide }) => {
  if (!notification) return null;
  const {
    type = 'info',
    title,
    message,
    confirmText = 'OK',
    cancelText = 'Cancel',
    onConfirm,
  } = notification;

  return (
    <div className={`notification-modal ${type}`}>
      <div className="notification-card">
        <div className="notification-header">
          <div className="notification-icon">❗</div>
          <h3>{title || 'Notice'}</h3>
        </div>
        {message && <p className="notification-message">{message}</p>}
        <div className="notification-actions">
          {type === 'confirm' && (
            <button className="btn btn-light" onClick={onHide}>
              {cancelText}
            </button>
          )}
          <button
            className={`btn ${type === 'error' ? 'btn-danger' : 'btn-primary'}`}
            onClick={() => {
              if (onConfirm) onConfirm();
              onHide?.();
            }}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default NotificationModal;
