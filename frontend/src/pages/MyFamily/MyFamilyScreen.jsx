// src/pages/MyFamily/MyFamilyScreen.jsx
import React, { useMemo, useContext } from 'react';
import { AppContext } from '../../contexts/AppContext.js';
import StatCard from '../../components/common/StatCard.jsx';
import ProfileCard from '../../components/common/ProfileCard.jsx';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlus, faUsers, faCalendarAlt, faShieldVirus } from '@fortawesome/free-solid-svg-icons';
import { useScanFlow } from '../../flows/scanFlow.js';

const MyFamilyEmpty = ({ onAddProfile }) => (
  <div className="content-wrapper centered-content empty-state">
    <div className="empty-icon">
      <FontAwesomeIcon icon={faUsers} />
    </div>
    <h2>My Family</h2>
    <p>Add your first family member profile to get started.</p>
    <button className="btn btn-primary" onClick={onAddProfile}>
      <FontAwesomeIcon icon={faPlus} /> Add First Profile
    </button>
  </div>
);

const MyFamilyPopulated = ({ profiles, stats, onAddProfile, onSelectProfile }) => (
  <div className="content-wrapper">
    <div className="my-family-page-header">
      <div>
        <h1>My Family</h1>
        <p className="page-subtitle">Manage your family's vaccination records</p>
      </div>
      <button className="btn btn-primary" onClick={onAddProfile}>
        <FontAwesomeIcon icon={faPlus} style={{ marginRight: '8px' }} />
        Add Member
      </button>
    </div>
    <div className="stat-card-container">
      <StatCard
        icon={faUsers}
        title="Family Members"
        count={profiles?.length || 0}
        colorClass="icon-bg-blue"
      />
      <StatCard
        icon={faCalendarAlt}
        title="Upcoming"
        count={stats.upcomingCount}
        colorClass="icon-bg-yellow"
      />
      <StatCard
        icon={faShieldVirus}
        title="Completed"
        count={stats.completedCount}
        colorClass="icon-bg-green"
      />
    </div>
    <div className="profile-grid-new">
      {profiles?.map((profile) => (
        <ProfileCard
          key={profile.profileId || profile.id}
          profile={profile}
          onSelect={() => onSelectProfile(profile.profileId || profile.id)}
        />
      ))}
    </div>
  </div>
);

function MyFamilyScreen() {
  const { navigateTo, allProfiles, showModal, showNotification, closeModal } =
    useContext(AppContext);
  const scan = useScanFlow({ showModal, closeModal, showNotification, navigateTo });

  const stats = useMemo(() => {
    if (!allProfiles) return { upcomingCount: 0, completedCount: 0 };
    return allProfiles.reduce(
      (acc, profile) => {
        if (profile.vaccines) {
          acc.completedCount += profile.vaccines.filter((v) => v.dateAdministered).length;
          acc.upcomingCount += profile.vaccines.filter(
            (v) => v.nextDueDate && !v.dateAdministered,
          ).length;
        }
        return acc;
      },
      { upcomingCount: 0, completedCount: 0 },
    );
  }, [allProfiles]);

  const handleSelectProfile = (profileId) => {
    navigateTo('profile-detail-screen', { currentProfileId: profileId });
  };
  const handleAddProfile = () => {
    // Show the chooser first
    showModal('add-method', {
      title: 'Add Family Member',
      onManual: () => {
        // open your existing manual form
        showModal('add-profile');
      },
      onAiScan: () => {
        // only start the orchestrator if user chooses AI
        scan.start('profile');
      },
    });
  };

  return (
    <div className="screen active my-family-page">
      {allProfiles && allProfiles.length > 0 ? (
        <MyFamilyPopulated
          profiles={allProfiles}
          stats={stats}
          onAddProfile={handleAddProfile}
          onSelectProfile={handleSelectProfile}
        />
      ) : (
        <MyFamilyEmpty onAddProfile={handleAddProfile} />
      )}
    </div>
  );
}

export default MyFamilyScreen;
