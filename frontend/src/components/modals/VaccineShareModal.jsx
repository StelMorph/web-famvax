// src/components/modals/VaccineShareModal.jsx
import React, { useMemo, useState, useContext, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faTimes,
  faSpinner,
  faCopy,
  faTrashAlt,
  faLink,
  faExternalLinkAlt,
} from '@fortawesome/free-solid-svg-icons';
import { AppContext } from '../../contexts/AppContext.js';
import api from '../../api/apiService.js';

const DEFAULT_DAYS = 7;
const LS_KEY = (vaccineId) => `famvax_vshare_${vaccineId}`;

// Build the public viewer URL and *always* include the `api=` parameter.
function buildViewerUrl({ token, viewBase, publicApiBase }) {
  const base = (viewBase || window.location.origin).replace(/\/+$/, '');
  const apiBase = (publicApiBase || '').replace(/\/+$/, '');
  const url = new URL(`${base}/public/vaccine.html`);
  url.searchParams.set('token', token);
  url.searchParams.set(
    'api',
    apiBase || (import.meta?.env?.VITE_API_URL || window.location.origin).replace(/\/+$/, ''),
  );
  return url.toString();
}

export default function VaccineShareModal({ profileId, vaccine, onClose }) {
  const { showNotification } = useContext(AppContext);

  const vaccineId = vaccine?.vaccineId || vaccine?.id;
  const vaccineTitle = vaccine?.vaccineName || vaccine?.name || 'Vaccine';

  const [days, setDays] = useState(DEFAULT_DAYS);
  const [busy, setBusy] = useState(false);
  const [revoking, setRevoking] = useState(false);
  const [link, setLink] = useState(null); // { token, publicPath, pdfPath, expiresAt }
  const [err, setErr] = useState('');

  // Prefer explicit public API; otherwise try runtime globals; last resort = auth base (dev fallback).
  const publicApiBase = useMemo(() => {
    return (
      (import.meta?.env && import.meta.env.VITE_PUBLIC_API_URL) ||
      (typeof window !== 'undefined' && window.FAMVAX_PUBLIC_API_URL) ||
      (typeof window !== 'undefined' && window.localStorage?.getItem('PUBLIC_API_URL')) ||
      (import.meta?.env && import.meta.env.VITE_API_URL) ||
      ''
    );
  }, []);

  // Viewer base (where vaccine.html lives)
  const publicViewBase = useMemo(() => {
    return (
      (import.meta?.env && import.meta.env.VITE_PUBLIC_VIEW_BASE_URL) || window.location.origin
    );
  }, []);

  const viewerUrl = link?.token
    ? buildViewerUrl({ token: link.token, viewBase: publicViewBase, publicApiBase })
    : '';

  // Restore saved token if it hasn't expired yet so it persists across refreshes.
  useEffect(() => {
    if (!vaccineId) return;
    try {
      const raw = localStorage.getItem(LS_KEY(vaccineId));
      if (!raw) return;
      const saved = JSON.parse(raw);
      if (!saved?.token || !saved?.expiresAt) return;
      const now = Math.floor(Date.now() / 1000);
      if (saved.expiresAt > now) setLink(saved);
      else localStorage.removeItem(LS_KEY(vaccineId));
    } catch {
      /* ignore */
    }
  }, [vaccineId]);

  const handleCreate = async () => {
    if (!profileId || !vaccineId) return;
    setBusy(true);
    setErr('');
    try {
      const data = await api.createVaccineShare(profileId, vaccineId, days); // { token, publicPath, pdfPath, expiresAt }
      setLink(data);
      try {
        localStorage.setItem(LS_KEY(vaccineId), JSON.stringify(data));
      } catch {}
      showNotification({ type: 'success', message: 'Share link created.' });
    } catch (e) {
      const msg = e?.body || e?.message || 'Failed to create share link.';
      setErr(msg);
      showNotification({ type: 'error', title: 'Error', message: msg });
    } finally {
      setBusy(false);
    }
  };

  const handleRevoke = async () => {
    if (!link?.token) return;
    setRevoking(true);
    setErr('');
    try {
      await api.revokeVaccineShare(link.token);
      setLink(null);
      try {
        localStorage.removeItem(LS_KEY(vaccineId));
      } catch {}
      showNotification({ type: 'success', message: 'Link revoked.' });
    } catch (e) {
      const msg = e?.body || e?.message || 'Failed to revoke link.';
      setErr(msg);
      showNotification({ type: 'error', title: 'Error', message: msg });
    } finally {
      setRevoking(false);
    }
  };

  const copy = async (text) => {
    try {
      await navigator.clipboard.writeText(text || '');
      showNotification({ type: 'success', message: 'Copied!' });
    } catch {
      showNotification({
        type: 'warning',
        message: 'Copy failed — select and copy manually.',
      });
    }
  };

  // Simple layout helpers
  const row = { display: 'flex', alignItems: 'center', gap: 12, marginTop: 10 };
  const col = { display: 'flex', flexDirection: 'column', gap: 10 };
  const inputRow = { display: 'flex', gap: 10, alignItems: 'center' };

  return (
    <div className="modal-content modal-flex-col" style={{ maxWidth: 560 }}>
      {/* Header */}
      <div className="modal-header">
        <h2>Share “{vaccineTitle}”</h2>
        <button onClick={onClose} className="btn-icon modal-close" title="Close">
          <FontAwesomeIcon icon={faTimes} />
        </button>
      </div>

      {/* Body */}
      <div className="modal-body-scrollable" style={{ ...col }}>
        {/* Expiry row */}
        <div style={row}>
          <label style={{ minWidth: 76 }}>Expires in</label>
          <select
            className="form-input"
            value={days}
            onChange={(e) => setDays(parseInt(e.target.value, 10))}
            style={{ maxWidth: 160 }}
          >
            <option value={1}>24 hours</option>
            <option value={3}>3 days</option>
            <option value={7}>7 days</option>
          </select>
          <div style={{ flex: 1 }} />
          <button className="btn btn-primary" onClick={handleCreate} disabled={busy}>
            {busy ? <FontAwesomeIcon icon={faSpinner} spin /> : 'Create / Refresh'}
          </button>
        </div>

        <p className="help-text" style={{ marginTop: 4 }}>
          One link only. The viewer page shows <b>this record</b> and has a <b>Download PDF</b>{' '}
          button. The link auto-expires.
        </p>

        {/* Link section */}
        <fieldset
          style={{ marginTop: 8, borderTop: '1px solid var(--border-muted)', paddingTop: 12 }}
        >
          <legend>Shareable Link</legend>

          {!link ? (
            <p className="help-text" style={{ padding: 0 }}>
              Create a link above to get a URL.
            </p>
          ) : (
            <>
              <div style={inputRow}>
                <input className="form-input" readOnly value={viewerUrl} />
                <button className="btn btn-outline" onClick={() => copy(viewerUrl)} title="Copy">
                  <FontAwesomeIcon icon={faCopy} />
                  &nbsp;Copy
                </button>
                <a
                  className="btn btn-outline"
                  href={viewerUrl}
                  target="_blank"
                  rel="noreferrer"
                  title="Open"
                >
                  <FontAwesomeIcon icon={faExternalLinkAlt} />
                  &nbsp;Open
                </a>
              </div>

              <p className="help-text" style={{ marginTop: 8 }}>
                Expires at:&nbsp;
                {link.expiresAt ? new Date(link.expiresAt * 1000).toLocaleString() : 'unknown'}
              </p>

              <div style={{ ...row, marginTop: 2 }}>
                <button
                  className="btn btn-danger"
                  onClick={handleRevoke}
                  disabled={revoking}
                  title="Revoke link"
                >
                  {revoking ? (
                    <FontAwesomeIcon icon={faSpinner} spin />
                  ) : (
                    <>
                      <FontAwesomeIcon icon={faTrashAlt} /> Revoke
                    </>
                  )}
                </button>
                <div style={{ flex: 1 }} />
                <a className="btn btn-outline" href={viewerUrl} target="_blank" rel="noreferrer">
                  <FontAwesomeIcon icon={faLink} />
                  &nbsp;Open Viewer
                </a>
              </div>
            </>
          )}
        </fieldset>

        {err && (
          <div className="form-error" style={{ marginTop: 8 }}>
            {err}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="modal-footer">
        <div className="spacer" />
        <button className="btn btn-outline" onClick={onClose}>
          Close
        </button>
      </div>
    </div>
  );
}
