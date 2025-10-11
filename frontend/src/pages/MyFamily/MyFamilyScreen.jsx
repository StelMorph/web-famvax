// frontend/src/pages/MyFamily/MyFamilyScreen.jsx
import React, { useMemo, useContext } from 'react';
import { AppContext } from '../../contexts/AppContext.js';
import StatCard from '../../components/common/StatCard.jsx';
import ProfileCard from '../../components/common/ProfileCard.jsx';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlus, faUsers, faCalendarAlt, faShieldVirus } from '@fortawesome/free-solid-svg-icons';

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
        count={profiles.length}
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
      {profiles.map((profile) => (
        <ProfileCard
          key={profile.profileId}
          profile={profile}
          onSelect={() => onSelectProfile(profile.profileId)}
        />
      ))}
    </div>
  </div>
);

function MyFamilyScreen() {
  const { navigateTo, allProfiles, showModal } = useContext(AppContext);

  const stats = useMemo(() => {
    if (!allProfiles) return { upcomingCount: 0, completedCount: 0 };
    return allProfiles.reduce(
      (acc, profile) => {
        if (profile.vaccines) {
          acc.completedCount += profile.vaccines.filter((v) => v.date).length;
          acc.upcomingCount += profile.vaccines.filter((v) => v.nextDueDate && !v.date).length;
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
    showModal('add-method', { addType: 'member' });
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
