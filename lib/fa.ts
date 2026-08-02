// Persian number formatting, shared by the public blog and the admin panel.
//
// These used to live in lib/admin-i18n.ts. The blog needs them too (view
// counts, dates), and importing them from there would drag the entire admin
// string dictionary into the public bundle for the sake of ten lines.

const FA_DIGITS = ["۰", "۱", "۲", "۳", "۴", "۵", "۶", "۷", "۸", "۹"];

/**
 * What a metric renders as when there is no number to render.
 *
 * "Not reported" is not the same fact as zero, so it gets its own glyph — and
 * either way a reader must never be shown the string "undefined" because a
 * backend is older than the field the page asks it for.
 */
export const NO_NUMBER = "—";

/** The value, but only if it is a real number worth formatting. */
function finite(n: number | null | undefined): number | null {
  return typeof n === "number" && Number.isFinite(n) ? n : null;
}

/** Turn every ASCII digit in a string into its Persian glyph. */
export function faDigits(input: string | number): string {
  return String(input).replace(/[0-9]/g, (d) => FA_DIGITS[+d]);
}

/** A whole number with Persian thousands separators and Persian digits. */
export function faNum(n: number | null | undefined): string {
  const v = finite(n);
  return v === null ? NO_NUMBER : faDigits(Math.round(v).toLocaleString("en-US"));
}

/**
 * Compact number for tight spaces (chart axes, stat tiles): ۱٫۲ هزار / ۳٫۴ م.
 * Uses the Arabic decimal separator (٫) so it groups naturally in RTL.
 */
export function faCompact(input: number | null | undefined): string {
  const n = finite(input);
  if (n === null) return NO_NUMBER;
  if (n >= 1_000_000)
    return (
      faDigits((n / 1_000_000).toFixed(1).replace(/\.0$/, "")).replace(".", "٫") +
      " م"
    );
  if (n >= 1_000)
    return (
      faDigits((n / 1_000).toFixed(1).replace(/\.0$/, "")).replace(".", "٫") +
      " هزار"
    );
  return faDigits(n);
}

/** Percentage, Persian digits, always with the % sign on the correct side. */
export function faPercent(n: number | null | undefined): string {
  const v = finite(n);
  return v === null ? NO_NUMBER : `٪${faDigits(Math.round(v))}`;
}
