// Persian-aware text helpers shared by the posts module.
// Kept dependency-free so they are trivially unit-testable and portable.

const FA_DIGITS = ["۰", "۱", "۲", "۳", "۴", "۵", "۶", "۷", "۸", "۹"] as const;

export function toFaDigits(n: number | string): string {
  return String(n).replace(/\d/g, (d) => FA_DIGITS[Number(d)]!);
}

/**
 * URL slug that keeps Unicode letters, so Persian titles produce readable
 * Persian slugs instead of being stripped to an empty string.
 */
export function slugify(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/['"]/g, "")
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export function stripHtml(s: string): string {
  return s.replace(/<[^>]*>/g, " ");
}

/** Escapes one CSV cell per RFC 4180. */
export function csvCell(v: unknown): string {
  const s = String(v ?? "");
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}
