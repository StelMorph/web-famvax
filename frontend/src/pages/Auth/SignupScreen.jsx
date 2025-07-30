import React, { useContext, useState } from 'react';
import { AppContext } from '../../contexts/AppContext.js';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faApple, faGoogle } from '@fortawesome/free-brands-svg-icons';
import { faArrowLeft, faSpinner, faEye, faEyeSlash } from '@fortawesome/free-solid-svg-icons';
import { CognitoIdentityProviderClient, SignUpCommand } from '@aws-sdk/client-cognito-identity-provider';
import awsConfig from '../../../aws-config.js';

function SignupScreen() {
    const { goBack, showModal } = useContext(AppContext);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSignup = async (e) => {
        e.preventDefault();
        setError('');
        if (password !== confirmPassword) {
            setError("Passwords do not match.");
            return;
        }
        setIsLoading(true);
        
        const client = new CognitoIdentityProviderClient({ region: awsConfig.cognito.region });
        const lowerCaseEmail = email.toLowerCase().trim();

        const command = new SignUpCommand({
            ClientId: awsConfig.cognito.userPoolClientId,
            Username: lowerCaseEmail,
            Password: password,
            UserAttributes: [{ Name: 'email', Value: lowerCaseEmail }],
        });

        try {
            await client.send(command);
            showModal('confirm-email', { emailToVerify: lowerCaseEmail });
        } catch (err) {
            setError(err.message || "An unexpected error occurred.");
        } finally {
            setIsLoading(false);
        }
    };
    
    // RESTORED: Social sign-in placeholder
    const handleSocialSignIn = (provider) => {
        showModal('feedback-modal');
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
                            <input type="email" id="signup-email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder=" " autoComplete="email" />
                            <label htmlFor="signup-email">Email address</label>
                        </div>
                        <div className="form-group">
                           <div className="input-wrapper">
                                <input type={showPassword ? "text" : "password"} id="signup-password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength="8" placeholder=" " autoComplete="new-password" />
                                <label htmlFor="signup-password">Your password</label>
                                {password && (
                                    <button type="button" className="btn-icon password-toggle" onClick={() => setShowPassword(!showPassword)}>
                                        <FontAwesomeIcon icon={showPassword ? faEyeSlash : faEye} />
                                    </button>
                                )}
                            </div>
                        </div>
                        <div className="form-group">
                             <div className="input-wrapper">
                                <input type={showConfirmPassword ? "text" : "password"} id="confirm-password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required placeholder=" " autoComplete="new-password" />
                                <label htmlFor="confirm-password">Confirm password</label>
                                {confirmPassword && (
                                    <button type="button" className="btn-icon password-toggle" onClick={() => setShowConfirmPassword(!showConfirmPassword)}>
                                        <FontAwesomeIcon icon={showConfirmPassword ? faEyeSlash : faEye} />
                                    </button>
                                )}
                            </div>
                        </div>
                        {error && <p className="error-message">{error}</p>}
                        <button type="submit" className="btn btn-primary auth-form-btn" disabled={isLoading}>
                             {isLoading ? <FontAwesomeIcon icon={faSpinner} spin /> : 'Sign Up'}
                        </button>
                    </form>
                    
                    {/* RESTORED: Social login buttons */}
                    <div className="auth-divider">OR</div>
                    <button className="btn btn-social btn-google" onClick={() => handleSocialSignIn('Google')}>
                        <FontAwesomeIcon icon={faGoogle} /> Continue with Google
                    </button>
                    <button className="btn btn-social btn-apple" onClick={() => handleSocialSignIn('Apple')}>
                        <FontAwesomeIcon icon={faApple} /> Continue with Apple
                    </button>
                </div>
            </div>
        </div>
    );
}

export default SignupScreen;