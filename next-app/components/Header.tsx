"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Logo from "./Logo";

/** Desktop nav (matches the golden: only Expertise · Blogs · Contact). */
const DESKTOP_LINKS = [
  { label: "Expertise", href: "/#skills" },
  { label: "Blogs", href: "/blog" },
  { label: "Contact", href: "/#contact" },
];

/** Full menu shown in the mobile overlay (per spec §1). */
const MOBILE_LINKS = [
  { label: "About", href: "/#about" },
  { label: "Expertise", href: "/#skills" },
  { label: "Blogs", href: "/blog" },
  { label: "Contact", href: "/#contact" },
  { label: "Start a Project", href: "/#contact" },
];

export default function Header() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    document.documentElement.style.overflow = open ? "hidden" : "";
    return () => {
      document.documentElement.style.overflow = "";
    };
  }, [open]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <header className="site-header">
      <Link href="/" className="site-header__logo" aria-label="Home">
        <Logo />
      </Link>

      <nav className="site-nav" aria-label="Primary">
        {DESKTOP_LINKS.map((l) => (
          <Link key={l.label} href={l.href}>
            {l.label}
          </Link>
        ))}
      </nav>

      <div className="site-header__spacer" aria-hidden="true" />

      <button
        type="button"
        className="site-header__burger"
        aria-label="Open menu"
        aria-expanded={open}
        onClick={() => setOpen(true)}
      >
        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path
            d="M3 6h18M3 12h18M3 18h18"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
      </button>

      <div className={`mobile-menu ${open ? "is-open" : ""}`} role="dialog" aria-modal="true">
        <button
          type="button"
          className="mobile-menu__close"
          aria-label="Close menu"
          onClick={() => setOpen(false)}
        >
          <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" width={22} height={22}>
            <path
              d="M6 6l12 12M18 6L6 18"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
        </button>
        {MOBILE_LINKS.map((l) => (
          <Link key={l.label} href={l.href} onClick={() => setOpen(false)}>
            {l.label}
          </Link>
        ))}
      </div>
    </header>
  );
}
