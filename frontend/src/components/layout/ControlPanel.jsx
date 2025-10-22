// src/components/layout/ControlPanel.jsx
import React, { useContext } from 'react';
import { AppContext } from '../../contexts/AppContext.js';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faUsers, faCog } from '@fortawesome/free-solid-svg-icons';

function ControlPanel() {
  const context = useContext(AppContext);

  if (!context) {
    return null; // Render nothing if context is not yet available
  }

  const { appState, navigateTo, pendingInviteCount } = context;
  const { activeScreen } = appState;

  const getActiveClass = (screenName) => {
    const familyScreens = ['my-family-screen', 'add-profile-screen', 'profile-detail-screen'];
    const settingsScreens = [
      'settings-screen',
      'account-details-screen',
      'subscription-screen',
      'notifications-screen',
      'help-center-screen',
      'privacy-policy-screen',
      'terms-service-screen',
      'shared-with-me-screen',
      'manage-devices-screen',
    ];
    if (screenName === 'my-family' && familyScreens.includes(activeScreen)) return 'active';
    if (screenName === 'settings' && settingsScreens.includes(activeScreen)) return 'active';
    return '';
  };

  // Option 1: rely entirely on the global navigation guard (AppState/App.jsx)
  // No local confirm dialogs here — just call navigateTo.
  const navigateCentral = (targetScreen) => {
    navigateTo(targetScreen);
  };

  return (
    <div className="control-panel" id="control-panel">
      <button
        className={`control-panel-button ${getActiveClass('my-family')}`}
        onClick={() => navigateCentral('my-family-screen')}
      >
        <FontAwesomeIcon icon={faUsers} />
        <span className="control-panel-text">My Family</span>
      </button>

      <button
        className={`control-panel-button ${getActiveClass('settings')}`}
        onClick={() => navigateCentral('settings-screen')}
      >
        <FontAwesomeIcon icon={faCog} />
        <span className="control-panel-text">Settings</span>
        {pendingInviteCount > 0 && (
          <span
            className="notification-badge-main"
            title={`${pendingInviteCount} pending invitation(s)`}
          >
            {pendingInviteCount}
          </span>
        )}
      </button>
    </div>
  );
}

export default ControlPanel;
