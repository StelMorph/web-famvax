// src/components/modals/ModalsController.jsx
import React, { useContext, useMemo, useState, useEffect } from 'react';
import { AppContext } from '../../contexts/AppContext.js';

import EditProfileModal from './profiles/EditProfileModal.jsx';
import ManageSharingModal from './profiles/ManageSharingModal.jsx';
import FeedbackModal from './global/FeedbackModal.jsx';
import AddMethodModal from './global/AddMethodModal.jsx';
import AiScanMethodModal from './global/AiScanMethodModal.jsx';
import CameraScanModal from './global/CameraScanModal.jsx';
import ProcessingModal from './global/ProcessingModal.jsx';
import ConfirmEmailModal from './auth/ConfirmEmailModal.jsx';
import ForgotPasswordModal from './auth/ForgotPasswordModal.jsx';
import AddEditVaccineModal from './vaccines/AddEditVaccineModal.jsx';
import ModalUndoBar from './global/ModalUndoBar.jsx';
import VaccineShareModal from './vaccines/VaccineShareModal.jsx';
import AddProfileModal from './profiles/AddProfileModal.jsx';
import api from '../../api/apiService.js';

function ModalsController() {
  const context = useContext(AppContext);
  const { appState, navigateTo, showNotification, setAllProfiles, showModal } = context || {};

  const {
    activeModal,

    // Params merged onto appState by SHOW_MODAL (no `params` object)
    title,
    onManual,
    onAiScan,

    // Scan-flow callbacks
    onTakePhoto,
    onFileSelected,
    onCaptureDataUrl,

    // Other props various modals expect
    currentProfile,
    currentEditingVaccine,
    mode,
    emailToVerify,
    currentProfileId,

    // ProcessingModal texts
    message,
    submessage,
  } = appState || {};

  const closeModal = () => showModal?.(null);

  // ---------------- Undo State ----------------
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

  // ------------- Handlers -------------
  const handleUpdateProfile = (updatedProfile) => {
    setAllProfiles?.((prev) =>
      prev.map((p) => (p.profileId === updatedProfile.profileId ? { ...p, ...updatedProfile } : p)),
    );
    showNotification?.({ type: 'success', message: 'Profile updated!' });
    closeModal();
  };

  const handleProfileCreated = () => closeModal();

  const handleSaveVaccine = (savedRecord) => {
    setAllProfiles?.((curr) =>
      curr.map((p) => {
        if (p.profileId === currentProfileId) {
          const idx = p.vaccines?.findIndex((v) => v.vaccineId === savedRecord.vaccineId) ?? -1;
          const list = Array.isArray(p.vaccines) ? [...p.vaccines] : [];
          if (idx > -1) list[idx] = savedRecord;
          else list.push(savedRecord);
          return { ...p, vaccines: list };
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
    } catch {
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

  // ------------- Render by modal id -------------
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

      // Manual vs AI chooser
      case 'add-method':
        return (
          <AddMethodModal
            onClose={closeModal}
            onAiScan={onAiScan}
            onManual={onManual}
            title={title}
          />
        );

      // AI source picker (Take Photo / Upload File)
      case 'ai-scan-method':
        return (
          <AiScanMethodModal
            onClose={closeModal}
            onTakePhoto={onTakePhoto}
            onFileSelected={onFileSelected}
          />
        );

      // Live camera capture (returns dataUrl)
      case 'camera-scan':
        return <CameraScanModal onClose={closeModal} onCaptureDataUrl={onCaptureDataUrl} />;

      // NEW: Blocking processing modal (no close)
      case 'processing':
        return <ProcessingModal title={title} message={message} submessage={submessage} />;

      case 'confirm-email':
        return (
          <ConfirmEmailModal
            email={emailToVerify}
            onClose={closeModal}
            onSuccess={handleEmailConfirmSuccess}
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
    'processing', // <— block clicks
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
        <div
          className="modal-overlay"
          onClick={handleOverlayClick}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15,23,42,0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
          }}
        >
          <div className="modal-shell" onClick={(e) => e.stopPropagation()}>
            {renderModalContent()}
          </div>
        </div>
      )}
    </>
  );
}

export default ModalsController;
