// src/flows/scanFlow.js
import api from '../api/apiService';

/**
 * @typedef {Object} ScanFlowDeps
 * @property {(modalId: string|null, params?: any) => void} showModal
 * @property {() => void} closeModal
 * @property {(opts: {type: string, title?: string, message?: string, duration?: number, actions?: any[]}) => void} showNotification
 * @property {(screen: string, params?: any, options?: {replace?: boolean}) => void} navigateTo
 *
 * @typedef {"profile" | "vaccine"} RecordType
 */

export function startScanFlow(deps, recordType) {
  const { showModal, closeModal } = deps;
  showModal('ai-scan-method', {
    onClose: () => closeModal?.(),
    onTakePhoto: () => startCameraCapture(deps, recordType),
    onFileSelected: (file) => handleIncomingFile(deps, recordType, file),
  });
}

export async function startCameraCapture(deps, recordType) {
  const { showModal, closeModal, showNotification } = deps;
  showModal('camera-scan', {
    onClose: () => closeModal?.(),
    onCaptureDataUrl: async (dataUrl) => {
      try {
        const file = await dataUrlToFile(dataUrl, 'scan.jpg');
        await uploadThenScan(deps, recordType, file);
      } catch (err) {
        showNotification?.({
          type: 'error',
          title: 'Capture Failed',
          message: err?.message || 'Could not capture image.',
        });
      }
    },
  });
}

export async function handleIncomingFile(deps, recordType, file) {
  try {
    await uploadThenScan(deps, recordType, file);
  } catch (err) {
    deps.showNotification?.({
      type: 'error',
      title: 'Upload Failed',
      message: err?.message || 'Could not upload file.',
    });
  }
}

export async function uploadThenScan(deps, recordType, file) {
  const { showNotification, showModal, closeModal } = deps;

  // Close picker/camera, then open blocking processing modal
  closeModal?.();
  showModal('processing', {
    title: 'Uploading…',
    message: `Uploading ${file.name}…`,
    submessage: 'Please don’t close this window.',
  });

  const { url, key } = await api.getUploadUrl(file.type);
  await putToS3(url, file);

  // Update the same processing modal (reusing id keeps it open)
  showModal('processing', {
    title: 'Processing…',
    message: 'AI is scanning the document.',
    submessage: 'This usually takes a few seconds.',
  });

  const result = await api.scanDocument(key);

  await handleScanSuccess(deps, recordType, result);
}

export async function handleScanSuccess(deps, recordType, result) {
  const { navigateTo, showModal, showNotification } = deps;

  showNotification?.({
    type: 'success',
    title: 'Scan complete',
    message: 'Document processed successfully.',
  });

  // Close the processing modal right before navigation
  showModal(null);

  navigateTo('ai-scan-review-extracted', {
    scannedData: result?.extractedData || {},
    scanRecordType: recordType || 'vaccine',
  });
}

export async function dataUrlToFile(dataUrl, filename = 'scan.jpg') {
  const res = await fetch(dataUrl);
  const blob = await res.blob();
  return new File([blob], filename, { type: blob.type || 'image/jpeg' });
}

async function putToS3(url, file) {
  const res = await fetch(url, {
    method: 'PUT',
    body: file,
    headers: { 'Content-Type': file.type },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`S3 upload failed: ${res.status} ${res.statusText} ${body}`);
  }
}

export function useScanFlow(deps) {
  return {
    start: (recordType) => startScanFlow(deps, recordType),
    fromFile: (recordType, file) => handleIncomingFile(deps, recordType, file),
    fromCamera: (recordType) => startCameraCapture(deps, recordType),
  };
}
