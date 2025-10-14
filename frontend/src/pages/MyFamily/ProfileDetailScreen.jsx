// src/components/screens/ProfileDetailScreen.jsx

import React, { useContext, useMemo, useState, useEffect, useRef } from 'react';
import { AppContext } from '../../contexts/AppContext.js';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faSyringe,
  faArrowLeft,
  faUser,
  faPencil,
  faShareNodes,
  faTrashCan,
  faCheckCircle,
  faClock,
  faChevronRight,
  faSpinner,
  faPlus,
  faInfoCircle,
  faTriangleExclamation,
  faChevronDown,
  faCheck,
  faRightFromBracket,
  faHistory,
  faUserPlus,
  faUserMinus,
  faPen,
  faTimes,
} from '@fortawesome/free-solid-svg-icons';
import api from '../../api/apiService.js';

// ========================================================================
//  Helper Functions
// ========================================================================

const Sort = {
  UPCOMING: 'upcoming',
  COMPLETED: 'completed',
  DATE_NEW: 'date-newest',
  DATE_OLD: 'date-oldest',
};

const normalizeSortToken = (s) => {
  const map = {
    'date-desc': Sort.DATE_NEW,
    'date-asc': Sort.DATE_OLD,
    'upcoming-soonest': Sort.UPCOMING,
    'completed-recent': Sort.COMPLETED,
    'name-asc': Sort.DATE_NEW,
    'name-desc': Sort.DATE_NEW,
  };
  return map[s] || s || Sort.DATE_NEW;
};

const readParams = () => {
  const p = new URLSearchParams(window.location.search);
  return { q: p.get('vaccine') ?? '', sort: normalizeSortToken(p.get('sort')) };
};

const writeParams = ({ q, sort }) => {
  const p = new URLSearchParams(window.location.search);

  if (q) {
    p.set('vaccine', q);
  } else {
    p.delete('vaccine');
  }

  if (sort) {
    p.set('sort', sort);
  } else {
    p.delete('sort');
  }

  const qs = p.toString();
  window.history.replaceState({}, '', `${window.location.pathname}${qs ? `?${qs}` : ''}`);
};

const normalize = (s) => (s || '').toString().toLowerCase().trim();
const startOfToday = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
};
const timeOrNaN = (d) => {
  if (!d) return Number.NaN;
  const t = d instanceof Date ? d.getTime() : new Date(d).getTime();
  return Number.isFinite(t) ? t : Number.NaN;
};
const cmpNum = (a, b, dir = 1) => {
  const aN = Number.isNaN(a),
    bN = Number.isNaN(b);
  if (aN && bN) return 0;
  if (aN) return 1;
  if (bN) return -1;
  return dir * (a - b);
};

// ========================================================================
//  Child Components
// ========================================================================

/** Renders a single, formatted log entry for the ActivityLogModal. */
function LogEntry({ log, currentUserId }) {
  const ICONS = {
    UPDATE_PROFILE: faPen,
    CREATE_VACCINE: faSyringe,
    UPDATE_VACCINE: faPen,
    DELETE_VACCINE: faTrashCan,
    CREATE_SHARE: faUserPlus,
    UPDATE_SHARE: faUserPlus,
    DELETE_SHARE: faUserMinus,
    DEFAULT: faPen,
  };

  const getSummaryText = () => {
    const actor =
      log.userId === currentUserId
        ? 'You'
        : `<strong>${log.details?.actorEmail || 'A user'}</strong>`;
    switch (log.action) {
      case 'CREATE_VACCINE':
        return `${actor} added the record for <strong>${log.details?.vaccineName || 'a vaccine'}</strong>.`;
      case 'UPDATE_VACCINE':
        return `${actor} updated the record for <strong>${log.details?.vaccineName || 'a vaccine'}</strong>.`;
      case 'DELETE_VACCINE':
        return `${actor} deleted the record for <strong>${log.details?.vaccineName || 'a vaccine'}</strong>.`;
      case 'CREATE_SHARE':
        return `${actor} shared this profile with <strong>${log.details?.inviteeEmail || 'a user'}</strong>.`;
      case 'UPDATE_SHARE':
        return `${actor} updated the role for <strong>${log.details?.inviteeEmail || 'a user'}</strong> to ${log.details?.newRole}.`;
      case 'DELETE_SHARE':
        return `${actor} removed sharing access for <strong>${log.details?.inviteeEmail || 'a user'}</strong>.`;
      default:
        return `${actor} ${log.action.replace(/_/g, ' ').toLowerCase()}.`;
    }
  };

  return (
    <div className="activity-log-item">
      <div className="log-icon-wrapper">
        <div className="icon-circle info">
          <FontAwesomeIcon icon={ICONS[log.action] || ICONS.DEFAULT} className="modal-icon" />
        </div>
      </div>
      <div className="log-details">
        <p className="log-summary" dangerouslySetInnerHTML={{ __html: getSummaryText() }}></p>
      </div>
      <span className="log-timestamp">
        {new Date(log.ts).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
      </span>
    </div>
  );
}

/** A modal that displays a profile's full activity history. */
function ActivityLogModal({ isOpen, onClose, profileId, profileName }) {
  const { appState } = useContext(AppContext);
  const [logs, setLogs] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen && profileId) {
      setIsLoading(true);
      api
        .getProfileAuditLog(profileId, { force: true })
        .then((data) => setLogs(data || []))
        .catch((err) => console.error('Failed to fetch audit log:', err))
        .finally(() => setIsLoading(false));
    }
  }, [isOpen, profileId]);

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content"
        style={{ maxWidth: '550px' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <h3>Activity for {profileName}</h3>
          <button className="btn-icon modal-close" onClick={onClose}>
            <FontAwesomeIcon icon={faTimes} />
          </button>
        </div>
        <div
          className="modal-body modal-body-scrollable"
          style={{ minHeight: '300px', maxHeight: '60vh', padding: '0 16px' }}
        >
          {isLoading ? (
            <div className="centered-content">
              <FontAwesomeIcon icon={faSpinner} spin size="2x" />
            </div>
          ) : logs.length === 0 ? (
            <div className="centered-content">
              <p>No changes have been recorded yet.</p>
            </div>
          ) : (
            <div className="activity-log-list">
              {logs.map((log) => (
                <LogEntry
                  key={`${log.ts}-${log.resource || log.resourceId}`}
                  log={log}
                  currentUserId={appState.user?.userId}
                />
              ))}
            </div>
          )}
        </div>
        <div className="modal-footer">
          <button className="btn btn-outline" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Renders a simple label-value pair for the profile details grid.
 * Refactored for readability.
 */
function InfoItem({ label, value }) {
  return (
    <div className="info-item-grid">
      <span className="info-label">{label}</span>
      <span className="info-value">{value || 'N/A'}</span>
    </div>
  );
}

/**
 * Renders a single vaccine record in the list.
 * Refactored for readability with clearer logic.
 */
function VaccineListItem({ vaccine, type, onClick }) {
  const isCompleted = type === 'completed';

  const icon = isCompleted ? faCheckCircle : faClock;
  const iconClassName = isCompleted ? 'completed-icon' : 'upcoming-icon';
  const iconStyle = isCompleted ? undefined : { color: '#F59E0B' };

  let dateText;
  if (isCompleted) {
    dateText = vaccine.date ? `Administered: ${vaccine.date}` : 'Administered';
  } else {
    dateText = vaccine.nextDueDate
      ? `Due: ${vaccine.nextDueDate}`
      : vaccine.date
        ? `Due: ${vaccine.date}`
        : 'Coming';
  }

  return (
    <div className="vaccine-item editable" onClick={onClick}>
      <FontAwesomeIcon icon={icon} className={iconClassName} style={iconStyle} />
      <div className="vaccine-details">
        <span className="vaccine-name">{vaccine.vaccineName}</span>
        <span className="vaccine-date">{dateText}</span>
      </div>
      <FontAwesomeIcon icon={faChevronRight} className="edit-indicator" />
    </div>
  );
}

/** A modal to confirm the permanent deletion of a profile. */
function ConfirmDeleteModal({ open, profileName, onCancel, onConfirm }) {
  const [typed, setTyped] = useState('');
  useEffect(() => {
    if (open) {
      setTyped('');
    }
  }, [open]);

  if (!open) {
    return null;
  }

  const canDelete = typed === profileName;

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true">
      <div className="notification-modal modern error">
        <div className="icon-circle">
          <FontAwesomeIcon className="modal-icon" icon={faTriangleExclamation} />
        </div>
        <div className="modal-title">Delete this member?</div>
        <div className="modal-message">
          This will permanently delete <strong>{profileName}</strong> and all vaccination records.
          This cannot be undone.
        </div>
        <div className="confirm-input-block">
          <label className="confirm-input-label">Type the member's name to confirm</label>
          <input
            className="form-input"
            placeholder={profileName}
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
          />
          <div className="confirm-hint">
            Must exactly match: <strong>{profileName}</strong>
          </div>
        </div>
        <div className="modal-buttons">
          <button className="btn btn-cancel" onClick={onCancel}>
            Cancel
          </button>
          <button className="btn btn-destructive" disabled={!canDelete} onClick={onConfirm}>
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

/** A custom dropdown component for sorting vaccine records. */
function SortDropdown({ value, onChange }) {
  const SORT_OPTIONS = [
    { value: Sort.UPCOMING, label: 'Upcoming' },
    { value: Sort.COMPLETED, label: 'Completed' },
    { value: Sort.DATE_NEW, label: 'Date — Newest' },
    { value: Sort.DATE_OLD, label: 'Date — Oldest' },
  ];
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const current = SORT_OPTIONS.find((o) => o.value === value) || SORT_OPTIONS[0];

  useEffect(() => {
    const onDocClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) {
        setOpen(false);
      }
    };
    const onEsc = (e) => {
      if (e.key === 'Escape') {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onDocClick);
    document.addEventListener('keydown', onEsc);
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      document.removeEventListener('keydown', onEsc);
    };
  }, []);

  return (
    <div className="sort-dropdown" ref={ref}>
      <button
        type="button"
        className="form-input sort-trigger"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span>{current.label}</span>
        <FontAwesomeIcon icon={faChevronDown} />
      </button>
      {open && (
        <div className="sort-menu" role="listbox" aria-label="Sort">
          {SORT_OPTIONS.map((opt) => {
            const active = opt.value === value;
            return (
              <div
                key={opt.value}
                role="option"
                aria-selected={active}
                className={`sort-item ${active ? 'active' : ''}`}
                onClick={() => {
                  onChange(opt.value);
                  setOpen(false);
                }}
              >
                <span className="sort-item-label">{opt.label}</span>
                {active && <FontAwesomeIcon className="sort-check" icon={faCheck} />}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ========================================================================
//  MAIN COMPONENT: ProfileDetailScreen
// ========================================================================

function ProfileDetailScreen() {
  // --- State & Hooks ---
  const {
    goBack,
    appState,
    showModal,
    navigateTo,
    allProfiles,
    setAllProfiles,
    showNotification,
    startScanning,
  } = useContext(AppContext);
  const profile = allProfiles?.find((p) => p.profileId === appState.currentProfileId);

  const [isLoadingVaccines, setIsLoadingVaccines] = useState(false);
  const [isActivityLogOpen, setIsActivityLogOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const initialParams = useMemo(() => readParams(), []);
  const [query, setQuery] = useState(initialParams.q);
  const [sort, setSort] = useState(initialParams.sort);

  // Effect for fetching vaccine data for the current profile
  useEffect(() => {
    const fetchVaccinesForProfile = async () => {
      if (profile && profile.vaccines === null) {
        setIsLoadingVaccines(true);
        try {
          const vaccines = await api.getProfileVaccines(profile.profileId);
          setAllProfiles((prev) =>
            prev.map((p) =>
              p.profileId === profile.profileId ? { ...p, vaccines: vaccines || [] } : p,
            ),
          );
        } catch {
          showNotification({
            type: 'error',
            title: 'Error',
            message: 'Could not load vaccination records.',
          });
          setAllProfiles((prev) =>
            prev.map((p) => (p.profileId === profile.profileId ? { ...p, vaccines: [] } : p)),
          );
        } finally {
          setIsLoadingVaccines(false);
        }
      }
    };
    fetchVaccinesForProfile();
  }, [profile, setAllProfiles, showNotification]);

  // Effect for synchronizing URL search params with component state
  useEffect(() => {
    writeParams({ q: query.trim(), sort });
  }, [query, sort]);

  useEffect(() => {
    const onPop = () => {
      const p = readParams();
      setQuery(p.q);
      setSort(p.sort);
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  // --- Memoized Calculations ---
  const { grouped, visibleGroups, totalsText } = useMemo(() => {
    const vaccines = Array.isArray(profile?.vaccines) ? profile.vaccines : [];
    const text = normalize(query);
    const today = startOfToday();
    const annotated = vaccines
      .map((v) => {
        const dateVal = v.date ? new Date(v.date) : null;
        const dueVal = v.nextDueDate ? new Date(v.nextDueDate) : null;
        const isCompleted = !!(dateVal && dateVal <= today);
        const isUpcoming = !!((dueVal && dueVal >= today) || (dateVal && dateVal > today));
        const category = isCompleted ? 'completed' : 'coming';
        const sortDate = isCompleted ? dateVal : dueVal || dateVal || null;
        return { ...v, category, _date: sortDate };
      })
      .filter((v) => !text || normalize(v.vaccineName).includes(text));

    let coming = annotated.filter((v) => v.category === 'coming');
    let completed = annotated.filter((v) => v.category === 'completed');

    const sortDir = sort === Sort.DATE_OLD ? +1 : -1;
    const dateCmp = (a, b) => cmpNum(timeOrNaN(a._date), timeOrNaN(b._date), sortDir);

    if (sort === Sort.UPCOMING) {
      completed = [];
      coming.sort((a, b) => cmpNum(timeOrNaN(a._date), timeOrNaN(b._date), 1));
    } else if (sort === Sort.COMPLETED) {
      coming = [];
      completed.sort(dateCmp);
    } else {
      coming.sort(dateCmp);
      completed.sort(dateCmp);
    }

    let visibleGroups = sort === Sort.DATE_OLD ? ['completed', 'coming'] : ['coming', 'completed'];
    if (sort === Sort.UPCOMING) visibleGroups = ['coming'];
    if (sort === Sort.COMPLETED) visibleGroups = ['completed'];

    const totalsText = `${completed.length} completed, ${coming.length} coming`;
    return { grouped: { coming, completed }, visibleGroups, totalsText };
  }, [profile?.vaccines, query, sort]);

  const isOwner = !profile?.isShared;
  const canEdit = isOwner || profile?.role === 'Editor';

  // --- Event Handlers ---
  const handleVaccineSave = (savedRecord) => {
    setAllProfiles((prev) =>
      prev.map((p) => {
        if (p.profileId !== profile.profileId) return p;
        const vaccineExists = p.vaccines.some((v) => v.vaccineId === savedRecord.vaccineId);
        const updatedVaccines = vaccineExists
          ? p.vaccines.map((v) => (v.vaccineId === savedRecord.vaccineId ? savedRecord : v))
          : [...p.vaccines, savedRecord];
        return { ...p, vaccines: updatedVaccines };
      }),
    );
    showModal(null);
    showNotification({
      type: 'success',
      title: 'Record Saved',
      message: `The record for ${savedRecord.vaccineName} has been saved.`,
    });
  };

  const handleVaccineDelete = ({ vaccineId, record, undoToken }) => {
    setAllProfiles((prev) =>
      prev.map((p) => {
        if (p.profileId !== profile.profileId) return p;
        return { ...p, vaccines: p.vaccines.filter((v) => v.vaccineId !== vaccineId) };
      }),
    );
    showModal(null);
    showNotification({
      type: 'success',
      title: 'Record Deleted',
      message: `"${record.vaccineName}" was deleted.`,
      duration: 10000,
      actions: [
        {
          label: 'Undo',
          onClick: async (hide) => {
            try {
              await api.restoreVaccine(profile.profileId, vaccineId, { undoToken });
              setAllProfiles((prev) =>
                prev.map((p) => {
                  if (p.profileId !== profile.profileId) return p;
                  return { ...p, vaccines: [...p.vaccines, record] };
                }),
              );
              showNotification({
                type: 'success',
                title: 'Restored',
                message: 'The record was restored.',
              });
            } catch (err) {
              showNotification({
                type: 'error',
                title: 'Undo Failed',
                message: 'Could not restore the record. Please refresh.',
              });
            }
            hide();
          },
        },
      ],
    });
  };

  const handleEditVaccine = (vaccine) =>
    showModal('add-edit-vaccine', {
      currentEditingVaccine: vaccine,
      currentProfileId: profile.profileId,
      mode: 'view',
      onSave: handleVaccineSave,
      onDelete: handleVaccineDelete,
    });

  const handleAddRecord = () => {
    showModal('add-method', {
      title: 'Add Vaccination Record',
      onManual: () => {
        showModal('add-edit-vaccine', {
          currentProfileId: profile.profileId,
          mode: 'add',
          onSave: handleVaccineSave,
        });
      },
      onAiScan: () => {
        startScanning('vaccine');
      },
    });
  };

  const deleteProfile = async () => {
    await api.deleteProfile(profile.profileId);
    setAllProfiles((prev) =>
      Array.isArray(prev) ? prev.filter((p) => p.profileId !== profile.profileId) : prev,
    );
    navigateTo('my-family-screen');
  };

  const handleLeaveShare = () => {
    showNotification({
      type: 'confirm-destructive',
      title: 'Leave Shared Profile?',
      message: `Are you sure you want to remove your access to "${profile.name}"? This cannot be undone.`,
      confirmText: 'Leave',
      onConfirm: async () => {
        try {
          await api.revokeShare(profile.shareId);
          showNotification({
            type: 'success',
            title: 'Access Removed',
            message: `You have left the shared profile "${profile.name}".`,
          });
          navigateTo('my-family-screen');
        } catch (err) {
          showNotification({
            type: 'error',
            title: 'Error',
            message: 'Could not leave the profile. Please try again.',
          });
        }
      },
    });
  };

  // --- Render Logic ---
  if (!profile) {
    return (
      <div className="content-wrapper centered-content">
        <FontAwesomeIcon icon={faSpinner} spin size="2x" />
      </div>
    );
  }

  const renderVaccineList = () => {
    if (isLoadingVaccines || profile.vaccines === null) {
      return (
        <div className="vaccine-empty-state">
          <FontAwesomeIcon icon={faSpinner} spin />
          <h4>Loading Records...</h4>
        </div>
      );
    }
    if (grouped.coming.length + grouped.completed.length > 0) {
      return (
        <div className="vaccine-list">
          {visibleGroups.map((groupName) => {
            const items = groupName === 'coming' ? grouped.coming : grouped.completed;
            if (!items.length) return null;
            return (
              <div key={groupName}>
                <h4 className="vaccine-group-title">
                  {groupName === 'coming' ? 'Coming' : 'Completed'}
                </h4>
                {items.map((v) => (
                  <VaccineListItem
                    key={v.vaccineId}
                    vaccine={v}
                    type={groupName === 'coming' ? 'upcoming' : 'completed'}
                    onClick={() => handleEditVaccine(v)}
                  />
                ))}
              </div>
            );
          })}
        </div>
      );
    }
    return (
      <div className="vaccine-empty-state">
        <div className="empty-state-icon">
          <FontAwesomeIcon icon={faSyringe} />
        </div>
        <h4>No records match your filters</h4>
        <p>Try a different search or sort.</p>
      </div>
    );
  };

  return (
    <div className="screen active profile-detail-page">
      <nav className="simple-nav">
        <button className="btn-icon back-button" onClick={goBack}>
          <FontAwesomeIcon icon={faArrowLeft} />
        </button>
        <h2>{profile.name}</h2>
      </nav>
      <div className="content-wrapper">
        {profile.isShared && (
          <div className="info-banner shared-banner">
            <FontAwesomeIcon icon={faInfoCircle} /> Shared by {profile.ownerEmail}. Your role:{' '}
            <strong>{profile.role}</strong>.
          </div>
        )}

        <div className="profile-info-card">
          <div className="profile-info-header">
            <div className="profile-info-main">
              <div className={`profile-avatar-large ${profile.avatarColor || 'avatar-blue'}`}>
                <FontAwesomeIcon icon={faUser} />
              </div>
              <div>
                <h3 className="profile-name-large">{profile.name}</h3>
                <p className="profile-sub-text">{profile.relationship || 'N/A'}</p>
              </div>
            </div>
            <div className="profile-info-actions">
              {canEdit && (
                <button
                  className="btn-icon"
                  onClick={() => showModal('edit-profile', { currentProfile: profile })}
                >
                  <FontAwesomeIcon icon={faPencil} />
                </button>
              )}
              {isOwner && (
                <button
                  className="btn-icon"
                  onClick={() => showModal('manage-sharing', { currentProfile: profile })}
                >
                  <FontAwesomeIcon icon={faShareNodes} />
                </button>
              )}
              {isOwner && (
                <button
                  className="btn-icon"
                  onClick={() => setIsActivityLogOpen(true)}
                  title="View Activity Log"
                >
                  <FontAwesomeIcon icon={faHistory} />
                </button>
              )}
              {isOwner && (
                <button className="btn-icon btn-danger-icon" onClick={() => setConfirmOpen(true)}>
                  <FontAwesomeIcon icon={faTrashCan} />
                </button>
              )}
              {profile.isShared && (
                <button
                  className="btn-icon btn-danger-icon"
                  onClick={handleLeaveShare}
                  title="Leave Share"
                >
                  <FontAwesomeIcon icon={faRightFromBracket} />
                </button>
              )}
            </div>
          </div>
          <div className="profile-details-grid">
            <InfoItem label="Date of Birth" value={profile.dob} />
            <InfoItem label="Gender" value={profile.gender} />
            <InfoItem label="Blood Type" value={profile.bloodType} />
            <InfoItem label="Allergies" value={profile.allergies} />
            <InfoItem label="Medical Conditions" value={profile.medicalConditions} />
          </div>
        </div>

        <div className="vaccine-records-card">
          <div className="vaccine-records-header">
            <div className="vaccine-title-group">
              <FontAwesomeIcon icon={faSyringe} />
              <div>
                <h3>Vaccination Records</h3>
                <span>{totalsText}</span>
              </div>
            </div>
            {canEdit && (
              <button className="btn btn-primary" onClick={handleAddRecord}>
                <FontAwesomeIcon icon={faPlus} style={{ marginRight: '8px' }} />
                Add Record
              </button>
            )}
          </div>
          <div className="filters-row">
            <div className="form-group">
              <label>VACCINE</label>
              <input
                className="form-input"
                type="text"
                placeholder="Search by vaccine name…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label>SORT</label>
              <SortDropdown value={sort} onChange={setSort} />
            </div>
          </div>
          {renderVaccineList()}
        </div>
      </div>

      <ConfirmDeleteModal
        open={confirmOpen}
        profileName={profile.name}
        onCancel={() => setConfirmOpen(false)}
        onConfirm={async () => {
          setConfirmOpen(false);
          await deleteProfile();
        }}
      />
      <ActivityLogModal
        isOpen={isActivityLogOpen}
        onClose={() => setIsActivityLogOpen(false)}
        profileId={profile.profileId}
        profileName={profile.name}
      />
    </div>
  );
}

export default ProfileDetailScreen;
