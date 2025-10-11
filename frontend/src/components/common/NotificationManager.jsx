// src/components/common/NotificationManager.jsx

import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faCheckCircle,
  faExclamationTriangle,
  faInfoCircle,
  faQuestionCircle,
  faTimes,
  faSpinner,
} from '@fortawesome/free-solid-svg-icons';

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
  const typeClass = isDestructive ? 'error' : notification.type || 'confirm';
  const config = NOTIFICATION_CONFIG[notification.type] || NOTIFICATION_CONFIG.confirm;

  // --- NEW: optional type-to-confirm support ---
  const requireText = !!notification.requireText; // pass true to enable the input
  const expectedText = notification.expectedText || ''; // the exact text to match (e.g., member name)
  const inputLabel = notification.inputLabel || 'Type to confirm';
  const inputPlaceholder = notification.inputPlaceholder || expectedText;
  const caseInsensitive = !!notification.caseInsensitive; // optional: allow case-insensitive match

  const [typed, setTyped] = useState('');
  const [isConfirming, setIsConfirming] = useState(false);

  const typedOk = React.useMemo(() => {
    const a = (typed || '').trim();
    const b = (expectedText || '').trim();
    if (!requireText) return true;
    if (caseInsensitive) return a.toLowerCase() === b.toLowerCase();
    return a === b;
  }, [typed, expectedText, requireText, caseInsensitive]);

  const handleConfirm = async () => {
    if (!typedOk) return;
    if (notification.onConfirm) {
      setIsConfirming(true);
      try {
        await notification.onConfirm();
      } catch (error) {
        console.error('Confirmation action failed:', error);
      } finally {
        setIsConfirming(false);
      }
    }
    onHide();
  };

  return (
    <div className="modal-overlay notification">
      <div className={`notification-modal modern ${typeClass}`}>
        <div className="icon-circle">
          <FontAwesomeIcon icon={config.icon} className="modal-icon" />
        </div>
        <h3 className="modal-title">{notification.title || config.title}</h3>
        {notification.message && <p className="modal-message">{notification.message}</p>}

        {requireText && (
          <div className="confirm-input-block">
            {inputLabel && <label className="confirm-input-label">{inputLabel}</label>}
            <input
              type="text"
              className="form-input"
              placeholder={inputPlaceholder}
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              autoFocus
            />
            {!typedOk && expectedText && (
              <div className="confirm-hint">
                Please type <strong>{expectedText}</strong> to enable deletion.
              </div>
            )}
          </div>
        )}

        <div className="modal-buttons">
          <button type="button" className="btn btn-cancel" onClick={onHide} disabled={isConfirming}>
            {notification.cancelText || 'Cancel'}
          </button>
          <button
            type="button"
            className={`btn ${isDestructive ? 'btn-destructive' : 'btn-confirm'}`}
            onClick={handleConfirm}
            disabled={isConfirming || !typedOk}
            title={!typedOk && requireText ? 'Type the required text to confirm' : undefined}
          >
            {isConfirming ? (
              <FontAwesomeIcon icon={faSpinner} spin />
            ) : (
              notification.confirmText || 'OK'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

function NotificationManager({ notification, onHide }) {
  if (!notification) return null;

  // Toast for simple messages
  if (
    (notification.type === 'success' ||
      notification.type === 'info' ||
      notification.type === 'error') &&
    !notification.onConfirm
  ) {
    return <Toast notification={notification} onHide={onHide} />;
  }

  // Modal for confirmations (and errors requiring acknowledgment)
  if (
    notification.type?.startsWith('confirm') ||
    (notification.type === 'error' && notification.onConfirm)
  ) {
    return <ConfirmationModal notification={notification} onHide={onHide} />;
  }

  return null;
}

export default NotificationManager;
