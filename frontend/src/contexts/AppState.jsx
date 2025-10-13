// src/contexts/AppState.js
import React, { useEffect, useMemo, useReducer, useRef } from 'react';
import { AppContext } from './AppContext';
import auth from '../api/authService';
import api from '../api/apiService';

const initialState = {
  currentUser: { isLoggedIn: false, userEmail: null, isPremium: false },
  isLoadingApp: true,

  activeScreen: 'my-family-screen',
  activeModal: null,
  currentProfileId: null,

  overview: null,
  profiles: null,
  devices: null,
  subscription: null,
  receivedShares: null,

  areDetailsLoading: false,
};

// -------- PUBLIC / PROTECTED & TOKEN UTILS --------
const PUBLIC_SCREENS = new Set(['auth-screen', 'signup-screen', 'forgot-password']);
const PROTECTED_SCREENS = new Set([
  'my-family-screen',
  'profile-details-screen',
  'manage-devices-screen',
  'settings-screen',
  'vaccine-records-screen',
]);

function parseJwtExpOk(jwt) {
  if (!jwt || typeof jwt !== 'string') return false;
  const parts = jwt.split('.');
  if (parts.length !== 3) return false;
  try {
    const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
    if (typeof payload.exp !== 'number') return true; // permissive if no exp
    return Date.now() < payload.exp * 1000;
  } catch {
    return false;
  }
}

function hasValidTokenSync() {
  const idToken = localStorage.getItem('idToken');
  return parseJwtExpOk(idToken);
}
// --------------------------------------------------

function reducer(state, action) {
  switch (action.type) {
    case 'SET_LOADING_APP':
      return { ...state, isLoadingApp: action.payload };
    case 'LOGIN':
      return { ...state, currentUser: action.payload };
    case 'NAVIGATE':
      return {
        ...state,
        activeScreen: action.payload.screen,
        currentProfileId: action.payload?.params?.currentProfileId ?? state.currentProfileId,
      };
    case 'SHOW_MODAL':
      return {
        ...state,
        activeModal: action.payload?.modalId ?? action.payload,
        ...action.payload?.params,
      };
    case 'HIDE_MODAL':
      return { ...state, activeModal: null };
    case 'SET_DETAILS_LOADING':
      return { ...state, areDetailsLoading: action.payload };
    case 'SET_OVERVIEW':
      return { ...state, overview: action.payload };
    case 'SET_PROFILES':
      return { ...state, profiles: action.payload };
    case 'SET_DEVICES':
      return { ...state, devices: action.payload };
    case 'SET_SUBSCRIPTION':
      return { ...state, subscription: action.payload };
    case 'SET_RECEIVED_SHARES':
      return { ...state, receivedShares: action.payload };
    default:
      return state;
  }
}

function historyImpliesActive(historyArr) {
  if (!Array.isArray(historyArr) || historyArr.length === 0) return false;
  const latest = historyArr[0];
  const status = (latest?.status || latest?.Status || '').toString().toLowerCase();
  if (status.includes('active') || status.includes('trial')) return true;
  const type = (latest?.type || latest?.Type || '').toString().toLowerCase();
  return type.includes('renewal');
}

export const AppProvider = ({ children }) => {
  const [appState, dispatch] = useReducer(reducer, initialState);

  // ---- Prefetch cache (unchanged) ----
  const subscriptionPrefetchRef = useRef({
    ready: false,
    ts: 0,
    subscription: null,
    history: null,
  });

  const prefetchSubscriptionBundle = async () => {
    const now = Date.now();
    if (subscriptionPrefetchRef.current.ready && now - subscriptionPrefetchRef.current.ts < 60_000)
      return;
    try {
      const history = await api.getSubscriptionHistory().catch(() => []);
      let sub = null;
      if (historyImpliesActive(history)) {
        try {
          sub = await api.getSubscription();
        } catch (e) {
          if (e?.status !== 404) throw e;
          sub = null;
        }
      }
      dispatch({ type: 'SET_SUBSCRIPTION', payload: sub ?? null });
      subscriptionPrefetchRef.current = {
        ready: true,
        ts: now,
        subscription: sub,
        history: history || [],
      };
    } catch {
      /* best effort */
    }
  };

  // -------------------- NAVIGATION (with strong auth guard) --------------------
  const navigateTo = (screen, params) => {
    // Block protected screens if not authenticated
    if (PROTECTED_SCREENS.has(screen) && !hasValidTokenSync()) {
      dispatch({ type: 'NAVIGATE', payload: { screen: 'auth-screen' } });
      localStorage.removeItem('activeScreen'); // kill stale target
      return;
    }

    dispatch({ type: 'NAVIGATE', payload: { screen, params } });

    // Persist only non-public screens; ALWAYS clear for public screens
    if (screen && !PUBLIC_SCREENS.has(screen)) {
      localStorage.setItem('activeScreen', screen);
    } else {
      localStorage.removeItem('activeScreen');
    }

    if (screen === 'settings-screen') prefetchSubscriptionBundle();
  };

  const showModal = (modalId, params) => {
    if (!modalId) return dispatch({ type: 'HIDE_MODAL' });
    dispatch({ type: 'SHOW_MODAL', payload: { modalId, params } });
  };

  const fetchDetailedData = async () => {
    if (appState.areDetailsLoading) return;
    dispatch({ type: 'SET_DETAILS_LOADING', payload: true });
    try {
      const [overview, profiles, devices, receivedShares, history] = await Promise.all([
        api.getOverview().catch(() => null),
        api.getProfiles().catch(() => null),
        api.listDevices().catch(() => null),
        api.getReceivedShares().catch(() => null),
        api.getSubscriptionHistory().catch(() => []),
      ]);

      let subscription = null;
      if (historyImpliesActive(history)) {
        try {
          subscription = await api.getSubscription();
        } catch (e) {
          if (e?.status !== 404) throw e;
          subscription = null;
        }
      }

      if (overview !== null) dispatch({ type: 'SET_OVERVIEW', payload: overview });
      if (profiles !== null) dispatch({ type: 'SET_PROFILES', payload: profiles });
      if (devices !== null) dispatch({ type: 'SET_DEVICES', payload: devices });
      dispatch({ type: 'SET_SUBSCRIPTION', payload: subscription });
      if (receivedShares !== null)
        dispatch({ type: 'SET_RECEIVED_SHARES', payload: receivedShares });

      subscriptionPrefetchRef.current = {
        ready: true,
        ts: Date.now(),
        subscription,
        history: history || [],
      };
    } finally {
      dispatch({ type: 'SET_DETAILS_LOADING', payload: false });
    }
  };

  const refreshUserData = async () => {
    await fetchDetailedData();
  };

  // --------------------------- STARTUP BOOT (align with guard) ----------------------------
  useEffect(() => {
    (async () => {
      const last = localStorage.getItem('activeScreen') || 'my-family-screen';
      const authed = hasValidTokenSync() || Boolean(await auth.getIdToken(false));

      if (!authed) {
        // Not authenticated: only allow public screens; also nuke stale activeScreen
        localStorage.removeItem('activeScreen');
        const initial = PUBLIC_SCREENS.has(last) ? last : 'auth-screen';
        navigateTo(initial);
        dispatch({ type: 'SET_LOADING_APP', payload: false });
        return;
      }

      // Authenticated bootstrap
      dispatch({
        type: 'LOGIN',
        payload: {
          isLoggedIn: true,
          userEmail: localStorage.getItem('userEmail') || null,
          isPremium: false,
        },
      });

      navigateTo(last || 'my-family-screen');
      await refreshUserData();
      dispatch({ type: 'SET_LOADING_APP', payload: false });
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---------------------- HARD ENFORCER (last line of defense) ----------------------
  useEffect(() => {
    if (PROTECTED_SCREENS.has(appState.activeScreen) && !hasValidTokenSync()) {
      dispatch({ type: 'NAVIGATE', payload: { screen: 'auth-screen' } });
      localStorage.removeItem('activeScreen');
    }
  }, [appState.activeScreen]);
  // ---------------------------------------------------------------------------------

  const value = useMemo(
    () => ({
      appState,
      navigateTo,
      showModal,
      showNotification: (opts) => console.log('[notify]', opts),

      // data
      allProfiles: appState.profiles,
      setAllProfiles: (v) =>
        dispatch({
          type: 'SET_PROFILES',
          payload: typeof v === 'function' ? v(appState.profiles) : v,
        }),
      devices: appState.devices,
      setDevices: (v) =>
        dispatch({
          type: 'SET_DEVICES',
          payload: typeof v === 'function' ? v(appState.devices) : v,
        }),
      subscription: appState.subscription,
      setSubscription: (v) =>
        dispatch({
          type: 'SET_SUBSCRIPTION',
          payload: typeof v === 'function' ? v(appState.subscription) : v,
        }),
      receivedShares: appState.receivedShares,
      setReceivedShares: (v) =>
        dispatch({
          type: 'SET_RECEIVED_SHARES',
          payload: typeof v === 'function' ? v(appState.receivedShares) : v,
        }),

      // helpers
      fetchDetailedData,
      refreshUserData,
      goBack: () => window.history.back(),
      currentUser: appState.currentUser,

      // prefetch
      subscriptionPrefetch: subscriptionPrefetchRef,
      prefetchSubscriptionBundle,
    }),
    [appState],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export default AppProvider;
