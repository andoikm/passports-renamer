import { useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import './Modal.css';

/**
 * Accessible modal dialog with focus trap and Escape-to-close.
 */
export function Modal({
  open,
  title,
  onClose,
  children,
  footer,
  className = '',
  size = 'default',
  closeOnEscape = true,
  initialFocusRef,
  returnFocusRef,
}) {
  const titleId = useId();
  const dialogRef = useRef(null);
  const previouslyFocused = useRef(/** @type {HTMLElement | null} */ (null));

  useEffect(() => {
    if (!open) return undefined;

    previouslyFocused.current =
      (returnFocusRef?.current &&
        /** @type {HTMLElement} */ (returnFocusRef.current)) ||
      /** @type {HTMLElement | null} */ (document.activeElement);

    const node = dialogRef.current;
    const focusTarget =
      initialFocusRef?.current ||
      node?.querySelector(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );

    window.requestAnimationFrame(() => {
      if (focusTarget && 'focus' in focusTarget) {
        /** @type {HTMLElement} */ (focusTarget).focus();
      } else {
        node?.focus();
      }
    });

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = previousOverflow;
      const restore = previouslyFocused.current;
      if (restore && typeof restore.focus === 'function') {
        window.requestAnimationFrame(() => restore.focus());
      }
    };
  }, [open, initialFocusRef, returnFocusRef]);

  useEffect(() => {
    if (!open) return undefined;

    const onKeyDown = (e) => {
      if (e.key === 'Escape' && closeOnEscape) {
        e.preventDefault();
        onClose?.();
        return;
      }

      if (e.key !== 'Tab' || !dialogRef.current) return;
      const focusables = dialogRef.current.querySelectorAll(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
      );
      const list = Array.from(focusables).filter(
        (el) => el instanceof HTMLElement && el.offsetParent !== null
      );
      if (list.length === 0) {
        e.preventDefault();
        dialogRef.current.focus();
        return;
      }
      const first = list[0];
      const last = list[list.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open, closeOnEscape, onClose]);

  if (!open) return null;

  return createPortal(
    <div className="ui-modal-root" role="presentation">
      <div
        className="ui-modal-backdrop"
        onMouseDown={(e) => {
          if (e.target === e.currentTarget && closeOnEscape) onClose?.();
        }}
      />
      <div
        ref={dialogRef}
        className={`ui-modal ui-modal--${size} ${className}`.trim()}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
      >
        <header className="ui-modal__header">
          <h2 id={titleId} className="ui-modal__title">
            {title}
          </h2>
          <button
            type="button"
            className="ui-modal__close"
            onClick={() => onClose?.()}
            aria-label="Close"
            disabled={!closeOnEscape}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </header>
        <div className="ui-modal__body">{children}</div>
        {footer ? <footer className="ui-modal__footer">{footer}</footer> : null}
      </div>
    </div>,
    document.body
  );
}
