// frontend/src/pages/Auth/SignupScreen.jsx
import React, { useContext, useState, useEffect } from 'react';
import { AppContext } from '../../contexts/AppContext.js';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'; // Fixed typo here
import { faApple, faGoogle } from '@fortawesome/free-brands-svg-icons';
import { faArrowLeft, faSpinner, faEye, faEyeSlash } from '@fortawesome/free-solid-svg-icons';
import auth from '../../api/authService.js';

const asciiRegex = /^[\x00-\x7F]*$/;

function SignupScreen() {
  const { goBack, navigateTo, showNotification } = useContext(AppContext);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [passwordError, setPasswordError] = useState('');

  // --- THE FIX: This function now actively sanitizes the input ---
  const handlePasswordInput = (event, setter) => {
    // Replace any character that is NOT a standard ASCII character with an empty string.
    const sanitizedValue = event.target.value.replace(/[^\x00-\x7F]/g, '');
    setter(sanitizedValue);
  };
  // -----------------------------------------------------------

  // Real-time validation for complexity (optional but good UX)
  useEffect(() => {
    if (password && password.length < 8) {
      setPasswordError('Password must be at least 8 characters.');
    } else {
      setPasswordError('');
    }
  }, [password]);

  const handleSignup = async (e) => {
    e.preventDefault();
    setError('');

    if (passwordError) return;

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setIsLoading(true);
    const lowerEmail = email.toLowerCase().trim();
    const result = await auth.signUp(lowerEmail, password);

    if (result.success) {
      showNotification({
        type: 'success',
        title: 'Account Created!',
        message: 'Your account is ready. Please log in to continue.',
      });
      navigateTo('auth-screen');
    } else {
      setError(result.error || 'Sign up failed. Please try again.');
    }
    setIsLoading(false);
  };

  const handleSocialSignIn = () => {
    showNotification({ type: 'info', message: 'Social sign-in is coming soon!' });
  };

  return (
    <div className="screen active" id="signup-screen">
      <div className="auth-container">
        <div className="auth-card">
          <button className="auth-back-link" onClick={goBack}>
            <FontAwesomeIcon icon={faArrowLeft} /> Back to sign in
          </button>
          <h2>Create your account</h2>
          <form className="auth-form" onSubmit={handleSignup}>
            <div className="form-group">
              <input
                type="email"
                id="signup-email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder=" "
                autoComplete="email"
              />
              <label htmlFor="signup-email">Email address</label>
            </div>
            <div className="form-group">
              <div className="input-wrapper">
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="signup-password"
                  value={password}
                  onChange={(e) => handlePasswordInput(e, setPassword)}
                  required
                  minLength="8"
                  placeholder=" "
                  autoComplete="new-password"
                />
                <label htmlFor="signup-password">Your password</label>
                {password && (
                  <button
                    type="button"
                    className="btn-icon password-toggle"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    <FontAwesomeIcon icon={showPassword ? faEye : faEyeSlash} />
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
              <div className="input-wrapper">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  id="confirm-password"
                  value={confirmPassword}
                  onChange={(e) => handlePasswordInput(e, setConfirmPassword)}
                  required
                  placeholder=" "
                  autoComplete="new-password"
                />
                <label htmlFor="confirm-password">Confirm password</label>
                {confirmPassword && (
                  <button
                    type="button"
                    className="btn-icon password-toggle"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    <FontAwesomeIcon icon={showConfirmPassword ? faEye : faEyeSlash} />
                  </button>
                )}
              </div>
            </div>
            {error && (
              <p className="error-message" style={{ textAlign: 'center', marginBottom: 15 }}>
                {error}
              </p>
            )}
            <button
              type="submit"
              className="btn btn-primary auth-form-btn"
              disabled={isLoading || !!passwordError}
            >
              {isLoading ? <FontAwesomeIcon icon={faSpinner} spin /> : 'Create Account'}
            </button>
          </form>
          <div className="auth-divider">OR</div>
          <button className="btn btn-social btn-google" onClick={handleSocialSignIn}>
            <FontAwesomeIcon icon={faGoogle} /> Continue with Google
          </button>
          <button className="btn btn-social btn-apple" onClick={handleSocialSignIn}>
            <FontAwesomeIcon icon={faApple} /> Continue with Apple
          </button>
        </div>
      </div>
    </div>
  );
}

export default SignupScreen;
