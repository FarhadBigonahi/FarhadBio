// The wire contract between this Next.js app and the backend at API_URL.
//
// These types are hand-maintained rather than imported from `server/` on
// purpose: the frontend must build on Vercel without the backend source being
// present, and the backend must be replaceable by anything that speaks the same
// JSON. This file IS the interface — if it changes, both sides change.

export type Block =
  | { type: "p"; html: string }
  | { type: "h3"; text: string }
  | { type: "code"; lang: string; code: string }
  | { type: "callout"; html: string }
  | { type: "quote"; html: string; cite: string }
  | { type: "list"; ordered: boolean; items: string[] }
  | {
      type: "image";
      src: string;
      alt: string;
      caption: string;
      width: number;
      height: number;
    };

export type Post = {
  id?: number;
  status: string;
  slug: string;
  lang: string;
  dir: "rtl" | "ltr";
  emoji: string;
  title: string;
  subtitle: string;
  excerpt: string;
  metaTitle: string;
  metaDescription: string;
  cover: string;
  coverFallback: string;
  coverAlt: string;
  coverWidth: number;
  coverHeight: number;
  date: string;
  dateFa: string;
  dateEn: string;
  readingMinutes: number;
  readingFa: string;
  tags: string[];
  repo: string;
  npm: string;
  body: Block[];
  /**
   * Lifetime reads. Server-owned — the editor never sends it, and a save must
   * never round-trip it back. Optional so a backend that predates the counter
   * still satisfies this contract.
   */
  views?: number;
};

export type Overview = {
  views: number;
  visitors: number;
  viewsTrend: number;
  visitorsTrend: number;
  posts: number;
  avgPerVisitor: number;
  totalPostViews: number;
};

export type DayPoint = { day: string; views: number; visitors: number };

export type Ranked = { label: string; value: number; extra?: string };

/** One row of the dashboard's per-post table. */
export type PostPerformance = {
  id: number;
  slug: string;
  title: string;
  emoji: string;
  dir: "rtl" | "ltr";
  status: "published" | "draft";
  date: string;
  views: number;
  visitors: number;
  trend: number;
  totalViews: number;
};

export type AnalyticsBundle = {
  days: number;
  overview: Overview;
  timeseries: DayPoint[];
  topPosts: Ranked[];
  sources: Ranked[];
  countries: Ranked[];
  devices: Ranked[];
  postPerformance: PostPerformance[];
};

/** Every error response from the backend has this shape. */
export type ApiErrorBody = { error: { code: string; message: string } };
