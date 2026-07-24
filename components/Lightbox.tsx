"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type LightboxProps = {
  src: string;
  alt: string;
  open: boolean;
  onClose: () => void;
};

export default function Lightbox({ src, alt, open, onClose }: LightboxProps) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (open) {
      const id = requestAnimationFrame(() => setVisible(true));
      return () => cancelAnimationFrame(id);
    }
    setVisible(false);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    document.documentElement.classList.add("fx-lock");
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      // Minimal focus trap: keep focus on the close control.
      if (e.key === "Tab") {
        e.preventDefault();
        closeRef.current?.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.documentElement.classList.remove("fx-lock");
      document.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  const onBackdrop = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (e.target === e.currentTarget) onClose();
    },
    [onClose]
  );

  return (
    <div
      className={`fx-lightbox ${visible ? "is-open" : ""}`}
      hidden={!open}
      onClick={onBackdrop}
      role="dialog"
      aria-modal="true"
      aria-label={alt}
    >
      <button
        ref={closeRef}
        type="button"
        className="fx-lightbox__close"
        aria-label="Close"
        onClick={onClose}
      >
        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path
            d="M6 6l12 12M18 6L6 18"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
      </button>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className="fx-lightbox__img" src={src} alt={alt} />
    </div>
  );
}
