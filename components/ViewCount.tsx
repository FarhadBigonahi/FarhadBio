"use client";
import { useEffect, useState } from "react";
import { faNum } from "@/lib/fa";

// Live read counter for an article.
//
// The number rendered on the server comes from the ISR-cached post payload, so
// it can be up to a minute old and never includes the read happening right now.
// This refreshes it from the backend's uncached counter endpoint, which is why
// the count a reader sees always includes themselves.
const API = process.env.NEXT_PUBLIC_API_URL;

// Long enough for the pageview beacon to have landed and incremented the
// counter. Asking sooner reliably renders a number one short.
const AFTER_BEACON_MS = 1400;

export default function ViewCount({
  slug,
  initial,
}: {
  slug: string;
  initial: number;
}) {
  const [views, setViews] = useState(initial);

  useEffect(() => {
    if (!API) return;
    let alive = true;

    const timer = window.setTimeout(() => {
      fetch(`${API}/v1/posts/${encodeURIComponent(slug)}/views`, {
        cache: "no-store",
      })
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => {
          if (alive && d && typeof d.views === "number") setViews(d.views);
        })
        .catch(() => {
          /* the server-rendered count stays — never an error a reader sees */
        });
    }, AFTER_BEACON_MS);

    return () => {
      alive = false;
      window.clearTimeout(timer);
    };
  }, [slug]);

  return (
    <span className="wb-views" title="تعداد بازدید">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" aria-hidden="true">
        <path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7-10-7-10-7Z" />
        <circle cx="12" cy="12" r="3" />
      </svg>
      <span>{faNum(views)} بازدید</span>
    </span>
  );
}
