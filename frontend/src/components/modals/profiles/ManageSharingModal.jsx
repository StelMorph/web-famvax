// src/pages/MyFamily/ManageSharingModal.jsx
import React, { useState, useEffect, useContext } from 'react';
import { AppContext } from '../../../contexts/AppContext.js';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faTimes,
  faSpinner,
  faTrashAlt,
  faCircleInfo,
  faShareNodes,
} from '@fortawesome/free-solid-svg-icons';
import api from '../../../api/apiService.js';

const ROLES = {
  Viewer: {
    name: 'Viewer',
    description: 'Can view vaccination records and profile details. Cannot make any changes.',
  },
  Editor: {
    name: 'Editor',
    description:
      'Can view details, add/edit vaccination records, and update profile details. Cannot share or delete the profile.',
  },
};

const SharedUser = ({ share, onRevoke }) => (
  <li className="shared-user-item">
    <div className="user-info">
      <span className="user-email">{share.inviteeEmail}</span>
      <span className={`user-role role-${share.role?.toLowerCase?.()}`}>{share.role}</span>
    </div>
    <div className="user-actions">
      <span className={`user-status status-${share.status?.toLowerCase?.()}`}>{share.status}</span>
      <button
        className="btn-icon btn-danger-icon"
        onClick={() => onRevoke(share.shareId, share.inviteeEmail)}
        title="Revoke Access"
      >
        <FontAwesomeIcon icon={faTrashAlt} />
      </button>
    </div>
  </li>
);

function ManageSharingModal({ profile, onClose }) {
  const { showNotification, currentUser } = useContext(AppContext);
  const profileId = profile?.profileId ?? profile?.id;

  const [shares, setShares] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [email, setEmail] = useState('');
  const [selectedRole, setSelectedRole] = useState('Viewer');
  const [formError, setFormError] = useState('');
  const [isSending, setIsSending] = useState(false);

  useEffect(() => {
    const fetchShares = async () => {
      if (!profileId) return;
      setIsLoading(true);
      try {
        const data = await api.getShares(profileId);
        setShares(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error('Failed to fetch shares:', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchShares();
  }, [profileId]);

  // --- DEFINITIVE FIX: This function now updates the UI *after* backend success ---
  const handleRevoke = (shareId, userEmail) => {
    showNotification({
      type: 'confirm-destructive',
      title: 'Revoke Access',
      message: `Are you sure you want to revoke access for ${userEmail}?`,
      confirmText: 'Revoke',
      onConfirm: async () => {
        try {
          // Step 1: Call the backend API and wait for it to complete.
          await api.revokeShare(shareId);

          // Step 2: If the API call did not throw an error, it was successful.
          // Now, update the frontend state to remove the user from the list.
          setShares((currentShares) => currentShares.filter((s) => s.shareId !== shareId));

          showNotification({
            type: 'success',
            message: `Access for ${userEmail} has been revoked.`,
          });
        } catch (err) {
          // Step 3: If the API call fails, we do NOT change the frontend state.
          // We simply show an error message.
          showNotification({
            type: 'error',
            title: 'Error',
            message: err?.body || err?.message || 'Could not revoke access. Please try again.',
          });
        }
      },
    });
  };

  const handleInvite = async () => {
    setFormError('');
    const lowerEmail = (email || '').toLowerCase().trim();

    if (!lowerEmail || !/^\S+@\S+\.\S+$/.test(lowerEmail)) {
      setFormError('Please enter a valid email address.');
      return;
    }
    if (lowerEmail === currentUser?.email) {
      setFormError('You cannot share a profile with yourself.');
      return;
    }

    setIsSending(true);
    try {
      // Use 'targetEmail' to match what your original code and apiService likely expect.
      await api.upsertShare(profileId, { targetEmail: lowerEmail, role: selectedRole });
      showNotification({ type: 'success', message: `Invitation sent to ${lowerEmail}.` });
      setEmail('');

      // After an invite, we must refetch to get the new share record from the server.
      const data = await api.getShares(profileId);
      setShares(Array.isArray(data) ? data : []);
    } catch (err) {
      const msg = err?.body?.message || err?.message || 'Failed to send invitation.';
      setFormError(typeof msg === 'string' ? msg : 'Failed to send invitation.');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="modal-content modal-flex-col" style={{ maxWidth: '600px' }}>
      <div className="modal-header">
        <h2>Manage Sharing for "{profile?.name || 'Profile'}"</h2>
        <button onClick={onClose} className="btn-icon modal-close" title="Close">
          <FontAwesomeIcon icon={faTimes} />
        </button>
      </div>

      <div className="modal-body-scrollable">
        <fieldset>
          <legend>Current Shares</legend>
          <div className="shared-users-container">
            {isLoading ? (
              <div style={{ textAlign: 'center' }}>
                <FontAwesomeIcon icon={faSpinner} spin />
              </div>
            ) : shares.length > 0 ? (
              <ul className="shared-users-list">
                {shares.map((s) => (
                  <SharedUser key={s.shareId} share={s} onRevoke={handleRevoke} />
                ))}
              </ul>
            ) : (
              <p className="no-shares-message" style={{ padding: 0 }}>
                This profile hasn&apos;t been shared yet.
              </p>
            )}
          </div>
        </fieldset>

        <fieldset>
          <legend>Invite New Member or Update Role</legend>
          <div className="form-group">
            <label htmlFor="share-email">Email Address</label>
            <input
              type="email"
              id="share-email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@example.com"
            />
          </div>

          <div className="form-group">
            <label>Permission Level</label>
            <div className="role-selector">
              {Object.keys(ROLES).map((roleKey) => (
                <button
                  key={roleKey}
                  type="button"
                  className={`role-btn ${selectedRole === roleKey ? 'active' : ''}`}
                  onClick={() => setSelectedRole(roleKey)}
                >
                  {ROLES[roleKey].name}
                </button>
              ))}
            </div>
          </div>

          <div className="role-description">
            <FontAwesomeIcon icon={faCircleInfo} />
            <p>{ROLES[selectedRole].description}</p>
          </div>

          {formError && <p className="message-banner error">{formError}</p>}
        </fieldset>
      </div>

      <div className="modal-footer">
        <button
          type="button"
          className="btn btn-primary"
          onClick={handleInvite}
          disabled={!email || isSending}
        >
          {isSending ? (
            <FontAwesomeIcon icon={faSpinner} spin />
          ) : (
            <>
              Invite / Update&nbsp;
              <FontAwesomeIcon icon={faShareNodes} />
            </>
          )}
        </button>
      </div>
    </div>
  );
}

export default ManageSharingModal;
