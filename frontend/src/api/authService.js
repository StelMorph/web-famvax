import {
  CognitoUserPool,
  CognitoUser,
  AuthenticationDetails,
  CognitoUserAttribute,
} from 'amazon-cognito-identity-js';
import { jwtDecode } from 'jwt-decode';
import api from './apiService';

const USER_POOL_ID = import.meta.env.VITE_COGNITO_USER_POOL_ID;
const CLIENT_ID = import.meta.env.VITE_COGNITO_CLIENT_ID;

const userPool = new CognitoUserPool({ UserPoolId: USER_POOL_ID, ClientId: CLIENT_ID });

let sessionRefreshTimer = null;
let onSessionExpired = () => {
  window.location.href = '/#auth-screen';
};
let inMemoryIdToken = null;

export function ensureDeviceId() {
  let id = localStorage.getItem('deviceId');
  if (!id) {
    id =
      (globalThis.crypto?.randomUUID && crypto.randomUUID()) ||
      `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    localStorage.setItem('deviceId', id);
  }
  return id;
}

function setPersistedToken(idToken, email) {
  inMemoryIdToken = idToken || null;
  if (idToken) localStorage.setItem('idToken', idToken);
  else localStorage.removeItem('idToken');
  if (email) localStorage.setItem('userEmail', email.toLowerCase());
}

function stopTimers() {
  if (sessionRefreshTimer) clearTimeout(sessionRefreshTimer);
  sessionRefreshTimer = null;
}

function startSessionManager(idToken) {
  stopTimers();
  inMemoryIdToken = idToken;
  try {
    const { exp } = jwtDecode(idToken);
    const refreshInMs = Math.max(0, exp * 1000 - Date.now() - 5 * 60 * 1000);
    sessionRefreshTimer = setTimeout(async () => {
      try {
        const fresh = await getIdToken(true);
        if (fresh) startSessionManager(fresh);
        else throw new Error('no fresh token');
      } catch {
        stopTimers();
        onSessionExpired();
      }
    }, refreshInMs);
  } catch {
    onSessionExpired();
  }
}

export function setSessionExpiredHandler(handler) {
  onSessionExpired = handler || onSessionExpired;
}

function getCurrentUser() {
  return userPool.getCurrentUser();
}

function parseUA(ua = navigator.userAgent || '') {
  const out = {
    deviceType: 'Desktop',
    browser: 'Unknown Browser',
    browserVersion: '',
    os: 'Unknown OS',
    osVersion: '',
    brand: '',
    model: '',
  };
  const l = ua.toLowerCase();

  if (/mobile|iphone|android.+mobile/.test(l)) out.deviceType = 'Mobile';
  else if (/ipad|tablet/.test(l)) out.deviceType = 'Tablet';

  const ver = (re) => ua.match(re)?.[1] || '';
  if (/edg\//.test(l)) {
    out.browser = 'Edge';
    out.browserVersion = ver(/edg\/([\d.]+)/i);
  } else if (/chrome\//.test(l) && !/edg\//.test(l)) {
    out.browser = 'Chrome';
    out.browserVersion = ver(/chrome\/([\d.]+)/i);
  } else if (/safari/.test(l) && !/chrome/.test(l)) {
    out.browser = 'Safari';
    out.browserVersion = ver(/version\/([\d.]+)/i);
  } else if (/firefox\//.test(l)) {
    out.browser = 'Firefox';
    out.browserVersion = ver(/firefox\/([\d.]+)/i);
  }

  if (/windows nt/.test(l)) {
    out.os = 'Windows';
    out.osVersion = ver(/windows nt ([\d.]+)/i);
  } else if (/mac os x/.test(l)) {
    out.os = 'macOS';
    out.osVersion = ver(/mac os x ([\d_]+)/i).replaceAll('_', '.');
  } else if (/android/.test(l)) {
    out.os = 'Android';
    out.osVersion = ver(/android ([\d.]+)/i);
  } else if (/iphone|ipad|ipod/.test(l)) {
    out.os = 'iOS';
    out.osVersion = ver(/os ([\d_]+)/i).replaceAll('_', '.');
  } else if (/linux/.test(l)) {
    out.os = 'Linux';
  }

  if (out.os === 'Android') {
    const m = ua.match(/\((?:[^;]*;){2}\s*([^;]+)\s+Build\//i);
    if (m) out.model = m[1].trim();
  }
  if (out.os === 'iOS') out.brand = 'Apple';

  return out;
}

function buildDevicePayload() {
  const deviceId = ensureDeviceId();
  const ua = parseUA();
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
  return {
    deviceId,
    device: {
      id: deviceId,
      type: ua.deviceType,
      browser: ua.browser,
      browserVersion: ua.browserVersion,
      os: ua.os,
      osVersion: ua.osVersion,
      brand: ua.brand,
      model: ua.model,
      userAgent: navigator.userAgent || '',
      screen: {
        width: window.screen?.width || null,
        height: window.screen?.height || null,
        pixelRatio: window.devicePixelRatio || 1,
      },
      locale: navigator.language || '',
      timeZone: tz,
      app: {
        name: 'web',
        version: import.meta.env.VITE_APP_VERSION || 'web',
      },
      lastSeen: new Date().toISOString(),
    },
  };
}

export async function getIdToken(forceRefresh = false) {
  const lsToken = localStorage.getItem('idToken');
  if (lsToken) {
    try {
      if (jwtDecode(lsToken).exp * 1000 > Date.now()) {
        inMemoryIdToken = lsToken;
        return lsToken;
      }
    } catch {}
  }
  return null;
}

export async function signIn(email, password) {
  const user = new CognitoUser({ Username: email, Pool: userPool });
  user.setAuthenticationFlowType('USER_PASSWORD_AUTH');
  const authDetails = new AuthenticationDetails({ Username: email, Password: password });

  const session = await new Promise((resolve, reject) => {
    user.authenticateUser(authDetails, { onSuccess: resolve, onFailure: reject });
  });

  const idToken = session.getIdToken().getJwtToken();
  setPersistedToken(idToken, email);
  api.setAuthToken(idToken);
  startSessionManager(idToken);

  try {
    const payload = buildDevicePayload();
    await api.completeLogin(payload);
    api.clearCache('GET:/devices');
  } catch (e) {
    console.warn('[auth] complete-login failed (continuing):', e);
  }

  window.__famvaxBootSetByEvent = true;
  window.dispatchEvent(new CustomEvent('device-ready'));

  return { success: true, session };
}

export async function refreshDeviceRegistration() {
  try {
    const token = await getIdToken(false);
    if (!token) return;

    const flag = localStorage.getItem('deviceMetaSentV2') === '1';
    if (!flag) {
      const payload = buildDevicePayload();
      await api.completeLogin(payload);
      localStorage.setItem('deviceMetaSentV2', '1');
    } else {
      await api.completeLogin();
    }
    api.clearCache('GET:/devices');
  } catch {}
}

export function signOut() {
  stopTimers();
  setPersistedToken(null);
  localStorage.removeItem('userEmail');
  const cu = getCurrentUser();
  if (cu) cu.signOut();
}

export async function signUp(email, password) {
  const attrs = [new CognitoUserAttribute({ Name: 'email', Value: email })];
  const validation = [{ Name: 'password', Value: password }];
  return new Promise((resolve, reject) => {
    userPool.signUp(email, password, attrs, validation, (err, result) => {
      if (err) return reject(err);
      resolve(result);
    });
  });
}

export default {
  signIn,
  signOut,
  signUp,
  getIdToken,
  ensureDeviceId,
  setSessionExpiredHandler,
  refreshDeviceRegistration,
};
