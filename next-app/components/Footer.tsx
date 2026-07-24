import Link from "next/link";
import Reveal from "./Reveal";

export default function Footer() {
  return (
    <footer className="footer">
      <Reveal as="div" className="footer__top">
        <nav className="footer__links" aria-label="Footer">
          <Link href="/">Home</Link>
          <Link href="/blog">Blogs</Link>
          <a href="#contact">Contact</a>
        </nav>

        <div className="footer__socials">
          <a
            href="https://instagram.com/its.farhad.bio"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Instagram — Farhad Bigonahi"
          >
            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <rect
                x="3"
                y="3"
                width="18"
                height="18"
                rx="5"
                stroke="currentColor"
                strokeWidth="2"
              />
              <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="2" />
              <circle cx="17.5" cy="6.5" r="1.2" fill="currentColor" />
            </svg>
          </a>
          <a
            href="https://t.me/FBMASIH"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Telegram — Farhad Bigonahi"
          >
            <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M21.9 4.3 18.6 20c-.24 1.1-.9 1.37-1.82.85l-5.04-3.72-2.43 2.34c-.27.27-.5.5-1 .5l.36-5.1L16.9 6.6c.4-.36-.09-.56-.62-.2L6.2 12.75l-4.98-1.56c-1.08-.34-1.1-1.08.23-1.6L20.5 2.87c.9-.33 1.7.22 1.4 1.43Z" />
            </svg>
          </a>
          <a
            href="mailto:business@farhad.bio"
            aria-label="Email — Farhad Bigonahi"
          >
            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <rect
                x="3"
                y="5"
                width="18"
                height="14"
                rx="2.5"
                stroke="currentColor"
                strokeWidth="2"
              />
              <path
                d="M4 7l8 6 8-6"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </a>
        </div>
      </Reveal>

      <Reveal as="div" className="footer__meta" delay={80}>
        <span>Farhad Bigonahi &mdash; Full-Stack Developer &amp; AI Builder</span>
        <span>&copy; 2026 Farhad Bigonahi. All rights reserved.</span>
      </Reveal>

      <Reveal as="div" className="footer__wordmark" fade delay={140} ariaHidden>
        Farhad<span className="reg">&reg;</span>
      </Reveal>
    </footer>
  );
}
