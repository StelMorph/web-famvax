// src/pages/Settings/ManageDevicesScreen.jsx
import React, { useContext, useEffect, useMemo, useState } from 'react';
import { AppContext } from '../../contexts/AppContext.js';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faArrowLeft,
  faSpinner,
  faMobileScreenButton,
  faTabletScreenButton,
  faLaptop,
  faTrashCan,
} from '@fortawesome/free-solid-svg-icons';
import api from '../../api/apiService.js';
import auth from '../../api/authService.js';
import '../../styles/pages/ManageDevices.css';

const formatDate = (dateString) => {
  if (!dateString) return 'N/A';
  try {
    return new Date(dateString).toLocaleString(undefined, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return String(dateString);
  }
};

const titleCase = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : 'Unknown');

const iconForType = (deviceType) => {
  switch (deviceType) {
    case 'desktop':
      return faLaptop;
    case 'tablet':
      return faTabletScreenButton;
    default: // mobile or unknown
      return faMobileScreenButton;
  }
};

// pick the available revoke fn from apiService
const getRevokeFn = () => {
  if (typeof api.removeDevice === 'function') return api.removeDevice;
  if (typeof api.revokeDevice === 'function') return api.revokeDevice;
  return null;
};

export default function ManageDevicesScreen() {
  const { goBack, showNotification, navigateTo, devices, setDevices } = useContext(AppContext);
  const [busyId, setBusyId] = useState(null);

  const currentDeviceId =
    (typeof window !== 'undefined' &&
      (localStorage.getItem('deviceId') || localStorage.getItem('currentDeviceId'))) ||
    null;

  // If devices haven't been pre-fetched (deep link), fetch ONLY devices.
  useEffect(() => {
    let alive = true;
    const ensureDevices = async () => {
      if (devices !== null) return;
      try {
        const list = await api.listDevices();
        if (alive) setDevices(list || []);
      } catch (err) {
        if (alive) {
          showNotification?.({ type: 'error', title: 'Error', message: 'Failed to load devices.' });
          setDevices([]); // avoid infinite spinner
        }
      }
    };
    ensureDevices();
    return () => {
      alive = false;
    };
  }, [devices, setDevices, showNotification]);

  const items = useMemo(() => (Array.isArray(devices) ? devices : []), [devices]);

  const sortedDevices = useMemo(
    () =>
      [...items].sort(
        (a, b) => new Date(b?.lastSeen || 0).getTime() - new Date(a?.lastSeen || 0).getTime(),
      ),
    [items],
  );

  const revoke = async (rawId) => {
    const revokeFn = getRevokeFn();
    if (!revokeFn) {
      showNotification?.({
        type: 'error',
        title: 'Not Implemented',
        message: 'No revoke/remove device API found in apiService.',
      });
      return;
    }
    await revokeFn(rawId);
  };

  const handleRevoke = (device) => {
    const deviceId = device?.deviceId ?? device?.id;
    if (!deviceId) {
      showNotification?.({ type: 'error', title: 'Error', message: 'Unknown device id.' });
      return;
    }

    const isCurrent = String(deviceId) === String(currentDeviceId);

    showNotification?.({
      type: 'confirm-destructive',
      title: isCurrent ? 'Sign out on this device?' : 'Revoke device access?',
      message: isCurrent
        ? 'This will sign you out here. You will need to log in again.'
        : 'This will sign that device out of your account.',
      confirmText: isCurrent ? 'Sign out' : 'Revoke',
      onConfirm: async () => {
        if (busyId) return;
        setBusyId(deviceId);
        try {
          // Revoke on backend
          await revoke(deviceId);

          if (isCurrent) {
            showNotification?.({ type: 'success', message: 'Signed out.' });
            // sign out locally after a short delay so the toast is visible
            setTimeout(() => {
              auth.signOut();
              navigateTo('auth-screen');
            }, 400);
          } else {
            showNotification?.({ type: 'success', message: 'Device revoked.' });
            // Refresh ONLY devices (single fetch)
            const updatedDevices = await api.listDevices();
            setDevices(updatedDevices || []);
          }
        } catch (err) {
          console.error(err);
          showNotification?.({
            type: 'error',
            title: 'Error',
            message: err?.message || 'Failed to revoke device.',
          });
        } finally {
          setBusyId(null);
        }
      },
    });
  };

  return (
    <div className="screen active devices-page">
      <nav className="simple-nav">
        <button className="btn-icon back-button" onClick={goBack} aria-label="Back">
          <FontAwesomeIcon icon={faArrowLeft} />
        </button>
        <h2>Manage Devices</h2>
      </nav>

      <div className="content-wrapper content-wrapper--wide">
        <div className="device-list">
          {devices === null ? (
            <div className="devices-loading">
              <FontAwesomeIcon icon={faSpinner} spin size="2x" />
            </div>
          ) : sortedDevices.length > 0 ? (
            sortedDevices.map((d) => {
              const browserInfo = `${d.dev_browserName || 'Unknown Browser'}`.trim();
              const osInfo = `${d.dev_osName || 'Unknown OS'}`.trim();
              const deviceTypeDisplay = titleCase(d.dev_type || 'desktop');
              const locationInfo = `${d.dev_city || d.dev_country || ''}`.trim();
              const deviceId = d.deviceId ?? d.id;
              const isCurrent = String(deviceId) === String(currentDeviceId);

              return (
                <div className="device-card" key={deviceId}>
                  <FontAwesomeIcon icon={iconForType(d.dev_type)} className="device-icon" />
                  <div className="device-info">
                    <div className="device-name">
                      <strong>{browserInfo}</strong>
                      {isCurrent && <span className="current-device-tag">Current Device</span>}
                    </div>
                    <div className="device-meta">
                      <span className="meta-chip">{deviceTypeDisplay}</span>
                      {osInfo !== 'Unknown' && (
                        <>
                          <span className="meta-sep">•</span>
                          <span className="meta-chip">{osInfo}</span>
                        </>
                      )}
                      {locationInfo && (
                        <>
                          <span className="meta-sep">•</span>
                          <span className="meta-chip">{locationInfo}</span>
                        </>
                      )}
                    </div>
                    <div className="last-seen">Last seen: {formatDate(d.lastSeen)}</div>
                  </div>

                  <div className="device-actions">
                    <button
                      className="btn btn-danger btn-with-icon"
                      onClick={() => handleRevoke(d)}
                      disabled={busyId === deviceId}
                    >
                      <FontAwesomeIcon icon={faTrashCan} className="icon-left" />
                      {isCurrent ? 'Sign out' : 'Revoke'}
                    </button>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="empty-state-card">No active device sessions found.</div>
          )}
        </div>
      </div>
    </div>
  );
}
