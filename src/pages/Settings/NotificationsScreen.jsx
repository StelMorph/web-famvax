import React, { useContext, useState } from 'react';
import { AppContext } from '../../contexts/AppContext.js';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowLeft } from '@fortawesome/free-solid-svg-icons';

function NotificationsScreen() {
    const { goBack, showNotification } = useContext(AppContext);
    
    // Simulate fetching initial state from GET /api/account/settings
    const [settings, setSettings] = useState({
        remindersEnabled: true,
        newSharesEnabled: true,
        updatesEnabled: false,
    });
    
    const [initialState, setInitialState] = useState(settings);

    const handleToggle = (key) => {
        setSettings(prev => ({ ...prev, [key]: !prev[key] }));
    };

    const handleSave = () => {
        // Simulate PATCH /api/account/notifications
        console.log("Saving notification settings:", settings);
        showNotification({ type: 'success', message: 'Notification settings saved!' });
        setInitialState(settings); // Update initial state after saving
        goBack();
    };

    const hasChanges = JSON.stringify(settings) !== JSON.stringify(initialState);

    return (
        <div className="screen active" id="notifications-screen">
            <nav className="simple-nav">
                <button className="btn-icon back-button" onClick={goBack}><FontAwesomeIcon icon={faArrowLeft} /></button>
                <h2>Notifications</h2>
                 <div className="header-actions">
                    <button className="btn btn-primary" onClick={handleSave} disabled={!hasChanges}>Save</button>
                 </div>
            </nav>
            <div className="content-wrapper settings-list">
                <h3>Push Notifications</h3>
                <div className="settings-item toggle-item">
                    <span>Vaccine Reminders</span>
                    <label className="switch"><input type="checkbox" checked={settings.remindersEnabled} onChange={() => handleToggle('remindersEnabled')} /><span className="slider round"></span></label>
                </div>
                <div className="settings-item toggle-item">
                    <span>New Shared Profiles</span>
                    <label className="switch"><input type="checkbox" checked={settings.newSharesEnabled} onChange={() => handleToggle('newSharesEnabled')} /><span className="slider round"></span></label>
                </div>
                <div className="settings-item toggle-item">
                    <span>App Updates & News</span>
                    <label className="switch"><input type="checkbox" checked={settings.updatesEnabled} onChange={() => handleToggle('updatesEnabled')} /><span className="slider round"></span></label>
                </div>
            </div>
        </div>
    );
}

export default NotificationsScreen;