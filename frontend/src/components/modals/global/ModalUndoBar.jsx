// src/components/modals/ModalUndoBar.jsx
import React, { useEffect, useRef, useState } from 'react';

/**
 * Global, top-right undo toast (same placement style as notification).
 *
 * Props:
 *  - open: boolean
 *  - message: string
 *  - // Either drive remaining time yourself...
 *    secondsLeft?: number
 *  - // ...or let the component manage the timer:
 *    timeoutMs?: number   (default 10000)
 *  - onUndo: () => Promise<void> | void
 *  - onClose: () => void
 */
export default function ModalUndoBar({
  open,
  message,
  secondsLeft,
  timeoutMs = 10000,
  onUndo,
  onClose,
}) {
  const [localSecs, setLocalSecs] = useState(Math.ceil(timeoutMs / 1000));
  const timerRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    if (typeof secondsLeft === 'number') return; // parent is driving countdown

    setLocalSecs(Math.ceil(timeoutMs / 1000));
    const started = Date.now();
    timerRef.current = setInterval(() => {
      const left = Math.max(0, Math.ceil((started + timeoutMs - Date.now()) / 1000));
      setLocalSecs(left);
      if (left <= 0) {
        clearInterval(timerRef.current);
        onClose?.();
      }
    }, 250);

    return () => timerRef.current && clearInterval(timerRef.current);
  }, [open, secondsLeft, timeoutMs, onClose]);

  if (!open) return null;

  const secs = typeof secondsLeft === 'number' ? secondsLeft : localSecs;

  return (
    <div className="undo-toast-overlay" role="status" aria-live="polite">
      <div className="undo-toast-card">
        <div className="undo-toast-body">
          <div className="undo-toast-text">{message}</div>
          <div className="undo-toast-spacer" />
          <button type="button" className="btn btn-secondary" onClick={onUndo}>
            Undo
          </button>
          <button
            type="button"
            className="btn btn-light undo-toast-close"
            onClick={onClose}
            aria-label="Close notification"
            title="Close"
          >
            ×
          </button>
          <div className="undo-toast-timer">{secs}s</div>
        </div>
      </div>
    </div>
  );
}
