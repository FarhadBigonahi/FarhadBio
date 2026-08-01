import Link from "next/link";
import type { Metadata } from "next";
import "./globals.css";
import { fontVars } from "./fonts";

// Global 404, for URLs that match no route group.
//
// Next supplies its own bare <html>/<body> shell here, because with multiple
// root layouts there is no app/layout.tsx to wrap this file — so this component
// must NOT render a document of its own or the two nest and the markup is
// invalid. That shell carries no lang attribute and nothing this file can do
// will add one, hence lang on the wrapper below: enough for a screen reader on
// the one page that answers 404 and is never indexed.
//
// Replacing Next's built-in error page matters because that page is white,
// unstyled and jarring against the rest of the site. The job here is to give a
// lost visitor — and a crawler that followed a stale link — a way back.

export const metadata: Metadata = {
  title: "404 — Page not found | Farhad Bigonahi",
  robots: { index: false, follow: true },
};

export default function NotFound() {
  return (
    <div lang="en" dir="ltr" className={fontVars} style={{ background: "var(--bg)" }}>
      <main
          style={{
            minHeight: "100svh",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 18,
            padding: "40px 24px",
            textAlign: "center",
          }}
        >
          <p
            style={{
              margin: 0,
              fontSize: 13,
              letterSpacing: ".18em",
              textTransform: "uppercase",
              color: "var(--accent-light)",
            }}
          >
            404
          </p>
          <h1 style={{ margin: 0, fontSize: "clamp(28px, 6vw, 44px)", lineHeight: 1.2 }}>
            This page doesn&rsquo;t exist
          </h1>
          <p style={{ margin: 0, color: "var(--muted)", maxWidth: "44ch", lineHeight: 1.7 }}>
            The link may be out of date. Try the homepage or the blog.
          </p>
          <p lang="fa" dir="rtl" style={{ margin: 0, color: "var(--muted)", lineHeight: 2 }}>
            این صفحه وجود ندارد. از خانه یا بلاگ ادامه دهید.
          </p>
          <nav
            aria-label="Error page"
            style={{ display: "flex", gap: 12, flexWrap: "wrap", justifyContent: "center", marginTop: 6 }}
          >
            <Link
              href="/"
              style={{
                padding: "12px 22px",
                borderRadius: 12,
                background: "#eff5ff",
                color: "#0a1526",
                fontWeight: 700,
                textDecoration: "none",
              }}
            >
              Home
            </Link>
            <Link
              href="/blog"
              style={{
                padding: "12px 22px",
                borderRadius: 12,
                border: "1px solid var(--hairline)",
                color: "var(--muted)",
                fontWeight: 600,
                textDecoration: "none",
              }}
            >
              بلاگ
            </Link>
          </nav>
      </main>
    </div>
  );
}
