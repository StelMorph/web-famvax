import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCakeCandles, faSyringe, faShareAlt } from '@fortawesome/free-solid-svg-icons';

function ProfileCard({ profile, onSelect }) {
  // This function is now more robust and always returns a string.
  const calculateAge = (dobString) => {
    if (!dobString) return 'Age unknown';

    const birthDate = new Date(dobString);
    // Add a check for invalid date strings
    if (isNaN(birthDate.getTime())) return 'Invalid date';

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    birthDate.setHours(0, 0, 0, 0);

    if (birthDate > today) return 'Upcoming';

    let ageYears = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      ageYears--;
    }

    if (ageYears >= 1) {
      return `${ageYears} year${ageYears !== 1 ? 's' : ''} old`;
    }

    let ageMonths =
      (today.getFullYear() - birthDate.getFullYear()) * 12 +
      (today.getMonth() - birthDate.getMonth());
    if (today.getDate() < birthDate.getDate()) {
      ageMonths--;
    }

    if (ageMonths >= 1) {
      return `${ageMonths} month${ageMonths !== 1 ? 's' : ''} old`;
    }

    const diffTime = Math.abs(today.getTime() - birthDate.getTime());
    const ageDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    return `${ageDays} day${ageDays !== 1 ? 's' : ''} old`;
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const options = { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' };
    try {
      return new Date(dateString).toLocaleDateString('en-US', options);
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (_e) {
      return 'Invalid Date';
    }
  };

  const getInitials = (name) => {
    if (!name) return '?';
    const parts = name.trim().split(' ');
    if (parts.length > 1) {
      return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  return (
    <div
      className="profile-card-new"
      data-testid={profile.profileId}
      onClick={() => onSelect(profile.profileId)}
    >
      <div className={`profile-avatar-new ${profile.avatarColor || 'avatar-blue'}`}>
        {getInitials(profile.name)}
      </div>
      <h3 className="profile-name-new">{profile.name}</h3>

      <div className="profile-tags">
        <span className="profile-tag">{calculateAge(profile.dob)}</span>
        <span className="profile-tag">{profile.relationship || 'N/A'}</span>
        {profile.isShared && (
          <span className="profile-tag shared-tag">
            <FontAwesomeIcon icon={faShareAlt} /> Shared
          </span>
        )}
      </div>

      <div className="profile-info-line">
        <div className="info-item">
          <FontAwesomeIcon icon={faCakeCandles} />
          <span>Born {formatDate(profile.dob)}</span>
        </div>
      </div>

      <div className="profile-info-line">
        <div className="info-item">
          <FontAwesomeIcon icon={faSyringe} />
          {/* We don't have vaccine data here yet, so we'll show 0 for now. */}
          <span>{profile.vaccines?.length || 0} vaccines</span>
        </div>
        <div className="info-item">
          {/* This will be implemented later */}
          <span>Due: 0</span>
        </div>
      </div>

      <button className="blood-type-btn" onClick={(e) => e.stopPropagation()}>
        Blood Type: {profile.bloodType || 'N/A'}
      </button>
    </div>
  );
}

export default ProfileCard;
