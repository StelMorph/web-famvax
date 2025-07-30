import React, { useState, useEffect, useCallback } from 'react';
import { AppProvider } from './contexts/AppContext.js';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSpinner } from '@fortawesome/free-solid-svg-icons';
import { CognitoIdentityProviderClient, GetUserCommand } from '@aws-sdk/client-cognito-identity-provider';
import awsConfig from '../aws-config.js';

// Page Imports
import AuthScreen from './pages/Auth/AuthScreen.jsx';
import SignupScreen from './pages/Auth/SignupScreen.jsx';
import AddProfileScreen from './pages/MyFamily/AddProfileScreen.jsx';
import MyFamilyScreen from './pages/MyFamily/MyFamilyScreen.jsx';
import ProfileDetailScreen from './pages/MyFamily/ProfileDetailScreen.jsx';
import SettingsScreen from './pages/Settings/SettingsScreen.jsx';
import AccountDetailsScreen from './pages/Settings/AccountDetailsScreen.jsx';
import HelpCenterScreen from './pages/Settings/HelpCenterScreen.jsx';
import SubscriptionScreen from './pages/Settings/SubscriptionScreen.jsx';
import NotificationsScreen from './pages/Settings/NotificationsScreen.jsx';
import PrivacyPolicyScreen from './pages/Settings/PrivacyPolicyScreen.jsx';
import TermsServiceScreen from './pages/Settings/TermsServiceScreen.jsx';
import StandardScheduleScreen from './pages/Settings/StandardScheduleScreen.jsx';
import SharedWithMeScreen from './pages/SharedWithMe/SharedWithMeScreen.jsx';
import AIScanReviewExtractedScreen from './scan/AIScanReviewExtractedScreen.jsx';

// Component Imports
import ControlPanel from './components/layout/ControlPanel.jsx';
import ModalsController from './components/modals/ModalsController.jsx';
import NotificationManager from './components/common/NotificationManager.jsx';
import api from './api/apiService.js';
import './styles/index.css';

function App() {
    // State
    const [currentUser, setCurrentUser] = useState({ isLoggedIn: false, userEmail: null, isPremium: false });
    const [appState, setAppState] = useState({ activeModal: null, currentProfileId: null });
    const [allProfiles, setAllProfiles] = useState(null);
    const [isLoadingApp, setIsLoadingApp] = useState(true);
    const [activeScreen, setActiveScreen] = useState('auth-screen');
    const [navHistory, setNavHistory] = useState(['auth-screen']);
    const [notification, setNotification] = useState(null);
    const [pendingInviteCount, setPendingInviteCount] = useState(0);

    // Callbacks
    const showNotification = useCallback((details) => setNotification({ ...details, id: Date.now() }), []);
    const navigateTo = useCallback((screen, params = {}) => {
        setAppState(prev => ({ ...prev, ...params }));
        setActiveScreen(screen);
        setNavHistory(prev => (prev[prev.length - 1] !== screen ? [...prev, screen] : prev));
    }, []);

    const goBack = useCallback((steps = 1) => {
        if (appState.activeModal) {
            setAppState(prev => ({ ...prev, activeModal: null, addType: null, extractedData: null }));
            return;
        }
    
        const newHistory = navHistory.slice(0, -steps);
    
        if (newHistory.length > 0) {
            setActiveScreen(newHistory[newHistory.length - 1]);
            setNavHistory(newHistory);
        } else {
            // Fallback to the default screen if history becomes empty
            const defaultScreen = currentUser.isLoggedIn ? 'my-family-screen' : 'auth-screen';
            setActiveScreen(defaultScreen);
            setNavHistory([defaultScreen]);
        }
        
        // Clean up temporary state after determining navigation
        setAppState(prev => ({ ...prev, addType: null, extractedData: null }));
    
    }, [navHistory, currentUser.isLoggedIn, appState.activeModal]);


    const showModal = useCallback((modalId, params = {}) => {
        setAppState(prev => ({...prev, activeModal: modalId, ...params}));
    }, []);

    // Effect for checking session and fetching initial data
    useEffect(() => {
        const checkUserAndFetchData = async () => {
            const accessToken = localStorage.getItem('accessToken');
            if (!accessToken) {
                setAllProfiles([]);
                setIsLoadingApp(false);
                navigateTo('auth-screen');
                return;
            }

            try {
                const cognitoClient = new CognitoIdentityProviderClient({ region: awsConfig.cognito.region });
                const { UserAttributes } = await cognitoClient.send(new GetUserCommand({ AccessToken: accessToken }));
                const email = UserAttributes.find(attr => attr.Name === 'email')?.Value;
                setCurrentUser({ isLoggedIn: true, userEmail: email, isPremium: true });

                const [ownedProfiles, receivedShares] = await Promise.all([api.getOwnedProfiles(), api.getReceivedShares()]);
                
                setPendingInviteCount((receivedShares || []).filter(s => s.status === 'PENDING').length);
                
                const acceptedShares = (receivedShares || []).filter(s => s.status === 'ACCEPTED');
                const sharedProfilePromises = acceptedShares.map(share => api.getSharedProfileDetails(share.profileId).catch(() => null));
                const sharedProfilesDetails = (await Promise.all(sharedProfilePromises)).filter(Boolean);

                const formattedSharedProfiles = sharedProfilesDetails.map((profile, i) => ({ ...profile, isShared: true, role: acceptedShares[i].role, ownerEmail: acceptedShares[i].ownerEmail, shareId: acceptedShares[i].shareId }));
                const uniqueProfiles = Array.from(new Map([...(ownedProfiles || []), ...formattedSharedProfiles].map(p => [p.profileId, p])).values());
                const vaccinesForAll = await Promise.all(uniqueProfiles.map(p => api.getProfileVaccines(p.profileId)));
                const hydratedProfiles = uniqueProfiles.map((p, i) => ({ ...p, vaccines: vaccinesForAll[i] || [] }));
                
                setAllProfiles(hydratedProfiles);
                navigateTo('my-family-screen');
            } catch (error) {
                console.error("Session failed:", error);
                localStorage.clear();
                setCurrentUser({ isLoggedIn: false, userEmail: null, isPremium: false });
                setAllProfiles([]);
                navigateTo('auth-screen');
            } finally {
                setIsLoadingApp(false);
            }
        };
        checkUserAndFetchData();
    }, [navigateTo]);

    const renderMainContent = () => {
        const isAuthFlow = ['auth-screen', 'signup-screen'].includes(activeScreen);
        if (!allProfiles && !isAuthFlow) return null; // Wait for initial data

        const screens = {
            'auth-screen': <AuthScreen />, 'signup-screen': <SignupScreen />,
            'my-family-screen': <MyFamilyScreen />, 'add-profile-screen': <AddProfileScreen />,
            'profile-detail-screen': <ProfileDetailScreen />, 'settings-screen': <SettingsScreen />,
            'account-details-screen': <AccountDetailsScreen />, 'help-center-screen': <HelpCenterScreen />,
            'subscription-screen': <SubscriptionScreen />, 'notifications-screen': <NotificationsScreen />,
            'privacy-policy-screen': <PrivacyPolicyScreen />, 'terms-service-screen': <TermsServiceScreen />,
            'standard-schedule-screen': <StandardScheduleScreen />, 'shared-with-me-screen': <SharedWithMeScreen />,
            'ai-scan-review-extracted': <AIScanReviewExtractedScreen />,
        };
        return screens[activeScreen] || <div>Screen not found</div>;
    };
    
    const contextValue = { currentUser, setCurrentUser, appState, setAppState, allProfiles, setAllProfiles, pendingInviteCount, navigateTo, goBack, showModal, showNotification };
    if (isLoadingApp) return <div className="app-container" style={{ justifyContent: 'center', alignItems: 'center' }}><FontAwesomeIcon icon={faSpinner} spin size="3x" color="var(--primary-color)" /></div>;

    const isAuthLayout = ['auth-screen', 'signup-screen'].includes(activeScreen);

    return (
        <AppProvider value={contextValue}>
            <div className="app-container">
                <NotificationManager notification={notification} onHide={() => setNotification(null)} />
                <div className={`app-wrapper ${isAuthLayout ? 'auth-active' : ''}`}>
                    {isAuthLayout ? renderMainContent() : (
                        <>
                            <ControlPanel />
                            <div className="main-content-area">{renderMainContent()}</div>
                        </>
                    )}
                </div>
                {!isAuthLayout && <ModalsController />}
            </div>
        </AppProvider>
    );
}

export default App;