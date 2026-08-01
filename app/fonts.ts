// Shared font definitions.
//
// The app has three root layouts (see app/(site), app/(fa), app/(admin)) so
// each section can declare its own <html lang/dir>. next/font must be called at
// module scope, so the definitions live here and every root layout imports the
// same instances — one set of @font-face rules, one preload manifest.
import localFont from "next/font/local";

export const satoshi = localFont({
  variable: "--font-satoshi",
  display: "swap",
  src: [
    { path: "../fonts/Satoshi-Regular.woff2", weight: "400", style: "normal" },
    { path: "../fonts/Satoshi-Medium.woff2", weight: "500", style: "normal" },
    { path: "../fonts/Satoshi-Bold.woff2", weight: "700", style: "normal" },
    { path: "../fonts/Satoshi-Black.woff2", weight: "900", style: "normal" },
  ],
});

export const iranSansX = localFont({
  variable: "--font-iransansx",
  display: "swap",
  src: [
    { path: "../fonts/IRANSansX-Regular.woff2", weight: "400", style: "normal" },
    { path: "../fonts/IRANSansX-Medium.woff2", weight: "500", style: "normal" },
    { path: "../fonts/IRANSansX-DemiBold.woff2", weight: "600", style: "normal" },
    { path: "../fonts/IRANSansX-Bold.woff2", weight: "700", style: "normal" },
    { path: "../fonts/IRANSansX-Black.woff2", weight: "900", style: "normal" },
  ],
});

/** Applied to <html> by every root layout so both families are always available. */
export const fontVars = `${satoshi.variable} ${iranSansX.variable}`;
