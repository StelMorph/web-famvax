// src/components/modals/global/ProcessingModal.jsx
import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSpinner } from '@fortawesome/free-solid-svg-icons';

/**
 * Blocking processing modal.
 * Props from appState (via SHOW_MODAL):
 * - title?: string
 * - message?: string
 * - submessage?: string
 */
function ProcessingModal({ title = 'Processing…', message = 'Please wait', submessage }) {
  return (
    <div
      className="modal-content"
      style={{
        maxWidth: 460,
        padding: 24,
        textAlign: 'center',
      }}
      aria-busy="true"
      aria-live="polite"
    >
      <div style={{ marginBottom: 12 }}>
        <FontAwesomeIcon icon={faSpinner} spin size="2x" />
      </div>
      <h3 style={{ margin: 0 }}>{title}</h3>
      <p style={{ marginTop: 8, marginBottom: 0 }}>{message}</p>
      {submessage ? (
        <p style={{ marginTop: 6, color: 'var(--text-color-light, #64748b)' }}>{submessage}</p>
      ) : null}
    </div>
  );
}

export default ProcessingModal;
