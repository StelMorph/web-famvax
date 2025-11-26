import React, { useContext, useEffect, useRef } from 'react';
import { AppContext } from '../../contexts/AppContext.js';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faUserCircle,
  faCreditCard,
  faCommentDots,
  faQuestionCircle,
  faUserSecret,
  faFileContract,
  faChevronRight,
  faShareAlt,
  faRightFromBracket,
  faMobileScreenButton,
} from '@fortawesome/free-solid-svg-icons';

import api from '../../api/apiService.js';
import auth from '../../api/authService.js';

function SettingsScreen({
  onOpenAccount,
  onOpenHelp,
  onOpenSub,
  onOpenDevices,
  onOpenPrivacy,
  onOpenStdSchedule,
  onSignOut,
}) {
  const {
    navigateTo,
    showNotification,
    devices,
    subscription,
    receivedShares,
    setDevices,
    setSubscription,
    setReceivedShares,
    fetchDetailedData,
    pendingInviteCount,
    signOut,
  } = useContext(AppContext);

  const prefetchedRef = useRef(false);
  useEffect(() => {
    if (prefetchedRef.current) return;

    const hasDevices = Array.isArray(devices);
    const hasSubscription = subscription !== undefined;
    const hasReceivedShares = Array.isArray(receivedShares);

    if (hasDevices && hasSubscription && hasReceivedShares) {
      prefetchedRef.current = true;
      return;
    }

    prefetchedRef.current = true;

    (async () => {
      if (typeof fetchDetailedData === 'function') {
        try {
          await fetchDetailedData();
          return;
        } catch (e) {
          console.error(e);
        }
      }
      try {
        const [d, history, shares] = await Promise.all([
          hasDevices ? Promise.resolve(devices) : api.listDevices().catch(() => []),
          api.getSubscriptionHistory().catch(() => []),
          hasReceivedShares
            ? Promise.resolve(receivedShares)
            : api.getReceivedShares().catch(() => []),
        ]);

        if (!hasDevices && typeof setDevices === 'function') setDevices(d || []);
        if (!hasReceivedShares && typeof setReceivedShares === 'function')
          setReceivedShares(shares || []);

        if (!hasSubscription && typeof setSubscription === 'function') {
          let sub = null;
          if (Array.isArray(history) && history.length) {
            const latest = history[0];
            sub = {
              status: latest?.status || 'active',
              plan: latest?.plan || 'monthly',
              price: latest?.amount ?? 399,
              latestEvent: latest,
              history,
            };
          }
          setSubscription(sub);
        }
      } catch (err) {
        console.error('Settings prefetch failed:', err);
      }
    })();
  }, [
    devices,
    fetchDetailedData,
    receivedShares,
    setDevices,
    setReceivedShares,
    setSubscription,
    subscription,
  ]);

  const handleSignOutClick = () => {
    // Call the signOut function from AppContext, which handles state update and navigation
    if (typeof showNotification === 'function') {
      showNotification({
        type: 'confirm-destructive',
        title: 'Sign Out?',
        message: 'This will sign you out on this device.',
        confirmText: 'Sign Out',
        onConfirm: () => signOut({ message: 'Signed out.' }), // Use context signOut
      });
    } else {
      signOut({ message: 'Signed out.' }); // Use context signOut
    }
  };

  return (
    <div className="screen active" id="settings-screen">
      <div className="content-wrapper settings-list">
        <h1 className="page-title" style={{ marginBottom: '30px' }}>
          Settings
        </h1>

        <div className="settings-section">
          <h3>Account & Security</h3>

          <div className="settings-item" onClick={() => navigateTo('account-details-screen')}>
            <FontAwesomeIcon icon={faUserCircle} className="settings-icon" />
            <span className="settings-item-label">Account Details</span>
            <FontAwesomeIcon icon={faChevronRight} className="arrow-icon" />
          </div>

          <div className="settings-item" onClick={() => navigateTo('subscription-screen')}>
            <FontAwesomeIcon icon={faCreditCard} className="settings-icon" />
            <span className="settings-item-label">Subscription</span>
            <FontAwesomeIcon icon={faChevronRight} className="arrow-icon" />
          </div>

          <div className="settings-item" onClick={() => navigateTo('manage-devices-screen')}>
            <FontAwesomeIcon icon={faMobileScreenButton} className="settings-icon" />
            <span className="settings-item-label">Manage Devices</span>
            <FontAwesomeIcon icon={faChevronRight} className="arrow-icon" />
          </div>

          <div className="settings-item" onClick={() => navigateTo('shared-with-me-screen')}>
            <FontAwesomeIcon icon={faShareAlt} className="settings-icon" />
            <span className="settings-item-label">Shared with Me</span>
            <div className="settings-item-badge">
              {pendingInviteCount > 0 && (
                <span className="notification-badge">{pendingInviteCount}</span>
              )}
              <FontAwesomeIcon icon={faChevronRight} className="arrow-icon" />
            </div>
          </div>
        </div>

        <div className="settings-section">
          <h3>Support</h3>
          <div
            className="settings-item"
            onClick={() =>
              showNotification?.({ type: 'info', message: 'Feedback modal coming soon.' })
            }
          >
            <FontAwesomeIcon icon={faCommentDots} className="settings-icon" />
            <span className="settings-item-label">Send Feedback</span>
            <FontAwesomeIcon icon={faChevronRight} className="arrow-icon" />
          </div>
          <div className="settings-item" onClick={() => navigateTo('help-center-screen')}>
            <FontAwesomeIcon icon={faQuestionCircle} className="settings-icon" />
            <span className="settings-item-label">Help Center</span>
            <FontAwesomeIcon icon={faChevronRight} className="arrow-icon" />
          </div>
        </div>

        <div className="settings-section">
          <h3>Legal</h3>
          <div className="settings-item" onClick={() => navigateTo('privacy-policy-screen')}>
            <FontAwesomeIcon icon={faUserSecret} className="settings-icon" />
            <span className="settings-item-label">Privacy Policy</span>
            <FontAwesomeIcon icon={faChevronRight} className="arrow-icon" />
          </div>
          <div className="settings-item" onClick={() => navigateTo('terms-service-screen')}>
            <FontAwesomeIcon icon={faFileContract} className="settings-icon" />
            <span className="settings-item-label">Terms of Service</span>
            <FontAwesomeIcon icon={faChevronRight} className="arrow-icon" />
          </div>
        </div>

        <div className="settings-section">
          <h3>Actions</h3>
          <div className="settings-item settings-item-danger" onClick={handleSignOutClick}>
            <FontAwesomeIcon icon={faRightFromBracket} className="settings-icon" />
            <span className="settings-item-label">Sign Out</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default SettingsScreen;
