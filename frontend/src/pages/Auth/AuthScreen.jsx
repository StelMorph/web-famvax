// frontend/src/pages/Auth/AuthScreen.jsx
import React, { useContext, useState } from 'react';
import { AppContext } from '../../contexts/AppContext.js';
import logo from '../../assets/famvax-logo.png';

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faApple, faGoogle } from '@fortawesome/free-brands-svg-icons';
import { faEye, faEyeSlash, faSpinner } from '@fortawesome/free-solid-svg-icons';

import auth from '../../api/authService.js';

function AuthScreen() {
  const { navigateTo, showModal, showNotification, refreshUserData } = useContext(AppContext);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handlePasswordChange = (e) => {
    const sanitized = e.target.value.replace(/[^\x00-\x7F]/g, '');
    setPassword(sanitized);
  };

  async function executeSignIn(kickPrevious = false) {
    setError('');
    try {
      const { session, user } = await auth.signIn(email.trim(), password, { kickPrevious });
      // Persist tokens for reload-safe API calls
      const idToken = session.getIdToken().getJwtToken();
      localStorage.setItem('idToken', idToken);
      if (user?.attributes?.email)
        localStorage.setItem('userEmail', user.attributes.email.toLowerCase());
      localStorage.setItem('authAt', String(Date.now()));

      // Hydrate app data using the fresh token
      await refreshUserData({ idTokenOverride: idToken });

      // Navigate to home and persist last screen for reload restore
      navigateTo('my-family-screen');
      localStorage.setItem('activeScreen', 'my-family-screen');

      return { ok: true };
    } catch (e) {
      const name = e?.name || '';
      const msg = String(e?.message || '');

      if (msg.includes('DEVICE_LIMIT_EXCEEDED')) {
        showNotification({
          type: 'confirm-destructive',
          title: 'Device limit reached',
          message:
            'Your account is signed in on another device. Do you want to sign out the other device and continue here?',
          confirmText: 'Sign out other device',
          onConfirm: async () => {
            setIsLoading(true);
            try {
              await executeSignIn(true);
            } finally {
              setIsLoading(false);
            }
          },
        });
        return { ok: false };
      }

      if (name === 'UserNotConfirmedException') {
        showModal('confirm-email', { emailToVerify: email.trim().toLowerCase() });
        return { ok: false };
      }

      setError(msg || 'Login failed, please try again.');
      return { ok: false };
    }
  }

  const handleLogin = async (e) => {
    e?.preventDefault?.();
    setIsLoading(true);
    await executeSignIn(false);
    setIsLoading(false);
  };

  const handleSocialSignIn = () => {
    showNotification({ type: 'info', message: 'Social sign-in is coming soon.' });
  };

  return (
    <div className="screen active" id="auth-screen">
      <div className="auth-container">
        <div className="auth-card">
          <img src={logo} alt="FamVax Logo" className="logo" />
          <h2>Welcome to FamVax</h2>
          <p>Sign in to continue</p>

          <button
            className="btn btn-social btn-google"
            onClick={handleSocialSignIn}
            type="button"
            disabled={isLoading}
          >
            <FontAwesomeIcon icon={faGoogle} /> Continue with Google
          </button>

          <button
            className="btn btn-social btn-apple"
            onClick={handleSocialSignIn}
            type="button"
            disabled={isLoading}
          >
            <FontAwesomeIcon icon={faApple} /> Continue with Apple
          </button>

          <div className="auth-divider">OR</div>

          <form className="auth-form" onSubmit={handleLogin}>
            <div className="form-group">
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder=" "
                autoComplete="email"
                disabled={isLoading}
              />
              <label htmlFor="email">Email</label>
            </div>

            <div className="form-group">
              <div className="input-wrapper">
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="password"
                  value={password}
                  onChange={handlePasswordChange}
                  required
                  placeholder=" "
                  autoComplete="current-password"
                  disabled={isLoading}
                />
                <label htmlFor="password">Password</label>
                {password && (
                  <button
                    type="button"
                    className="btn-icon password-toggle"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    disabled={isLoading}
                  >
                    <FontAwesomeIcon icon={showPassword ? faEyeSlash : faEye} />
                  </button>
                )}
              </div>
            </div>

            {error && (
              <p className="error-message" style={{ textAlign: 'center', marginBottom: 15 }}>
                {error}
              </p>
            )}

            <button type="submit" className="btn btn-primary auth-form-btn" disabled={isLoading}>
              {isLoading ? <FontAwesomeIcon icon={faSpinner} spin /> : 'Log In'}
            </button>
          </form>

          <div className="auth-footer">
            <a
              href="#"
              onClick={(e) => {
                e.preventDefault();
                showModal('forgot-password');
              }}
            >
              Forgot password?
            </a>
            <a
              href="#"
              onClick={(e) => {
                e.preventDefault();
                localStorage.removeItem('activeScreen');
                navigateTo('signup-screen');
              }}
            >
              Need an account? Sign up
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AuthScreen;
