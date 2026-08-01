"use client";
import { useEffect, useRef } from "react";

/**
 * A confirmation dialog for destructive admin actions.
 *
 * Replaces window.confirm, which cannot be styled, cannot say which post it is
 * about in the panel's own voice, and — because it blocks the whole renderer —
 * freezes every other tab in the browser process while it is open.
 */
export default function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel,
  cancelLabel,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    // Focus the safe choice, not the destructive one: a stray Enter should
    // dismiss the dialog, never delete the post.
    cancelRef.current?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    document.addEventListener("keydown", onKey);
    // The page behind a modal must not scroll away under it.
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <div className="ad-modal" onMouseDown={onCancel}>
      <div
        className="ad-modal__card"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="ad-modal-title"
        aria-describedby="ad-modal-msg"
        // The backdrop closes on click; a click inside it must not bubble up
        // and dismiss the dialog the user is reading.
        onMouseDown={(e) => e.stopPropagation()}
      >
        <h2 id="ad-modal-title">{title}</h2>
        <p id="ad-modal-msg">{message}</p>
        <div className="ad-modal__actions">
          <button
            type="button"
            className="ad-btn ad-btn--ghost"
            ref={cancelRef}
            onClick={onCancel}
          >
            {cancelLabel}
          </button>
          <button type="button" className="ad-btn ad-btn--danger" onClick={onConfirm}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
