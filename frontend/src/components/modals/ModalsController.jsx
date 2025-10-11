// src/components/modals/ModalsController.jsx
import React, { useContext, useMemo, useState, useEffect } from 'react';
import { AppContext } from '../../contexts/AppContext.js';
import EditProfileModal from './EditProfileModal.jsx';
import ManageSharingModal from './ManageSharingModal.jsx';
import FeedbackModal from './FeedbackModal.jsx';
import AddMethodModal from './AddMethodModal.jsx';
import AiScanMethodModal from './AiScanMethodModal.jsx';
import AIScanCameraScreen from '../../scan/AIScanCameraScreen.jsx';
import ConfirmEmailModal from './ConfirmEmailModal.jsx';
import ForgotPasswordModal from './ForgotPasswordModal.jsx';
import AddEditVaccineModal from './AddEditVaccineModal.jsx';
import ModalUndoBar from './ModalUndoBar.jsx';
import VaccineShareModal from './VaccineShareModal.jsx'; // <-- NEW
import api from '../../api/apiService.js';

function ModalsController() {
  const context = useContext(AppContext);

  // keep hooks stable even if there's no modal/context
  const appState = context?.appState || {};
  const navigateTo = context?.navigateTo || (() => {});
  const showNotification = context?.showNotification || (() => {});
  const setAllProfiles = context?.setAllProfiles || (() => {});
  const showModal = context?.showModal || (() => {});

  const {
    activeModal,
    currentProfile,
    currentEditingVaccine,
    mode,
    emailToVerify,
    addType,
    currentProfileId,
  } = appState;

  const closeModal = () => showModal(null);

  /* ---------------- Undo state (global toast) ---------------- */
  const [undoState, setUndoState] = useState(null);
  // undoState: { profileId, vaccineId, undoToken, expiresAt:number(ms), record? }
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    if (!undoState) return;
    const t = setInterval(() => setNow(Date.now()), 300);
    return () => clearInterval(t);
  }, [undoState]);

  const secondsLeft = useMemo(() => {
    if (!undoState) return 0;
    const leftMs = Math.max(0, undoState.expiresAt - now);
    return Math.ceil(leftMs / 1000);
  }, [undoState, now]);

  const clearUndo = () => setUndoState(null);

  /* ---------------- Profiles handlers ---------------- */
  const handleUpdateProfile = (updatedProfile) => {
    setAllProfiles((prev) =>
      prev.map((p) => (p.profileId === updatedProfile.profileId ? { ...p, ...updatedProfile } : p)),
    );
    showNotification({ type: 'success', message: 'Profile updated!' });
    closeModal();
  };

  /* ---------------- Vaccines save/delete ---------------- */
  const handleSaveVaccine = (savedRecord) => {
    setAllProfiles((curr) =>
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
    showNotification({ type: 'success', message: 'Record saved!' });
    closeModal();
  };

  /**
   * onDelete payload can be:
   *  - vaccineId (legacy, no undo)
   *  - { vaccineId, undoToken, undoExpiresAt, record } (new soft-delete flow)
   */
  const handleDeleteVaccine = (payload) => {
    const isObject = payload && typeof payload === 'object';
    const vaccineId = isObject ? payload.vaccineId : payload;
    const undoToken = isObject ? payload.undoToken : undefined;
    const undoExpiresAt = isObject ? payload.undoExpiresAt : undefined;
    const backupRecord = isObject ? payload.record : undefined;

    // optimistic removal in state for current profile
    setAllProfiles((curr) =>
      curr.map((p) =>
        p.profileId === currentProfileId
          ? { ...p, vaccines: (p.vaccines || []).filter((v) => v.vaccineId !== vaccineId) }
          : p,
      ),
    );

    if (undoToken && undoExpiresAt) {
      setUndoState({
        profileId: currentProfileId,
        vaccineId,
        undoToken,
        expiresAt: undoExpiresAt,
        record: backupRecord || null,
      });
      // ✅ Close the Add/Edit modal immediately after delete
      closeModal();
    } else {
      showNotification({ type: 'success', message: 'Record deleted.' });
      closeModal();
    }
  };

  const handleUndo = async () => {
    if (!undoState) return;
    try {
      await api.restoreVaccine(undoState.profileId, undoState.vaccineId, undoState.undoToken);
      if (undoState.record) {
        setAllProfiles((curr) =>
          curr.map((p) =>
            p.profileId === undoState.profileId
              ? { ...p, vaccines: [undoState.record, ...(p.vaccines || [])] }
              : p,
          ),
        );
      }
      showNotification({ type: 'success', message: 'Record restored.' });
    } catch (e) {
      console.error(e);
      showNotification({
        type: 'error',
        title: 'Undo failed',
        message: 'Could not restore the record.',
      });
    } finally {
      clearUndo();
    }
  };

  // When timer reaches zero, just clear (record remains deleted)
  useEffect(() => {
    if (!undoState) return;
    if (secondsLeft <= 0) clearUndo();
  }, [secondsLeft, undoState]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ---------------- Add flow helpers ---------------- */
  const handleAiScan = () => showModal('ai-scan-method');

  const handleManualEntry = () => {
    if (addType === 'member') {
      navigateTo('add-profile-screen');
      closeModal();
    } else {
      showModal('add-edit-vaccine', { mode: 'add', currentProfileId });
    }
  };

  const handleScanSuccess = (extractedData) => {
    navigateTo('ai-scan-review-extracted', { extractedData, addType, currentProfileId });
    closeModal();
  };

  const handleEmailConfirmSuccess = () => {
    showNotification({
      type: 'success',
      title: 'Success!',
      message: 'Email verified! You can now log in.',
    });
    closeModal();
    navigateTo('auth-screen');
  };

  const handleResendCode = async (email) => {
    console.log(`Resending code to ${email}...`);
    showNotification({
      type: 'info',
      title: 'Code Sent',
      message: `A new code has been sent to ${email}.`,
    });
  };

  const handleFileSelectedForScan = (file) => {
    navigateTo('ai-scan-review-extracted', { extractedData: {}, addType, currentProfileId });
    closeModal();
  };

  const renderModalContent = () => {
    switch (activeModal) {
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
      case 'vaccine-share': // <-- NEW
        return (
          <VaccineShareModal
            profileId={currentProfileId || currentProfile?.profileId || currentProfile?.id}
            vaccine={currentEditingVaccine}
            onClose={closeModal}
          />
        );
      case 'feedback-modal':
        return <FeedbackModal onClose={closeModal} />;
      case 'add-method':
        return (
          <AddMethodModal
            onClose={closeModal}
            onAiScan={handleAiScan}
            onManual={handleManualEntry}
            title={`Add ${addType === 'record' ? 'Record' : 'Member'}`}
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
        return <AIScanCameraScreen onClose={closeModal} onSuccess={handleScanSuccess} />;
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

  const handleTakePhoto = () => showModal('camera-scan');

  const modalsToKeepOpen = ['confirm-email', 'forgot-password', 'camera-scan', 'add-edit-vaccine'];
  const handleOverlayClick = modalsToKeepOpen.includes(activeModal) ? undefined : closeModal;

  return (
    <>
      {/* Global Undo toast (top-center, alarm style) */}
      <ModalUndoBar
        open={!!undoState && secondsLeft > 0}
        message="Record deleted."
        secondsLeft={secondsLeft}
        onUndo={handleUndo}
        onClose={() => clearUndo()}
      />

      {/* Modal overlay & content */}
      {activeModal && (
        <div className="modal-overlay" onClick={handleOverlayClick}>
          <div onClick={(e) => e.stopPropagation()}>{renderModalContent()}</div>
        </div>
      )}
    </>
  );
}

export default ModalsController;
