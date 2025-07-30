import React, { useContext } from 'react';
import { AppContext } from '../../contexts/AppContext.js'; // <-- VERIFIED CORRECT
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
    faUserCircle, faCreditCard, faBell, faCommentDots, faQuestionCircle, 
    faCalendarAlt, faUserSecret, faFileContract, faChevronRight, faShareAlt,
    faRightFromBracket
} from '@fortawesome/free-solid-svg-icons';

function SettingsScreen() {
    const { navigateTo, showModal, showNotification, pendingInviteCount } = useContext(AppContext);

    const handleSignOut = () => {
        showNotification({
            type: 'confirm-destructive', title: 'Sign Out?',
            message: "Are you sure you want to sign out?", confirmText: 'Sign Out',
            onConfirm: () => {
                localStorage.removeItem('accessToken');
                localStorage.removeItem('idToken');
                window.location.reload();
            }
        });
    };

    return (
        <div className="screen active" id="settings-screen">
            <div className="content-wrapper settings-list">
                <h1 className="page-title" style={{marginBottom: '30px'}}>Settings</h1>
                <div className="settings-section">
                    <h3>Account</h3>
                    <div className="settings-item" onClick={() => navigateTo('account-details-screen')}><FontAwesomeIcon icon={faUserCircle} className="settings-icon" /><span className="settings-item-label">Account Details</span><FontAwesomeIcon icon={faChevronRight} className="arrow-icon" /></div>
                    <div className="settings-item" onClick={() => navigateTo('subscription-screen')}><FontAwesomeIcon icon={faCreditCard} className="settings-icon" /><span className="settings-item-label">Subscription</span><FontAwesomeIcon icon={faChevronRight} className="arrow-icon" /></div>
                    <div className="settings-item" onClick={() => navigateTo('shared-with-me-screen')}><FontAwesomeIcon icon={faShareAlt} className="settings-icon" /><span className="settings-item-label">Shared with Me</span><div className="settings-item-badge">{pendingInviteCount > 0 && <span className="notification-badge">{pendingInviteCount}</span>}<FontAwesomeIcon icon={faChevronRight} className="arrow-icon" /></div></div>
                    <div className="settings-item" onClick={() => navigateTo('notifications-screen')}><FontAwesomeIcon icon={faBell} className="settings-icon" /><span className="settings-item-label">Notifications</span><FontAwesomeIcon icon={faChevronRight} className="arrow-icon" /></div>
                </div>
                <div className="settings-section">
                    <h3>Support</h3>
                    <div className="settings-item" onClick={() => showModal('feedback-modal')}><FontAwesomeIcon icon={faCommentDots} className="settings-icon" /><span className="settings-item-label">Send Feedback</span><FontAwesomeIcon icon={faChevronRight} className="arrow-icon" /></div>
                    <div className="settings-item" onClick={() => navigateTo('help-center-screen')}><FontAwesomeIcon icon={faQuestionCircle} className="settings-icon" /><span className="settings-item-label">Help Center</span><FontAwesomeIcon icon={faChevronRight} className="arrow-icon" /></div>
                </div>
                <div className="settings-section">
                    <h3>Legal</h3>
                    <div className="settings-item" onClick={() => navigateTo('privacy-policy-screen')}><FontAwesomeIcon icon={faUserSecret} className="settings-icon" /><span className="settings-item-label">Privacy Policy</span><FontAwesomeIcon icon={faChevronRight} className="arrow-icon" /></div>
                    <div className="settings-item" onClick={() => navigateTo('terms-service-screen')}><FontAwesomeIcon icon={faFileContract} className="settings-icon" /><span className="settings-item-label">Terms of Service</span><FontAwesomeIcon icon={faChevronRight} className="arrow-icon" /></div>
                </div>
                <div className="settings-section">
                    <h3>Actions</h3>
                    <div className="settings-item settings-item-danger" onClick={handleSignOut}><FontAwesomeIcon icon={faRightFromBracket} className="settings-icon" /><span className="settings-item-label">Sign Out</span></div>
                </div>
            </div>
        </div>
    );
}

export default SettingsScreen;