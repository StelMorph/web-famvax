import React, { useState, useEffect, useContext } from 'react';
import { AppContext } from '../../contexts/AppContext';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
// --- DEFINITIVE FIX: Import faTrashCan for a better delete icon ---
import {
  faTimes,
  faSpinner,
  faUserPlus,
  faUserMinus,
  faPen,
  faSyringe,
  faTrashCan,
} from '@fortawesome/free-solid-svg-icons';
import api from '../../api/apiService.js';

function LogEntry({ log, currentUserId }) {
  const ICONS = {
    UPDATE_PROFILE: faPen,
    CREATE_SHARE: faUserPlus,
    DELETE_SHARE: faUserMinus,
    CREATE_VACCINE: faSyringe,
    UPDATE_VACCINE: faPen,
    // --- DEFINITIVE FIX: Assign a clear icon for the delete action ---
    DELETE_VACCINE: faTrashCan,
    DEFAULT: faPen,
  };

  const getSummaryText = () => {
    const actor =
      log.userId === currentUserId
        ? 'You'
        : `<strong>${log.details?.actorEmail || 'A user'}</strong>`;
    switch (log.action) {
      case 'CREATE_VACCINE':
        return `${actor} added the record for <strong>${log.details?.vaccineName || 'a vaccine'}</strong>.`;
      case 'UPDATE_VACCINE':
        return `${actor} updated the record for <strong>${log.details?.vaccineName || 'a vaccine'}</strong>.`;

      // --- DEFINITIVE FIX: Add a specific case for DELETE_VACCINE ---
      // This will now work because the backend is providing `log.details.vaccineName`.
      case 'DELETE_VACCINE':
        return `${actor} deleted the record for <strong>${log.details?.vaccineName || 'a vaccine'}</strong>.`;

      case 'CREATE_SHARE':
        return `${actor} shared this profile with <strong>${log.details?.inviteeEmail || 'a user'}</strong>.`;
      default:
        // This is now just a fallback and should not be hit for vaccine deletes.
        return `${actor} ${log.action.replace(/_/g, ' ').toLowerCase()}.`;
    }
  };

  return (
    <div className="activity-log-item">
      <div className="log-icon-wrapper">
        <div className="icon-circle info">
          {/* This will now correctly pick the faTrashCan icon for DELETE_VACCINE actions */}
          <FontAwesomeIcon icon={ICONS[log.action] || ICONS.DEFAULT} className="modal-icon" />
        </div>
      </div>
      <div className="log-details">
        <p className="log-summary" dangerouslySetInnerHTML={{ __html: getSummaryText() }}></p>
      </div>
      <span className="log-timestamp">
        {new Date(log.ts).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
      </span>
    </div>
  );
}

function ActivityLogModal({ isOpen, onClose, profileId, profileName }) {
  const { appState } = useContext(AppContext);
  const [logs, setLogs] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen && profileId) {
      setIsLoading(true);
      api
        .getProfileAuditLog(profileId, { force: true })
        .then((data) => setLogs(data || []))
        .catch((err) => console.error('Failed to fetch audit log:', err))
        .finally(() => setIsLoading(false));
    }
  }, [isOpen, profileId]);

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: '550px' }}>
        <div className="modal-header">
          <h3>Activity for {profileName}</h3>
          <button className="btn-icon modal-close" onClick={onClose}>
            <FontAwesomeIcon icon={faTimes} />
          </button>
        </div>
        <div
          className="modal-body modal-body-scrollable"
          style={{ minHeight: '300px', maxHeight: '60vh', padding: '0 16px' }}
        >
          {isLoading ? (
            <div className="centered-content">
              <FontAwesomeIcon icon={faSpinner} spin size="2x" />
            </div>
          ) : logs.length === 0 ? (
            <div className="centered-content">
              <p>No changes have been recorded yet.</p>
            </div>
          ) : (
            <div className="activity-log-list">
              {logs.map((log) => (
                <LogEntry
                  key={`${log.ts}-${log.resource || log.resourceId}`}
                  log={log}
                  currentUserId={appState.user?.userId}
                />
              ))}
            </div>
          )}
        </div>
        <div className="modal-footer">
          <button className="btn btn-outline" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

export default ActivityLogModal;
