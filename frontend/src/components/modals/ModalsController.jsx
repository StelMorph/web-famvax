// src/components/modals/ModalsController.jsx

import React, { useContext } from 'react';
import { AppContext } from '../../contexts/AppContext.js';
import api from '../../api/apiService.js';

import EditProfileModal from './EditProfileModal.jsx';
import ManageSharingModal from './ManageSharingModal.jsx';
import FeedbackModal from './FeedbackModal.jsx';
import AddMethodModal from './AddMethodModal.jsx';
import AiScanMethodModal from './AiScanMethodModal.jsx';
import AIScanCameraScreen from '../../scan/AIScanCameraScreen.jsx';
import ConfirmEmailModal from './ConfirmEmailModal.jsx';
import ForgotPasswordModal from './ForgotPasswordModal.jsx';
import AddEditVaccineModal from './AddEditVaccineModal.jsx';

function ModalsController() {
    const { appState, setAppState, navigateTo, showNotification, setAllProfiles, allProfiles } = useContext(AppContext);

    if (!appState.activeModal) return null;

    const closeModal = () => {
        setAppState(prev => ({ 
            ...prev, activeModal: null, currentProfile: null, currentEditingVaccine: null, mode: null,
        }));
    };
    
    const handleUpdateProfile = (updatedProfile) => {
        setAllProfiles(prevData => prevData.map(p => 
            p.profileId === updatedProfile.profileId ? { ...p, ...updatedProfile } : p
        ));
        showNotification({ type: 'success', message: 'Profile updated successfully!' });
        closeModal();
    };

    // --- THIS IS THE BUG FIX ---
    // The 'mode' parameter was unreliable. This new logic is more robust.
    const handleSaveVaccine = (savedRecord) => {
         setAllProfiles(currentProfiles => {
            return currentProfiles.map(p => {
                if (p.profileId === appState.currentProfileId) {
                    // Check if the saved record's ID already exists in this profile's vaccine list.
                    const existingVaccineIndex = p.vaccines?.findIndex(v => v.vaccineId === savedRecord.vaccineId) ?? -1;

                    let newVaccines;
                    if (existingVaccineIndex > -1) {
                        // If it exists, it's an UPDATE. Replace the item at the found index.
                        newVaccines = [...p.vaccines];
                        newVaccines[existingVaccineIndex] = savedRecord;
                    } else {
                        // If it does not exist, it's an ADD. Append it to the end.
                        newVaccines = [...(p.vaccines || []), savedRecord];
                    }
                    return { ...p, vaccines: newVaccines };
                }
                return p;
            });
        });
        showNotification({type: 'success', message: `Record saved successfully!`});
        closeModal();
    };
    
    const handleDeleteVaccine = (vaccineId) => {
        setAllProfiles(currentProfiles => {
            return currentProfiles.map(p => {
                if (p.profileId === appState.currentProfileId) {
                    return { ...p, vaccines: p.vaccines.filter(v => v.vaccineId !== vaccineId) };
                }
                return p;
            });
        });
        showNotification({ type: 'success', message: 'Record deleted.' });
        closeModal();
    };
    
    const handleAiScan = () => {
        setAppState(prev => ({ ...prev, activeModal: 'ai-scan-method' }));
    };
    
    const handleManualEntry = () => {
        if (appState.addType === 'member') {
            navigateTo('add-profile-screen');
            closeModal();
        } else {
            setAppState(prev => ({
                ...prev,
                activeModal: 'add-edit-vaccine',
                mode: 'add',
            }));
        }
    };

    const handleScanSuccess = (extractedData) => {
        navigateTo('ai-scan-review-extracted', { extractedData, addType: appState.addType, currentProfileId: appState.currentProfileId });
        closeModal();
    };

    const handleEmailConfirmSuccess = () => {
        showNotification({ type: 'success', message: 'Email verified! You can now log in.' });
        closeModal();
        navigateTo('auth-screen');
    };

    const handleResendCode = () => {
        showNotification({ type: 'info', message: `A new code has been sent to ${appState.emailToVerify}.`});
    };
    
    const handleFileSelectedForScan = (file) => {
        console.log("File selected for AI Scan:", file.name);
        navigateTo('ai-scan-review-extracted', { 
            extractedData: {},
            addType: appState.addType, 
            currentProfileId: appState.currentProfileId 
        });
        closeModal();
    };

    const handleTakePhoto = () => {
        setAppState(prev => ({ ...prev, activeModal: 'camera-scan' }));
    };
    
    const renderModalContent = () => {
        switch (appState.activeModal) {
            case 'edit-profile':
                return <EditProfileModal profile={appState.currentProfile} onUpdate={handleUpdateProfile} onClose={closeModal} />;
            case 'manage-sharing':
                return <ManageSharingModal profile={appState.currentProfile} onClose={closeModal} />;
            case 'add-edit-vaccine':
                 return <AddEditVaccineModal vaccine={appState.currentEditingVaccine} mode={appState.mode} profileId={appState.currentProfileId} onClose={closeModal} onSave={handleSaveVaccine} onDelete={handleDeleteVaccine} />;
            case 'feedback-modal': 
                return <FeedbackModal onClose={closeModal} />;
            case 'add-method': 
                return <AddMethodModal onClose={closeModal} onAiScan={handleAiScan} onManual={handleManualEntry} title={`Add ${appState.addType === 'record' ? 'Record' : 'Member'}`} />;
            case 'ai-scan-method':
                 return <AiScanMethodModal onTakePhoto={handleTakePhoto} onFileSelected={handleFileSelectedForScan} onClose={closeModal} />;
            case 'camera-scan': 
                return <AIScanCameraScreen onClose={closeModal} onSuccess={handleScanSuccess} />;
            case 'confirm-email': 
                return <ConfirmEmailModal email={appState.emailToVerify} onConfirm={handleEmailConfirmSuccess} onClose={closeModal} onResend={handleResendCode} />;
            case 'forgot-password': 
                return <ForgotPasswordModal onClose={closeModal} />;
            default:
                closeModal();
                return null;
        }
    };

    // --- UI REFINEMENT ---
    // Added 'add-edit-vaccine' to the list of modals that should not close on overlay click.
    const modalsToKeepOpen = ['confirm-email', 'forgot-password', 'camera-scan', 'add-edit-vaccine'];

    return (
        <div className="modal-overlay" onClick={modalsToKeepOpen.includes(appState.activeModal) ? undefined : closeModal}>
            <div onClick={(e) => e.stopPropagation()}>
                {renderModalContent()}
            </div>
        </div>
    );
}

export default ModalsController;