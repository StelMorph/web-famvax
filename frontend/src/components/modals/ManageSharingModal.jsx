import React, { useState, useEffect, useContext } from 'react';
import { AppContext } from '../../contexts/AppContext.js';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTimes, faSpinner, faTrashAlt, faCircleInfo, faShareNodes } from '@fortawesome/free-solid-svg-icons';
import awsConfig from '../../../aws-config.js';

const ROLES = {
    Viewer: { name: 'Viewer', description: 'Can view vaccination records and profile details. Cannot make any changes.' },
    Editor: { name: 'Editor', description: 'Can view details, add/edit vaccination records, and update profile details. Cannot share or delete the profile.' }
};

const SharedUser = ({ share, onRevoke }) => (
    <li className="shared-user-item">
        <div className="user-info">
            <span className="user-email">{share.inviteeEmail}</span>
            <span className={`user-role role-${share.role.toLowerCase()}`}>{share.role}</span>
        </div>
        <div className="user-actions">
            <span className={`user-status status-${share.status.toLowerCase()}`}>{share.status}</span>
            <button className="btn-icon btn-danger-icon" onClick={() => onRevoke(share.shareId, share.inviteeEmail)} title="Revoke Access">
                <FontAwesomeIcon icon={faTrashAlt} />
            </button>
        </div>
    </li>
);

function ManageSharingModal({ profile, onClose }) {
    const { currentUser, showNotification } = useContext(AppContext);
    const [shares, setShares] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [email, setEmail] = useState('');
    const [selectedRole, setSelectedRole] = useState('Viewer');
    const [formError, setFormError] = useState('');
    const [isSending, setIsSending] = useState(false);

    const fetchShares = async () => {
        setIsLoading(true);
        setFormError(''); 
        const idToken = localStorage.getItem('idToken');
        try {
            const response = await fetch(`${awsConfig.api.invokeUrl}/profiles/${profile.profileId}/shares`, {
                headers: { 'Authorization': `Bearer ${idToken}` }
            });
            if (!response.ok) throw new Error("Could not fetch sharing details.");
            const data = await response.json();
            setShares(data);
        } catch (err) {
            console.error(err);
            setFormError("Failed to load sharing details.");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchShares();
    }, [profile.profileId]);

    const handleRevoke = async (shareId, userEmail) => {
        showNotification({
            type: 'confirm-destructive',
            title: 'Revoke Access',
            message: `Are you sure you want to revoke access for ${userEmail}?`,
            confirmText: 'Revoke',
            onConfirm: async () => {
                const idToken = localStorage.getItem('idToken');
                try {
                    const response = await fetch(`${awsConfig.api.invokeUrl}/shares/${shareId}`, {
                        method: 'DELETE',
                        headers: { 'Authorization': `Bearer ${idToken}` }
                    });
                    if (response.status !== 204) throw new Error("Failed to revoke access.");
                    showNotification({type: 'success', message: `Access for ${userEmail} has been revoked.`});
                    fetchShares();
                } catch (err) {
                     showNotification({type: 'error', title: 'Error', message: err.message || 'An error occurred.'});
                }
            }
        });
    };
    
    const handleInvite = async () => {
        setFormError('');
        const lowerCaseEmail = email.toLowerCase().trim();

        if (!lowerCaseEmail || !/^\S+@\S+\.\S+$/.test(lowerCaseEmail)) {
            setFormError('Please enter a valid email address.');
            return;
        }
        if (lowerCaseEmail === currentUser.userEmail) {
            setFormError('You cannot share a profile with yourself.');
            return;
        }

        setIsSending(true);
        const idToken = localStorage.getItem('idToken');
        
        try {
            // The frontend simply sends the request. The backend will handle all logic.
            const response = await fetch(`${awsConfig.api.invokeUrl}/profiles/${profile.profileId}/share`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${idToken}` },
                body: JSON.stringify({ inviteeEmail: lowerCaseEmail, role: selectedRole }),
            });

            const resBody = await response.json();

            if (!response.ok) {
                throw new Error(resBody.message || 'Failed to send or update invitation.');
            }
            
            showNotification({type: 'success', message: resBody.message});
            setEmail('');
            fetchShares();

        } catch (err) {
            setFormError(err.message);
        } finally {
            setIsSending(false);
        }
    };


    return (
        <div className="modal-content modal-flex-col" style={{maxWidth: '600px'}}>
            <div className="modal-header">
                <h2>Manage Sharing for "{profile.name}"</h2>
                <button onClick={onClose} className="btn-icon modal-close" title="Close"><FontAwesomeIcon icon={faTimes} /></button>
            </div>

            <div className="modal-body-scrollable">
                <fieldset>
                    <legend>Current Shares</legend>
                    <div className="shared-users-container">
                        {isLoading ? (
                            <div style={{ textAlign: 'center' }}><FontAwesomeIcon icon={faSpinner} spin /></div>
                        ) : shares && shares.length > 0 ? (
                            <ul className="shared-users-list">
                                {shares.map(share => <SharedUser key={share.shareId} share={share} onRevoke={handleRevoke} />)}
                            </ul>
                        ) : (
                            <p className="no-shares-message" style={{padding: 0}}>This profile hasn't been shared yet.</p>
                        )}
                    </div>
                </fieldset>

                <fieldset>
                    <legend>Invite New Member or Update Role</legend>
                     <div className="form-group">
                        <label htmlFor="share-email">Email Address</label>
                        <input type="email" id="share-email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@example.com" />
                    </div>
                    <div className="form-group">
                        <label>Permission Level</label>
                        <div className="role-selector">
                            {Object.keys(ROLES).map(roleKey => (
                                <button key={roleKey} type="button" className={`role-btn ${selectedRole === roleKey ? 'active' : ''}`} onClick={() => setSelectedRole(roleKey)}>
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
                <button type="button" className="btn btn-primary" onClick={handleInvite} disabled={!email || isSending}>
                     {isSending ? <FontAwesomeIcon icon={faSpinner} spin /> : <><FontAwesomeIcon icon={faShareNodes} style={{ marginRight: '8px' }} /> Invite / Update</>}
                </button>
            </div>
        </div>
    );
}

export default ManageSharingModal;