// Persian-aware text helpers shared by the posts module.
// Kept dependency-free so they are trivially unit-testable and portable.

const FA_DIGITS = ["۰", "۱", "۲", "۳", "۴", "۵", "۶", "۷", "۸", "۹"] as const;

export function toFaDigits(n: number | string): string {
  return String(n).replace(/\d/g, (d) => FA_DIGITS[Number(d)]!);
}

/**
 * The longest a slug may be, in characters.
 *
 * Persian costs six characters per letter once percent-encoded, so this is
 * already a ~480-character path. Past that a shared link stops being pasteable.
 */
const MAX_SLUG = 80;

/**
 * Cuts a slug to the length cap without splitting a word.
 *
 * Post slugs are the article's whole title, so the cap is reached by ordinary
 * headlines rather than by pathological ones. A hard slice leaves a fragment of
 * a Persian word in the URL — meaningless to a reader and matching no query —
 * where dropping the word entirely costs nothing.
 */
function truncate(slug: string): string {
  if (slug.length <= MAX_SLUG) return slug;
  // One past the cap, so a cut that happens to land exactly on a separator is
  // recognised as a clean break rather than being pulled back a whole word.
  const cut = slug.slice(0, MAX_SLUG + 1);
  const lastBreak = cut.lastIndexOf("-");
  // No separator at all means one enormous word; there is nothing to preserve.
  const kept = lastBreak > 0 ? cut.slice(0, lastBreak) : cut.slice(0, MAX_SLUG);
  return kept.replace(/-+$/, "");
}

/**
 * URL slug that keeps Unicode letters, so Persian titles produce readable
 * Persian slugs instead of being stripped to an empty string.
 */
export function slugify(input: string): string {
  return truncate(
    input
      .trim()
      .toLowerCase()
      .replace(/['"]/g, "")
      .replace(/[^\p{L}\p{N}]+/gu, "-")
      .replace(/^-+|-+$/g, "")
  );
}

export function stripHtml(s: string): string {
  return s.replace(/<[^>]*>/g, " ");
}

/** Escapes one CSV cell per RFC 4180. */
export function csvCell(v: unknown): string {
  const s = String(v ?? "");
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}
