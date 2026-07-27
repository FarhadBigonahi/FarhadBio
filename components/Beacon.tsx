"use client";
import { useEffect } from "react";
import { usePathname } from "next/navigation";

// Pageview beacon. Fires on first load and on every client-side navigation.
//
// It posts DIRECTLY to the backend rather than through a Next.js route: for a
// visitor in Iran that is one short hop to a local server instead of a detour
// through Vercel's edge and back. It also keeps analytics traffic off the
// frontend entirely.
const API = process.env.NEXT_PUBLIC_API_URL;

/** Stable per-browser id — powers the "visitors" metric. Not a tracking cookie. */
function sessionId(): string {
  try {
    let id = localStorage.getItem("fb_sid");
    if (!id) {
      id =
        (crypto.randomUUID && crypto.randomUUID()) ||
        Math.random().toString(36).slice(2) + Date.now().toString(36);
      localStorage.setItem("fb_sid", id);
    }
    return id;
  } catch {
    // Private mode / storage disabled — still count the view, just anonymously.
    return "anon";
  }
}

export default function Beacon() {
  const pathname = usePathname();

  useEffect(() => {
    if (!API || !pathname || pathname.startsWith("/admin")) return;

    const payload = JSON.stringify({
      path: pathname,
      referrer: document.referrer || "",
      session: sessionId(),
    });
    const url = `${API}/v1/events`;

    try {
      // text/plain (not application/json) keeps this a CORS "simple request",
      // so there is no preflight OPTIONS round trip — and sendBeacon cannot do
      // preflight at all. The backend parses text/plain bodies as JSON.
      const blob = new Blob([payload], { type: "text/plain;charset=UTF-8" });
      if (navigator.sendBeacon?.(url, blob)) return;

      fetch(url, {
        method: "POST",
        headers: { "content-type": "text/plain;charset=UTF-8" },
        body: payload,
        keepalive: true,
        mode: "cors",
      }).catch(() => {});
    } catch {
      /* analytics is best-effort and must never break a page view */
    }
  }, [pathname]);

  return null;
}
