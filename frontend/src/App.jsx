// src/App.jsx

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { AppProvider } from './contexts/AppContext.js';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSpinner } from '@fortawesome/free-solid-svg-icons';
import { jwtDecode } from 'jwt-decode';

// Pages
import AuthScreen from './pages/Auth/AuthScreen.jsx';
import SignupScreen from './pages/Auth/SignupScreen.jsx';
import AddProfileScreen from './pages/MyFamily/AddProfileScreen.jsx';
import MyFamilyScreen from './pages/MyFamily/MyFamilyScreen.jsx';
import ProfileDetailScreen from './pages/MyFamily/ProfileDetailScreen.jsx';
import SettingsScreen from './pages/Settings/SettingsScreen.jsx';
import AccountDetailsScreen from './pages/Settings/AccountDetailsScreen.jsx';
import HelpCenterScreen from './pages/Settings/HelpCenterScreen.jsx';
import SubscriptionScreen from './pages/Settings/SubscriptionScreen.jsx';
import PrivacyPolicyScreen from './pages/Settings/PrivacyPolicyScreen.jsx';
import StandardScheduleScreen from './pages/Settings/StandardScheduleScreen.jsx';
import SharedWithMeScreen from './pages/SharedWithMe/SharedWithMeScreen.jsx';
import AIScanReviewExtractedScreen from './scan/AIScanReviewExtractedScreen.jsx';
import ManageDevicesScreen from './pages/Settings/ManageDevicesScreen.jsx';

// Components
import ControlPanel from './components/layout/ControlPanel.jsx';
import ModalsController from './components/modals/ModalsController.jsx';
import NotificationManager from './components/common/NotificationManager.jsx';

// API
import api from './api/apiService.js';
import auth from './api/authService.js';

// Styles
import './styles/index.css';

/* -------------------------------------------------------------
 * Routing helpers
 * ----------------------------------------------------------- */
const readHashScreen = () => (window.location.hash || '').replace('#', '').trim();
const validScreens = new Set([
  'auth-screen',
  'signup-screen',
  'my-family-screen',
  'add-profile-screen',
  'profile-detail-screen',
  'settings-screen',
  'account-details-screen',
  'help-center-screen',
  'subscription-screen',
  'privacy-policy-screen',
  'standard-schedule-screen',
  'shared-with-me-screen',
  'ai-scan-review-extracted',
  'manage-devices-screen',
]);

/* =============================================================
 * App
 * =========================================================== */
function App() {
  const initialScreenFromHash = readHashScreen();
  const initialScreenFromStorage = localStorage.getItem('lastScreen') || '';
  const initialScreen = validScreens.has(initialScreenFromHash)
    ? initialScreenFromHash
    : validScreens.has(initialScreenFromStorage)
      ? initialScreenFromStorage
      : 'auth-screen';

  // Global state
  const [currentUser, setCurrentUser] = useState({
    isLoggedIn: false,
    userEmail: null,
    isPremium: false,
  });
  const [appState, setAppState] = useState({
    activeModal: null,
    currentProfileId: null,
    areDetailsLoading: false,
  });

  // Cached data
  const [allProfiles, setAllProfiles] = useState(null);
  const [devices, setDevices] = useState(null);
  const [subscriptionHistory, setSubscriptionHistory] = useState(null);
  const [subscription, setSubscription] = useState(null);
  const [receivedShares, setReceivedShares] = useState(null);
  const [pendingInviteCount, setPendingInviteCount] = useState(0);

  // UI state
  const [isLoadingApp, setIsLoadingApp] = useState(true);
  const [bootReady, setBootReady] = useState(false);
  const [activeScreen, setActiveScreen] = useState(initialScreen);
  const [notification, setNotification] = useState(null);

  const showNotification = useCallback(
    (details) => setNotification({ ...details, id: Date.now() }),
    [],
  );

  const navigateTo = useCallback((screen, params = {}, options = {}) => {
    const { replace = false } = options;
    if (!validScreens.has(screen)) screen = 'my-family-screen';

    setAppState((prev) => ({ ...prev, ...params }));
    setActiveScreen(screen);
    localStorage.setItem('lastScreen', screen);

    const state = { screen, params };
    const url = `#${screen}`;

    if (replace) {
      window.history.replaceState(state, '', url);
    } else {
      window.history.pushState(state, '', url);
    }
  }, []);

  const goBack = useCallback(() => {
    if (appState.activeModal) {
      setAppState((prev) => ({ ...prev, activeModal: null }));
      return;
    }
    window.history.back();
  }, [appState.activeModal]);

  const showModal = useCallback((modalId, params = {}) => {
    setAppState((prev) => ({ ...prev, activeModal: modalId, ...params }));
  }, []);

  // Refs / guards
  const bootDidRun = useRef(false);
  const unifiedInFlight = useRef(false);
  const warmOnceRef = useRef(false);
  const settingsFetchedHeaderRef = useRef(false);
  const subScreenFetchedHeaderRef = useRef(false);
  const subScreenFetchedHistoryRef = useRef(false);
  const lastMyFamilyFetchAtRef = useRef(0);
  const bootSetByEventRef = useRef(false);

  // Sign-out handler
  const handleSignOut = useCallback(
    (options = {}) => {
      auth.signOut();
      setCurrentUser({ isLoggedIn: false, userEmail: null, isPremium: false });
      setAllProfiles(null);
      setDevices(null);
      setSubscription(null);
      setSubscriptionHistory(null);
      setReceivedShares(null);
      setPendingInviteCount(0);
      setBootReady(false);

      navigateTo('auth-screen', {}, { replace: true });

      if (options.message) {
        showNotification({
          type: 'info',
          title: options.title || 'Session Ended',
          message: options.message,
        });
      }
    },
    [navigateTo, showNotification],
  );

  // Session expiry → force sign out
  useEffect(() => {
    auth.setSessionExpiredHandler(() => handleSignOut({ message: 'Your session has expired.' }));
  }, [handleSignOut]);

  // Device-ready (fresh login): only here we flip bootReady
  useEffect(() => {
    const onReady = () => {
      bootSetByEventRef.current = true;
      setBootReady(true);
      const remembered = readHashScreen() || localStorage.getItem('lastScreen') || '';
      const target =
        validScreens.has(remembered) && !['auth-screen', 'signup-screen'].includes(remembered)
          ? remembered
          : 'my-family-screen';
      navigateTo(target, {}, { replace: true });
    };
    window.addEventListener('device-ready', onReady);
    return () => window.removeEventListener('device-ready', onReady);
  }, [navigateTo]);

  /* -------------------------------------------------------------
   * Unified fetch for My Family (profiles + shares + devices)
   * ----------------------------------------------------------- */
  const fetchAllForMyFamily = useCallback(async () => {
    if (unifiedInFlight.current) return;
    unifiedInFlight.current = true;
    setAppState((prev) => ({ ...prev, areDetailsLoading: true }));
    try {
      const [ownedP, shares, devs] = await Promise.all([
        (api.getOwnedProfiles ? api.getOwnedProfiles() : api.getProfiles()).catch(() => []),
        api.getReceivedShares().catch(() => []),
        api.listDevices({ force: true }).catch(() => []), // <- single devices request after login
      ]);

      setReceivedShares(shares || []);
      setPendingInviteCount((shares || []).filter((s) => s.status === 'PENDING').length);

      const accepted = (shares || []).filter((s) => s.status === 'ACCEPTED');
      const sharedDetails = await Promise.all(
        accepted.map((s) => api.getSharedProfileDetails(s.profileId).catch(() => null)),
      );
      const formattedShared = (sharedDetails || []).filter(Boolean).map((p, i) => ({
        ...p,
        isShared: true,
        role: accepted[i].role,
        ownerEmail: accepted[i].ownerEmail,
        shareId: accepted[i].shareId,
      }));

      const combined = [...(ownedP || []), ...formattedShared];
      setAllProfiles(combined.map((p) => ({ ...p, vaccines: null })));
      setDevices(devs || []);
    } finally {
      setAppState((prev) => ({ ...prev, areDetailsLoading: false }));
      unifiedInFlight.current = false;
    }
  }, []);

  /* -------------------------------------------------------------
   * Background warm-up ONCE per session
   * ----------------------------------------------------------- */
  useEffect(() => {
    if (!bootReady || warmOnceRef.current) return;
    warmOnceRef.current = true;
    (async () => {
      try {
        await Promise.allSettled([api.getSubscription({ ttlMs: 5 * 60_000 })]);
      } catch {}
    })();
  }, [bootReady]);

  /* -------------------------------------------------------------
   * Boot for returning sessions (no fresh sign-in path)
   * ----------------------------------------------------------- */
  const checkUserAndEnterApp = useCallback(async () => {
    setIsLoadingApp(true);
    const idToken = await auth.getIdToken();
    if (!idToken) {
      handleSignOut();
      setIsLoadingApp(false);
      return;
    }
    try {
      api.setAuthToken(idToken);

      const decodedToken = jwtDecode(idToken);
      setCurrentUser({
        isLoggedIn: true,
        userEmail: decodedToken.email,
        isPremium: decodedToken['custom:subscription_status'] === 'active',
      });

      try {
        await api.completeLogin({ deviceId: api.ensureDeviceId(), meta: {} });
        api.clearCache('GET:/devices');
      } catch {}

      if (!bootSetByEventRef.current) {
        const remembered = readHashScreen() || localStorage.getItem('lastScreen') || '';
        const target =
          validScreens.has(remembered) && !['auth-screen', 'signup-screen'].includes(remembered)
            ? remembered
            : 'my-family-screen';
        navigateTo(target, {}, { replace: true });
        setBootReady(true);
      }
    } catch (error) {
      console.error('Critical error during app boot:', error);
      handleSignOut({ message: 'There was a problem loading your account.' });
    } finally {
      setIsLoadingApp(false);
    }
  }, [handleSignOut, navigateTo]);

  // Run boot once
  useEffect(() => {
    if (bootDidRun.current) return;
    bootDidRun.current = true;
    checkUserAndEnterApp();
  }, [checkUserAndEnterApp]);

  /* -------------------------------------------------------------
   * My Family: throttled loader on entry/re-entry
   * ----------------------------------------------------------- */
  useEffect(() => {
    if (!bootReady) return;
    if (activeScreen !== 'my-family-screen') return;

    const now = Date.now();
    if (now - lastMyFamilyFetchAtRef.current < 1500) return; // throttle 1.5s
    lastMyFamilyFetchAtRef.current = now;

    api.clearCache('GET:/profiles');
    fetchAllForMyFamily();
  }, [bootReady, activeScreen, fetchAllForMyFamily]);

  // Profile-detail direct load safeguard
  useEffect(() => {
    if (!bootReady) return;
    if (activeScreen !== 'profile-detail-screen') return;
    if (appState.currentProfileId) return;

    if (Array.isArray(allProfiles) && allProfiles.length === 1) {
      setAppState((prev) => ({
        ...prev,
        currentProfileId: allProfiles[0].id || allProfiles[0].profileId,
      }));
    } else {
      navigateTo('my-family-screen');
    }
  }, [bootReady, activeScreen, appState.currentProfileId, allProfiles, navigateTo]);

  // Settings: prefetch subscription header (once per visit)
  useEffect(() => {
    if (!bootReady) return;
    if (activeScreen !== 'settings-screen') return;
    if (settingsFetchedHeaderRef.current) return;

    settingsFetchedHeaderRef.current = true;
    (async () => {
      try {
        const sub = await api.getSubscription();
        if (sub)
          setSubscription({
            ...sub,
            plan: (sub.plan ?? sub.price?.nickname ?? 'monthly')?.toString().toLowerCase(),
          });
      } catch (e) {
        console.warn('GET /subscription (settings prefetch) failed:', e);
      }
    })();
  }, [bootReady, activeScreen]);

  // Subscription screen: ensure header + history (once per visit)
  useEffect(() => {
    if (!bootReady) return;
    if (activeScreen !== 'subscription-screen') return;

    if (!subscription && !subScreenFetchedHeaderRef.current) {
      subScreenFetchedHeaderRef.current = true;
      (async () => {
        try {
          const sub = await api.getSubscription();
          if (sub)
            setSubscription({
              ...sub,
              plan: (sub.plan ?? sub.price?.nickname ?? 'monthly')?.toString().toLowerCase(),
            });
        } catch (e) {
          console.warn('GET /subscription (reload safeguard) failed:', e);
        }
      })();
    }

    const needHistory = !Array.isArray(subscriptionHistory) || subscriptionHistory.length === 0;
    if (needHistory && !subScreenFetchedHistoryRef.current) {
      subScreenFetchedHistoryRef.current = true;
      (async () => {
        try {
          const hist = await api.getSubscriptionHistory();
          setSubscriptionHistory(Array.isArray(hist) ? hist : []);
        } catch (e) {
          console.warn('GET /subscription/history failed:', e);
        }
      })();
    }
  }, [bootReady, activeScreen, subscription, subscriptionHistory]);

  // Back/forward sync + reset visit-scoped flags
  useEffect(() => {
    const handlePopState = (event) => {
      const screenFromState = event.state?.screen || readHashScreen() || 'auth-screen';
      const safeScreen = validScreens.has(screenFromState) ? screenFromState : 'auth-screen';
      const isAuthRoute = ['auth-screen', 'signup-screen'].includes(safeScreen);

      // --- Navigation Guards ---
      if (currentUser.isLoggedIn && isAuthRoute) {
        navigateTo('my-family-screen', {}, { replace: true });
        return;
      }
      if (!currentUser.isLoggedIn && !isAuthRoute) {
        navigateTo('auth-screen', {}, { replace: true });
        return;
      }
      // --- End Guards ---

      setActiveScreen(safeScreen);
      localStorage.setItem('lastScreen', safeScreen);
      setAppState((prev) => ({ ...prev, ...event.state?.params }));

      if (safeScreen !== 'settings-screen') settingsFetchedHeaderRef.current = false;
      if (safeScreen !== 'subscription-screen') {
        subScreenFetchedHistoryRef.current = false;
        subScreenFetchedHeaderRef.current = false;
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [currentUser.isLoggedIn, navigateTo]);

  /* -------------------------------------------------------------
   * Context value
   * ----------------------------------------------------------- */
  const contextValue = useMemo(
    () => ({
      currentUser,
      setCurrentUser,
      appState,
      setAppState,
      allProfiles,
      setAllProfiles,
      devices,
      setDevices,
      subscription,
      setSubscription,
      subscriptionHistory,
      setSubscriptionHistory,
      receivedShares,
      setReceivedShares,
      pendingInviteCount,
      navigateTo,
      goBack,
      showModal,
      showNotification,
      refreshUserData: fetchAllForMyFamily,
      fetchDetailedData: fetchAllForMyFamily,
      signOut: handleSignOut,
    }),
    [
      currentUser,
      appState,
      allProfiles,
      devices,
      subscription,
      subscriptionHistory,
      receivedShares,
      pendingInviteCount,
      navigateTo,
      goBack,
      showModal,
      showNotification,
      fetchAllForMyFamily,
      handleSignOut,
    ],
  );

  if (isLoadingApp) {
    return (
      <div className="app-container" style={{ justifyContent: 'center', alignItems: 'center' }}>
        <FontAwesomeIcon icon={faSpinner} spin size="3x" color="var(--primary-color)" />
      </div>
    );
  }

  const isAuthLayout = ['auth-screen', 'signup-screen'].includes(activeScreen);

  const renderScreen = () => {
    switch (activeScreen) {
      case 'auth-screen':
        return <AuthScreen />;
      case 'signup-screen':
        return <SignupScreen />;
      case 'my-family-screen':
        return (
          <MyFamilyScreen
            profiles={allProfiles}
            devices={devices}
            receivedShares={receivedShares}
            pendingInviteCount={pendingInviteCount}
            isLoading={appState.areDetailsLoading}
            onAddProfile={() => navigateTo('add-profile-screen')}
            onOpenProfile={(id) => navigateTo('profile-detail-screen', { currentProfileId: id })}
            onRefresh={() => fetchAllForMyFamily()}
          />
        );
      case 'add-profile-screen':
        return (
          <AddProfileScreen
            onDone={() => {
              navigateTo('my-family-screen');
              fetchAllForMyFamily();
            }}
            onCancel={goBack}
          />
        );
      case 'profile-detail-screen':
        return (
          <ProfileDetailScreen
            profileId={appState.currentProfileId}
            onBack={goBack}
            onChanged={() => fetchAllForMyFamily()}
          />
        );
      case 'settings-screen':
        return (
          <SettingsScreen
            user={currentUser}
            subscription={subscription}
            onOpenAccount={() => navigateTo('account-details-screen')}
            onOpenHelp={() => navigateTo('help-center-screen')}
            onOpenSub={() => navigateTo('subscription-screen')}
            onOpenDevices={() => navigateTo('manage-devices-screen')}
            onOpenPrivacy={() => navigateTo('privacy-policy-screen')}
            onOpenStdSchedule={() => navigateTo('standard-schedule-screen')}
            onSignOut={() => handleSignOut({ message: 'Signed out.' })}
          />
        );
      case 'account-details-screen':
        return <AccountDetailsScreen onBack={goBack} />;
      case 'help-center-screen':
        return <HelpCenterScreen onBack={goBack} />;
      case 'subscription-screen':
        return (
          <SubscriptionScreen
            subscription={subscription}
            history={subscriptionHistory}
            onBack={goBack}
            onChanged={() => {
              api
                .getSubscription({ force: true })
                .then(setSubscription)
                .catch(() => {});
              api
                .getSubscriptionHistory({ force: true })
                .then(setSubscriptionHistory)
                .catch(() => {});
            }}
          />
        );
      case 'privacy-policy-screen':
        return <PrivacyPolicyScreen onBack={goBack} />;
      case 'standard-schedule-screen':
        return <StandardScheduleScreen onBack={goBack} />;
      case 'shared-with-me-screen':
        return (
          <SharedWithMeScreen
            receivedShares={receivedShares}
            onAcceptDone={() => fetchAllForMyFamily()}
            onBack={goBack}
          />
        );
      case 'ai-scan-review-extracted':
        return <AIScanReviewExtractedScreen onBack={goBack} />;
      case 'manage-devices-screen':
        return (
          <ManageDevicesScreen
            devices={devices}
            onRemoved={() => {
              api
                .listDevices({ force: true, ttlMs: 0 })
                .then(setDevices)
                .catch(() => {});
            }}
            onBack={goBack}
          />
        );
      default:
        return <AuthScreen />;
    }
  };

  const mainContent = renderScreen();

  return (
    <AppProvider value={contextValue}>
      <div className="app-container">
        <NotificationManager notification={notification} onHide={() => setNotification(null)} />
        <ModalsController />
        <div className={`app-wrapper ${isAuthLayout ? 'auth-active' : ''}`}>
          {isAuthLayout ? (
            mainContent
          ) : (
            <>
              <ControlPanel />
              <div className="main-content-area">{mainContent}</div>
            </>
          )}
        </div>
      </div>
    </AppProvider>
  );
}

export default App;
