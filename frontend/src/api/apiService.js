// src/api/apiService.js
// Centralized API client: auth headers, request de-duplication, TTL cache.

const RAW_BASE = (import.meta.env.VITE_API_URL || '').trim();
const API_BASE = RAW_BASE.replace(/\/+$/, '');

/* ---------------- In-memory auth token ---------------- */
let inMemoryIdToken = null;
export function setAuthToken(token) {
  inMemoryIdToken = token || null;
}

/* ---------------- Device Id ---------------- */
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

/* ---------------- Helpers ---------------- */
export function clearCache(prefix = '') {
  for (const k of cache.keys()) {
    if (!prefix || k.startsWith(prefix)) cache.delete(k);
  }
}

function authHeaders(extra = {}) {
  const h = { ...(extra || {}) };
  if (inMemoryIdToken) h['Authorization'] = `Bearer ${inMemoryIdToken}`;
  const did = ensureDeviceId();
  if (did) h['X-Device-Id'] = did;
  return h;
}

async function fetchJson(url, options = {}) {
  const res = await fetch(url, options);
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    const err = new Error(`HTTP ${res.status} ${res.statusText} at ${url}`);
    err.status = res.status;
    err.body = text;
    throw err;
  }
  const ct = res.headers.get('content-type') || '';
  if (ct.includes('application/json')) return res.json();
  const txt = await res.text();
  if (!txt) return null;
  try {
    return JSON.parse(txt);
  } catch {
    return txt;
  }
}

/* ---------------- Inflight + TTL cache ---------------- */
const inflight = new Map(); // key -> Promise
const cache = new Map(); // key -> { value, expiresAt }

function cachedGet(key, fetcher, { ttlMs = 60_000, force = false } = {}) {
  const now = Date.now();
  if (!force) {
    const hit = cache.get(key);
    if (hit && hit.expiresAt > now) return Promise.resolve(hit.value);
    const infl = inflight.get(key);
    if (infl) return infl;
  } else {
    cache.delete(key);
  }
  const p = (async () => {
    const v = await fetcher();
    cache.set(key, { value: v, expiresAt: now + ttlMs });
    return v;
  })().finally(() => inflight.delete(key));
  inflight.set(key, p);
  return p;
}

/* =================================================================
 *                             AUTH / LOGIN
 * ================================================================= */
export async function completeLogin(payload = undefined) {
  const deviceId = ensureDeviceId();
  const body = { deviceId };
  if (payload && typeof payload.kickPrevious !== 'undefined') {
    body.kickPrevious = !!payload.kickPrevious;
  }
  if (payload && payload.meta && typeof payload.meta === 'object') {
    body.meta = payload.meta;
  }
  if (!body.meta && payload && payload.device && typeof payload.device === 'object') {
    const d = payload.device;
    body.meta = {
      deviceType: d.type || d.deviceType || '',
      osName: d.os || d.osName || '',
      browserName: d.browser || d.browserName || '',
      locale: d.locale || '',
      timeZone: d.timeZone || '',
    };
  }
  const res = await fetchJson(`${API_BASE}/auth/complete-login`, {
    method: 'POST',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(body),
  });
  clearCache('');
  return res;
}

/* =================================================================
 *                           SUBSCRIPTION
 * ================================================================= */
export function getSubscription({ force = false, ttlMs = 60_000 } = {}) {
  const key = 'GET:/subscription';
  return cachedGet(key, () => fetchJson(`${API_BASE}/subscription`, { headers: authHeaders() }), {
    ttlMs,
    force,
  });
}

export function getSubscriptionHistory({ force = false, ttlMs = 60_000 } = {}) {
  const key = 'GET:/subscription/history';
  return cachedGet(
    key,
    () => fetchJson(`${API_BASE}/subscription/history`, { headers: authHeaders() }),
    { ttlMs, force },
  );
}

export async function createSubscription(payload) {
  const idempotencyKey =
    (globalThis.crypto?.randomUUID && crypto.randomUUID()) ||
    `${Date.now()}-${Math.random().toString(16).slice(2)}`;

  return fetchJson(`${API_BASE}/subscription`, {
    method: 'POST',
    headers: authHeaders({
      'Content-Type': 'application/json',
      'x-idempotency-key': idempotencyKey,
    }),
    body: JSON.stringify(payload),
  });
}

export async function updateSubscriptionStatus({ cancelAtPeriodEnd }) {
  return fetchJson(`${API_BASE}/subscription`, {
    method: 'PATCH',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ cancelAtPeriodEnd }),
  });
}

export async function cancelSubscription() {
  const res = await fetchJson(`${API_BASE}/subscription`, {
    method: 'DELETE',
    headers: authHeaders(),
  });
  clearCache('GET:/subscription');
  clearCache('GET:/subscription/history');
  return res;
}

/* =================================================================
 *                             SHARING
 * ================================================================= */
export function getShares(profileId, { force = false, ttlMs = 60_000 } = {}) {
  const pid = encodeURIComponent(profileId);
  const key = `GET:/profiles/${pid}/shares`;
  return cachedGet(
    key,
    async () => {
      try {
        return await fetchJson(`${API_BASE}/profiles/${pid}/shares`, { headers: authHeaders() });
      } catch {
        return [];
      }
    },
    { ttlMs, force },
  );
}

export async function upsertShare(profileId, { targetEmail, role }) {
  const pid = encodeURIComponent(profileId);
  const res = await fetchJson(`${API_BASE}/profiles/${pid}/share`, {
    method: 'POST',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ inviteeEmail: targetEmail, role }),
  });
  clearCache(`GET:/profiles/${pid}/shares`);
  return res;
}

export async function revokeShare(shareId) {
  const sid = encodeURIComponent(shareId);
  const res = await fetchJson(`${API_BASE}/shares/${sid}`, {
    method: 'DELETE',
    headers: authHeaders(),
  });
  clearCache('GET:/shares/received');
  return res;
}

export async function respondToShare(shareId, { accept = true } = {}) {
  const sid = encodeURIComponent(shareId);
  const res = await fetchJson(`${API_BASE}/shares/${sid}/accept`, {
    method: 'PUT',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ accept }),
  });
  clearCache('GET:/shares/received');
  clearCache('GET:/profiles');
  return res;
}

export function getReceivedShares({ force = false, ttlMs = 60_000 } = {}) {
  const key = 'GET:/shares/received';
  return cachedGet(
    key,
    () => fetchJson(`${API_BASE}/shares/received`, { headers: authHeaders() }),
    { ttlMs, force },
  );
}

/* =================================================================
 *                           OVERVIEW / PROFILES
 * ================================================================= */
export function getOverview({ force = false, ttlMs = 60_000 } = {}) {
  const key = 'GET:/me/overview';
  return cachedGet(key, () => fetchJson(`${API_BASE}/me/overview`, { headers: authHeaders() }), {
    ttlMs,
    force,
  });
}

export function getProfiles({ force = false, ttlMs = 60_000 } = {}) {
  const key = 'GET:/profiles';
  return cachedGet(key, () => fetchJson(`${API_BASE}/profiles`, { headers: authHeaders() }), {
    ttlMs,
    force,
  });
}

export function getOwnedProfiles(opts) {
  return getProfiles(opts);
}

export function getSharedProfileDetails(profileId, { force = false, ttlMs = 60_000 } = {}) {
  const pid = encodeURIComponent(profileId);
  const key = `GET:/profiles/${pid}`;
  return cachedGet(
    key,
    () => fetchJson(`${API_BASE}/profiles/${pid}`, { headers: authHeaders() }),
    { ttlMs, force },
  );
}

export function getProfileVaccines(profileId, { force = false, ttlMs = 60_000 } = {}) {
  const pid = encodeURIComponent(profileId);
  const key = `GET:/profiles/${pid}/vaccines`;
  return cachedGet(
    key,
    () => fetchJson(`${API_BASE}/profiles/${pid}/vaccines`, { headers: authHeaders() }),
    { ttlMs, force },
  );
}

export async function createProfile(data) {
  return fetchJson(`${API_BASE}/profiles`, {
    method: 'POST',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(data),
  });
}

export async function updateProfile(profileId, data) {
  const pid = encodeURIComponent(profileId);
  return fetchJson(`${API_BASE}/profiles/${pid}`, {
    method: 'PUT',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(data),
  });
}

export async function deleteProfile(profileId) {
  const pid = encodeURIComponent(profileId);
  const res = await fetchJson(`${API_BASE}/profiles/${pid}`, {
    method: 'DELETE',
    headers: authHeaders(),
  });
  clearCache('GET:/profiles');
  return res;
}

export const deleteProfileCascade = deleteProfile;

/* =================================================================
 *                       VACCINES (create/update/delete/restore)
 * ================================================================= */
export async function createVaccine(profileId, data) {
  const pid = encodeURIComponent(profileId);
  const res = await fetchJson(`${API_BASE}/profiles/${pid}/vaccines`, {
    method: 'POST',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(data),
  });
  clearCache(`GET:/profiles/${pid}/vaccines`);
  return res;
}

export async function updateVaccine(profileId, vaccineId, data) {
  const pid = encodeURIComponent(profileId);
  const vid = encodeURIComponent(vaccineId);
  const res = await fetchJson(`${API_BASE}/profiles/${pid}/vaccines/${vid}`, {
    method: 'PUT',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(data),
  });
  clearCache(`GET:/profiles/${pid}/vaccines`);
  return res;
}

export async function deleteVaccine(profileId, vaccineId) {
  const pid = encodeURIComponent(profileId);
  const vid = encodeURIComponent(vaccineId);
  const res = await fetchJson(`${API_BASE}/profiles/${pid}/vaccines/${vid}`, {
    method: 'DELETE',
    headers: authHeaders(),
  });
  clearCache(`GET:/profiles/${pid}/vaccines`);
  return res; // { vaccineId, undoToken, undoExpiresAt }
}

export async function restoreVaccine(profileId, vaccineId, undoToken) {
  const pid = encodeURIComponent(profileId);
  const vid = encodeURIComponent(vaccineId);
  const res = await fetchJson(`${API_BASE}/profiles/${pid}/vaccines/${vid}/restore`, {
    method: 'POST',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ undoToken }),
  });
  clearCache(`GET:/profiles/${pid}/vaccines`);
  return res;
}

/* =================================================================
 *                               DEVICES
 * ================================================================= */
export function listDevices({ force = false, ttlMs = 60_000 } = {}) {
  const key = 'GET:/devices';
  return cachedGet(key, () => fetchJson(`${API_BASE}/devices`, { headers: authHeaders() }), {
    ttlMs,
    force,
  });
}

export async function removeDevice(deviceId) {
  const res = await fetchJson(`${API_BASE}/devices/${encodeURIComponent(deviceId)}`, {
    method: 'DELETE',
    headers: authHeaders(),
  });
  clearCache('GET:/devices');
  return res;
}

/* =================================================================
 *                   VACCINE single-record sharing (NEW)
 * ================================================================= */
export async function createVaccineShare(profileId, vaccineId, days = 7) {
  const pid = encodeURIComponent(profileId);
  const vid = encodeURIComponent(vaccineId);
  return fetchJson(`${API_BASE}/profiles/${pid}/vaccines/${vid}/share`, {
    method: 'POST',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ days }),
  });
}

/** Revoke a vaccine share link by token. */
export async function revokeVaccineShare(token) {
  const t = encodeURIComponent(token);
  return fetchJson(`${API_BASE}/vaccine-share/${t}`, {
    method: 'DELETE',
    headers: authHeaders(),
  });
}

/* =================================================================
 *                              AUDIT
 * ================================================================= */
export function getProfileAuditLog(profileId, { force = false, ttlMs = 60_000 } = {}) {
  const pid = encodeURIComponent(profileId);
  const key = `GET:/profiles/${pid}/audit-log`;
  return cachedGet(
    key,
    () => fetchJson(`${API_BASE}/profiles/${pid}/audit-log`, { headers: authHeaders() }),
    { ttlMs, force },
  );
}

/* =================================================================
 *                       NEW: OCR / DOCUMENT SCANNING
 * ================================================================= */
/**
 * Asks the backend for a secure, one-time URL to upload a file to.
 * @param {string} contentType The MIME type of the file to be uploaded (e.g., 'image/jpeg').
 * @returns {Promise<{url: string, key: string}>} The presigned URL and the S3 object key.
 */
export async function getUploadUrl(contentType) {
  return fetchJson(`${API_BASE}/ocr/get-upload-url`, {
    method: 'POST',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ contentType }),
  });
}

/**
 * Tells the backend to process a file that has been uploaded to S3.
 * @param {string} key The S3 object key returned from getUploadUrl.
 * @returns {Promise<{extractedData: object}>} The key-value pairs extracted by Textract.
 */
export async function scanDocument(key) {
  return fetchJson(`${API_BASE}/ocr/scan-document`, {
    method: 'POST',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ key }),
  });
}
/* =================================================================
 *                           Default export
 * ================================================================= */
const api = {
  setAuthToken,
  ensureDeviceId,
  clearCache,

  completeLogin,

  // Subscription
  getSubscription,
  getSubscriptionHistory,
  createSubscription,
  updateSubscriptionStatus,
  cancelSubscription,

  // Sharing
  getShares,
  upsertShare,
  revokeShare,
  respondToShare,
  getReceivedShares,

  // Profiles
  getProfiles,
  getOwnedProfiles,
  getSharedProfileDetails,
  getProfileVaccines,
  createProfile,
  updateProfile,
  deleteProfile,
  deleteProfileCascade,

  // Vaccines
  createVaccine,
  updateVaccine,
  deleteVaccine,
  restoreVaccine,

  // Devices
  listDevices,
  removeDevice,

  // Vaccine record sharing (NEW)
  createVaccineShare,
  revokeVaccineShare,

  // Audit
  getProfileAuditLog,

  // OCR / Document Scanning (NEW)
  getUploadUrl,
  scanDocument,
};

export default api;
