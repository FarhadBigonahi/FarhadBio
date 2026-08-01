// Classification rules for an incoming pageview: is it worth recording, what
// device is it, and where did it come from?
//
// This is the file that decides what your numbers MEAN, so it is deliberately
// pure (no I/O) and easy to change.

/** Coarse device class from a User-Agent string. */
export function deviceFromUA(ua: string): "mobile" | "tablet" | "desktop" {
  const s = ua.toLowerCase();
  if (/ipad|tablet|(android(?!.*mobile))/.test(s)) return "tablet";
  if (/mobi|iphone|android|ipod/.test(s)) return "mobile";
  return "desktop";
}

const BOT_UA =
  /bot|crawler|spider|crawling|slurp|facebookexternalhit|preview|monitor|curl|wget|python-requests|axios|headless|lighthouse|pingdom|uptime|semrush|ahrefs|dataprovider|scrapy/i;

/**
 * POLICY — what counts as a real human pageview.
 *
 * Everything that survives this function becomes a row in `events` and shows up
 * in the dashboard forever, so the bar is "would I want this in my traffic
 * numbers?". Current rules:
 *   1. Known bot/crawler User-Agents are dropped (they would inflate views).
 *   2. Empty User-Agents are dropped (no real browser omits it).
 *   3. Dashboard and API paths are never tracked.
 * Deliberately NOT dropped: unknown UAs, prefetches, repeat views from the same
 * session — those are real signal.
 */
export function shouldRecord(path: string, ua: string): boolean {
  if (!ua.trim()) return false;
  if (BOT_UA.test(ua)) return false;
  if (path.startsWith("/admin") || path.startsWith("/api")) return false;
  return true;
}

/**
 * The post slug a pageview path points at, or "" when the path is not an
 * article. Tolerates the trailing slash and percent-encoding a Persian slug
 * picks up on its way through a browser.
 */
export function postSlugFromPath(path: string): string {
  const m = /^\/blog\/([^/?#]+)\/?$/.exec(path);
  if (!m) return "";
  try {
    return decodeURIComponent(m[1]!);
  } catch {
    // Malformed escape sequence — the slug cannot match a row anyway.
    return "";
  }
}

const SOURCE_MAP: Record<string, string> = {
  "google.com": "google",
  "t.me": "telegram",
  "telegram.me": "telegram",
  "instagram.com": "instagram",
  "l.instagram.com": "instagram",
  "github.com": "github",
  "twitter.com": "twitter",
  "x.com": "twitter",
  "bing.com": "bing",
  "duckduckgo.com": "duckduckgo",
  "linkedin.com": "linkedin",
  "yandex.ru": "yandex",
  "reddit.com": "reddit",
  "youtube.com": "youtube",
};

/** Human label for where a visit came from, derived from the referrer URL. */
export function sourceFromReferrer(ref: string, selfHosts: string[]): string {
  if (!ref) return "direct";

  let host: string;
  try {
    host = new URL(ref).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return "direct";
  }
  if (!host) return "direct";

  // Internal navigation is not a "source".
  const bare = selfHosts.map((h) => h.replace(/^www\./, "").toLowerCase());
  if (bare.includes(host)) return "direct";

  const registrable = host.split(".").slice(-2).join(".");
  return SOURCE_MAP[host] ?? SOURCE_MAP[registrable] ?? host;
}
