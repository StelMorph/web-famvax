// src/pages/MyFamily/ProfileDetailScreen.jsx
import React, { useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AppContext } from '../../contexts/AppContext';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faArrowLeft,
  faCheck,
  faCheckCircle,
  faChevronDown,
  faChevronRight,
  faClock,
  faHistory,
  faInfoCircle,
  faPen,
  faPlus,
  faRightFromBracket,
  faSpinner,
  faSyringe,
  faTimes,
  faTrashCan,
  faUser,
  faUserPlus,
} from '@fortawesome/free-solid-svg-icons';
import api from '../../api/apiService';

// ---- helpers ---------------------------------------------------------------
const Sort = {
  UPCOMING: 'upcoming',
  COMPLETED: 'completed',
  DATE_NEW: 'date-newest',
  DATE_OLD: 'date-oldest',
};
const normalizeSortToken = (s) =>
  ({ 'date-desc': Sort.DATE_NEW, 'date-asc': Sort.DATE_OLD })[s] || s || Sort.DATE_NEW;

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
const norm = (s) => (s || '').toString().toLowerCase().trim();
const startOfToday = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
};
const asTime = (d) => {
  if (!d) return Number.NaN;
  const t = d instanceof Date ? d.getTime() : new Date(d).getTime();
  return Number.isFinite(t) ? t : Number.NaN;
};

// ---- small UI bits ---------------------------------------------------------
function InfoItem({ label, value }) {
  return (
    <div className="info-item-grid">
      <span className="info-label">{label}</span>
      <span className="info-value">{value || 'N/A'}</span>
    </div>
  );
}

function VaccineListItem({ vaccine, type, onClick }) {
  const isCompleted = type === 'completed';
  const icon = isCompleted ? faCheckCircle : faClock;
  const iconStyle = isCompleted ? undefined : { color: '#F59E0B' };
  const dateText = isCompleted
    ? vaccine.date
      ? `Administered: ${vaccine.date}`
      : 'Administered'
    : vaccine.nextDueDate
      ? `Due: ${vaccine.nextDueDate}`
      : vaccine.date
        ? `Due: ${vaccine.date}`
        : 'Coming';

  return (
    <div className="vaccine-item editable" onClick={onClick}>
      <FontAwesomeIcon
        icon={icon}
        className={isCompleted ? 'completed-icon' : 'upcoming-icon'}
        style={iconStyle}
      />
      <div className="vaccine-details">
        <span className="vaccine-name">{vaccine.vaccineName}</span>
        <span className="vaccine-date">{dateText}</span>
      </div>
      <FontAwesomeIcon icon={faChevronRight} className="edit-indicator" />
    </div>
  );
}

function ConfirmDeleteModal({ open, profileName, onCancel, onConfirm }) {
  const [typed, setTyped] = useState('');
  useEffect(() => {
    if (open) setTyped('');
  }, [open]);
  if (!open) return null;
  const canDelete = typed === profileName;
  return (
    <div className="modal-overlay" role="dialog" aria-modal="true">
      <div className="notification-modal modern error">
        <div className="icon-circle">
          <FontAwesomeIcon className="modal-icon" icon={faTrashCan} />
        </div>
        <div className="modal-title">Delete this member?</div>
        <div className="modal-message">
          This will permanently delete <strong>{profileName}</strong> and all vaccination records.
          This cannot be undone.
        </div>
        <div className="confirm-input-block">
          <label className="confirm-input-label">Type the member&apos;s name to confirm</label>
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

function SortDropdown({ value, onChange }) {
  const OPTIONS = [
    { value: Sort.UPCOMING, label: 'Upcoming' },
    { value: Sort.COMPLETED, label: 'Completed' },
    { value: Sort.DATE_NEW, label: 'Date — Newest' },
    { value: Sort.DATE_OLD, label: 'Date — Oldest' },
  ];
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const current = OPTIONS.find((o) => o.value === value) || OPTIONS[0];

  useEffect(() => {
    const onDocClick = (e) => ref.current && !ref.current.contains(e.target) && setOpen(false);
    const onEsc = (e) => e.key === 'Escape' && setOpen(false);
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
          {OPTIONS.map((opt) => {
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

// ---- main screen -----------------------------------------------------------
function ProfileDetailScreen() {
  const { goBack, appState, showModal, navigateTo, allProfiles, setAllProfiles, showNotification } =
    useContext(AppContext);
  const profile = allProfiles?.find((p) => p.profileId === appState.currentProfileId);

  const [loadingVaccines, setLoadingVaccines] = useState(false);
  const [activityOpen, setActivityOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const initial = useMemo(() => readParams(), []);
  const [query, setQuery] = useState(initial.q);
  const [sort, setSort] = useState(initial.sort);

  // load vaccines once per profile (if needed)
  useEffect(() => {
    const run = async () => {
      if (profile && profile.vaccines === null) {
        setLoadingVaccines(true);
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
          setLoadingVaccines(false);
        }
      }
    };
    run();
  }, [profile, setAllProfiles, showNotification]);

  // sync URL
  useEffect(() => {
    writeParams({ q: query.trim(), sort });
  }, [query, sort]);

  // back/forward sync
  useEffect(() => {
    const onPop = () => {
      const p = readParams();
      setQuery(p.q);
      setSort(p.sort);
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  // build visible lists
  const { coming, completed, groups, totalsText } = useMemo(() => {
    const vaccines = Array.isArray(profile?.vaccines) ? profile.vaccines : [];
    const q = norm(query);
    const today = startOfToday();

    const items = vaccines
      .map((v) => {
        const d = v.date ? new Date(v.date) : null;
        const due = v.nextDueDate ? new Date(v.nextDueDate) : null;
        const isCompleted = !!(d && d <= today);
        const sDate = isCompleted ? d : due || d || null;
        return { ...v, _cat: isCompleted ? 'completed' : 'coming', _date: sDate };
      })
      .filter((v) => !q || norm(v.vaccineName).includes(q));

    const byDate = (dir) => (a, b) => {
      const at = asTime(a._date);
      const bt = asTime(b._date);
      if (Number.isNaN(at) && Number.isNaN(bt)) return 0;
      if (Number.isNaN(at)) return 1;
      if (Number.isNaN(bt)) return -1;
      return dir * (at - bt);
    };

    let coming = items.filter((v) => v._cat === 'coming');
    let completed = items.filter((v) => v._cat === 'completed');

    if (sort === Sort.UPCOMING) {
      completed = [];
      coming.sort(byDate(+1));
    } else if (sort === Sort.COMPLETED) {
      coming = [];
      completed.sort(byDate(-1));
    } else if (sort === Sort.DATE_NEW) {
      coming.sort(byDate(-1));
      completed.sort(byDate(-1));
    } else {
      coming.sort(byDate(+1));
      completed.sort(byDate(+1));
    }

    const groups =
      sort === Sort.UPCOMING
        ? ['coming']
        : sort === Sort.COMPLETED
          ? ['completed']
          : sort === Sort.DATE_OLD
            ? ['completed', 'coming']
            : ['coming', 'completed'];

    return {
      coming,
      completed,
      groups,
      totalsText: `${completed.length} completed, ${coming.length} coming`,
    };
  }, [profile?.vaccines, query, sort]);

  const isOwner = !profile?.isShared;
  const canEdit = isOwner || profile?.role === 'Editor';

  const handleSave = (saved) => {
    setAllProfiles((prev) =>
      prev.map((p) => {
        if (p.profileId !== profile.profileId) return p;
        const exists = p.vaccines.some((v) => v.vaccineId === saved.vaccineId);
        const vaccines = exists
          ? p.vaccines.map((v) => (v.vaccineId === saved.vaccineId ? saved : v))
          : [...p.vaccines, saved];
        return { ...p, vaccines };
      }),
    );
    showModal(null);
    showNotification({
      type: 'success',
      title: 'Record Saved',
      message: `The record for ${saved.vaccineName} has been saved.`,
    });
  };

  const handleDelete = ({ vaccineId, record, undoToken }) => {
    setAllProfiles((prev) =>
      prev.map((p) =>
        p.profileId === profile.profileId
          ? { ...p, vaccines: p.vaccines.filter((v) => v.vaccineId !== vaccineId) }
          : p,
      ),
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
                prev.map((p) =>
                  p.profileId === profile.profileId
                    ? { ...p, vaccines: [...p.vaccines, record] }
                    : p,
                ),
              );
              showNotification({
                type: 'success',
                title: 'Restored',
                message: 'The record was restored.',
              });
            } catch {
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

  const editVaccine = (v) =>
    showModal('add-edit-vaccine', {
      currentEditingVaccine: v,
      currentProfileId: profile.profileId,
      mode: 'view',
      onSave: handleSave,
      onDelete: handleDelete,
    });

  const addRecord = () =>
    showModal('add-method', {
      title: 'Add Vaccination Record',
      onManual: () =>
        showModal('add-edit-vaccine', {
          currentProfileId: profile.profileId,
          mode: 'add',
          onSave: handleSave,
        }),
      onAiScan: () =>
        showNotification({
          type: 'info',
          title: 'Coming Soon',
          message: 'AI Scan feature is under development.',
        }),
    });

  const deleteProfile = async () => {
    await api.deleteProfile(profile.profileId);
    setAllProfiles((prev) =>
      Array.isArray(prev) ? prev.filter((p) => p.profileId !== profile.profileId) : prev,
    );
    navigateTo('my-family-screen');
  };

  const leaveShare = () =>
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
        } catch {
          showNotification({
            type: 'error',
            title: 'Error',
            message: 'Could not leave the profile. Please try again.',
          });
        }
      },
    });

  if (!profile) {
    return (
      <div className="content-wrapper centered-content">
        <FontAwesomeIcon icon={faSpinner} spin size="2x" />
      </div>
    );
  }

  const renderList = () => {
    if (loadingVaccines || profile.vaccines === null) {
      return (
        <div className="vaccine-empty-state">
          <FontAwesomeIcon icon={faSpinner} spin />
          <h4>Loading Records...</h4>
        </div>
      );
    }
    const hasAny = coming.length + completed.length > 0;
    if (!hasAny) {
      return (
        <div className="vaccine-empty-state">
          <div className="empty-state-icon">
            <FontAwesomeIcon icon={faSyringe} />
          </div>
          <h4>No records match your filters</h4>
          <p>Try a different search or sort.</p>
        </div>
      );
    }
    return (
      <div className="vaccine-list">
        {groups.map((g) => {
          const items = g === 'coming' ? coming : completed;
          if (!items.length) return null;
          return (
            <div key={g}>
              <h4 className="vaccine-group-title">{g === 'coming' ? 'Coming' : 'Completed'}</h4>
              {items.map((v) => (
                <VaccineListItem
                  key={v.vaccineId}
                  vaccine={v}
                  type={g === 'coming' ? 'upcoming' : 'completed'}
                  onClick={() => editVaccine(v)}
                />
              ))}
            </div>
          );
        })}
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
                  <FontAwesomeIcon icon={faPen} />
                </button>
              )}
              {isOwner && (
                <button
                  className="btn-icon"
                  onClick={() => showModal('manage-sharing', { currentProfile: profile })}
                >
                  <FontAwesomeIcon icon={faUserPlus} />
                </button>
              )}
              {isOwner && (
                <button
                  className="btn-icon"
                  onClick={() => setActivityOpen(true)}
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
                  onClick={leaveShare}
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
              <button className="btn btn-primary" onClick={addRecord}>
                <FontAwesomeIcon icon={faPlus} style={{ marginRight: 8 }} />
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

          {renderList()}
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

      {activityOpen && (
        <div className="modal-overlay" onClick={() => setActivityOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Activity for {profile.name}</h3>
              <button className="btn-icon modal-close" onClick={() => setActivityOpen(false)}>
                <FontAwesomeIcon icon={faTimes} />
              </button>
            </div>
            <div className="modal-body">
              <p>Activity log…</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ProfileDetailScreen;
