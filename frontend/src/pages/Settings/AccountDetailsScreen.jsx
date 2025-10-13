import React, { useContext, useState, useEffect } from 'react';
import { AppContext } from '../../contexts/AppContext.js';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowLeft, faEye, faEyeSlash, faSpinner } from '@fortawesome/free-solid-svg-icons';
import {
  CognitoIdentityProviderClient,
  ChangePasswordCommand,
} from '@aws-sdk/client-cognito-identity-provider';
import auth from '../../api/authService.js';

// FIX: Read the region from the central .env file
const REGION = import.meta.env.VITE_REGION;

function AccountDetailsScreen() {
  const { goBack, currentUser, showNotification } = useContext(AppContext);
  const [formData, setFormData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [passwordError, setPasswordError] = useState('');

  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    const sanitizedValue = value.replace(/[^\x00-\x7F]/g, '');
    setFormData((prev) => ({ ...prev, [name]: sanitizedValue }));
  };

  useEffect(() => {
    if (formData.newPassword && formData.newPassword.length < 8) {
      setPasswordError('New password must be at least 8 characters.');
    } else {
      setPasswordError('');
    }
  }, [formData.newPassword]);

  const handleSave = async () => {
    setIsSaving(true);
    if (passwordError) {
      showNotification({ type: 'error', message: passwordError });
      setIsSaving(false);
      return;
    }
    if (formData.newPassword !== formData.confirmPassword) {
      showNotification({ type: 'error', title: 'Error', message: 'New passwords do not match.' });
      setIsSaving(false);
      return;
    }
    try {
      const client = new CognitoIdentityProviderClient({ region: REGION });
      const command = new ChangePasswordCommand({
        PreviousPassword: formData.currentPassword,
        ProposedPassword: formData.newPassword,
        AccessToken: await auth.getIdToken(),
      });
      await client.send(command);
      showNotification({ type: 'success', message: 'Password changed successfully!' });
      setFormData({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err) {
      showNotification({ type: 'error', title: 'Password Change Failed', message: err.message });
    } finally {
      setIsSaving(false);
    }
  };

  const hasChanges = formData.newPassword.length > 0;

  return (
    <div className="screen active">
      <nav className="simple-nav">
        <button className="btn-icon back-button" onClick={goBack}>
          <FontAwesomeIcon icon={faArrowLeft} />
        </button>
        <h2>Account Details</h2>
        <div className="header-actions">
          <button
            className="btn btn-primary"
            onClick={handleSave}
            disabled={!hasChanges || isSaving || !!passwordError}
          >
            {isSaving ? <FontAwesomeIcon icon={faSpinner} spin /> : 'Save Changes'}
          </button>
        </div>
      </nav>
      <div className="content-wrapper">
        <div className="form-card">
          <form onSubmit={(e) => e.preventDefault()}>
            <fieldset>
              <legend>Account Information</legend>
              <div className="form-group">
                <label>Email</label>
                <input type="email" value={currentUser?.userEmail || ''} disabled />
              </div>
            </fieldset>
            <fieldset>
              <legend>Change Password</legend>
              <div className="form-group">
                <label>Current Password</label>
                <div className="input-wrapper">
                  <input
                    type={showCurrentPassword ? 'text' : 'password'}
                    name="currentPassword"
                    value={formData.currentPassword}
                    onChange={handlePasswordChange}
                  />
                  {formData.currentPassword && (
                    <button
                      type="button"
                      className="password-toggle"
                      onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    >
                      <FontAwesomeIcon icon={showCurrentPassword ? faEye : faEyeSlash} />
                    </button>
                  )}
                </div>
              </div>
              <div className="form-group">
                <label>New Password</label>
                <div className="input-wrapper">
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    name="newPassword"
                    value={formData.newPassword}
                    onChange={handlePasswordChange}
                  />
                  {formData.newPassword && (
                    <button
                      type="button"
                      className="password-toggle"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                    >
                      <FontAwesomeIcon icon={showNewPassword ? faEye : faEyeSlash} />
                    </button>
                  )}
                </div>
                {passwordError && (
                  <p className="error-message" style={{ marginTop: '8px' }}>
                    {passwordError}
                  </p>
                )}
              </div>
              <div className="form-group">
                <label>Confirm New Password</label>
                <div className="input-wrapper">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handlePasswordChange}
                  />
                  {formData.confirmPassword && (
                    <button
                      type="button"
                      className="password-toggle"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    >
                      <FontAwesomeIcon icon={showConfirmPassword ? faEye : faEyeSlash} />
                    </button>
                  )}
                </div>
              </div>
            </fieldset>
          </form>
        </div>
      </div>
    </div>
  );
}

export default AccountDetailsScreen;
