// src/components/modals/ModalsController.jsx
import React, { useContext, useMemo, useState, useEffect } from 'react';
import { AppContext } from '../../contexts/AppContext.js';
import EditProfileModal from './profiles/EditProfileModal.jsx';
import ManageSharingModal from './profiles/ManageSharingModal.jsx';
import FeedbackModal from './global/FeedbackModal.jsx';
import AddMethodModal from './global/AddMethodModal.jsx';
import AiScanMethodModal from './global/AiScanMethodModal.jsx';
import CameraScanModal from './global/CameraScanModal.jsx';
import ConfirmEmailModal from './auth/ConfirmEmailModal.jsx';
import ForgotPasswordModal from './auth/ForgotPasswordModal.jsx';
import AddEditVaccineModal from './vaccines/AddEditVaccineModal.jsx';
import ModalUndoBar from './global/ModalUndoBar.jsx';
import VaccineShareModal from './vaccines/VaccineShareModal.jsx';
import AddProfileModal from './profiles/AddProfileModal.jsx';
import api from '../../api/apiService.js';

function ModalsController() {
  const context = useContext(AppContext);

  // Destructure with fallbacks to prevent crashes if context is not yet available
  const { appState, navigateTo, showNotification, setAllProfiles, showModal } = context || {};

  // Get all necessary properties from appState, with fallbacks
  const {
    activeModal,
    // Generic props for the 'add-method' modal, passed from the calling screen
    title,
    onManual,
    onAiScan,
    // Other specific props for various modals
    currentProfile,
    currentEditingVaccine,
    mode,
    emailToVerify,
    currentProfileId,
  } = appState || {};

  const closeModal = () => showModal?.(null);

  // --- State and Handlers for Undo Functionality ---
  const [undoState, setUndoState] = useState(null);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    if (!undoState) return;
    const t = setInterval(() => setNow(Date.now()), 300);
    return () => clearInterval(t);
  }, [undoState]);

  const secondsLeft = useMemo(() => {
    if (!undoState) return 0;
    return Math.ceil(Math.max(0, undoState.expiresAt - now) / 1000);
  }, [undoState, now]);

  useEffect(() => {
    if (undoState && secondsLeft <= 0) setUndoState(null);
  }, [secondsLeft, undoState]);

  // --- Handlers for Specific Modal Actions ---
  const handleUpdateProfile = (updatedProfile) => {
    setAllProfiles?.((prev) =>
      prev.map((p) => (p.profileId === updatedProfile.profileId ? { ...p, ...updatedProfile } : p)),
    );
    showNotification?.({ type: 'success', message: 'Profile updated!' });
    closeModal();
  };

  const handleProfileCreated = () => {
    closeModal();
  };

  const handleSaveVaccine = (savedRecord) => {
    setAllProfiles?.((curr) =>
      curr.map((p) => {
        if (p.profileId === currentProfileId) {
          const idx = p.vaccines?.findIndex((v) => v.vaccineId === savedRecord.vaccineId) ?? -1;
          let newVaccines = idx > -1 ? [...p.vaccines] : [...(p.vaccines || [])];
          if (idx > -1) newVaccines[idx] = savedRecord;
          else newVaccines.push(savedRecord);
          return { ...p, vaccines: newVaccines };
        }
        return p;
      }),
    );
    showNotification?.({ type: 'success', message: 'Record saved!' });
    closeModal();
  };

  const handleDeleteVaccine = (payload) => {
    const vaccineId = payload?.vaccineId || payload;
    setAllProfiles?.((curr) =>
      curr.map((p) =>
        p.profileId === currentProfileId
          ? { ...p, vaccines: (p.vaccines || []).filter((v) => v.vaccineId !== vaccineId) }
          : p,
      ),
    );

    if (payload?.undoToken && payload?.undoExpiresAt) {
      setUndoState({
        profileId: currentProfileId,
        vaccineId,
        undoToken: payload.undoToken,
        expiresAt: payload.undoExpiresAt,
        record: payload.record || null,
      });
    } else {
      showNotification?.({ type: 'success', message: 'Record deleted.' });
    }
    closeModal();
  };

  const handleUndo = async () => {
    if (!undoState) return;
    try {
      await api.restoreVaccine(undoState.profileId, undoState.vaccineId, {
        undoToken: undoState.undoToken,
      });
      if (undoState.record) {
        setAllProfiles?.((curr) =>
          curr.map((p) =>
            p.profileId === undoState.profileId
              ? { ...p, vaccines: [undoState.record, ...(p.vaccines || [])] }
              : p,
          ),
        );
      }
      showNotification?.({ type: 'success', message: 'Record restored.' });
    } catch (e) {
      showNotification?.({
        type: 'error',
        title: 'Undo failed',
        message: 'Could not restore the record.',
      });
    } finally {
      setUndoState(null);
    }
  };

  const handleEmailConfirmSuccess = () => {
    showNotification?.({
      type: 'success',
      title: 'Success!',
      message: 'Email verified! You can now log in.',
    });
    closeModal();
    navigateTo?.('auth-screen');
  };

  const handleResendCode = async (email) => {
    showNotification?.({
      type: 'info',
      title: 'Code Sent',
      message: `A new code has been sent to ${email}.`,
    });
  };

  // These are handled cleanly by App.jsx now, these are just fallbacks.
  const handleScanSuccess = () => {
    navigateTo?.('ai-scan-review-extracted');
    closeModal();
  };
  const handleFileSelectedForScan = () => {
    navigateTo?.('ai-scan-review-extracted');
    closeModal();
  };
  const handleTakePhoto = () => showModal?.('camera-scan');

  const renderModalContent = () => {
    if (!activeModal) return null;

    switch (activeModal) {
      case 'add-profile':
        return <AddProfileModal onClose={closeModal} onProfileCreated={handleProfileCreated} />;
      case 'edit-profile':
        return (
          <EditProfileModal
            profile={currentProfile}
            onUpdate={handleUpdateProfile}
            onClose={closeModal}
          />
        );
      case 'manage-sharing':
        return <ManageSharingModal profile={currentProfile} onClose={closeModal} />;
      case 'add-edit-vaccine':
        return (
          <AddEditVaccineModal
            vaccine={currentEditingVaccine}
            mode={mode}
            profileId={currentProfileId}
            onClose={closeModal}
            onSave={handleSaveVaccine}
            onDelete={handleDeleteVaccine}
          />
        );
      case 'vaccine-share':
        return (
          <VaccineShareModal
            profileId={currentProfileId || currentProfile?.profileId}
            vaccine={currentEditingVaccine}
            onClose={closeModal}
          />
        );
      case 'feedback-modal':
        return <FeedbackModal onClose={closeModal} />;

      // CORRECTED AND SIMPLIFIED: This modal now acts as a simple, dumb component.
      case 'add-method':
        return (
          <AddMethodModal
            onClose={closeModal}
            onAiScan={onAiScan}
            onManual={onManual}
            title={title}
          />
        );

      case 'ai-scan-method':
        return (
          <AiScanMethodModal
            onTakePhoto={handleTakePhoto}
            onFileSelected={handleFileSelectedForScan}
            onClose={closeModal}
          />
        );
      case 'camera-scan':
        return <CameraScanModal onClose={closeModal} onSuccess={handleScanSuccess} />;
      case 'confirm-email':
        return (
          <ConfirmEmailModal
            email={emailToVerify}
            onConfirm={handleEmailConfirmSuccess}
            onClose={closeModal}
            onResend={handleResendCode}
          />
        );
      case 'forgot-password':
        return <ForgotPasswordModal onClose={closeModal} />;
      default:
        return null;
    }
  };

  const modalsToKeepOpen = [
    'confirm-email',
    'forgot-password',
    'camera-scan',
    'add-edit-vaccine',
    'add-profile',
  ];
  const handleOverlayClick = modalsToKeepOpen.includes(activeModal) ? undefined : closeModal;

  return (
    <>
      <ModalUndoBar
        open={!!undoState}
        message="Record deleted."
        secondsLeft={secondsLeft}
        onUndo={handleUndo}
        onClose={() => setUndoState(null)}
      />
      {activeModal && (
        <div className="modal-overlay" onClick={handleOverlayClick}>
          <div onClick={(e) => e.stopPropagation()}>{renderModalContent()}</div>
        </div>
      )}
    </>
  );
}

export default ModalsController;
