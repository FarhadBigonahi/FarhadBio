"use client";
import { useState } from "react";

/**
 * Share row for an article.
 *
 * Telegram leads deliberately: this is a Persian blog, and Telegram is where
 * its readers actually pass links around. Everything is a plain link to the
 * network's share URL — no SDKs, no third-party script, nothing that could
 * watch a reader who never clicks.
 */
export default function PostShare({
  url,
  title,
}: {
  url: string;
  title: string;
}) {
  const [copied, setCopied] = useState(false);
  const u = encodeURIComponent(url);
  const t = encodeURIComponent(title);

  const targets = [
    {
      key: "telegram",
      label: "تلگرام",
      href: `https://t.me/share/url?url=${u}&text=${t}`,
      icon: <path d="M21.9 4.3 18.9 19c-.2 1-.8 1.3-1.7.8l-4.6-3.4-2.2 2.1c-.3.3-.5.5-1 .5l.3-4.7L18.3 6c.4-.3-.1-.5-.6-.2L7.2 12.4l-4.5-1.4c-1-.3-1-1 .2-1.4l17.6-6.8c.8-.3 1.5.2 1.4 1.5Z" />,
    },
    {
      key: "whatsapp",
      label: "واتساپ",
      href: `https://api.whatsapp.com/send?text=${t}%20${u}`,
      icon: <path d="M12 2a10 10 0 0 0-8.6 15L2 22l5.2-1.4A10 10 0 1 0 12 2Zm5.4 14c-.2.6-1.3 1.2-1.8 1.2-.5.1-1 .1-1.7-.1a13 13 0 0 1-5.6-4.6c-.5-.8-.9-1.7-.9-2.5 0-.9.5-1.4.7-1.6.2-.2.4-.3.6-.3h.5c.2 0 .4 0 .6.5l.8 1.8c0 .2.1.3 0 .5l-.4.6-.3.3c-.1.1-.2.3 0 .5.2.4.8 1.2 1.6 1.9 1 .9 1.8 1.1 2 1.2.2.1.4.1.5 0l.8-1c.2-.2.3-.2.5-.1l1.8.9c.2.1.4.2.4.3.1.2.1.6 0 1Z" />,
    },
    {
      key: "twitter",
      label: "X",
      href: `https://twitter.com/intent/tweet?url=${u}&text=${t}`,
      icon: <path d="M17.5 3h3.1l-6.8 7.8L22 21h-6.3l-4.9-6.4L5.1 21H2l7.3-8.3L2.3 3h6.4l4.4 5.9L17.5 3Zm-1.1 16.1h1.7L7.7 4.8H5.9l10.5 14.3Z" />,
    },
    {
      key: "linkedin",
      label: "لینکدین",
      href: `https://www.linkedin.com/sharing/share-offsite/?url=${u}`,
      icon: <path d="M6.9 21H3.3V9h3.6v12ZM5.1 7.4a2.1 2.1 0 1 1 0-4.2 2.1 2.1 0 0 1 0 4.2ZM21 21h-3.6v-5.8c0-1.4 0-3.2-1.9-3.2s-2.2 1.5-2.2 3.1V21H9.7V9h3.4v1.6h.1a3.8 3.8 0 0 1 3.4-1.9c3.6 0 4.3 2.4 4.3 5.5V21Z" />,
    },
  ];

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      /* clipboard blocked — the share links still work */
    }
  }

  return (
    <div className="wb-share">
      <span className="wb-share__label">هم‌رسانی:</span>
      {targets.map((s) => (
        <a
          key={s.key}
          className="wb-share__btn"
          href={s.href}
          target="_blank"
          rel="noopener noreferrer nofollow"
          aria-label={`هم‌رسانی در ${s.label}`}
          title={s.label}
        >
          <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            {s.icon}
          </svg>
        </a>
      ))}
      <button
        type="button"
        className={`wb-share__btn wb-share__btn--copy${copied ? " is-done" : ""}`}
        onClick={copy}
        aria-label="کپی نشانی نوشته"
        title={copied ? "کپی شد" : "کپی نشانی"}
      >
        {copied ? (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="m20 6-11 11-5-5" />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7" />
            <path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7" />
          </svg>
        )}
      </button>
    </div>
  );
}
