import { useEffect, useRef, useCallback, useId, useState } from 'react';

// Save/share dialog, shared by every calculator.
//
// Previously duplicated across all twelve wrappers, none of which trapped
// focus, closed on Escape, returned focus on close, or told a screen reader a
// dialog had opened.
export default function ShareModal({ mode, onClose, shareTitle }) {
  const panelRef = useRef(null);
  const closeRef = useRef(null);
  const previouslyFocused = useRef(null);
  const titleId = useId();
  const descId = useId();
  const [copied, setCopied] = useCopied();

  const url = typeof window !== 'undefined' ? window.location.href : '';

  const copy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }, [url, setCopied]);

  useEffect(() => {
    if (!mode) return undefined;

    // Send focus back where it came from on close, or the user is dumped at
    // the top of the document.
    previouslyFocused.current = document.activeElement;
    closeRef.current?.focus();

    const onKeyDown = (e) => {
      if (e.key === 'Escape') { e.stopPropagation(); onClose(); return; }
      if (e.key !== 'Tab') return;

      // Trap Tab inside the dialog; otherwise focus wanders behind the overlay
      // to controls the user cannot see.
      const focusables = panelRef.current?.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      if (!focusables?.length) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    };

    document.addEventListener('keydown', onKeyDown, true);
    return () => {
      document.removeEventListener('keydown', onKeyDown, true);
      previouslyFocused.current?.focus?.();
    };
  }, [mode, onClose]);

  if (!mode) return null;
  const isSave = mode === 'save';

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal"
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descId}
        onClick={(e) => e.stopPropagation()}
      >
        <button className="modal-close" onClick={onClose} aria-label="Close dialog" ref={closeRef}>×</button>
        {!isSave && <div className="modal-icon" aria-hidden="true">⤴</div>}
        <h2 className="modal-title" id={titleId}>
          {isSave ? 'Save your calculation' : 'Share your calculation'}
        </h2>
        <p className="modal-desc" id={descId}>
          {isSave
            ? 'Copy this link. Open it any time to return to exactly these inputs and results.'
            : 'Copy this link and send it. Anyone who opens it will see the same inputs and results instantly.'}
        </p>
        <div className="modal-url-wrap">
          <label className="visually-hidden" htmlFor={`${titleId}-url`}>Link to this calculation</label>
          <input
            className="modal-url"
            id={`${titleId}-url`}
            readOnly
            value={url}
            onFocus={(e) => e.target.select()}
          />
        </div>
        <button className="modal-copy" onClick={copy}>{copied ? '✓ Copied!' : 'Copy link'}</button>
        {/* Announced to screen readers, which cannot see the button label change. */}
        <span className="visually-hidden" role="status" aria-live="polite">
          {copied ? 'Link copied to clipboard' : ''}
        </span>
      </div>
    </div>
  );
}

// Local so the reset timer is torn down with the dialog.
function useCopied() {
  const [copied, setCopiedState] = useState(false);
  const timer = useRef(null);
  const set = useCallback((v) => {
    setCopiedState(v);
    clearTimeout(timer.current);
    if (v) timer.current = setTimeout(() => setCopiedState(false), 2000);
  }, [setCopiedState]);
  useEffect(() => () => clearTimeout(timer.current), []);
  return [copied, set];
}
