// frontend/src/pages/SharedWithMe/SharedWithMeScreen.jsx
import React, { useContext, useEffect } from 'react';
import { AppContext } from '../../contexts/AppContext.js';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowLeft, faSpinner, faCheck, faChevronRight } from '@fortawesome/free-solid-svg-icons';
import api from '../../api/apiService.js';

const PendingInviteCard = ({ share, onAccept, onReject }) => (
  <div className="invite-card pending-card">
    <div className="invite-card-info">
      <div className="avatar initials-p">{share.profileName?.charAt(0) || '?'}</div>
      <div className="profile-info">
        <span className="profile-name">{share.profileName}</span>
        <span className="shared-by">Shared by: {share.ownerEmail || 'A user'}</span>
      </div>
    </div>
    <div className="invite-card-actions">
      <button className="btn-text btn-reject" onClick={() => onReject(share)}>
        Reject
      </button>
      <button className="btn btn-outline" onClick={() => onAccept(share.shareId)}>
        Accept
      </button>
    </div>
  </div>
);

const AcceptedShareCard = ({ share, onView }) => (
  <div className="invite-card accepted-card">
    <div className="invite-card-info" onClick={() => onView(share)} style={{ cursor: 'pointer' }}>
      <div className="avatar initials-p">{share.profileName?.charAt(0) || '?'}</div>
      <div className="profile-info">
        <span className="profile-name">{share.profileName}</span>
        <span className="shared-by">Role: {share.role}</span>
      </div>
    </div>
    <div className="accepted-card-actions">
      <div
        className="invite-card-status"
        onClick={() => onView(share)}
        style={{ cursor: 'pointer' }}
      >
        <FontAwesomeIcon icon={faCheck} />
        <span>Accepted</span>
        <FontAwesomeIcon icon={faChevronRight} className="arrow-icon" />
      </div>
    </div>
  </div>
);

function SharedWithMeScreen() {
  const { goBack, navigateTo, showNotification, receivedShares, fetchDetailedData } =
    useContext(AppContext);

  useEffect(() => {
    if (receivedShares === null) {
      fetchDetailedData();
    }
  }, [receivedShares, fetchDetailedData]);

  const handleAccept = async (shareId) => {
    try {
      await api.respondToShare(shareId);
      showNotification({
        type: 'success',
        title: 'Invite Accepted!',
        message: 'The profile is now available in your "My Family" list.',
      });
      fetchDetailedData();
    } catch (err) {
      showNotification({ type: 'error', title: 'Error', message: err.message });
    }
  };

  const handleReject = (share) => {
    showNotification({
      type: 'confirm-destructive',
      title: 'Reject Invitation?',
      message: `Are you sure you want to reject this invite from ${share.ownerEmail}?`,
      confirmText: 'Reject',
      onConfirm: async () => {
        try {
          await api.revokeShare(share.shareId);
          fetchDetailedData(); // Refetch after rejecting
        } catch (err) {
          showNotification({ type: 'error', title: 'Error', message: err.message });
        }
      },
    });
  };

  const handleLeaveShare = (share) => {
    showNotification({
      type: 'confirm-destructive',
      title: 'Leave Shared Profile?',
      message: `Are you sure you want to remove your access to "${share.profileName}"? This cannot be undone.`,
      confirmText: 'Leave',
      onConfirm: async () => {
        try {
          await api.revokeShare(share.shareId);
          fetchDetailedData();
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
        } catch (_err) {
          showNotification({
            type: 'error',
            title: 'Error',
            message: 'Could not leave the profile. Please try again.',
          });
        }
      },
    });
  };

  const handleViewProfile = (share) =>
    navigateTo('profile-detail-screen', { currentProfileId: share.profileId });

  const pendingShares = (receivedShares || []).filter((s) => s.status === 'PENDING');
  const acceptedShares = (receivedShares || []).filter((s) => s.status === 'ACCEPTED');

  return (
    <div className="screen active">
      <nav className="simple-nav">
        <button className="btn-icon back-button" onClick={goBack}>
          <FontAwesomeIcon icon={faArrowLeft} />
        </button>
        <h2>Shared with Me</h2>
      </nav>
      <div className="content-wrapper">
        {receivedShares === null ? (
          <div style={{ textAlign: 'center' }}>
            <FontAwesomeIcon icon={faSpinner} spin size="2x" />
          </div>
        ) : (
          <>
            <h3>New Invitations</h3>
            {pendingShares.length === 0 ? (
              <p>No new invitations at the moment.</p>
            ) : (
              <div className="invite-list">
                {pendingShares.map((s) => (
                  <PendingInviteCard
                    key={s.shareId}
                    share={s}
                    onAccept={handleAccept}
                    onReject={handleReject}
                  />
                ))}
              </div>
            )}
            <hr />
            <h3>Accepted Profiles</h3>
            {acceptedShares.length === 0 ? (
              <p>Profiles you accept will appear here.</p>
            ) : (
              <div className="invite-list">
                {acceptedShares.map((s) => (
                  <AcceptedShareCard
                    key={s.shareId}
                    share={s}
                    onView={handleViewProfile}
                    onLeave={handleLeaveShare}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default SharedWithMeScreen;
