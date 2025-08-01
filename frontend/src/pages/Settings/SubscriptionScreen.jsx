import React, { useContext } from 'react';
import { AppContext } from '../../contexts/AppContext.js'; // <-- CORRECTED
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowLeft, faCheckCircle } from '@fortawesome/free-solid-svg-icons';

function SubscriptionScreen() {
    const { goBack, currentUser, navigateTo } = useContext(AppContext);

    const handleSubscribe = () => {
        // In a real app, this would trigger a payment flow (e.g., Stripe, RevenueCat)
        showNotification({ type: 'info', title: 'Action Required', message: 'Redirecting to subscription management.'});
        navigateTo('settings-screen'); // Navigate away for now
    };

    return (
        <div className="screen active" id="subscription-screen">
            <nav className="simple-nav">
                <button className="btn-icon back-button" onClick={goBack}><FontAwesomeIcon icon={faArrowLeft} /></button>
                <h2>Subscription</h2>
            </nav>
            <div className="content-wrapper subscription-page-content">
                {currentUser.isPremium ? (
                    <div id="sub-status-premium">
                        <h2>Premium Active</h2>
                        <p>Thank you for being a FamVax Premium subscriber!</p>
                        <div className="sub-details">
                            <p><strong>Plan:</strong> Monthly</p>
                            <p><strong>Renews on:</strong> July 28, 2025 (Simulated)</p>
                        </div>
                        <button className="btn btn-outline" onClick={() => alert('Redirecting to subscription portal...')}>Manage Subscription</button>
                    </div>
                ) : (
                    <>
                        <h1>Unlock FamVax Premium</h1>
                        <div className="plan-details-card single-plan">
                            <div className="trial-badge">7-DAY FREE TRIAL</div>
                            <div className="plan-pricing">
                                <span className="price-amount">$3.99</span>
                                <span className="price-period">/month</span>
                            </div>
                            <p className="billing-note">Billed monthly after trial. Cancel anytime.</p>
                            <ul className="plan-features">
                                <li><FontAwesomeIcon icon={faCheckCircle} /> Unlimited Family Members</li>
                                <li><FontAwesomeIcon icon={faCheckCircle} /> Unlimited AI Document Scans</li>
                                <li><FontAwesomeIcon icon={faCheckCircle} /> Securely Share Profiles</li>
                                <li><FontAwesomeIcon icon={faCheckCircle} /> Travel Vaccine Suggestions</li>
                            </ul>
                        </div>
                        <button className="btn btn-primary btn-large" style={{width: '100%', marginTop: '30px'}} onClick={handleSubscribe}>
                            Start 7-Day Free Trial
                        </button>
                        <p className="no-charge-note">No charges until your trial ends.</p>
                    </>
                )}
            </div>
        </div>
    );
}

export default SubscriptionScreen;