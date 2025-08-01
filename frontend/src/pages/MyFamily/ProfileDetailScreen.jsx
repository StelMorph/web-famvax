import React, { useContext, useMemo } from 'react';
import { AppContext } from '../../contexts/AppContext.js';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSyringe, faArrowLeft, faUser, faPencil, faShareNodes, faTrashCan, faCheckCircle, faClock, faChevronRight, faSpinner, faPlus, faInfoCircle, faRightFromBracket } from '@fortawesome/free-solid-svg-icons';
import api from '../../api/apiService.js';

// ... (Other code from this file which had correct paths)
// The existing file did not have any incorrect local file imports.
// Keeping its content the same. I'm providing the full code just in case.

const InfoItem = ({ label, value }) => (
    <div className="info-item-grid">
        <span className="info-label">{label}</span>
        <span className="info-value">{value || 'N/A'}</span>
    </div>
);

const VaccineListItem = ({ vaccine, type, onClick }) => (
    <div className='vaccine-item editable' onClick={onClick}>
        <FontAwesomeIcon icon={type === 'completed' ? faCheckCircle : faClock} className={type === 'completed' ? 'completed-icon' : 'upcoming-icon'} />
        <div className="vaccine-details">
            <span className="vaccine-name">{vaccine.vaccineName}</span>
            <span className="vaccine-date">{type === 'completed' ? `Administered: ${vaccine.date}` : `Due: ${vaccine.nextDueDate}`}</span>
        </div>
        <FontAwesomeIcon icon={faChevronRight} className="edit-indicator" />
    </div>
);

function ProfileDetailScreen() {
    const { goBack, appState, showModal, navigateTo, allProfiles, setAllProfiles, showNotification } = useContext(AppContext);
    
    const profile = allProfiles?.find(p => p.profileId === appState.currentProfileId);
    
    const { completedVaccines, upcomingVaccines } = useMemo(() => {
        const completed = profile?.vaccines?.filter(v => v.date) || [];
        const upcoming = profile?.vaccines?.filter(v => v.nextDueDate && !v.date) || [];
        return { completedVaccines: completed, upcomingVaccines: upcoming };
    }, [profile]);

    const handleLeaveShare = () => {
        showNotification({
            type: 'confirm-destructive', title: 'Leave Share?',
            message: "Are you sure? You will lose access permanently unless invited again.",
            confirmText: 'Leave',
            onConfirm: async () => {
                try {
                    await api.deleteShare(profile.shareId);
                    showNotification({type: 'success', message: 'You have left the shared profile.'});
                    setAllProfiles(prev => prev.filter(p => p.profileId !== profile.profileId));
                    navigateTo('my-family-screen');
                } catch(err) {
                    showNotification({type: 'error', title: 'Error', message: err.message});
                }
            }
        });
    };

    const handleDeleteProfile = () => {
        showNotification({
            type: 'confirm-destructive', title: 'Delete Profile?',
            message: `Are you sure you want to permanently delete the profile for "${profile.name}"? This cannot be undone.`,
            confirmText: 'Delete',
            onConfirm: async () => {
                try {
                    await api.deleteProfile(profile.profileId);
                    setAllProfiles(prev => prev.filter(p => p.profileId !== profile.profileId));
                    showNotification({ type: 'success', message: `Profile for ${profile.name} has been deleted.` });
                    navigateTo('my-family-screen');
                } catch(error) {
                    showNotification({type: 'error', title: 'Error', message: error.message});
                }
            }
        });
    };

    const handleEditVaccine = (vaccine) => showModal('add-edit-vaccine', { currentEditingVaccine: vaccine, currentProfileId: profile.profileId, mode: 'view' });
    const handleAddRecord = () => showModal('add-method', { addType: 'record', currentProfileId: profile.profileId });

    if (!profile) return ( <div className="content-wrapper centered-content"><FontAwesomeIcon icon={faSpinner} spin size="2x"/></div> );

    const hasVaccines = (completedVaccines.length + upcomingVaccines.length) > 0;
    const isOwner = !profile.isShared;
    const canEdit = isOwner || profile.role === 'Editor';

    return (
        <div className="screen active profile-detail-page">
            <nav className="simple-nav"><button className="btn-icon back-button" onClick={goBack}><FontAwesomeIcon icon={faArrowLeft} /></button><h2>{profile.name}</h2></nav>
            <div className="content-wrapper">
                {profile.isShared && ( <div className="info-banner shared-banner"><FontAwesomeIcon icon={faInfoCircle} /> Shared by {profile.ownerEmail}. Your role: <strong>{profile.role}</strong>.</div> )}
                <div className="profile-info-card">
                    <div className="profile-info-header">
                        <div className="profile-info-main">
                            <div className={`profile-avatar-large ${profile.avatarColor || 'avatar-blue'}`}><FontAwesomeIcon icon={faUser} /></div>
                            <div><h3 className="profile-name-large">{profile.name}</h3><p className="profile-sub-text">{profile.relationship || 'N/A'}</p></div>
                        </div>
                        <div className="profile-info-actions">
                           {canEdit && <button className="btn-icon" onClick={() => showModal('edit-profile', { currentProfile: profile })}><FontAwesomeIcon icon={faPencil} /></button>}
                           {isOwner && <button className="btn-icon" onClick={() => showModal('manage-sharing', { currentProfile: profile })}><FontAwesomeIcon icon={faShareNodes} /></button>}
                           {isOwner && <button className="btn-icon btn-danger-icon" onClick={handleDeleteProfile}><FontAwesomeIcon icon={faTrashCan} /></button>}
                           {profile.isShared && <button className="btn-icon btn-danger-icon" onClick={handleLeaveShare}><FontAwesomeIcon icon={faRightFromBracket} /></button>}
                        </div>
                    </div>
                    <div className="profile-details-grid"><InfoItem label="Date of Birth" value={profile.dob} /><InfoItem label="Gender" value={profile.gender} /><InfoItem label="Blood Type" value={profile.bloodType} /><InfoItem label="Allergies" value={profile.allergies} /><InfoItem label="Medical Conditions" value={profile.medicalConditions} /></div>
                </div>
                <div className="vaccine-records-card">
                    <div className="vaccine-records-header">
                        <div className="vaccine-title-group"><FontAwesomeIcon icon={faSyringe} /><div><h3>Vaccination Records</h3><span>{completedVaccines.length} completed, {upcomingVaccines.length} upcoming</span></div></div>
                        {canEdit && <button className="btn btn-primary" onClick={handleAddRecord}><FontAwesomeIcon icon={faPlus} style={{ marginRight: '8px' }}/>Add Record</button>}
                    </div>
                    {hasVaccines ? (
                        <div className="vaccine-list">
                            {upcomingVaccines.length > 0 && <><h4>Upcoming</h4>{upcomingVaccines.map(v => <VaccineListItem key={v.vaccineId} vaccine={v} type="upcoming" onClick={() => handleEditVaccine(v)} />)}</>}
                            {completedVaccines.length > 0 && <><h4 style={{marginTop: '20px'}}>Completed</h4>{completedVaccines.map(v => <VaccineListItem key={v.vaccineId} vaccine={v} type="completed" onClick={() => handleEditVaccine(v)} />)}</>}
                        </div>
                    ) : ( <div className="vaccine-empty-state"><div className="empty-state-icon"><FontAwesomeIcon icon={faSyringe} /></div><h4>No Vaccination Records</h4><p>Add a vaccination record to get started.</p>{canEdit && <button className="btn btn-primary" onClick={handleAddRecord}>Add First Record</button>}</div> )}
                </div>
            </div>
        </div>
    );
}

export default ProfileDetailScreen;