import React, { useContext, useState } from 'react';
import { AppContext } from '../../contexts/AppContext.js'; // CORRECTED
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowLeft, faEye, faEyeSlash } from '@fortawesome/free-solid-svg-icons';
import { CognitoIdentityProviderClient, ChangePasswordCommand } from '@aws-sdk/client-cognito-identity-provider';
import awsConfig from '../../../aws-config.js'; // CORRECTED

function AccountDetailsScreen() {
    const { goBack, currentUser, showNotification } = useContext(AppContext);
    
    const [formData, setFormData] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
    const [showCurrentPassword, setShowCurrentPassword] = useState(false);
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    const hasChanges = formData.newPassword.length > 0;
    const handleChange = (e) => setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));

    const handleSave = async () => {
        setIsSaving(true);
        if (!formData.currentPassword || !formData.newPassword) {
            showNotification({type: 'error', title: 'Missing Info', message: 'Please provide all password fields to make a change.'});
            return setIsSaving(false);
        }
        if (formData.newPassword !== formData.confirmPassword) {
            showNotification({type: 'error', title: 'Error', message: 'New passwords do not match.'});
            return setIsSaving(false);
        }
        try {
            const client = new CognitoIdentityProviderClient({ region: awsConfig.cognito.region });
            const command = new ChangePasswordCommand({
                PreviousPassword: formData.currentPassword, ProposedPassword: formData.newPassword,
                AccessToken: localStorage.getItem('accessToken'),
            });
            await client.send(command);
            showNotification({type: 'success', message: 'Password changed successfully!'});
            setFormData({ currentPassword: '', newPassword: '', confirmPassword: '' });
        } catch (err) {
             showNotification({type: 'error', title: 'Password Change Failed', message: err.message});
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="screen active">
            <nav className="simple-nav">
                <button className="btn-icon back-button" onClick={goBack}><FontAwesomeIcon icon={faArrowLeft} /></button>
                <h2>Account Details</h2>
                <div className="header-actions"><button className="btn btn-primary" onClick={handleSave} disabled={!hasChanges || isSaving}>{isSaving ? 'Saving...' : 'Save Changes'}</button></div>
            </nav>
            <div className="content-wrapper">
                <form onSubmit={(e) => e.preventDefault()}>
                    <fieldset><legend>Account Information</legend><div className="form-group"><label>Email</label><input type="email" value={currentUser?.userEmail || ''} disabled /></div></fieldset>
                    <fieldset>
                        <legend>Change Password</legend>
                        <div className="form-group"><label>Current Password</label><div className="input-wrapper"><input type={showCurrentPassword ? "text" : "password"} name="currentPassword" value={formData.currentPassword} onChange={handleChange} /><button type="button" className="btn-icon password-toggle" onClick={() => setShowCurrentPassword(!showCurrentPassword)}><FontAwesomeIcon icon={showCurrentPassword ? faEyeSlash : faEye} /></button></div></div>
                        <div className="form-group"><label>New Password</label><div className="input-wrapper"><input type={showNewPassword ? "text" : "password"} name="newPassword" value={formData.newPassword} onChange={handleChange} /><button type="button" className="btn-icon password-toggle" onClick={() => setShowNewPassword(!showNewPassword)}><FontAwesomeIcon icon={showNewPassword ? faEyeSlash : faEye} /></button></div></div>
                        <div className="form-group"><label>Confirm New Password</label><input type="password" name="confirmPassword" value={formData.confirmPassword} onChange={handleChange} /></div>
                    </fieldset>
                </form>
            </div>
        </div>
    );
}

export default AccountDetailsScreen;