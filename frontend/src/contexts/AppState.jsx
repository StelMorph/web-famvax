// src/contexts/AppState.jsx
import React, { useEffect, useMemo, useReducer, useRef } from 'react';
import { AppContext } from './AppContext';
import auth from '../api/authService';
import api from '../api/apiService';

/* ----------------------- Initial App State ----------------------- */
const initialState = {
  currentUser: { isLoggedIn: false, userEmail: null, isPremium: false },
  isLoadingApp: true,

  activeScreen: 'my-family-screen',
  activeModal: null,
  currentProfileId: null,

  // For NotificationManager
  notification: null,

  // Data blobs
  overview: null,
  profiles: null,
  devices: null,
  subscription: null,
  receivedShares: null,

  areDetailsLoading: false,

  // 🔒 Global "unsaved edits" flag for AI Review screen
  reviewDirty: false,
};

/* ----------------------- Auth gates ----------------------- */
const PUBLIC_SCREENS = new Set(['auth-screen', 'signup-screen', 'forgot-password']);
const PROTECTED_SCREENS = new Set([
  'my-family-screen',
  'profile-detail-screen',
  'settings-screen',
  'vaccine-records-screen',
  'ai-scan-review-extracted',
]);

function parseJwtExpOk(jwt) {
  if (!jwt || typeof jwt !== 'string') return false;
  const parts = jwt.split('.');
  if (parts.length !== 3) return false;
  try {
    const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
    if (typeof payload.exp !== 'number') return true;
    return Date.now() < payload.exp * 1000;
  } catch {
    return false;
  }
}
function hasValidTokenSync() {
  const idToken = localStorage.getItem('idToken');
  return parseJwtExpOk(idToken);
}

/* ----------------------- Reducer ----------------------- */
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
        ...(action.payload?.params || {}),
      };

    case 'SHOW_MODAL':
      return {
        ...state,
        activeModal: action.payload?.modalId ?? action.payload,
        ...action.payload?.params,
      };
    case 'HIDE_MODAL':
      return { ...state, activeModal: null };

    // NotificationManager state
    case 'SHOW_NOTIFICATION':
      return { ...state, notification: action.payload };
    case 'HIDE_NOTIFICATION':
      return { ...state, notification: null };

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

    // 🔒 global dirty flag
    case 'SET_REVIEW_DIRTY':
      return { ...state, reviewDirty: !!action.payload };

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

/* ----------------------- Provider ----------------------- */
export const AppProvider = ({ children }) => {
  const [appState, dispatch] = useReducer(reducer, initialState);

  /* ---- Optional per-screen guard API (still available) ---- */
  const navGuardRef = useRef(null);
  const setNavigationGuard = (fnOrNull) => {
    navGuardRef.current = typeof fnOrNull === 'function' ? fnOrNull : null;
  };
  const clearNavigationGuard = () => {
    navGuardRef.current = null;
  };

  // 🔒 Helper: If user is on AI review and it's dirty, show confirm before any nav
  const maybeBlockLeavingAIReview = (proceed) => {
    if (appState.activeScreen === 'ai-scan-review-extracted' && appState.reviewDirty) {
      dispatch({
        type: 'SHOW_NOTIFICATION',
        payload: {
          type: 'confirm',
          title: 'Discard changes?',
          message: 'You have unsaved edits. If you leave now, your changes will be lost.',
          confirmText: 'Discard',
          cancelText: 'Stay',
          onConfirm: () => {
            dispatch({ type: 'SET_REVIEW_DIRTY', payload: false });
            // clear any per-screen guard if set
            navGuardRef.current = null;
            proceed();
          },
        },
      });
      return true; // handled (blocked for now)
    }
    return false; // not blocked
  };

  /* ----------------------- Navigation ----------------------- */
  const navigateTo = (screen, params = {}, options = {}) => {
    if (PROTECTED_SCREENS.has(screen) && !hasValidTokenSync()) {
      dispatch({ type: 'NAVIGATE', payload: { screen: 'auth-screen' } });
      localStorage.removeItem('activeScreen');
      return;
    }

    const proceed = () => {
      dispatch({ type: 'NAVIGATE', payload: { screen, params, options } });

      if (screen && !PUBLIC_SCREENS.has(screen)) {
        localStorage.setItem('activeScreen', screen);
      } else {
        localStorage.removeItem('activeScreen');
      }
    };

    // 🔒 Global AI Review dirty check FIRST (highest priority)
    if (maybeBlockLeavingAIReview(proceed)) return;

    // Per-screen guard (optional, keeps working)
    if (navGuardRef.current) {
      const handled = navGuardRef.current(proceed, { type: 'navigateTo', screen, params });
      if (handled === false || handled === true) return;
    }

    proceed();
  };

  const goBack = () => {
    const proceed = () => window.history.back();

    // 🔒 Global AI Review dirty check FIRST
    if (maybeBlockLeavingAIReview(proceed)) return;

    if (navGuardRef.current) {
      const handled = navGuardRef.current(proceed, { type: 'goBack' });
      if (handled === false || handled === true) return;
    }
    proceed();
  };

  const showModal = (modalId, params) => {
    if (!modalId) return dispatch({ type: 'HIDE_MODAL' });
    dispatch({ type: 'SHOW_MODAL', payload: { modalId, params } });
  };

  // NotificationManager helpers
  const showNotification = (payload) => dispatch({ type: 'SHOW_NOTIFICATION', payload });
  const hideNotification = () => dispatch({ type: 'HIDE_NOTIFICATION' });

  // 🔒 Expose setter for the global dirty flag
  const setReviewDirty = (val) => dispatch({ type: 'SET_REVIEW_DIRTY', payload: !!val });

  /* ----------------------- Data fetch ----------------------- */
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
      if (receivedShares !== null)
        dispatch({ type: 'SET_RECEIVED_SHARES', payload: receivedShares });
      dispatch({ type: 'SET_SUBSCRIPTION', payload: subscription });
    } finally {
      dispatch({ type: 'SET_DETAILS_LOADING', payload: false });
    }
  };

  /* --------------------------- Boot --------------------------- */
  useEffect(() => {
    (async () => {
      const last = localStorage.getItem('activeScreen') || 'my-family-screen';
      const authed = hasValidTokenSync() || Boolean(await auth.getIdToken(false));

      if (!authed) {
        localStorage.removeItem('activeScreen');
        const initial = PUBLIC_SCREENS.has(last) ? last : 'auth-screen';
        dispatch({ type: 'NAVIGATE', payload: { screen: initial } });
        dispatch({ type: 'SET_LOADING_APP', payload: false });
        return;
      }

      dispatch({
        type: 'LOGIN',
        payload: {
          isLoggedIn: true,
          userEmail: localStorage.getItem('userEmail') || null,
          isPremium: false,
        },
      });

      dispatch({ type: 'NAVIGATE', payload: { screen: last || 'my-family-screen' } });
      await fetchDetailedData();
      dispatch({ type: 'SET_LOADING_APP', payload: false });
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Hard gate if token expires on a protected screen
  useEffect(() => {
    if (PROTECTED_SCREENS.has(appState.activeScreen) && !hasValidTokenSync()) {
      dispatch({ type: 'NAVIGATE', payload: { screen: 'auth-screen' } });
      localStorage.removeItem('activeScreen');
    }
  }, [appState.activeScreen]);

  /* ----------------------- Context value ----------------------- */
  const value = useMemo(
    () => ({
      appState,

      // navigation
      navigateTo,
      goBack,

      // modals
      showModal,

      // notifications
      showNotification,
      hideNotification,

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

      fetchDetailedData,
      currentUser: appState.currentUser,

      // per-screen guard API still available
      setNavigationGuard,
      clearNavigationGuard,

      // 🔒 global dirty flag setter
      setReviewDirty,
    }),
    [appState],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export default AppProvider;
