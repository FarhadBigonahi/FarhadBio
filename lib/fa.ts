// Persian number formatting, shared by the public blog and the admin panel.
//
// These used to live in lib/admin-i18n.ts. The blog needs them too (view
// counts, dates), and importing them from there would drag the entire admin
// string dictionary into the public bundle for the sake of ten lines.

const FA_DIGITS = ["۰", "۱", "۲", "۳", "۴", "۵", "۶", "۷", "۸", "۹"];

/** Turn every ASCII digit in a string into its Persian glyph. */
export function faDigits(input: string | number): string {
  return String(input).replace(/[0-9]/g, (d) => FA_DIGITS[+d]);
}

/** A whole number with Persian thousands separators and Persian digits. */
export function faNum(n: number): string {
  return faDigits(Math.round(n).toLocaleString("en-US"));
}

/**
 * Compact number for tight spaces (chart axes, stat tiles): ۱٫۲ هزار / ۳٫۴ م.
 * Uses the Arabic decimal separator (٫) so it groups naturally in RTL.
 */
export function faCompact(n: number): string {
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
export function faPercent(n: number): string {
  return `٪${faDigits(Math.round(n))}`;
}
