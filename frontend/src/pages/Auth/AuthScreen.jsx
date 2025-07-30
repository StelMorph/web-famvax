import React, { useContext, useState } from 'react';
import { AppContext } from '../../contexts/AppContext.js';
import logo from '../../assets/famvax-logo.png';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faApple, faGoogle } from '@fortawesome/free-brands-svg-icons';
import { faEye, faEyeSlash, faSpinner } from '@fortawesome/free-solid-svg-icons';
import { CognitoIdentityProviderClient, InitiateAuthCommand } from '@aws-sdk/client-cognito-identity-provider';
import awsConfig from '../../../aws-config.js';

function AuthScreen() {
    const { navigateTo, showModal } = useContext(AppContext);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    
    const handleLogin = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');

        const client = new CognitoIdentityProviderClient({ region: awsConfig.cognito.region });
        const command = new InitiateAuthCommand({
            AuthFlow: 'USER_PASSWORD_AUTH',
            ClientId: awsConfig.cognito.userPoolClientId,
            AuthParameters: {
                USERNAME: email.toLowerCase().trim(),
                PASSWORD: password,
            },
        });

        try {
            const { AuthenticationResult } = await client.send(command);
            if (AuthenticationResult) {
                localStorage.setItem('accessToken', AuthenticationResult.AccessToken);
                localStorage.setItem('idToken', AuthenticationResult.IdToken);
                window.location.reload();
            } else {
                throw new Error("Login failed, please try again.");
            }
        } catch (err) {
            setError(err.message || 'An unexpected error occurred during sign in.');
            setIsLoading(false);
        }
    };
    
    // RESTORED: Social sign-in placeholder
    const handleSocialSignIn = (provider) => {
        showModal('feedback-modal');
    };

    return (
        <div className="screen active" id="auth-screen">
            <div className="auth-container">
                <div className="auth-card">
                    <img src={logo} alt="FamVax Logo" className="logo" />
                    <h2>Welcome to FamVax</h2>
                    <p>Sign in to continue</p>
                    
                    {/* RESTORED: Social Login Buttons */}
                    <button className="btn btn-social btn-google" onClick={() => handleSocialSignIn('Google')}>
                        <FontAwesomeIcon icon={faGoogle} /> Continue with Google
                    </button>
                    <button className="btn btn-social btn-apple" onClick={() => handleSocialSignIn('Apple')}>
                        <FontAwesomeIcon icon={faApple} /> Continue with Apple
                    </button>
                    <div className="auth-divider">OR</div>

                    <form className="auth-form" onSubmit={handleLogin}>
                        <div className="form-group">
                            <input type="email" id="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder=" " autoComplete="email" />
                            <label htmlFor="email">Email</label>
                        </div>
                        <div className="form-group">
                            <div className="input-wrapper">
                                <input type={showPassword ? "text" : "password"} id="password" value={password} onChange={(e) => setPassword(e.target.value)} required placeholder=" " autoComplete="current-password" />
                                <label htmlFor="password">Password</label>
                                {password && (
                                    <button type="button" className="btn-icon password-toggle" onClick={() => setShowPassword(!showPassword)}>
                                        <FontAwesomeIcon icon={showPassword ? faEye : faEyeSlash} />
                                    </button>
                                )}
                            </div>
                        </div>
                        {error && <p className="error-message" style={{textAlign: 'center', marginBottom: '15px'}}>{error}</p>}
                        <button type="submit" className="btn btn-primary auth-form-btn" disabled={isLoading}>
                            {isLoading ? <FontAwesomeIcon icon={faSpinner} spin /> : 'Log In'}
                        </button>
                    </form>
                    <div className="auth-footer">
                        <a href="#" onClick={(e) => { e.preventDefault(); showModal('forgot-password'); }}>Forgot password?</a>
                        <a href="#" onClick={(e) => { e.preventDefault(); navigateTo('signup-screen'); }}>Need an account? Sign up</a>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default AuthScreen;